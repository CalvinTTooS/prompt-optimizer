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

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
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

function loadApiKey(): string {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (existsSync('.env.local')) {
    const m = readFileSync('.env.local', 'utf8').match(/^\s*GEMINI_API_KEY\s*=\s*(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
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

/**
 * Spells out the JSON shape that `responseSchema` enforces on the Gemini path.
 * Derived from the same flags, so the two backends stay in sync by construction.
 */
function jsonContract(fields: string[]): string {
  return `Rispondi esclusivamente con un oggetto JSON valido, senza testo prima o dopo. Campi richiesti (tutti stringhe): ${fields.join(', ')}.`;
}

/** Runs the prompt through the local `claude` CLI and returns the parsed object. */
function callClaude<T>(prompt: string): T {
  const res = spawnSync('claude', ['-p', '--model', CLAUDE_MODEL, '--output-format', 'json'], {
    input: prompt,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    shell: true,
  });
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
      ({ progetto } = callClaude<{ progetto: string }>(
        `${SCAFFOLD_PROGETTO_INSTRUCTIONS}\n\n${jsonContract(['progetto'])}\n\n${input}`,
      ));
    } else {
      const model = genAI.getGenerativeModel({
        model: MODEL,
        generationConfig: { responseMimeType: 'application/json', responseSchema: buildScaffoldSchema() },
      });
      const response = await model.startChat().sendMessage([SCAFFOLD_PROGETTO_INSTRUCTIONS, input]);
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
    parsed = callClaude<OptimizerResultLike>(`${instruction}\n\n${jsonContract(fields)}\n\n${input}`);
  } else {
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: { responseMimeType: 'application/json', responseSchema: buildResponseSchema(flows) },
    });
    const response = await model.startChat().sendMessage([instruction, input]);
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
  console.log(`Casi: ${cases.length} · Ripetizioni: ${REPS} · Chiamate: ${total}`);
  console.log(`Stima: ~${Math.round((total * SLEEP_MS) / 60000)} minuti\n`);

  const observations: Observation[] = [];
  const errors: string[] = [];
  const jsonFailures: string[] = [];
  let n = 0;

  for (const c of cases) {
    for (const flow of c.flows) {
      if (!matches(flow)) continue;
      for (let rep = 1; rep <= REPS; rep += 1) {
        n += 1;
        if (n > 1 && SLEEP_MS > 0) await sleep(SLEEP_MS);
        process.stdout.write(`[${n}/${total}] ${c.id} (${flow}) ${rep}/${REPS}... `);
        try {
          const { text, conformance } = await generateAndCheck(flow, c.input);
          observations.push({ caseId: c.id, flow, rep, text, conformance });
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
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
