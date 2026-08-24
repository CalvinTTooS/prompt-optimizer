import { CLAUDE_EVAL_INSTRUCTIONS, CLAUDE_EVAL_PAIR_INSTRUCTIONS } from '../constants/prompts';

export const EVAL_VERDICTS = ['solido', 'migliorabile', 'da-rivedere'] as const;
export type EvalVerdict = (typeof EVAL_VERDICTS)[number];

export interface EvalItem { criterion: string; ok: boolean; note: string }
export interface EvalResult { verdict: EvalVerdict; suggestion: string; items: EvalItem[] }

export function buildEvalMessage(variantText: string): string {
  return `${CLAUDE_EVAL_INSTRUCTIONS}\n\n--- PROMPT DA VALUTARE ---\n${variantText}`;
}

/** Estrae il primo oggetto JSON da una stringa che può contenere preamboli
 *  iniettati dall'output-style del CLI. */
function extractEvalObject(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first === -1 || last <= first) {
      throw new Error('Nessun oggetto JSON trovato nella risposta di Claude');
    }
    return JSON.parse(text.slice(first, last + 1));
  }
}

function normalizeVerdict(v: unknown): EvalVerdict {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  return (EVAL_VERDICTS as readonly string[]).includes(s) ? (s as EvalVerdict) : 'migliorabile';
}

function normalizeItems(raw: unknown): EvalItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((it) => ({
    criterion: typeof it?.criterion === 'string' ? it.criterion : '',
    ok: Boolean(it?.ok),
    note: typeof it?.note === 'string' ? it.note : '',
  }));
}

export function parseEvalResult(text: string): EvalResult {
  const obj = extractEvalObject(text);
  if (obj.verdict === undefined) {
    throw new Error('Oggetto valutazione malformato: manca "verdict"');
  }
  return {
    verdict: normalizeVerdict(obj.verdict),
    suggestion: typeof obj.suggestion === 'string' ? obj.suggestion : '',
    items: normalizeItems(obj.items),
  };
}

export function buildEvalPairMessage(systemText: string, userText: string): string {
  return `${CLAUDE_EVAL_PAIR_INSTRUCTIONS}\n\n--- SYSTEM DA VALUTARE ---\n${systemText}\n\n--- USER DA VALUTARE ---\n${userText}`;
}
