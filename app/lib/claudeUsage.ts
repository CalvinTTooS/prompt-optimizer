/** Consumo di una singola chiamata `claude -p`, estratto dall'envelope esterno
 *  JSON del CLI (`{ total_cost_usd, usage: { input_tokens, output_tokens }, … }`).
 *  Nota: refine/eval parsano il campo `result` interno; qui invece leggiamo i
 *  metadati dell'envelope, che altrimenti verrebbero ignorati. */
export interface CallUsage {
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
}

/** Totali cumulati di sessione (in-memory, azzerati al riavvio) + ultima chiamata. */
export interface UsageTotals {
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  callCount: number;
  last: CallUsage | null;
}

export const EMPTY_USAGE: UsageTotals = {
  totalCostUsd: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  callCount: 0,
  last: null,
};

/** Somma una chiamata ai totali (funzione pura, per l'updater dell'hook). */
export function accumulateUsage(prev: UsageTotals, call: CallUsage): UsageTotals {
  return {
    totalCostUsd: prev.totalCostUsd + call.costUsd,
    totalInputTokens: prev.totalInputTokens + call.inputTokens,
    totalOutputTokens: prev.totalOutputTokens + call.outputTokens,
    callCount: prev.callCount + 1,
    last: call,
  };
}
