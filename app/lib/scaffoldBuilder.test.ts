import { describe, expect, test } from 'vitest';
import { buildScaffold } from './scaffoldBuilder';
import { SCAFFOLD_TEMPLATE } from '../constants/scaffoldTemplate';

const FILLED_PROGETTO = `## Contesto
Obiettivo: un'app di esempio.

## Comandi del progetto
- Gate: \`npm run lint && npm test\``;

describe('buildScaffold', () => {
  test('returns every file of the scaffold', () => {
    const files = buildScaffold(FILLED_PROGETTO);

    expect(Object.keys(files).sort()).toEqual([
      'CLAUDE.md',
      'GEMINI.md',
      'METHOD.md',
      'profiles/android.md',
      'profiles/desktop.md',
      'profiles/web.md',
    ]);
  });

  test('CLAUDE.md keeps the verbatim operational rules but replaces the empty Progetto section with the filled one', () => {
    const files = buildScaffold(FILLED_PROGETTO);

    // Operational part preserved verbatim.
    expect(files['CLAUDE.md']).toContain("## Regola d'oro");
    expect(files['CLAUDE.md']).toContain('## Workflow — a ogni modifica');
    // Filled project content spliced in.
    expect(files['CLAUDE.md']).toContain("Obiettivo: un'app di esempio.");
    expect(files['CLAUDE.md']).toContain('# Progetto');
    // The empty placeholder heading/body is gone.
    expect(files['CLAUDE.md']).not.toContain('DA COMPILARE');
    expect(files['CLAUDE.md']).not.toContain('<cosa fa, per chi, perché>');
  });

  test('GEMINI.md gets the same filled Progetto section, keeping its own operational preamble', () => {
    const files = buildScaffold(FILLED_PROGETTO);

    expect(files['GEMINI.md']).toContain('Precedenza Antigravity');
    expect(files['GEMINI.md']).toContain("Obiettivo: un'app di esempio.");
    expect(files['GEMINI.md']).not.toContain('DA COMPILARE');
  });

  test('METHOD.md and the platform profiles are passed through verbatim', () => {
    const files = buildScaffold(FILLED_PROGETTO);

    expect(files['METHOD.md']).toBe(SCAFFOLD_TEMPLATE['METHOD.md']);
    expect(files['profiles/desktop.md']).toBe(SCAFFOLD_TEMPLATE['profiles/desktop.md']);
    expect(files['profiles/android.md']).toBe(SCAFFOLD_TEMPLATE['profiles/android.md']);
    expect(files['profiles/web.md']).toBe(SCAFFOLD_TEMPLATE['profiles/web.md']);
  });
});
