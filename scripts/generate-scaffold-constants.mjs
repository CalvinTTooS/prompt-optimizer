// Generates app/constants/scaffoldTemplate.ts from the canonical template files
// in app/scaffold-template/. The app is a static export and cannot read these
// files from disk at runtime, so their content is embedded as string constants.
// Source of truth stays the .md files; regenerate after editing them.
//
// Run: node scripts/generate-scaffold-constants.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const templateDir = 'app/scaffold-template';

// Order is intentional: maps directly to the file set written to a project root.
const files = {
  'CLAUDE.md': join(templateDir, 'CLAUDE.md'),
  'GEMINI.md': join(templateDir, 'GEMINI.md'),
  'METHOD.md': join(templateDir, 'METHOD.md'),
  'profiles/desktop.md': join(templateDir, 'profiles/desktop.md'),
  'profiles/android.md': join(templateDir, 'profiles/android.md'),
  'profiles/web.md': join(templateDir, 'profiles/web.md'),
};

// Line endings are normalized to LF: the .md sources are read from the working
// tree, which on Windows (core.autocrlf=true) holds CRLF. Those \r\n would be
// baked into the string literals as *content* — git cannot normalize them there
// — making the output differ per platform and dirtying the repo on every build.
const read = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const entries = Object.entries(files)
  // JSON.stringify safely escapes newlines, quotes, backslashes and unicode.
  .map(([key, path]) => `  ${JSON.stringify(key)}: ${JSON.stringify(read(path))},`)
  .join('\n');

const output = `// AUTO-GENERATED — do not edit by hand.
// Source of truth: app/scaffold-template/*.md
// Regenerate with: node scripts/generate-scaffold-constants.mjs
export const SCAFFOLD_TEMPLATE: Record<string, string> = {
${entries}
};
`;

writeFileSync('app/constants/scaffoldTemplate.ts', output);
console.log('Generated app/constants/scaffoldTemplate.ts');
