import { describe, it, expect } from 'vitest';
import { extractPlaceholders } from './placeholders';

describe('extractPlaceholders', () => {
  it('finds the declared double-brace form', () => {
    expect(extractPlaceholders(['Scrivi a {{DESTINATARIO}} entro {{SCADENZA}}.'])).toEqual([
      '{{DESTINATARIO}}',
      '{{SCADENZA}}',
    ]);
  });

  // Nothing ever asked models to emit this form; the fill-in feature grew around
  // a habit. Still accepted so prompts generated before the convention keep working.
  it('still accepts the legacy square form', () => {
    expect(extractPlaceholders(['Riassumi [ARGOMENTO] in tre righe.'])).toEqual(['[ARGOMENTO]']);
  });

  it('collects across several texts, without duplicates, in order', () => {
    expect(
      extractPlaceholders(['Ciao {{NOME}}', undefined, 'Ancora {{NOME}} e poi {{LUOGO}}']),
    ).toEqual(['{{NOME}}', '{{LUOGO}}']);
  });

  // These carry a real value and are restored automatically: offering them for
  // editing would invite the user to break the restore map.
  it('never offers anonymization placeholders as fields', () => {
    expect(
      extractPlaceholders(['Scrivi a [EMAIL_1], chiama [TELEFONO_2], carta [CARTA_1], ccv [CCV_1]']),
    ).toEqual([]);
  });

  it('keeps a square placeholder that merely starts with similar letters', () => {
    expect(extractPlaceholders(['Invia a [EMAIL DEL CLIENTE]'])).toEqual(['[EMAIL DEL CLIENTE]']);
  });

  // `[main.py](http://…)` is a link, not a field to fill in.
  it('does not mistake a Markdown link for a placeholder', () => {
    expect(extractPlaceholders(['Vedi [la guida](https://example.com/x) per i dettagli.'])).toEqual([]);
  });

  it('ignores brackets spanning lines, which are never a single field', () => {
    expect(extractPlaceholders(['Un [testo\nspezzato] qui.'])).toEqual([]);
  });

  it('returns nothing for a prompt with no placeholders', () => {
    expect(extractPlaceholders(['Spiega la fotosintesi a un bambino di 10 anni.'])).toEqual([]);
  });
});
