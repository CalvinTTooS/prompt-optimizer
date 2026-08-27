import { describe, it, expect } from 'vitest';
import {
  checkChat,
  checkCowork,
  checkCode,
  checkSystemUser,
  checkGemini,
  checkScaffoldProject,
  type ConformanceResult,
} from './conformance';

/** Helper: is a given check id passing in this result? */
const passed = (r: ConformanceResult, id: string) =>
  r.checks.find((c) => c.id === id)?.passed;

const evidence = (r: ConformanceResult, id: string) =>
  r.checks.find((c) => c.id === id)?.evidence;

// --- Chat ------------------------------------------------------------------

describe('checkChat', () => {
  const good = `<role>
Sei un divulgatore scientifico.
</role>

<context>
L'utente ha 10 anni.
</context>

<goal>
Spiegare la fotosintesi.
</goal>

<output_format>
Tre paragrafi brevi.
</output_format>`;

  it('accepts a well-formed tagged prompt', () => {
    const r = checkChat(good);
    expect(r.passed).toBe(r.total);
  });

  it('reports which required tags are missing', () => {
    const r = checkChat('<role>x</role>\n\n<goal>y</goal>');
    expect(passed(r, 'chat.tags')).toBe(false);
    expect(evidence(r, 'chat.tags')).toContain('<context>');
    expect(evidence(r, 'chat.tags')).toContain('<output_format>');
  });

  it('detects an unclosed tag', () => {
    const r = checkChat(good.replace('</goal>', ''));
    expect(passed(r, 'chat.balanced')).toBe(false);
  });

  it('flags two top-level tags concatenated on one line', () => {
    const r = checkChat('<role>a</role> <context>b</context>\n\n<goal>c</goal>\n\n<output_format>d</output_format>');
    expect(passed(r, 'chat.spacing')).toBe(false);
  });

  // Chat explicitly ALLOWS a follow-up question, unlike the agent formats.
  it('does not penalise a trailing question', () => {
    const r = checkChat(`${good}\n\nVuoi che approfondisca un aspetto?`);
    expect(r.checks.some((c) => c.id.includes('UserQuestion'))).toBe(false);
  });
});

// --- Cowork ----------------------------------------------------------------

describe('checkCowork', () => {
  it('requires the four workspace tags', () => {
    const r = checkCowork('<system>a</system>\n\n<primary_task>b</primary_task>');
    expect(passed(r, 'cowork.tags')).toBe(false);
    expect(evidence(r, 'cowork.tags')).toContain('<workspace_context>');
  });

  it('accepts a complete workspace prompt', () => {
    const r = checkCowork(
      '<system>a</system>\n\n<workspace_context>b</workspace_context>\n\n' +
        '<primary_task>c</primary_task>\n\n<collaboration_rules>d</collaboration_rules>',
    );
    expect(r.passed).toBe(r.total);
  });
});

// --- Code ------------------------------------------------------------------

describe('checkCode', () => {
  const good = `## Contesto del progetto
Il progetto vive in \`src/main.py\` e usa \`.venv/bin/python\`.
Leggi \`CLAUDE.md\` all'inizio; non modificarlo.

## Generazione del Piano Operativo
Presenta un piano numerato e FERMATI ATTENDENDO APPROVAZIONE.

## Istruzioni operative
1. Esegui \`git checkout -b feat/x\`.
2. Aggiorna \`WORK_LOG.md\` e annota le regole in \`lessons.md\`.`;

  it('accepts a conformant CLI-agent prompt', () => {
    const r = checkCode(good);
    expect(r.passed).toBe(r.total);
  });

  it('flags a local file formatted as a Markdown link', () => {
    const r = checkCode(good.replace('`src/main.py`', '[main.py](http://main.py)'));
    expect(passed(r, 'code.noMarkdownLinks')).toBe(false);
    expect(evidence(r, 'code.noMarkdownLinks')).toContain('main.py');
  });

  // A link to real external documentation is legitimate and must not be flagged.
  it('does not flag a link to external documentation', () => {
    const r = checkCode(`${good}\n\nVedi [la guida ufficiale](https://docs.python.org/3/).`);
    expect(passed(r, 'code.noMarkdownLinks')).toBe(true);
  });

  it('requires the context heading first', () => {
    const r = checkCode(good.replace('## Contesto del progetto', '## Introduzione'));
    expect(passed(r, 'code.contextFirst')).toBe(false);
  });

  it('flags XML tags borrowed from the other formats', () => {
    const r = checkCode(`${good}\n\n<role>esperto</role>`);
    expect(passed(r, 'code.noXmlTags')).toBe(false);
    expect(evidence(r, 'code.noXmlTags')).toContain('<role>');
  });

  // Code snippets must not trip the XML check.
  it('does not flag generics or HTML inside code', () => {
    const r = checkCode(`${good}\n\nUsa \`List<String>\` e un \`<div>\` contenitore.`);
    expect(passed(r, 'code.noXmlTags')).toBe(true);
  });

  it('requires the plan section and the stop instruction', () => {
    const r = checkCode(good.replace('FERMATI ATTENDENDO APPROVAZIONE', 'poi procedi'));
    expect(passed(r, 'code.planStop')).toBe(false);
  });

  it('requires a separate branch', () => {
    const r = checkCode(good.replace('git checkout -b feat/x', 'lavora su main'));
    expect(passed(r, 'code.branch')).toBe(false);
  });

  it('flags placeholder markers actually used as content', () => {
    const r = checkCode(`${good}\n\n3. [TODO] completare qui.`);
    expect(passed(r, 'code.noPlaceholders')).toBe(false);
  });

  // Rule 6 requires the prompt to FORBID placeholders, so a conformant prompt
  // names them. This exact text was produced by Gemini on the harness's first
  // live run and was wrongly flagged before the fix.
  it('does not flag placeholders named inside a prohibition', () => {
    const r = checkCode(
      `${good}\n\n4. È VIETATO inserire placeholder come '[TODO]', '<INSERIRE CONTENUTO>', '...' o simili.`,
    );
    expect(passed(r, 'code.noPlaceholders')).toBe(true);
  });

  it('does not flag a placeholder quoted in backticks', () => {
    const r = checkCode(`${good}\n\n3. Ogni sezione va sviluppata: nessun \`[TODO]\` residuo.`);
    expect(passed(r, 'code.noPlaceholders')).toBe(true);
  });

  it('requires both working-memory files', () => {
    const r = checkCode(good.replace('e annota le regole in `lessons.md`', ''));
    expect(passed(r, 'code.memory')).toBe(false);
    expect(evidence(r, 'code.memory')).toContain('lessons.md');
  });

  // Rule 10: the prompt addresses the agent only.
  it('flags a trailing question addressed to the human', () => {
    const r = checkCode(`${good}\n\nVuoi che proceda?`);
    expect(passed(r, 'code.noUserQuestions')).toBe(false);
  });
});

// --- System + User ---------------------------------------------------------

describe('checkSystemUser', () => {
  it('accepts a well-split pair', () => {
    const r = checkSystemUser(
      'Sei un traduttore EN→IT. Mantieni un tono formale e i termini tecnici invariati.',
      'Traduci il seguente testo: "The deployment failed."',
    );
    expect(r.passed).toBe(r.total);
  });

  it('flags an empty User prompt', () => {
    const r = checkSystemUser('Sei un esperto di cybersecurity.', '   ');
    expect(passed(r, 'sysusr.userNotEmpty')).toBe(false);
  });

  it('flags a substantial line duplicated across both fields', () => {
    const shared = 'Rispondi sempre in italiano mantenendo un tono formale e conciso.';
    const r = checkSystemUser(`Sei un assistente.\n${shared}`, `${shared}\nTraduci questo testo.`);
    expect(passed(r, 'sysusr.noDuplication')).toBe(false);
  });

  // Short incidental repetition (headings, separators) must not be flagged.
  it('ignores short repeated lines', () => {
    const r = checkSystemUser('Regole:\n- sii conciso', 'Regole:\n- traduci');
    expect(passed(r, 'sysusr.noDuplication')).toBe(true);
  });
});

// --- Gemini ----------------------------------------------------------------

describe('checkGemini', () => {
  const good = `## Comandi
Build e test: \`pnpm test\`.

## Stile
Usa TypeScript strict.`;

  it('accepts a conformant instruction file', () => {
    const r = checkGemini(good);
    expect(r.passed).toBe(r.total);
  });

  it('flags self-reference by filename', () => {
    const r = checkGemini(`${good}\n\nLe regole in questo GEMINI.md valgono sempre.`);
    expect(passed(r, 'gemini.noSelfReference')).toBe(false);
  });

  it('requires Markdown headings', () => {
    const r = checkGemini('Usa `pnpm test` per i test.');
    expect(passed(r, 'gemini.headings')).toBe(false);
  });

  it('requires at least one concrete command', () => {
    const r = checkGemini('## Comandi\nEsegui i test del progetto.');
    expect(passed(r, 'gemini.concreteCommands')).toBe(false);
  });

  it('flags the generic phrases the rule names explicitly', () => {
    const r = checkGemini(`${good}\n\nScrivi codice pulito.`);
    expect(passed(r, 'gemini.noGenericPhrases')).toBe(false);
  });

  it('flags a trailing question addressed to the human', () => {
    const r = checkGemini(`${good}\n\nTi serve altro?`);
    expect(passed(r, 'gemini.noUserQuestions')).toBe(false);
  });
});

// --- Scaffold --------------------------------------------------------------

describe('checkScaffoldProject', () => {
  const good = `## Contesto
App desktop.

## Scelte architetturali vincolanti
- Linguaggio: TypeScript

## Organizzazione del codice
Sorgenti in \`src/\`.

## Comandi del progetto
- Gate: \`npm run lint && npm test\`

## Profilo di piattaforma
Scegli un profilo da \`profiles/\`.`;

  it('accepts a complete project section', () => {
    const r = checkScaffoldProject(good);
    expect(r.passed).toBe(r.total);
  });

  it('reports the missing subsections', () => {
    const r = checkScaffoldProject('## Contesto\nApp desktop.');
    expect(passed(r, 'scaffold.sections')).toBe(false);
    expect(evidence(r, 'scaffold.sections')).toContain('Comandi del progetto');
  });

  it('requires the Gate command', () => {
    const r = checkScaffoldProject(good.replace('- Gate: `npm run lint && npm test`', '- Test: `npm test`'));
    expect(passed(r, 'scaffold.gate')).toBe(false);
  });
});
