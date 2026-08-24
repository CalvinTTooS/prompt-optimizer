import {
  SCAFFOLD_EDITABLE_FILES,
  assembleFile,
  defaultEditableContent,
  type ScaffoldFileKey,
} from './scaffoldTemplates';

/**
 * Assembles the full project scaffold from the model-filled project section.
 * `editable` overrides the per-file editable content (preamble for CLAUDE/GEMINI,
 * whole file otherwise); missing keys fall back to the baked-in default, so
 * `buildScaffold(progetto)` reproduces the original behavior.
 */
export function buildScaffold(
  filledProgetto: string,
  editable: Partial<Record<ScaffoldFileKey, string>> = {},
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key } of SCAFFOLD_EDITABLE_FILES) {
    const content = editable[key] ?? defaultEditableContent(key);
    out[key] = assembleFile(key, content, filledProgetto);
  }
  return out;
}
