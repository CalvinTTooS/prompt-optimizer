import { CLAUDE_REFINE_INSTRUCTIONS, CLAUDE_REFINE_PAIR_INSTRUCTIONS } from '../constants/prompts';

export const REFINE_MODELS = ['haiku', 'sonnet', 'opus'] as const;
export type RefineModel = (typeof REFINE_MODELS)[number];
export const DEFAULT_REFINE_MODEL: RefineModel = 'sonnet';
export const TIER_LABELS: Record<RefineModel, string> = {
  haiku: 'Veloce',
  sonnet: 'Bilanciato',
  opus: 'Potente',
};

export interface RefineResult { refined: string; changes: string }

export function buildRefineMessage(variantText: string): string {
  return `${CLAUDE_REFINE_INSTRUCTIONS}\n\n--- PROMPT DA RIFINIRE ---\n${variantText}`;
}

/** Estrae il primo oggetto JSON da una stringa che può contenere preamboli. */
function extractJsonObject(text: string): Record<string, unknown> {
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

export function parseRefineResult(text: string): RefineResult {
  const obj = extractJsonObject(text);
  if (typeof obj.refined !== 'string') {
    throw new Error('Oggetto rifinito malformato: manca "refined"');
  }
  return {
    refined: obj.refined,
    changes: typeof obj.changes === 'string' ? obj.changes : '',
  };
}

export interface RefinePairResult { refinedSystem: string; refinedUser: string; changes: string }

export function buildRefinePairMessage(systemText: string, userText: string): string {
  return `${CLAUDE_REFINE_PAIR_INSTRUCTIONS}\n\n--- SYSTEM DA RIFINIRE ---\n${systemText}\n\n--- USER DA RIFINIRE ---\n${userText}`;
}

export function parseRefinePairResult(text: string): RefinePairResult {
  const obj = extractJsonObject(text);
  if (typeof obj.refinedSystem !== 'string' || typeof obj.refinedUser !== 'string') {
    throw new Error('Oggetto rifinito malformato: manca "refinedSystem"/"refinedUser"');
  }
  return {
    refinedSystem: obj.refinedSystem,
    refinedUser: obj.refinedUser,
    changes: typeof obj.changes === 'string' ? obj.changes : '',
  };
}
