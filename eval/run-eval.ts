// Manual best-practice evaluation runner.
//
// Runs each case in ./prompts.ts through its flow(s) using the REAL app
// meta-prompts and schemas (imported from ../app), calling Gemini live, and
// writes every response to a markdown log for review + best-practice scoring.
//
// Usage: set GEMINI_API_KEY (env or .env.local), then:
//   npx tsx eval/run-eval.ts
// Optional: EVAL_MODEL=gemini-2.5-flash (defaults to gemini-flash-latest).
//
// The API key is read from the environment / .env.local and never printed.

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
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
  parseOptimizerResponse,
  type OptimizerFlows,
} from '../app/lib/promptOptimizer';
import { buildScaffold } from '../app/lib/scaffoldBuilder';

function loadApiKey(): string {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (existsSync('.env.local')) {
    const m = readFileSync('.env.local', 'utf8').match(/^\s*GEMINI_API_KEY\s*=\s*(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('GEMINI_API_KEY non impostata (variabile d\'ambiente o riga in .env.local).');
}

const API_KEY = loadApiKey();
const MODEL = process.env.EVAL_MODEL || 'gemini-flash-latest';
// Optional filters: EVAL_FLOW=chat runs only cases for that flow;
// EVAL_ONLY=id1,id2 runs only the listed case ids (e.g. to retry failures).
const ONLY_FLOW = process.env.EVAL_FLOW as EvalFlow | undefined;
const ONLY_IDS = (process.env.EVAL_ONLY ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
// Free-tier Gemini is rate-limited (~5 requests/min). Pace calls to stay under
// it; override with EVAL_SLEEP_MS=0 on a paid key.
const SLEEP_MS = Number(process.env.EVAL_SLEEP_MS ?? 13000);
const genAI = new GoogleGenerativeAI(API_KEY);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Mirror of the systemInstruction wrapper in usePromptOptimizer.handleOptimize.
// Keep in sync; the substantive per-flow content comes from the real FLOW_*
// constants imported above.
function buildSystemInstruction(tasks: string[]): string {
  return `Sei un esperto Prompt Engineer. Devi generare versioni ottimizzate dello stesso prompt in base ai flussi richiesti.

      Esegui ESATTAMENTE i flussi di lavoro specificati qui sotto:
      ${tasks.join('\n')}

      VINCOLO UNIVERSALE: NON modificare mai i segnaposto di anonimizzazione come [EMAIL_X], [TELEFONO_X].

      Nel campo "spiegazione" fornisci una breve spiegazione delle migliorie apportate in base ai formati richiesti.`;
}

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

async function runOptimizerFlow(flow: OptFlow, input: string): Promise<string> {
  const flows: OptimizerFlows = {
    genChat: false,
    genCowork: false,
    genCode: false,
    genSystemUser: false,
    genGemini: false,
  };
  flows[FLOW_FLAG[flow]] = true;

  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: 'application/json', responseSchema: buildResponseSchema(flows) },
  });
  const chat = model.startChat();
  const response = await chat.sendMessage([buildSystemInstruction([FLOW_INSTR[flow]]), input]);
  const finishReason = response.response.candidates?.[0]?.finishReason;
  const parsed = parseOptimizerResponse({ text: response.response.text(), finishReason });

  const parts: string[] = [`_Spiegazione:_ ${parsed.spiegazione}`];
  if (parsed.promptChat) parts.push(`\n**Prompt Chat:**\n\n\`\`\`\n${parsed.promptChat}\n\`\`\``);
  if (parsed.promptCowork) parts.push(`\n**Prompt Cowork:**\n\n\`\`\`\n${parsed.promptCowork}\n\`\`\``);
  if (parsed.promptCode) parts.push(`\n**Prompt Code:**\n\n\`\`\`\n${parsed.promptCode}\n\`\`\``);
  if (parsed.promptSystem) parts.push(`\n**System Prompt:**\n\n\`\`\`\n${parsed.promptSystem}\n\`\`\``);
  if (parsed.promptUser) parts.push(`\n**User Prompt:**\n\n\`\`\`\n${parsed.promptUser}\n\`\`\``);
  if (parsed.promptGemini) parts.push(`\n**GEMINI.md:**\n\n\`\`\`\n${parsed.promptGemini}\n\`\`\``);
  return parts.join('\n');
}

async function runScaffold(input: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: 'application/json', responseSchema: buildScaffoldSchema() },
  });
  const chat = model.startChat();
  const response = await chat.sendMessage([SCAFFOLD_PROGETTO_INSTRUCTIONS, input]);
  const finishReason = response.response.candidates?.[0]?.finishReason;
  const { progetto } = parseOptimizerResponse<{ progetto: string }>({ text: response.response.text(), finishReason });
  const files = buildScaffold(progetto);
  const claude = files['CLAUDE.md'];
  return [
    `_Sezione Progetto generata da Gemini (il resto è verbatim dal template):_\n\n\`\`\`markdown\n${progetto}\n\`\`\``,
    `\n_CLAUDE.md assemblato (${claude.split('\n').length} righe):_\n\n\`\`\`markdown\n${claude}\n\`\`\``,
  ].join('\n');
}

async function main() {
  const started = new Date();
  const lines: string[] = [
    `# Eval best-practice — log risposte`,
    ``,
    `Modello: \`${MODEL}\` · Casi: ${EVAL_CASES.length} · Avvio: ${started.toISOString()}`,
    ``,
    `> Ogni sezione: prompt di input + flusso + risposta reale di Gemini. Da valutare contro \`docs/prompt-engineering-best-practices.md\`.`,
    ``,
  ];

  const caseWanted = (c: EvalCase) => ONLY_IDS.length === 0 || ONLY_IDS.includes(c.id);
  const matches = (flow: EvalFlow) => !ONLY_FLOW || flow === ONLY_FLOW;
  const cases = EVAL_CASES.filter(caseWanted);
  const total = cases.reduce((s, c) => s + c.flows.filter(matches).length, 0);
  let n = 0;
  for (const c of cases) {
    for (const flow of c.flows) {
      if (!matches(flow)) continue;
      n += 1;
      if (n > 1 && SLEEP_MS > 0) await sleep(SLEEP_MS);
      process.stdout.write(`[${n}/${total}] ${c.id} (${flow})... `);
      lines.push(`---`, ``, `## ${c.id} — ${c.title}  ·  flusso: \`${flow}\``, ``, `**Input:**`, ``, `> ${c.input}`, ``);
      try {
        const out = flow === 'scaffold' ? await runScaffold(c.input) : await runOptimizerFlow(flow, c.input);
        lines.push(out, ``);
        process.stdout.write('ok\n');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        lines.push(`**ERRORE:** ${msg}`, ``);
        process.stdout.write(`ERRORE: ${msg}\n`);
      }
    }
  }

  mkdirSync('eval/output', { recursive: true });
  const stamp = started.toISOString().replace(/[:.]/g, '-');
  const path = `eval/output/eval-log-${stamp}.md`;
  writeFileSync(path, lines.join('\n'));
  writeFileSync('eval/output/latest.md', lines.join('\n'));
  console.log(`\nLog scritto in ${path} (e eval/output/latest.md).`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
