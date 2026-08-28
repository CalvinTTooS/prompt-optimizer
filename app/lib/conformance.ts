// Conformance checker: does a GENERATED prompt obey the rules its own format
// declares in app/constants/prompts.ts?
//
// Scope, deliberately narrow: every check here is DECIDABLE BY A PARSER. A rule
// that needs judgement (e.g. "architectural clarity", "no loopholes") is not
// checked at all — an approximate check produces false positives, which is the
// defect that made the previous linter untrustworthy.
//
// What this does NOT claim: that the prompt is good, or that it will perform
// better. It measures conformity to the best practices we claim to apply —
// which is exactly the promise the product makes.
//
// Shared by the in-app badge and by the offline eval harness, so the same
// definition of "conformant" governs both.

export type ConformanceFlow =
  | 'chat'
  | 'cowork'
  | 'code'
  | 'systemUser'
  | 'gemini'
  | 'scaffold';

export interface ConformanceCheck {
  /** Stable id, e.g. 'code.noMarkdownLinks'. Used to aggregate across runs. */
  id: string;
  /** Human-readable rule, shown in the UI (Italian). */
  label: string;
  passed: boolean;
  /** Proof of failure — the offending line or fragment. Absent when passed. */
  evidence?: string;
}

export interface ConformanceResult {
  flow: ConformanceFlow;
  checks: ConformanceCheck[];
  passed: number;
  total: number;
}

// --- helpers ---------------------------------------------------------------

const ok = (id: string, label: string): ConformanceCheck => ({ id, label, passed: true });
const ko = (id: string, label: string, evidence?: string): ConformanceCheck => ({
  id,
  label,
  passed: false,
  ...(evidence ? { evidence } : {}),
});

const result = (flow: ConformanceFlow, checks: ConformanceCheck[]): ConformanceResult => ({
  flow,
  checks,
  passed: checks.filter((c) => c.passed).length,
  total: checks.length,
});

/** Non-empty, trimmed lines — the unit most rules reason about. */
function lines(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
}

/** First match of `re` in `text`, trimmed to keep evidence readable. */
function firstMatch(text: string, re: RegExp): string | undefined {
  const m = text.match(re);
  return m ? m[0].slice(0, 120) : undefined;
}

/**
 * A prompt aimed at an agent must never address the human user, so a trailing
 * question is a violation for the agent-facing formats (Code rule 10, Gemini
 * rule 9). It is NOT a violation for Chat, where FLOW_CHAT explicitly allows a
 * follow-up question on conversational tasks — hence this is applied per flow
 * instead of globally, unlike the previous linter.
 */
function endsWithUserQuestion(text: string): string | undefined {
  const ls = lines(text);
  const last = ls[ls.length - 1] ?? '';
  return last.endsWith('?') ? last.slice(0, 120) : undefined;
}

/** Checks that each named tag appears as a matched <tag>…</tag> pair. */
function checkTagPairs(text: string, tags: string[], idPrefix: string): ConformanceCheck[] {
  const missing = tags.filter((t) => !new RegExp(`<${t}>`).test(text));
  const unclosed = tags.filter(
    (t) => new RegExp(`<${t}>`).test(text) && !new RegExp(`</${t}>`).test(text),
  );
  return [
    missing.length === 0
      ? ok(`${idPrefix}.tags`, `Tag richiesti presenti (${tags.map((t) => `<${t}>`).join(', ')})`)
      : ko(
          `${idPrefix}.tags`,
          `Tag richiesti presenti (${tags.map((t) => `<${t}>`).join(', ')})`,
          `mancanti: ${missing.map((t) => `<${t}>`).join(', ')}`,
        ),
    unclosed.length === 0
      ? ok(`${idPrefix}.balanced`, 'Tag chiusi correttamente')
      : ko(
          `${idPrefix}.balanced`,
          'Tag chiusi correttamente',
          `senza chiusura: ${unclosed.map((t) => `<${t}>`).join(', ')}`,
        ),
  ];
}

/**
 * The system instruction demands one blank line between top-level sections and
 * forbids concatenating tags on one line. Only the second half is decidable
 * without knowing the tag hierarchy, so that is all we check.
 */
function checkNoConcatenatedTags(text: string, tags: string[], idPrefix: string): ConformanceCheck {
  const label = 'Nessun tag di primo livello concatenato sulla stessa riga';
  for (const raw of text.split('\n')) {
    const opens = tags.filter((t) => raw.includes(`<${t}>`));
    if (opens.length > 1) {
      return ko(`${idPrefix}.spacing`, label, raw.trim().slice(0, 120));
    }
  }
  return ok(`${idPrefix}.spacing`, label);
}

// --- anonymization placeholders (universal constraint) --------------------

// The meta-prompt states: "VINCOLO UNIVERSALE: NON modificare mai i segnaposto
// di anonimizzazione come [EMAIL_X], [TELEFONO_X]". Those placeholders carry the
// user's real PII in the restore map, so a mangled one silently breaks the
// privacy promise: the value can no longer be restored. Nothing verified this.
//
// Note the inverse of the usual worry: a well-formed placeholder is CORRECT and
// must never be reported (the previous linter flagged them, which is defect ⑤
// of the audit). Only a CORRUPTED one is a violation.
const ANON_PREFIXES = 'EMAIL|TELEFONO|CARTA|CCV|MANUALE';
// `_X`/`_N` are allowed because the meta-prompt itself uses that generic form,
// and a generated prompt may legitimately echo it when restating the rule.
const ANON_WELL_FORMED = new RegExp(`^\\[(?:${ANON_PREFIXES})_(?:\\d+|X|N)\\]$`);
const ANON_LOOSE = new RegExp(`\\[\\s*(?:${ANON_PREFIXES})[^\\]]*\\]`, 'gi');

function checkAnonymizationIntact(text: string): ConformanceCheck {
  const label = 'Segnaposto di anonimizzazione non alterati';
  for (const m of text.matchAll(ANON_LOOSE)) {
    if (!ANON_WELL_FORMED.test(m[0])) {
      return ko('anon.intact', label, m[0].slice(0, 120));
    }
  }
  return ok('anon.intact', label);
}

// XML tags belonging to the other flows. Checking this closed list instead of a
// generic `<\w+>` avoids flagging code snippets, generics or HTML samples.
const FOREIGN_XML_TAGS = [
  'role',
  'context',
  'goal',
  'output_format',
  'system',
  'workspace_context',
  'primary_task',
  'collaboration_rules',
  'instructions',
];

// --- Chat ------------------------------------------------------------------

const CHAT_TAGS = ['role', 'context', 'goal', 'output_format'];

export function checkChat(text: string): ConformanceResult {
  return result('chat', [
    ...checkTagPairs(text, CHAT_TAGS, 'chat'),
    checkNoConcatenatedTags(text, CHAT_TAGS, 'chat'),
    checkAnonymizationIntact(text),
  ]);
}

// --- Cowork ----------------------------------------------------------------

const COWORK_TAGS = ['system', 'workspace_context', 'primary_task', 'collaboration_rules'];

export function checkCowork(text: string): ConformanceResult {
  return result('cowork', [
    ...checkTagPairs(text, COWORK_TAGS, 'cowork'),
    checkNoConcatenatedTags(text, COWORK_TAGS, 'cowork'),
    checkAnonymizationIntact(text),
  ]);
}

// --- Code (FLOW_CODE_INSTRUCTIONS, rules 1/4/5/6/9/10) ---------------------

// Rule 1 forbids formatting LOCAL FILES as Markdown links. A link to real
// external documentation is legitimate, so we only flag links whose text looks
// like a file or path — which is what the rule's own example shows.
const FILE_LINK_RE = /\[[^\]\n]*(?:\.[a-z]{1,4}|\/)[^\]\n]*\]\([^)\n]*\)/i;

const PLACEHOLDER_RE = /\[TODO\]|\[DA COMPLETARE\]|\[INSERIRE[^\]]*\]|<INSERIRE[^>]*>|<DA [^>]*>/i;

// Rule 6 requires the generated prompt to FORBID placeholders, so a conformant
// prompt routinely NAMES them: "è VIETATO inserire placeholder come '[TODO]'".
// Naming is not using. Without this distinction the check fires on the very
// prompts that obey the rule — a false positive found by the eval harness on
// its first live run.
const PROHIBITION_RE = /vietat|proibit|non\s+(?:usare|inserire|includere|lasciare)|mai\s+(?:usare|inserire)|divieto|evita/i;

/** True when the match is wrapped in quotes or backticks, i.e. cited verbatim. */
function isQuoted(line: string, start: number, length: number): boolean {
  const before = line[start - 1];
  const after = line[start + length];
  return (
    (before === "'" && after === "'") ||
    (before === '"' && after === '"') ||
    (before === '`' && after === '`')
  );
}

/** First placeholder actually USED as content, ignoring the ones merely cited. */
function findUsedPlaceholder(text: string): string | undefined {
  for (const line of text.split('\n')) {
    if (PROHIBITION_RE.test(line)) continue;
    const m = line.match(PLACEHOLDER_RE);
    if (!m || m.index === undefined) continue;
    if (isQuoted(line, m.index, m[0].length)) continue;
    return m[0].slice(0, 120);
  }
  return undefined;
}

export function checkCode(text: string): ConformanceResult {
  const checks: ConformanceCheck[] = [];

  const firstLine = lines(text)[0] ?? '';
  checks.push(
    /^##\s*Contesto del progetto/i.test(firstLine)
      ? ok('code.contextFirst', 'Inizia con "## Contesto del progetto"')
      : ko('code.contextFirst', 'Inizia con "## Contesto del progetto"', firstLine.slice(0, 120)),
  );

  const badLink = firstMatch(text, FILE_LINK_RE);
  checks.push(
    badLink
      ? ko('code.noMarkdownLinks', 'Nessun file locale formattato come link Markdown', badLink)
      : ok('code.noMarkdownLinks', 'Nessun file locale formattato come link Markdown'),
  );

  const foreign = FOREIGN_XML_TAGS.filter((t) => new RegExp(`<${t}>`).test(text));
  checks.push(
    foreign.length === 0
      ? ok('code.noXmlTags', 'Markdown puro, nessun tag XML')
      : ko('code.noXmlTags', 'Markdown puro, nessun tag XML', foreign.map((t) => `<${t}>`).join(', ')),
  );

  const hasPlan = /^##\s.*\bpiano\b/im.test(text);
  const hasStop = /APPROVAZIONE|FERMATI|ATTEND\w+/i.test(text);
  checks.push(
    hasPlan && hasStop
      ? ok('code.planStop', 'Sezione del piano operativo con attesa di approvazione')
      : ko(
          'code.planStop',
          'Sezione del piano operativo con attesa di approvazione',
          !hasPlan ? 'sezione "## …Piano…" assente' : 'manca l\'ordine di fermarsi',
        ),
  );

  checks.push(
    /git checkout -b/.test(text)
      ? ok('code.branch', 'Ordina di lavorare su un branch separato')
      : ko('code.branch', 'Ordina di lavorare su un branch separato', 'manca "git checkout -b"'),
  );

  const placeholder = findUsedPlaceholder(text);
  checks.push(
    placeholder
      ? ko('code.noPlaceholders', 'Nessun segnaposto tipo [TODO] o <INSERIRE…>', placeholder)
      : ok('code.noPlaceholders', 'Nessun segnaposto tipo [TODO] o <INSERIRE…>'),
  );

  const hasWorkLog = /WORK_LOG/i.test(text);
  const hasLessons = /lessons\.md/i.test(text);
  checks.push(
    hasWorkLog && hasLessons
      ? ok('code.memory', 'Cita WORK_LOG e lessons.md')
      : ko(
          'code.memory',
          'Cita WORK_LOG e lessons.md',
          [!hasWorkLog && 'WORK_LOG', !hasLessons && 'lessons.md'].filter(Boolean).join(' e ') + ' non citati',
        ),
  );

  checks.push(
    /CLAUDE\.md/i.test(text)
      ? ok('code.claudeMd', 'Cita CLAUDE.md (da leggere, non modificare)')
      : ko('code.claudeMd', 'Cita CLAUDE.md (da leggere, non modificare)', 'CLAUDE.md non citato'),
  );

  const question = endsWithUserQuestion(text);
  checks.push(
    question
      ? ko('code.noUserQuestions', 'Parla solo all\'agente, nessuna domanda all\'utente', question)
      : ok('code.noUserQuestions', 'Parla solo all\'agente, nessuna domanda all\'utente'),
  );

  checks.push(checkAnonymizationIntact(text));

  return result('code', checks);
}

// --- System + User ---------------------------------------------------------

/** Lines short enough to recur innocently (headings, separators) are ignored. */
const DUP_MIN_LENGTH = 25;

export function checkSystemUser(system: string, user: string): ConformanceResult {
  const checks: ConformanceCheck[] = [];

  checks.push(
    user.trim().length > 0
      ? ok('sysusr.userNotEmpty', 'Lo User Prompt non è vuoto')
      : ko('sysusr.userNotEmpty', 'Lo User Prompt non è vuoto', 'campo vuoto'),
  );

  const systemLines = new Set(lines(system).filter((l) => l.length >= DUP_MIN_LENGTH));
  const duplicated = lines(user).find((l) => l.length >= DUP_MIN_LENGTH && systemLines.has(l));
  checks.push(
    duplicated
      ? ko('sysusr.noDuplication', 'Nessun contenuto identico duplicato nei due campi', duplicated.slice(0, 120))
      : ok('sysusr.noDuplication', 'Nessun contenuto identico duplicato nei due campi'),
  );

  checks.push(checkAnonymizationIntact(`${system}\n${user}`));

  return result('systemUser', checks);
}

// --- Gemini instruction file (FLOW_GEMINI_INSTRUCTIONS, rules 2/4/9) -------

const SELF_REFERENCE_RE = /\b(?:quest[oa]|il presente|in questo)\s+(?:file\s+)?GEMINI\.md/i;

// Rule 4 names these as the anti-pattern to avoid ("MAI frasi generiche").
const GENERIC_PHRASE_RE = /scriv\w+ codice pulito|testa le tue modifiche|segui le best practice\b/i;

// Rule 5 asks for a "comando concreto ed eseguibile (es. `npm test`)". The
// backticks are in the EXAMPLE, not in the requirement — an earlier version of
// this check demanded them and reported perfectly good files as violations:
//
//     ## Build & Test Commands
//     - Build: cargo build --release
//     - Test: cargo test
//
// Two ways to recognise a command, and both must be accepted:
//  1. inside backticks, where the fences already declare "this is code", so a
//     generic runner-plus-argument shape is enough;
//  2. in plain prose, where that shape is indistinguishable from ordinary text
//     ("follow standard guidelines" has it too) — so we require a known runner.
//     A whitelist is narrow by design: a missed runner costs one false negative,
//     a loose pattern costs trust in every number the harness produces.
const COMMAND_IN_BACKTICKS_RE = /`[a-z][\w.-]*(?:\s+[\w.:/@=-]+)+`/;

const KNOWN_RUNNERS = [
  'npm', 'pnpm', 'yarn', 'bun', 'npx', 'node', 'deno',
  'cargo', 'rustc', 'clippy',
  'go', 'make', 'cmake', 'gradle', 'mvn', 'dotnet', 'swift',
  'python', 'python3', 'uv', 'pip', 'poetry', 'pytest', 'ruff', 'black', 'mypy', 'tox',
  'tsc', 'vitest', 'jest', 'eslint', 'prettier', 'biome',
  'docker', 'kubectl', 'terraform',
  'ruby', 'bundle', 'rake', 'composer', 'php', 'dart', 'flutter',
].join('|');

const BARE_COMMAND_RE = new RegExp(`\\b(?:${KNOWN_RUNNERS})\\s+[\\w.:/@=-]+`, 'i');

export function checkGemini(text: string): ConformanceResult {
  const checks: ConformanceCheck[] = [];

  const selfRef = firstMatch(text, SELF_REFERENCE_RE);
  checks.push(
    selfRef
      ? ko('gemini.noSelfReference', 'Non si auto-referenzia col nome del file', selfRef)
      : ok('gemini.noSelfReference', 'Non si auto-referenzia col nome del file'),
  );

  checks.push(
    /^##\s+\S/m.test(text)
      ? ok('gemini.headings', 'Struttura in heading Markdown')
      : ko('gemini.headings', 'Struttura in heading Markdown', 'nessun heading "## "'),
  );

  const command = firstMatch(text, COMMAND_IN_BACKTICKS_RE) ?? firstMatch(text, BARE_COMMAND_RE);
  checks.push(
    command
      ? ok('gemini.concreteCommands', 'Contiene almeno un comando concreto ed eseguibile')
      : ko('gemini.concreteCommands', 'Contiene almeno un comando concreto ed eseguibile', 'nessun comando trovato'),
  );

  const generic = firstMatch(text, GENERIC_PHRASE_RE);
  checks.push(
    generic
      ? ko('gemini.noGenericPhrases', 'Nessuna frase generica non verificabile', generic)
      : ok('gemini.noGenericPhrases', 'Nessuna frase generica non verificabile'),
  );

  const question = endsWithUserQuestion(text);
  checks.push(
    question
      ? ko('gemini.noUserQuestions', 'Parla solo all\'agente, nessuna domanda all\'utente', question)
      : ok('gemini.noUserQuestions', 'Parla solo all\'agente, nessuna domanda all\'utente'),
  );

  checks.push(checkAnonymizationIntact(text));

  return result('gemini', checks);
}

// --- Scaffold: the "Progetto" section Gemini fills in ----------------------

// SCAFFOLD_PROGETTO_INSTRUCTIONS demands exactly these second-level headings.
const SCAFFOLD_SECTIONS = [
  'Contesto',
  'Scelte architetturali vincolanti',
  'Organizzazione del codice',
  'Comandi del progetto',
  'Profilo di piattaforma',
];

export function checkScaffoldProject(progetto: string): ConformanceResult {
  const missing = SCAFFOLD_SECTIONS.filter(
    (s) => !new RegExp(`^##\\s+${s}\\b`, 'im').test(progetto),
  );
  return result('scaffold', [
    missing.length === 0
      ? ok('scaffold.sections', 'Tutte le sottosezioni richieste sono presenti')
      : ko('scaffold.sections', 'Tutte le sottosezioni richieste sono presenti', `mancanti: ${missing.join(', ')}`),
    /\bGate\b/.test(progetto)
      ? ok('scaffold.gate', 'Definisce il comando di Gate')
      : ko('scaffold.gate', 'Definisce il comando di Gate', 'la parola "Gate" non compare'),
    checkAnonymizationIntact(progetto),
  ]);
}
