// Conformance evaluation harness.
//
// Runs every case in ./prompts.ts through the REAL app meta-prompts and
// schemas (imported from ../app), calling Gemini live, then checks each
// generated prompt against the rules its own format declares
// (../app/lib/conformance) and reports a per-rule conformance rate.
//
// What the numbers mean: this FALSIFIES rules ("this one is violated at least
// sometimes"), it does not CERTIFY them. A rule at 100% on ~10 cases says
// little; a rule at 60% says the meta-prompt is not imposing it. Use the
// DELTA across runs — before and after changing a meta-prompt — not the level.
//
// This is a development tool. It never runs in the shipped app and never
// spends the end user's quota.
//
// Usage: set GEMINI_API_KEY (env or .env.local), then:
//   npm run eval
// Options:
//   EVAL_MODEL     override the pinned model (default: gemini-3.5-flash-lite)
//   EVAL_REPS      repetitions per case (default: 3 — Gemini is not deterministic)
//   EVAL_FLOW      run only one flow, e.g. EVAL_FLOW=code
//   EVAL_ONLY      run only these case ids, comma-separated
//   EVAL_SLEEP_MS  pacing between calls (default: 13000 for the free tier)

import { writeFileSync, mkdirSync, readFileSync, existsSync, mkdtempSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EVAL_CASES, type EvalCase, type EvalFlow } from './prompts';
import {
  FLOW_CHAT_INSTRUCTIONS,
  FLOW_COWORK_INSTRUCTIONS,
  FLOW_CODE_INSTRUCTIONS,
  FLOW_SYSTEM_USER_INSTRUCTIONS,
  FLOW_GEMINI_INSTRUCTIONS,
  SCAFFOLD_PROGETTO_INSTRUCTIONS,
} from '../app/constants/prompts';
import {
  buildResponseSchema,
  buildScaffoldSchema,
  buildOptimizerSystemInstruction,
  parseOptimizerResponse,
  wrapUserInput,
  USER_INPUT_FRAMING,
  type OptimizerFlows,
} from '../app/lib/promptOptimizer';
import {
  checkChat,
  checkCowork,
  checkCode,
  checkSystemUser,
  checkGemini,
  checkScaffoldProject,
  type ConformanceResult,
} from '../app/lib/conformance';

/**
 * Where the key came from. Reported at startup, because the precedence here is
 * SILENT and that cost a full afternoon on 2026-08-29: an exported
 * GEMINI_API_KEY shadowed `.env.local` entirely, so renaming the file to swap
 * accounts changed nothing while every run kept spending one budget. The value
 * is never printed — only its source and a short digest, which is enough to
 * tell two keys apart and to match a run against its quota ledger.
 */
let keySource = 'sconosciuta';

function loadApiKey(): string {
  if (process.env.GEMINI_API_KEY) {
    keySource = "variabile d'ambiente GEMINI_API_KEY";
    return process.env.GEMINI_API_KEY;
  }
  if (existsSync('.env.local')) {
    const m = readFileSync('.env.local', 'utf8').match(/^\s*GEMINI_API_KEY\s*=\s*(.+)$/m);
    if (m) {
      keySource = 'file .env.local';
      return m[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  throw new Error('GEMINI_API_KEY non impostata (variabile d\'ambiente o riga in .env.local).');
}

// Pinned on purpose. `gemini-flash-latest` is a MOVING alias: Google repoints
// it over time, which silently invalidates every historical comparison. A
// regression baseline needs a fixed snapshot.
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';

const API_KEY = loadApiKey();
const MODEL = process.env.EVAL_MODEL || DEFAULT_MODEL;
const REPS = Math.max(1, Number(process.env.EVAL_REPS ?? 3));
const ONLY_FLOW = process.env.EVAL_FLOW as EvalFlow | undefined;
const ONLY_IDS = (process.env.EVAL_ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const SLEEP_MS = Number(process.env.EVAL_SLEEP_MS ?? 13000);

// Multi-flow mode (EVAL_MULTI=1) asks for ALL five formats in ONE call — what
// production does when the user ticks several boxes — then checks only the
// case's own variant. Paired with a default run on the same corpus it isolates
// a single question: does generating five formats together degrade conformity
// compared with generating them one at a time?
//
// The default run measures the BEST case (one format per call), so without this
// mode the cost of batching stays invisible.
const MULTI = process.env.EVAL_MULTI === '1';

// Second backend (EVAL_BACKEND=claude), for a cross-model reading of the SAME
// meta-prompts. It answers a question one model alone cannot: when a rule scores
// low, is the rule at fault or the model? Failing on both points at us; failing
// on one points at the model.
//
// Two confounds, declared rather than hidden — this is indicative, not a
// controlled experiment:
//  1. No `responseSchema`. Gemini has the JSON shape enforced by the API; Claude
//     can only be ASKED for it. A malformed reply is therefore a backend
//     artifact, not a rule violation, and is counted separately.
//  2. The CLI inherits the user's global output style, so replies may carry
//     preambles or code fences. Hence the tolerant extraction below.
const BACKEND = (process.env.EVAL_BACKEND ?? 'gemini') as 'gemini' | 'claude';
const CLAUDE_MODEL = process.env.EVAL_CLAUDE_MODEL ?? 'sonnet';

class JsonContractError extends Error {}

// ---------------------------------------------------------------------------
// Checkpoint and resume
//
// Runs get killed. Five in a row died mid-flight on 2026-08-29 with zero
// application errors, after three more had been lost to a network blackout, an
// exhausted quota, and a sleeping network card. Diagnosing the killer is not
// always possible from inside the run; making its death cheap always is.
//
// So the checkpoint is no longer write-only: a new run reads it back and skips
// the observations it already holds. An interruption costs one call, not the
// whole block.
// ---------------------------------------------------------------------------

/** One checkpoint per block, so concurrent or successive flows never clobber each other. */
const CHECKPOINT_PATH = `eval/output/_partial-${ONLY_FLOW ?? 'all'}${MULTI ? '-multi' : ''}${
  BACKEND === 'claude' ? '-claude' : ''
}.json`;

interface Checkpoint {
  fingerprint: string;
  observations: Observation[];
}

/**
 * Identity of a measurement. Resuming is only sound when the interrupted run was
 * measuring the SAME thing, and the field that bites is the last one: the
 * meta-prompt text itself. Editing a FLOW_* constant mid-block and resuming
 * would blend two different prompts into one report — no error, no warning,
 * just numbers that mean nothing. Hashing the prompts makes that impossible.
 */
function runFingerprint(): string {
  const promptText =
    buildOptimizerSystemInstruction([
      FLOW_CHAT_INSTRUCTIONS,
      FLOW_COWORK_INSTRUCTIONS,
      FLOW_CODE_INSTRUCTIONS,
      FLOW_SYSTEM_USER_INSTRUCTIONS,
      FLOW_GEMINI_INSTRUCTIONS,
    ]) + SCAFFOLD_PROGETTO_INSTRUCTIONS;
  const promptHash = createHash('sha256').update(promptText).digest('hex').slice(0, 12);
  const engine = BACKEND === 'claude' ? `claude:${CLAUDE_MODEL}` : MODEL;
  return `${engine}|reps=${REPS}|multi=${MULTI ? 1 : 0}|prompts=${promptHash}`;
}

function loadCheckpoint(fingerprint: string): Observation[] {
  if (!existsSync(CHECKPOINT_PATH)) return [];
  try {
    const cp = JSON.parse(readFileSync(CHECKPOINT_PATH, 'utf8')) as Checkpoint;
    if (cp.fingerprint !== fingerprint) {
      console.log(
        `Checkpoint presente ma di un'altra configurazione — ignorato, si riparte da zero.\n` +
          `  trovato: ${cp.fingerprint}\n  atteso:  ${fingerprint}`,
      );
      return [];
    }
    return cp.observations ?? [];
  } catch {
    console.log('Checkpoint illeggibile — ignorato, si riparte da zero.');
    return [];
  }
}

// ---------------------------------------------------------------------------
// Local quota ledger
//
// IMPORTANT: this is a LOCAL tally of the calls THIS harness has made today, not
// a reading of Google's counter. The Gemini API exposes no "requests remaining"
// endpoint: a 429 is the only authoritative signal, and it arrives too late to
// plan around. Calls made by the desktop app itself are invisible here, so treat
// the number as a floor — the real usage is this or more.
// ---------------------------------------------------------------------------

const DAILY_CAP = Number(process.env.EVAL_DAILY_CAP ?? 500);
const IGNORE_QUOTA = process.env.EVAL_IGNORE_QUOTA === '1';
const today = () => new Date().toISOString().slice(0, 10);

// The tally is scoped by DAY and by KEY. Google's free tier meters per project,
// so swapping in a key from another account brings its own budget: a ledger
// keyed only by day would refuse a run against a freshly reset key. The key
// itself is never written anywhere — only a short digest of it, enough to tell
// two keys apart and useless to anyone who reads the file.
const KEY_ID = createHash('sha256').update(API_KEY).digest('hex').slice(0, 8);
const quotaPath = () => `eval/output/_quota-${today()}-${KEY_ID}.json`;

function quotaUsed(): number {
  if (!existsSync(quotaPath())) return 0;
  try {
    return Number(JSON.parse(readFileSync(quotaPath(), 'utf8')).calls) || 0;
  } catch {
    return 0;
  }
}

function quotaBump(): void {
  try {
    writeFileSync(quotaPath(), JSON.stringify({ day: today(), key: KEY_ID, calls: quotaUsed() + 1 }));
  } catch {
    // A ledger failure must never abort a measurement in progress.
  }
}

/**
 * Spells out the JSON shape that `responseSchema` enforces on the Gemini path.
 * Derived from the same flags, so the two backends stay in sync by construction.
 */
function jsonContract(fields: string[]): string {
  return `Rispondi esclusivamente con un oggetto JSON valido, senza testo prima o dopo. Campi richiesti (tutti stringhe): ${fields.join(', ')}.`;
}

// ⚠️ CONTAINMENT — do not remove, and do not "simplify" by dropping the cwd.
//
// The CLI is a full coding agent, not a text endpoint. On 2026-08-28 an
// unrestricted run took three eval inputs literally and DID them: it created
// `docs/TESTING.md`, registered it in `CLAUDE.md` and rewrote `CONTRIBUTING.md`
// — inside the repository it was supposed to be measuring. Those replies then
// showed up as "malformed JSON", because the agent had gone off to work instead
// of answering.
//
// A benchmark must never be able to modify the system under test. Three layers,
// in increasing order of reliability:
//  1. `--restricted`      drops the code-running tools
//  2. `--disallowed-tools` names the file-writing ones explicitly
//  3. a throwaway cwd     the decisive one: whatever survives 1 and 2 can only
//                         reach an empty temp directory, never the repo
const CLAUDE_SANDBOX = mkdtempSync(join(tmpdir(), 'eval-claude-'));
const CLAUDE_BLOCKED_TOOLS = 'Edit Write NotebookEdit Bash PowerShell WebFetch Task';

/** Runs the prompt through the local `claude` CLI and returns the parsed object. */
function callClaude<T>(prompt: string): T {
  const res = spawnSync(
    'claude',
    [
      '-p',
      '--model', CLAUDE_MODEL,
      '--output-format', 'json',
      '--restricted',
      '--disallowed-tools', CLAUDE_BLOCKED_TOOLS,
    ],
    {
      input: prompt,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      shell: true,
      cwd: CLAUDE_SANDBOX,
    },
  );
  if (res.error) throw new Error(`claude non avviabile: ${res.error.message}`);
  if (res.status !== 0) throw new Error(`claude uscito con codice ${res.status}: ${res.stderr?.slice(0, 200)}`);

  let envelope: { result?: string; is_error?: boolean };
  try {
    envelope = JSON.parse(res.stdout);
  } catch {
    throw new JsonContractError('envelope del CLI non parsabile');
  }
  if (envelope.is_error) throw new Error('il CLI ha segnalato un errore');

  // The reply may be fenced or preceded by prose (inherited output style), so
  // take the outermost braces rather than trusting the whole string.
  const raw = envelope.result ?? '';
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new JsonContractError('nessun oggetto JSON nella risposta');
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    throw new JsonContractError('JSON della risposta non valido');
  }
}

const genAI = new GoogleGenerativeAI(API_KEY);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type OptFlow = Exclude<EvalFlow, 'scaffold'>;
const FLOW_FLAG: Record<OptFlow, keyof OptimizerFlows> = {
  chat: 'genChat',
  cowork: 'genCowork',
  code: 'genCode',
  systemUser: 'genSystemUser',
  gemini: 'genGemini',
};
const FLOW_INSTR: Record<OptFlow, string> = {
  chat: FLOW_CHAT_INSTRUCTIONS,
  cowork: FLOW_COWORK_INSTRUCTIONS,
  code: FLOW_CODE_INSTRUCTIONS,
  systemUser: FLOW_SYSTEM_USER_INSTRUCTIONS,
  gemini: FLOW_GEMINI_INSTRUCTIONS,
};

/** The optimizer response shape, shared by both backends. */
type OptimizerResultLike = {
  spiegazione?: string;
  promptChat?: string;
  promptCowork?: string;
  promptCode?: string;
  promptSystem?: string;
  promptUser?: string;
  promptGemini?: string;
};

/** One generated artifact plus its conformance verdict. */
interface Observation {
  caseId: string;
  flow: EvalFlow;
  rep: number;
  text: string;
  conformance: ConformanceResult;
}

async function generateAndCheck(flow: EvalFlow, input: string): Promise<{ text: string; conformance: ConformanceResult }> {
  if (flow === 'scaffold') {
    let progetto: string;
    if (BACKEND === 'claude') {
      // The CLI has no system-instruction channel, so the boundary here can only
      // be textual: the delimiter still marks material from directives.
      ({ progetto } = callClaude<{ progetto: string }>(
        `${USER_INPUT_FRAMING}\n\n${SCAFFOLD_PROGETTO_INSTRUCTIONS}\n\n${jsonContract(['progetto'])}\n\n${wrapUserInput(input)}`,
      ));
    } else {
      const model = genAI.getGenerativeModel({
        model: MODEL,
        systemInstruction: `${USER_INPUT_FRAMING}\n\n${SCAFFOLD_PROGETTO_INSTRUCTIONS}`,
        generationConfig: { responseMimeType: 'application/json', responseSchema: buildScaffoldSchema() },
      });
      const response = await model.startChat().sendMessage(wrapUserInput(input));
      const finishReason = response.response.candidates?.[0]?.finishReason;
      ({ progetto } = parseOptimizerResponse<{ progetto: string }>({
        text: response.response.text(),
        finishReason,
      }));
    }
    return { text: progetto, conformance: checkScaffoldProject(progetto) };
  }

  const flows: OptimizerFlows = MULTI
    ? { genChat: true, genCowork: true, genCode: true, genSystemUser: true, genGemini: true }
    : {
        genChat: false,
        genCowork: false,
        genCode: false,
        genSystemUser: false,
        genGemini: false,
      };
  if (!MULTI) flows[FLOW_FLAG[flow]] = true;

  // Same order production uses, so the meta-prompt is byte-identical to the one
  // a user with all five boxes ticked would send.
  const tasks = MULTI
    ? (['chat', 'cowork', 'code', 'systemUser', 'gemini'] as OptFlow[]).map((f) => FLOW_INSTR[f])
    : [FLOW_INSTR[flow]];

  const instruction = buildOptimizerSystemInstruction(tasks);

  let parsed: OptimizerResultLike;
  if (BACKEND === 'claude') {
    // Field names mirror buildResponseSchema, so the contract asked of Claude
    // matches the shape the Gemini schema enforces.
    const fields = ['spiegazione'];
    if (flows.genChat) fields.push('promptChat');
    if (flows.genCowork) fields.push('promptCowork');
    if (flows.genCode) fields.push('promptCode');
    if (flows.genSystemUser) fields.push('promptSystem', 'promptUser');
    if (flows.genGemini) fields.push('promptGemini');
    parsed = callClaude<OptimizerResultLike>(
      `${instruction}\n\n${jsonContract(fields)}\n\n${wrapUserInput(input)}`,
    );
  } else {
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: instruction,
      generationConfig: { responseMimeType: 'application/json', responseSchema: buildResponseSchema(flows) },
    });
    const response = await model.startChat().sendMessage(wrapUserInput(input));
    const finishReason = response.response.candidates?.[0]?.finishReason;
    parsed = parseOptimizerResponse({ text: response.response.text(), finishReason });
  }

  switch (flow) {
    case 'chat':
      return { text: parsed.promptChat ?? '', conformance: checkChat(parsed.promptChat ?? '') };
    case 'cowork':
      return { text: parsed.promptCowork ?? '', conformance: checkCowork(parsed.promptCowork ?? '') };
    case 'code':
      return { text: parsed.promptCode ?? '', conformance: checkCode(parsed.promptCode ?? '') };
    case 'gemini':
      return { text: parsed.promptGemini ?? '', conformance: checkGemini(parsed.promptGemini ?? '') };
    case 'systemUser': {
      const system = parsed.promptSystem ?? '';
      const user = parsed.promptUser ?? '';
      return {
        text: `--- SYSTEM ---\n${system}\n\n--- USER ---\n${user}`,
        conformance: checkSystemUser(system, user),
      };
    }
  }
}

/** Aggregated pass rate for one rule id within one flow. */
interface RuleStat {
  id: string;
  label: string;
  passed: number;
  total: number;
  /** Case ids where the rule failed, for the report. */
  failures: { caseId: string; evidence?: string }[];
}

function aggregate(observations: Observation[]): Map<EvalFlow, RuleStat[]> {
  const byFlow = new Map<EvalFlow, Map<string, RuleStat>>();
  for (const obs of observations) {
    if (!byFlow.has(obs.flow)) byFlow.set(obs.flow, new Map());
    const rules = byFlow.get(obs.flow)!;
    for (const check of obs.conformance.checks) {
      if (!rules.has(check.id)) {
        rules.set(check.id, { id: check.id, label: check.label, passed: 0, total: 0, failures: [] });
      }
      const stat = rules.get(check.id)!;
      stat.total += 1;
      if (check.passed) stat.passed += 1;
      else stat.failures.push({ caseId: obs.caseId, evidence: check.evidence });
    }
  }
  const out = new Map<EvalFlow, RuleStat[]>();
  for (const [flow, rules] of byFlow) out.set(flow, [...rules.values()]);
  return out;
}

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));
/** Below this, the meta-prompt is not reliably imposing the rule. */
const WARN_THRESHOLD = 90;

/**
 * Retries the server-side transients, and only those.
 *
 * A 500/503 from Google means "ask again", not "this prompt violates a rule":
 * on 2026-08-29 seven such replies cost 13% of a block's observations and
 * skewed nothing except the sample size. A 429 is deliberately NOT retried —
 * within a run it means "not today", and hammering it burns the pacing budget
 * without ever succeeding.
 */
async function withTransientRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  // Quota refusals are checked FIRST and never retried. This ordering is not
  // decorative: a 429 body reads "limit: 500" and "quotaValue":"500", so a bare
  // \b500\b matched it and the retry logic escalated the very error it was meant
  // to leave alone — burning calls against an already-exhausted budget on
  // 2026-08-29. Transients are matched on the SDK's bracketed status prefix
  // (`[503 Service Unavailable]`), not on any occurrence of the number.
  const QUOTA = /\b429\b|quota exceeded|RESOURCE_EXHAUSTED/i;
  const TRANSIENT = /\[(500|502|503|504)\s|internal error|high demand|service unavailable/i;
  let lastError: unknown;
  for (let i = 0; i <= attempts; i += 1) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (QUOTA.test(msg) || !TRANSIENT.test(msg) || i === attempts) break;
      const backoff = SLEEP_MS * (i + 1);
      process.stdout.write(`transitorio, riprovo tra ${Math.round(backoff / 1000)}s... `);
      quotaBump();
      await sleep(backoff);
    }
  }
  throw lastError;
}

function renderTable(stats: Map<EvalFlow, RuleStat[]>): string[] {
  const out: string[] = [];
  for (const [flow, rules] of stats) {
    const observations = rules[0]?.total ?? 0;
    out.push('', `## Flusso ${flow.toUpperCase()} — ${observations} osservazioni`, '');
    out.push('| Regola | Conformi | % | |');
    out.push('|---|---|---|---|');
    for (const r of rules.sort((a, b) => pct(a.passed, a.total) - pct(b.passed, b.total))) {
      const p = pct(r.passed, r.total);
      out.push(`| \`${r.id}\` ${r.label} | ${r.passed}/${r.total} | ${p}% | ${p < WARN_THRESHOLD ? '⚠' : ''} |`);
    }
  }
  return out;
}

async function main() {
  const started = new Date();
  const caseWanted = (c: EvalCase) => ONLY_IDS.length === 0 || ONLY_IDS.includes(c.id);
  const matches = (flow: EvalFlow) => !ONLY_FLOW || flow === ONLY_FLOW;
  const cases = EVAL_CASES.filter(caseWanted);
  const total = cases.reduce((s, c) => s + c.flows.filter(matches).length, 0) * REPS;

  const mode = MULTI ? 'multi-flusso (5 formati per chiamata)' : 'flusso singolo';
  const engine = BACKEND === 'claude' ? `claude CLI (${CLAUDE_MODEL})` : MODEL;
  console.log(`Backend: ${BACKEND} · Modello: ${engine} · Modalità: ${mode}`);
  console.log(`Chiave: ${KEY_ID} · da ${keySource}`);
  console.log(`Casi: ${cases.length} · Ripetizioni: ${REPS} · Chiamate: ${total}`);

  mkdirSync('eval/output', { recursive: true });

  const fingerprint = runFingerprint();
  const resumed = loadCheckpoint(fingerprint);
  const done = new Set(resumed.map((o) => `${o.caseId}|${o.flow}|${o.rep}`));
  const todo = total - done.size;

  if (done.size > 0) {
    console.log(`Ripresa: ${done.size} osservazioni già acquisite, ne restano ${todo}.`);
  }

  // Pre-flight on the local ledger. Starting a run that cannot finish wastes the
  // very quota it needs: the free tier's 500 daily requests are the binding
  // constraint, and a block that dies at 90% still spent 90% of the calls.
  const used = quotaUsed();
  console.log(
    `Quota (conteggio locale, non di Google): ${used}/${DAILY_CAP} oggi · ` +
      `residue ~${Math.max(0, DAILY_CAP - used)} · questa esecuzione ne chiede ${todo}`,
  );
  if (todo > DAILY_CAP - used) {
    const msg =
      `Quota insufficiente: servono ${todo} chiamate, ne risultano ~${Math.max(0, DAILY_CAP - used)}.\n` +
      `Il conteggio è locale e non vede le chiamate fatte dall'app: potrebbe sottostimare l'uso reale.\n` +
      `Per procedere comunque: EVAL_IGNORE_QUOTA=1`;
    if (!IGNORE_QUOTA) {
      console.error(`\n${msg}`);
      process.exit(2);
    }
    console.log(`\n${msg}\n→ EVAL_IGNORE_QUOTA=1: procedo lo stesso.`);
  }

  console.log(`Stima: ~${Math.round((todo * SLEEP_MS) / 60000)} minuti\n`);

  const observations: Observation[] = [...resumed];
  const errors: string[] = [];
  const jsonFailures: string[] = [];
  let n = 0;

  // A 429 is not a transient hiccup like a dropped connection: within one run it
  // means "not today". Without this guard an exhausted quota does not produce an
  // error, it produces a FALSE RESULT — every rule at 0%, which reads as a
  // catastrophic regression of the product. Happened twice on 2026-08-27/28,
  // once burning 149 calls' worth of wall time to collect refusals.
  let consecutiveQuotaErrors = 0;
  const QUOTA_ABORT_THRESHOLD = 3;

  // Calls actually issued this session (skipped observations are not calls), so
  // the pacing sleep does not fire before the first real request of a resume.
  let calls = 0;

  for (const c of cases) {
    for (const flow of c.flows) {
      if (!matches(flow)) continue;
      for (let rep = 1; rep <= REPS; rep += 1) {
        n += 1;
        if (done.has(`${c.id}|${flow}|${rep}`)) continue;
        if (calls > 0 && SLEEP_MS > 0) await sleep(SLEEP_MS);
        calls += 1;
        process.stdout.write(`[${n}/${total}] ${c.id} (${flow}) ${rep}/${REPS}... `);
        quotaBump();
        try {
          const { text, conformance } = await withTransientRetry(() => generateAndCheck(flow, c.input));
          observations.push({ caseId: c.id, flow, rep, text, conformance });
          consecutiveQuotaErrors = 0;
          // Checkpoint after every observation, and read back on the next run
          // (see loadCheckpoint). The markdown report is written only at the
          // end, so an interrupted run used to leave nothing usable behind.
          writeFileSync(CHECKPOINT_PATH, JSON.stringify({ fingerprint, observations } satisfies Checkpoint));
          const failed = conformance.total - conformance.passed;
          process.stdout.write(failed === 0 ? 'ok\n' : `${conformance.passed}/${conformance.total}\n`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          // A malformed reply is a BACKEND artifact, not a rule violation:
          // without responseSchema the JSON shape is merely requested. Mixing
          // the two would make the Claude backend look non-conformant when it
          // is only being verbose.
          if (e instanceof JsonContractError) {
            jsonFailures.push(`${c.id} (${flow}) rep ${rep}: ${msg}`);
            process.stdout.write(`JSON non conforme: ${msg}\n`);
          } else {
            errors.push(`${c.id} (${flow}) rep ${rep}: ${msg}`);
            process.stdout.write(`ERRORE: ${msg}\n`);

            // A rejected key fails every remaining call identically: there is
            // nothing to salvage by continuing, and the pacing sleep would drag
            // a doomed corpus out for half an hour. Stop on the first one.
            if (/API_KEY_INVALID|API key not valid/i.test(msg)) {
              console.error(
                `\nInterrotto: la chiave (${KEY_ID}, da ${keySource}) è rifiutata dall'API.\n` +
                  `Le osservazioni già acquisite restano nel checkpoint.`,
              );
              process.exit(2);
            }

            if (/\b429\b|quota/i.test(msg)) {
              consecutiveQuotaErrors += 1;
              if (consecutiveQuotaErrors >= QUOTA_ABORT_THRESHOLD) {
                console.error(
                  `\nInterrotto: ${QUOTA_ABORT_THRESHOLD} errori di quota consecutivi.\n` +
                    'La quota giornaliera è esaurita o la chiave non è valida. Nessun report\n' +
                    'scritto: un report parziale di sole violazioni sarebbe un dato falso.\n' +
                    'Controlla il contatore reale su https://ai.dev/rate-limit prima di riprovare.',
                );
                process.exit(2);
              }
            } else {
              consecutiveQuotaErrors = 0;
            }
          }
        }
      }
    }
  }

  const stats = aggregate(observations);

  // --- console summary: the headline is the per-rule rate, nothing else ---
  console.log('\n' + '='.repeat(60));
  console.log('CONFORMITÀ PER REGOLA');
  console.log('='.repeat(60));
  for (const [flow, rules] of stats) {
    console.log(`\n${flow.toUpperCase()} (${rules[0]?.total ?? 0} osservazioni)`);
    for (const r of rules.sort((a, b) => pct(a.passed, a.total) - pct(b.passed, b.total))) {
      const p = pct(r.passed, r.total);
      console.log(
        `  ${r.id.padEnd(28)} ${String(r.passed).padStart(3)}/${String(r.total).padEnd(3)} ${String(p).padStart(3)}%  ${p < WARN_THRESHOLD ? '⚠' : ''}`,
      );
    }
  }
  if (errors.length) console.log(`\n${errors.length} chiamate fallite (vedi il report).`);
  if (jsonFailures.length) {
    console.log(`${jsonFailures.length} risposte con JSON non conforme — artefatto del backend, non violazioni di regola.`);
  }

  // --- markdown report, with the evidence for every failure ---
  const lines: string[] = [
    '# Eval di conformità',
    '',
    `Backend: **${BACKEND}** · Modello: \`${engine}\` · Modalità: **${mode}** · Casi: ${cases.length} · Ripetizioni: ${REPS} · Avvio: ${started.toISOString()}`,
    '',
    '> I numeri servono a **falsificare** una regola, non a certificarla. Confronta il',
    '> **delta** tra due esecuzioni (prima/dopo una modifica ai meta-prompt), non il livello.',
    ...renderTable(stats),
  ];

  for (const [flow, rules] of stats) {
    const failing = rules.filter((r) => r.failures.length > 0);
    if (failing.length === 0) continue;
    lines.push('', `### Violazioni — ${flow}`, '');
    for (const r of failing) {
      lines.push(`**\`${r.id}\`** — ${r.label}`, '');
      for (const f of r.failures.slice(0, 10)) {
        lines.push(`- \`${f.caseId}\`${f.evidence ? `: ${f.evidence}` : ''}`);
      }
      if (r.failures.length > 10) lines.push(`- …e altre ${r.failures.length - 10}`);
      lines.push('');
    }
  }

  if (errors.length) {
    lines.push('', '## Chiamate fallite', '', ...errors.map((e) => `- ${e}`));
  }
  if (jsonFailures.length) {
    lines.push(
      '',
      '## Risposte con JSON non conforme',
      '',
      '> Artefatto del **backend**, non violazioni di regola: senza `responseSchema` la',
      '> forma JSON è solo richiesta, non imposta. Contate a parte per non falsare il confronto.',
      '',
      ...jsonFailures.map((e) => `- ${e}`),
    );
  }

  lines.push('', '---', '', '## Prompt generati', '');
  for (const obs of observations) {
    lines.push(
      `### ${obs.caseId} · ${obs.flow} · rep ${obs.rep} — ${obs.conformance.passed}/${obs.conformance.total}`,
      '',
      '```',
      obs.text,
      '```',
      '',
    );
  }

  mkdirSync('eval/output', { recursive: true });
  const stamp = started.toISOString().replace(/[:.]/g, '-');
  // The mode is in the filename: comparing a single-flow run against a
  // multi-flow one is the whole point, and mixing them up would invalidate it.
  const suffix = `${BACKEND}-${MULTI ? 'multi' : 'single'}`;
  const path = `eval/output/eval-${suffix}-${stamp}.md`;
  writeFileSync(path, lines.join('\n'));
  writeFileSync(`eval/output/latest-${suffix}.md`, lines.join('\n'));
  console.log(`\nReport in ${path} (e eval/output/latest.md).`);

  // The checkpoint is dropped only when the block is genuinely COMPLETE.
  // Reaching the last case is not the same thing: transient 500/503 replies from
  // Google leave holes (7 of 54 on the systemUser block, 2026-08-29), and
  // deleting the checkpoint there would force a re-run of every observation to
  // recover a handful. Keeping it lets a re-run fill only the gaps.
  if (errors.length === 0 && jsonFailures.length === 0) {
    if (existsSync(CHECKPOINT_PATH)) unlinkSync(CHECKPOINT_PATH);
  } else {
    console.log(
      `Checkpoint conservato (${observations.length} osservazioni): rilancia lo stesso blocco ` +
        `per recuperare solo le ${errors.length + jsonFailures.length} mancanti.`,
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
