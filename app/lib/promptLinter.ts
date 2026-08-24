export type LintLevel = 'warn' | 'info';
export type LintRule = 'follow-up' | 'placeholder' | 'length';
export interface LintIssue { rule: LintRule; level: LintLevel; message: string }
export interface LintResult { issues: LintIssue[] }

export const SHORT_WORDS = 15;
export const LONG_WORDS = 600;

const FOLLOWUP_PHRASES = [
  'vuoi che', 'fammi sapere', 'vuoi una versione', 'ti serve altro',
  'posso aggiungere', 'shall i', 'would you like',
];

export function lintPrompt(text: string): LintResult {
  const issues: LintIssue[] = [];
  const lower = text.toLowerCase();

  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const lastLine = lines[lines.length - 1] ?? '';
  if (lastLine.endsWith('?') || FOLLOWUP_PHRASES.some((p) => lower.includes(p))) {
    issues.push({
      rule: 'follow-up',
      level: 'warn',
      message: 'Contiene una domanda di follow-up all\'utente: un prompt di produzione dovrebbe essere autosufficiente.',
    });
  }

  const hasCurly = /\{\{[^}]+\}\}/.test(text);
  const hasAnon = /\[[A-Z]+_\d+\]/.test(text);
  if (hasCurly || hasAnon) {
    const kinds = [hasCurly ? '{{...}}' : '', hasAnon ? '[XXX_N]' : ''].filter(Boolean).join(' e ');
    issues.push({ rule: 'placeholder', level: 'warn', message: `Segnaposto non risolti (${kinds}) nel testo.` });
  }

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words < SHORT_WORDS) {
    issues.push({ rule: 'length', level: 'info', message: `Molto corto (${words} parole): forse sotto-specificato.` });
  } else if (words > LONG_WORDS) {
    issues.push({ rule: 'length', level: 'info', message: `Molto lungo (${words} parole).` });
  }

  return { issues };
}
