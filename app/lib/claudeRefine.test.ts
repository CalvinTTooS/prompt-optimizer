import { describe, it, expect } from 'vitest';
import {
  REFINE_MODELS,
  DEFAULT_REFINE_MODEL,
  TIER_LABELS,
  buildRefineMessage,
  parseRefineResult,
  buildRefinePairMessage,
  parseRefinePairResult,
} from './claudeRefine';

describe('REFINE_MODELS', () => {
  it('espone haiku/sonnet/opus con sonnet come default', () => {
    expect([...REFINE_MODELS]).toEqual(['haiku', 'sonnet', 'opus']);
    expect(DEFAULT_REFINE_MODEL).toBe('sonnet');
  });
  it('TIER_LABELS mappa ogni modello alla sua etichetta neutra', () => {
    expect(TIER_LABELS).toEqual({ haiku: 'Veloce', sonnet: 'Bilanciato', opus: 'Potente' });
    expect(Object.keys(TIER_LABELS).sort()).toEqual([...REFINE_MODELS].sort());
  });
});

describe('buildRefineMessage', () => {
  it('include istruzioni e prompt sotto un separatore', () => {
    const msg = buildRefineMessage('PROMPT_X');
    expect(msg).toContain('Vincoli');
    expect(msg).toContain('PROMPT_X');
    expect(msg).toContain('--- PROMPT DA RIFINIRE ---');
  });
});

describe('parseRefineResult', () => {
  it('estrae refined e changes da testo JSON pulito', () => {
    const raw = '{"refined":"R","changes":"C"}';
    expect(parseRefineResult(raw)).toEqual({ refined: 'R', changes: 'C' });
  });

  it('scarta un preambolo prima dell oggetto JSON', () => {
    const raw = 'Ecco il risultato:\n\n{"refined":"R2","changes":"C2"}\n';
    expect(parseRefineResult(raw)).toEqual({ refined: 'R2', changes: 'C2' });
  });

  it('tollera changes mancante restituendo stringa vuota', () => {
    const raw = '{"refined":"solo refined"}';
    expect(parseRefineResult(raw)).toEqual({ refined: 'solo refined', changes: '' });
  });

  it('lancia se refined non è presente', () => {
    const raw = '{"changes":"niente refined"}';
    expect(() => parseRefineResult(raw)).toThrow();
  });
});

describe('buildRefinePairMessage', () => {
  it('include entrambi i testi con i separatori', () => {
    const m = buildRefinePairMessage('SYS', 'USR');
    expect(m).toContain('SYS'); expect(m).toContain('USR');
    expect(m).toContain('--- SYSTEM DA RIFINIRE ---');
    expect(m).toContain('--- USER DA RIFINIRE ---');
  });
});
describe('parseRefinePairResult', () => {
  it('estrae refinedSystem/refinedUser/changes', () => {
    const raw = '{"refinedSystem":"S","refinedUser":"U","changes":"C"}';
    expect(parseRefinePairResult(raw)).toEqual({ refinedSystem: 'S', refinedUser: 'U', changes: 'C' });
  });
  it('scarta preambolo e tollera changes mancante', () => {
    const raw = 'Ecco:\n{"refinedSystem":"S2","refinedUser":"U2"}';
    expect(parseRefinePairResult(raw)).toEqual({ refinedSystem: 'S2', refinedUser: 'U2', changes: '' });
  });
  it('lancia se manca refinedSystem o refinedUser', () => {
    expect(() => parseRefinePairResult('{"refinedSystem":"S"}')).toThrow();
  });
});
