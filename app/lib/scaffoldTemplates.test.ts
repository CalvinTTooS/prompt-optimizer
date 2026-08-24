import { describe, expect, test } from 'vitest';
import { SCAFFOLD_TEMPLATE } from '../constants/scaffoldTemplate';
import {
  PROGETTO_MARKER,
  SCAFFOLD_EDITABLE_FILES,
  defaultEditableContent,
  assembleFile,
} from './scaffoldTemplates';

describe('defaultEditableContent', () => {
  test('CLAUDE.md/GEMINI.md = preambolo prima del marker (marker escluso)', () => {
    for (const key of ['CLAUDE.md', 'GEMINI.md'] as const) {
      const def = defaultEditableContent(key);
      expect(def).not.toContain(PROGETTO_MARKER);
      expect(SCAFFOLD_TEMPLATE[key].startsWith(def)).toBe(true);
    }
  });
  test('METHOD.md e profili = file intero', () => {
    expect(defaultEditableContent('METHOD.md')).toBe(SCAFFOLD_TEMPLATE['METHOD.md']);
    expect(defaultEditableContent('profiles/web.md')).toBe(SCAFFOLD_TEMPLATE['profiles/web.md']);
  });
});

describe('assembleFile', () => {
  test('preamble: preambolo + sezione Progetto compilata', () => {
    const out = assembleFile('CLAUDE.md', 'REGOLE\n\n', '  ## Contesto\nX  ');
    expect(out).toBe('REGOLE\n\n# Progetto\n\n## Contesto\nX\n');
  });
  test('whole: contenuto invariato', () => {
    expect(assembleFile('METHOD.md', 'CONTENUTO', 'ignorato')).toBe('CONTENUTO');
  });
});

describe('SCAFFOLD_EDITABLE_FILES', () => {
  test('elenca le 6 chiavi con il tipo giusto', () => {
    expect(SCAFFOLD_EDITABLE_FILES.map((f) => f.key)).toEqual([
      'CLAUDE.md', 'GEMINI.md', 'METHOD.md',
      'profiles/desktop.md', 'profiles/android.md', 'profiles/web.md',
    ]);
    expect(SCAFFOLD_EDITABLE_FILES.filter((f) => f.type === 'preamble').map((f) => f.key))
      .toEqual(['CLAUDE.md', 'GEMINI.md']);
  });
});
