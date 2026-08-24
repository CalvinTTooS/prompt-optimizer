import { describe, expect, test } from 'vitest';
import { runAnonymization } from './anonymization';

describe('runAnonymization', () => {
  test('masks an email address with a numbered EMAIL placeholder', () => {
    const { safeText, detected } = runAnonymization('Contattami a mario.rossi@example.com per dettagli.', []);

    expect(safeText).toBe('Contattami a [EMAIL_1] per dettagli.');
    expect(detected).toEqual([{ original: 'mario.rossi@example.com', placeholder: '[EMAIL_1]' }]);
  });

  test('masks an Italian mobile phone number with a TELEFONO placeholder', () => {
    const { safeText, detected } = runAnonymization('Chiamami al 333 1234567 quando puoi.', []);

    expect(safeText).toContain('[TELEFONO_1]');
    expect(detected).toEqual([{ original: '333 1234567', placeholder: '[TELEFONO_1]' }]);
  });

  test('masks a credit-card-like digit sequence with a CARTA placeholder', () => {
    const { safeText, detected } = runAnonymization('La carta è 4111111111111111 scaduta.', []);

    expect(safeText).toBe('La carta è [CARTA_1] scaduta.');
    expect(detected).toEqual([{ original: '4111111111111111', placeholder: '[CARTA_1]' }]);
  });

  test('does NOT mask a 13-16 digit sequence that fails the Luhn checksum (false-positive fix)', () => {
    // Regression test: previously ANY 13-16 digit sequence was treated as a
    // credit card, so ordinary long numbers (invoice IDs, tracking numbers,
    // phone+area code combos...) were needlessly masked. Now only sequences
    // that pass the Luhn checksum (a real property of card numbers) are masked.
    const { safeText, detected } = runAnonymization('Il codice ordine è 1234567890123456.', []);

    expect(safeText).toBe('Il codice ordine è 1234567890123456.');
    expect(detected).toEqual([]);
  });

  test('does not match a phone-like digit sequence embedded inside a longer number (word-boundary fix)', () => {
    // Regression test: the TELEFONO pattern used to have no left word-boundary,
    // so it could match a "3xxxxxxxxx" substring in the middle of an unrelated
    // longer digit sequence (e.g. an order code), not just standalone numbers.
    const { safeText, detected } = runAnonymization('Codice ordine 93123456701 confermato.', []);

    expect(safeText).toBe('Codice ordine 93123456701 confermato.');
    expect(detected).toEqual([]);
  });

  test('masks only the numeric part of a CCV/CVV, keeping the label', () => {
    const { safeText, detected } = runAnonymization('Il ccv: 123 è sul retro.', []);

    expect(safeText).toBe('Il ccv: [CCV_1] è sul retro.');
    expect(detected).toEqual([{ original: '123', placeholder: '[CCV_1]' }]);
  });

  test('reuses the existing placeholder when the same value appears again in fresh text', () => {
    // Regression test: previously, a value already present in `currentCensored`
    // (e.g. from an earlier anonymization pass) was left in PLAIN TEXT instead
    // of being masked, because the replace callback bailed out on already-known
    // values without substituting the existing placeholder.
    const currentCensored = [{ original: 'mario.rossi@example.com', placeholder: '[EMAIL_1]' }];

    const { safeText, detected } = runAnonymization(
      'Scrivi di nuovo a mario.rossi@example.com per conferma.',
      currentCensored,
    );

    expect(safeText).toBe('Scrivi di nuovo a [EMAIL_1] per conferma.');
    expect(detected).toEqual([{ original: 'mario.rossi@example.com', placeholder: '[EMAIL_1]' }]);
  });

  test('numbers newly detected values starting after the existing detected entries', () => {
    const currentCensored = [{ original: 'existing@example.com', placeholder: '[EMAIL_1]' }];

    const { detected } = runAnonymization('Nuovo contatto: nuovo@example.com', currentCensored);

    expect(detected).toEqual([
      { original: 'existing@example.com', placeholder: '[EMAIL_1]' },
      { original: 'nuovo@example.com', placeholder: '[EMAIL_2]' },
    ]);
  });
});
