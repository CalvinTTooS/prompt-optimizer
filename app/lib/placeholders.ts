// Fill-in placeholders: the tokens the user replaces before using a prompt.
//
// Two conventions coexist, for a reason worth stating:
//
//  - `{{NOME}}` is the DECLARED one. The meta-prompt asks for it and the refine
//    instructions require it. Double braces cannot collide with Markdown links
//    or with array indexing in code samples, so detection is unambiguous.
//  - `[NOME]` is LEGACY. Nothing ever asked models to emit it; the fill-in
//    feature grew around a habit they happened to have. It is still accepted so
//    that prompts generated before the convention was written down keep working.
//
// Anonymization placeholders (`[EMAIL_1]`, `[TELEFONO_2]`, …) are deliberately
// excluded: they already carry a value and are restored automatically, so
// offering them for editing would invite the user to break the restore map.

/** Prefixes reserved by app/lib/anonymization.ts — never fill-in fields. */
const ANON_PREFIXES = 'EMAIL|TELEFONO|CARTA|CCV|MANUALE';

const CURLY_RE = /\{\{[^{}\n]+\}\}/g;

// Square form, minus the anonymization prefixes. The trailing `(?!\()` drops
// Markdown links: `[main.py](http://…)` is a link, not a field to fill in.
const SQUARE_RE = new RegExp(`\\[(?!(?:${ANON_PREFIXES})_\\d)[^\\[\\]\\n]+\\](?!\\()`, 'g');

/**
 * Every distinct placeholder appearing in the given texts, in order of first
 * appearance. Undefined entries are ignored, so callers can pass optional
 * fields straight from the optimizer result.
 *
 * Derive these at render time from the CURRENT texts rather than snapshotting
 * them once: refining a prompt rewrites it, and a snapshot taken before that
 * leaves the new placeholders unreachable from the fill-in form.
 */
export function extractPlaceholders(texts: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const re of [CURLY_RE, SQUARE_RE]) {
      for (const m of text.match(re) ?? []) seen.add(m);
    }
  }
  return [...seen];
}
