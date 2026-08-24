import { describe, expect, test } from 'vitest';
import { buildExamplesBlock, EMPTY_EXAMPLES, type SingleExample } from './fewShotExamples';

describe('buildExamplesBlock', () => {
  test('stringa vuota se non ci sono esempi', () => {
    expect(buildExamplesBlock(EMPTY_EXAMPLES)).toBe('');
  });

  test('stringa vuota se tutti gli esempi sono vuoti', () => {
    expect(buildExamplesBlock([{ content: '   ' }])).toBe('');
  });

  test('formatta un esempio con la guida e i tag <esempio>', () => {
    const block = buildExamplesBlock([{ content: 'ESEMPIO A' }]);
    expect(block).toContain('MODELLO da emulare');
    expect(block).toContain('[Esempio 1]');
    expect(block).toContain('<esempio>\nESEMPIO A\n</esempio>');
  });

  test('numera solo gli esempi non vuoti in sequenza', () => {
    const examples: SingleExample[] = [{ content: '' }, { content: 'B' }, { content: 'C' }];
    const block = buildExamplesBlock(examples);
    expect(block).toContain('[Esempio 1]');
    expect(block).toContain('[Esempio 2]');
    expect(block).not.toContain('[Esempio 3]');
  });
});
