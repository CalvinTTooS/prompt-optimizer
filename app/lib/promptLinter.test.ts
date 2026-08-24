import { describe, it, expect } from 'vitest';
import { lintPrompt } from './promptLinter';

const rules = (t: string) => lintPrompt(t).issues.map((i) => i.rule);

describe('lintPrompt', () => {
  it('rileva follow-up quando l ultima riga è una domanda', () => {
    expect(rules('Fai X.\nVuoi che aggiunga altro?')).toContain('follow-up');
  });
  it('rileva follow-up da frase chiave a metà testo', () => {
    expect(rules('Fammi sapere se va bene.\nGenera il report.')).toContain('follow-up');
  });
  it('NON rileva follow-up con ? solo a metà e ultima riga dichiarativa', () => {
    expect(rules('Esempio: "quanti anni?"\nProduci la tabella finale.')).not.toContain('follow-up');
  });
  it('rileva placeholder {{}} e [EMAIL_1]', () => {
    expect(rules('Scrivi a {{nome}} una mail lunga e dettagliata per il progetto ora')).toContain('placeholder');
    expect(rules('Contatta [EMAIL_1] con una proposta commerciale dettagliata e chiara oggi')).toContain('placeholder');
  });
  it('length: corto sotto soglia, lungo sopra, niente in range', () => {
    expect(rules('Fai una cosa')).toContain('length');            // <15 parole
    expect(rules(Array(700).fill('parola').join(' '))).toContain('length'); // >600
    expect(rules(Array(50).fill('parola').join(' '))).not.toContain('length');
  });
  it('prompt pulito in range → nessuna issue', () => {
    expect(lintPrompt(Array(40).fill('parola').join(' ') + '.').issues).toEqual([]);
  });
  it('level corretto: length → info, follow-up → warn', () => {
    const lengthIssue = lintPrompt('Fai una cosa').issues.find((i) => i.rule === 'length');
    expect(lengthIssue?.level).toBe('info');

    const followUpIssue = lintPrompt('Fai X.\nVuoi che aggiunga altro?').issues.find((i) => i.rule === 'follow-up');
    expect(followUpIssue?.level).toBe('warn');
  });
});
