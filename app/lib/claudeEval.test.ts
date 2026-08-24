import { describe, it, expect } from 'vitest';
import { EVAL_VERDICTS, buildEvalMessage, parseEvalResult, buildEvalPairMessage } from './claudeEval';

describe('EVAL_VERDICTS', () => {
  it('espone i tre livelli', () => {
    expect([...EVAL_VERDICTS]).toEqual(['solido', 'migliorabile', 'da-rivedere']);
  });
});

describe('buildEvalMessage', () => {
  it('include criteri, separatore e prompt', () => {
    const m = buildEvalMessage('PROMPT_X');
    expect(m).toContain('VALUTI');
    expect(m).toContain('--- PROMPT DA VALUTARE ---');
    expect(m).toContain('PROMPT_X');
  });
});

describe('parseEvalResult', () => {
  it('estrae verdict/suggestion/items da JSON pulito', () => {
    const raw = '{"verdict":"solido","suggestion":"ok","items":[{"criterion":"Obiettivo","ok":true,"note":"chiaro"}]}';
    expect(parseEvalResult(raw)).toEqual({
      verdict: 'solido',
      suggestion: 'ok',
      items: [{ criterion: 'Obiettivo', ok: true, note: 'chiaro' }],
    });
  });

  it('scarta un preambolo prima dell oggetto JSON', () => {
    const raw = 'Ecco:\n{"verdict":"migliorabile","suggestion":"s","items":[]}\n';
    expect(parseEvalResult(raw).verdict).toBe('migliorabile');
  });

  it('verdict sconosciuto → migliorabile', () => {
    const raw = '{"verdict":"BOH","suggestion":"","items":[]}';
    expect(parseEvalResult(raw).verdict).toBe('migliorabile');
  });

  it('items mancante → [] e ok coerced a booleano', () => {
    const raw = '{"verdict":"solido","suggestion":"s"}';
    expect(parseEvalResult(raw).items).toEqual([]);
    const raw2 = '{"verdict":"solido","items":[{"criterion":"C","ok":1,"note":"n"}]}';
    expect(parseEvalResult(raw2).items[0].ok).toBe(true);
  });

  it('lancia se manca verdict', () => {
    expect(() => parseEvalResult('{"suggestion":"s"}')).toThrow();
  });
});

describe('buildEvalPairMessage', () => {
  it('include entrambi i testi', () => {
    const m = buildEvalPairMessage('SYS', 'USR');
    expect(m).toContain('SYS'); expect(m).toContain('USR');
    expect(m).toContain('--- SYSTEM DA VALUTARE ---');
    expect(m).toContain('--- USER DA VALUTARE ---');
  });
});
