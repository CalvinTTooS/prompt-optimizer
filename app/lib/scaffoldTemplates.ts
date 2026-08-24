import { SCAFFOLD_TEMPLATE } from '../constants/scaffoldTemplate';

/** Heading that opens the empty "to be filled" project section in the template. */
export const PROGETTO_MARKER = '# Progetto — DA COMPILARE';

export type ScaffoldFileKey =
  | 'CLAUDE.md'
  | 'GEMINI.md'
  | 'METHOD.md'
  | 'profiles/desktop.md'
  | 'profiles/android.md'
  | 'profiles/web.md';

export interface EditableFile {
  key: ScaffoldFileKey;
  label: string;
  type: 'preamble' | 'whole';
}

export const SCAFFOLD_EDITABLE_FILES: EditableFile[] = [
  { key: 'CLAUDE.md', label: 'CLAUDE.md (regole)', type: 'preamble' },
  { key: 'GEMINI.md', label: 'GEMINI.md (regole)', type: 'preamble' },
  { key: 'METHOD.md', label: 'METHOD.md (metodologia)', type: 'whole' },
  { key: 'profiles/desktop.md', label: 'Profilo Desktop', type: 'whole' },
  { key: 'profiles/android.md', label: 'Profilo Android', type: 'whole' },
  { key: 'profiles/web.md', label: 'Profilo Web', type: 'whole' },
];

function fileType(key: ScaffoldFileKey): 'preamble' | 'whole' {
  const f = SCAFFOLD_EDITABLE_FILES.find((e) => e.key === key);
  return f ? f.type : 'whole';
}

/** The editable unit's default text: preamble (before the marker) for
 *  CLAUDE/GEMINI, the whole file for the others. */
export function defaultEditableContent(key: ScaffoldFileKey): string {
  const full = SCAFFOLD_TEMPLATE[key];
  if (fileType(key) === 'preamble') {
    const i = full.indexOf(PROGETTO_MARKER);
    return i === -1 ? full : full.slice(0, i);
  }
  return full;
}

/** Reassembles a file from its editable content + the model-filled project
 *  section (preamble type) or verbatim (whole type). */
export function assembleFile(key: ScaffoldFileKey, editable: string, filledProgetto: string): string {
  if (fileType(key) === 'preamble') {
    return `${editable}# Progetto\n\n${filledProgetto.trim()}\n`;
  }
  return editable;
}
