import { describe, expect, test } from 'vitest';
import { buildResponseSchema, buildScaffoldSchema, parseOptimizerResponse, TruncatedResponseError } from './promptOptimizer';

describe('buildResponseSchema', () => {
  test('includes only the requested output flows, always keeping spiegazione', () => {
    const schema = buildResponseSchema({ genChat: true, genCowork: false, genCode: false, genSystemUser: false, genGemini: false });

    expect(Object.keys(schema.properties)).toEqual(['spiegazione', 'promptChat']);
    expect(schema.required).toEqual(['spiegazione', 'promptChat']);
  });

  test('includes promptSystem and promptUser when genSystemUser is enabled', () => {
    const schema = buildResponseSchema({ genChat: false, genCowork: false, genCode: false, genSystemUser: true, genGemini: false });

    expect(Object.keys(schema.properties)).toEqual(['spiegazione', 'promptSystem', 'promptUser']);
    expect(schema.required).toEqual(['spiegazione', 'promptSystem', 'promptUser']);
  });

  test('includes promptGemini when genGemini is enabled', () => {
    const schema = buildResponseSchema({ genChat: false, genCowork: false, genCode: false, genSystemUser: false, genGemini: true });

    expect(Object.keys(schema.properties)).toEqual(['spiegazione', 'promptGemini']);
    expect(schema.required).toEqual(['spiegazione', 'promptGemini']);
  });

  test('includes all prompt fields when every flow is enabled', () => {
    const schema = buildResponseSchema({ genChat: true, genCowork: true, genCode: true, genSystemUser: true, genGemini: true });

    expect(Object.keys(schema.properties)).toEqual([
      'spiegazione',
      'promptChat',
      'promptCowork',
      'promptCode',
      'promptSystem',
      'promptUser',
      'promptGemini',
    ]);
    expect(schema.required).toEqual([
      'spiegazione',
      'promptChat',
      'promptCowork',
      'promptCode',
      'promptSystem',
      'promptUser',
      'promptGemini',
    ]);
  });
});

describe('buildScaffoldSchema', () => {
  test('constrains the response to a single required "progetto" string field', () => {
    const schema = buildScaffoldSchema();

    expect(Object.keys(schema.properties)).toEqual(['progetto']);
    expect(schema.required).toEqual(['progetto']);
  });
});

describe('parseOptimizerResponse', () => {
  test('parses well-formed structured JSON without any manual cleanup', () => {
    const payload = {
      spiegazione: 'Ottimizzato per chiarezza',
      promptChat: 'Riga 1\nRiga 2 con backslash: C:\\progetti\\app e asterisco \\*bold\\*',
    };

    const result = parseOptimizerResponse({ text: JSON.stringify(payload) });

    expect(result).toEqual(payload);
  });

  test('throws a clear, actionable TruncatedResponseError when generation hit the token limit', () => {
    // Regression test for the long-prompt bug: previously a MAX_TOKENS response
    // produced a half-written JSON string that crashed JSON.parse with a cryptic
    // "Unexpected end of JSON input" alert instead of an explanation.
    const truncatedText = '{"spiegazione": "Testo lungo che si interrompe a met';

    expect(() => parseOptimizerResponse({ text: truncatedText, finishReason: 'MAX_TOKENS' })).toThrow(
      TruncatedResponseError,
    );
  });
});
