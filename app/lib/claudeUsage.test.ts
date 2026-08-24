import { describe, it, expect } from 'vitest';
import { accumulateUsage, EMPTY_USAGE } from './claudeUsage';

describe('accumulateUsage', () => {
  it('somma una chiamata ai totali e aggiorna last/callCount', () => {
    const t1 = accumulateUsage(EMPTY_USAGE, { costUsd: 0.03, inputTokens: 10, outputTokens: 100 });
    expect(t1).toEqual({ totalCostUsd: 0.03, totalInputTokens: 10, totalOutputTokens: 100, callCount: 1, last: { costUsd: 0.03, inputTokens: 10, outputTokens: 100 } });
    const t2 = accumulateUsage(t1, { costUsd: 0.02, inputTokens: 5, outputTokens: 50 });
    expect(t2.callCount).toBe(2);
    expect(t2.totalCostUsd).toBeCloseTo(0.05);
    expect(t2.totalOutputTokens).toBe(150);
    expect(t2.last).toEqual({ costUsd: 0.02, inputTokens: 5, outputTokens: 50 });
  });
});
