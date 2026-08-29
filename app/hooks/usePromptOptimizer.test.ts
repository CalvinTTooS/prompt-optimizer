import { describe, expect, test, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const runAnonymization = vi.fn();
const buildResponseSchema = vi.fn(() => ({ mockSchema: true }));
const parseOptimizerResponse = vi.fn();
const saveTextFile = vi.fn();
const loggerError = vi.fn();
const sendMessage = vi.fn();
const startChat = vi.fn(() => ({ sendMessage }));
const getGenerativeModel = vi.fn(() => ({ startChat }));
// Regular function, not an arrow function: vi.fn()'s implementation must be
// constructible since production code calls `new GoogleGenerativeAI(...)`.
const GoogleGenerativeAI = vi.fn(function GoogleGenerativeAIMock() {
  return { getGenerativeModel };
});

const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock('../lib/anonymization', () => ({ runAnonymization }));
// Partial mock: only the two functions this suite spies on are replaced.
// buildOptimizerSystemInstruction stays REAL so the assertions below verify the
// meta-prompt actually shipped, not a stand-in that could drift from it.
vi.mock('../lib/promptOptimizer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/promptOptimizer')>()),
  buildResponseSchema,
  parseOptimizerResponse,
}));
vi.mock('../lib/nativeDownload', () => ({ saveTextFile }));
vi.mock('../lib/logger', () => ({ logger: { error: loggerError } }));
vi.mock('@google/generative-ai', () => ({ GoogleGenerativeAI }));
vi.mock('../lib/toast', () => ({ toast: { error: toastError, success: toastSuccess, info: vi.fn() } }));
// Passthrough: returns the i18n key (plus interpolation vars) instead of the
// Italian copy, so assertions check the right message was requested without
// coupling the test to the current translated text.
vi.mock('../lib/i18n', () => ({
  t: (key: string, vars?: Record<string, unknown>) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
}));

const { usePromptOptimizer } = await import('./usePromptOptimizer');

beforeEach(() => {
  vi.clearAllMocks();
  runAnonymization.mockImplementation((text: string, censored: unknown[]) => ({ safeText: text, detected: censored }));
  sendMessage.mockResolvedValue({
    response: { text: () => '{}', candidates: [{ finishReason: 'STOP' }] },
  });
  parseOptimizerResponse.mockReturnValue({ spiegazione: 'ok' });
});

describe('usePromptOptimizer', () => {
  test('handleOptimize does nothing when the input is empty', async () => {
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));

    await act(async () => {
      await result.current.handleOptimize();
    });

    expect(GoogleGenerativeAI).not.toHaveBeenCalled();
  });

  test('handleOptimize does nothing when there is no API key', async () => {
    const { result } = renderHook(() => usePromptOptimizer('', 'gemini-flash'));
    act(() => result.current.setInput('ottimizza questo'));

    await act(async () => {
      await result.current.handleOptimize();
    });

    expect(GoogleGenerativeAI).not.toHaveBeenCalled();
  });

  test('handleOptimize shows a toast when no output format is selected', async () => {
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => {
      result.current.setInput('ottimizza questo');
      result.current.setGenChat(false);
    });

    await act(async () => {
      await result.current.handleOptimize();
    });

    expect(toastError).toHaveBeenCalledWith('toast.selectOutputFormat');
    expect(GoogleGenerativeAI).not.toHaveBeenCalled();
  });

  test('handleOptimize proceeds when only the Gemini flow is selected', async () => {
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => {
      result.current.setInput('ottimizza questo');
      result.current.setGenChat(false);
      result.current.setGenGemini(true);
    });

    await act(async () => {
      await result.current.handleOptimize();
    });

    expect(toastError).not.toHaveBeenCalled();
    expect(GoogleGenerativeAI).toHaveBeenCalled();
  });

  test('anonymizes the input before sending it to Gemini when privacy is enabled', async () => {
    runAnonymization.mockReturnValue({
      safeText: 'contattami a [EMAIL_1]',
      detected: [{ original: 'me@example.com', placeholder: '[EMAIL_1]' }],
    });
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => result.current.setInput('contattami a me@example.com'));

    await act(async () => {
      await result.current.handleOptimize();
    });

    expect(sendMessage).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('contattami a [EMAIL_1]')]));
    expect(result.current.censoredData).toEqual([{ original: 'me@example.com', placeholder: '[EMAIL_1]' }]);
  });

  test('sends the raw input unchanged when privacy is disabled', async () => {
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => {
      result.current.setInput('contattami a me@example.com');
      result.current.setEnablePrivacy(false);
    });

    await act(async () => {
      await result.current.handleOptimize();
    });

    expect(runAnonymization).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('contattami a me@example.com')]));
  });

  // The hook no longer snapshots the fill-in fields: they are derived from the
  // CURRENT texts where they are displayed, so a prompt refined afterwards
  // contributes its own placeholders too (see lib/placeholders). Here the hook
  // only has to store the result and drop values typed for the previous prompt.
  test('sets the result and clears the values typed for the previous prompt', async () => {
    parseOptimizerResponse.mockReturnValue({ spiegazione: 'ok', promptChat: 'Ciao {{NOME}}, benvenuto.' });
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => result.current.setInput('un prompt qualsiasi'));
    act(() => result.current.setVariables({ '{{VECCHIO}}': 'valore di prima' }));

    await act(async () => {
      await result.current.handleOptimize();
    });

    expect(result.current.result).toEqual({ spiegazione: 'ok', promptChat: 'Ciao {{NOME}}, benvenuto.' });
    expect(result.current.variables).toEqual({});
  });

  // Substitution still has to work for whatever the user typed, in either form.
  test('sostituisce i segnaposto compilati, in entrambe le convenzioni', async () => {
    parseOptimizerResponse.mockReturnValue({
      spiegazione: 'ok',
      promptChat: 'Ciao {{NOME}}, vedi [ARGOMENTO].',
    });
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => result.current.setInput('un prompt qualsiasi'));
    await act(async () => {
      await result.current.handleOptimize();
    });
    act(() => result.current.setVariables({ '{{NOME}}': 'Marco', '[ARGOMENTO]': 'la fotosintesi' }));

    expect(result.current.getCleanedPrompt(result.current.result?.promptChat)).toBe(
      'Ciao Marco, vedi la fotosintesi.',
    );
  });

  test('surfaces a friendly error via toast and logs the detail on failure', async () => {
    parseOptimizerResponse.mockImplementation(() => {
      throw new Error('risposta troncata');
    });
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => result.current.setInput('un prompt qualsiasi'));

    await act(async () => {
      await result.current.handleOptimize();
    });

    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('risposta troncata'));
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/^toast\.error:/));
    expect(loggerError).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  test('handleAutoAnonymize replaces the input and records the censored entries', () => {
    runAnonymization.mockReturnValue({
      safeText: 'contattami a [EMAIL_1]',
      detected: [{ original: 'me@example.com', placeholder: '[EMAIL_1]' }],
    });
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => result.current.setInput('contattami a me@example.com'));

    act(() => result.current.handleAutoAnonymize());

    expect(result.current.input).toBe('contattami a [EMAIL_1]');
    expect(result.current.censoredData).toEqual([{ original: 'me@example.com', placeholder: '[EMAIL_1]' }]);
  });

  test('handleRestoreField puts the original value back and forgets the placeholder', () => {
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => {
      result.current.setInput('contattami a [EMAIL_1]');
      result.current.setCensoredData([{ original: 'me@example.com', placeholder: '[EMAIL_1]' }]);
    });

    act(() => result.current.handleRestoreField('[EMAIL_1]'));

    expect(result.current.input).toBe('contattami a me@example.com');
    expect(result.current.censoredData).toEqual([]);
  });

  test('handleRestoreAll puts every original value back and clears all censored entries', () => {
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => {
      result.current.setInput('[EMAIL_1] chiama [TELEFONO_1]');
      result.current.setCensoredData([
        { original: 'me@example.com', placeholder: '[EMAIL_1]' },
        { original: '333 1234567', placeholder: '[TELEFONO_1]' },
      ]);
    });

    act(() => result.current.handleRestoreAll());

    expect(result.current.input).toBe('me@example.com chiama 333 1234567');
    expect(result.current.censoredData).toEqual([]);
  });

  test('getCleanedPrompt reverses censored placeholders and fills in variables', () => {
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => {
      result.current.setCensoredData([{ original: 'me@example.com', placeholder: '[EMAIL_1]' }]);
      result.current.setVariables({ '[NOME]': 'Mario' });
    });

    const cleaned = result.current.getCleanedPrompt('Scrivi a [EMAIL_1], ciao [NOME]');

    expect(cleaned).toBe('Scrivi a me@example.com, ciao Mario');
  });

  test('downloadMarkdown prefixes the content and delegates to saveTextFile', async () => {
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));

    await act(async () => {
      await result.current.downloadMarkdown('task.md', '# Titolo', 'corpo');
    });

    expect(saveTextFile).toHaveBeenCalledWith('task.md', '# Titolo\n\ncorpo');
  });

  test('downloadMarkdown writes the content verbatim when the prefix is empty', async () => {
    // For files where the content already IS the whole document (e.g. GEMINI.md),
    // an empty prefix must not add leading blank lines.
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));

    await act(async () => {
      await result.current.downloadMarkdown('GEMINI.md', '', '## Build\n`npm test`');
    });

    expect(saveTextFile).toHaveBeenCalledWith('GEMINI.md', '## Build\n`npm test`');
  });

  test('embeds the few-shot example block into the system instruction', async () => {
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => {
      result.current.setInput('ottimizza questo');
      result.current.setGenSystemUser(true);
    });

    await act(async () => {
      await result.current.handleOptimize([{ content: 'ESEMPIO X' }]);
    });

    expect(sendMessage).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('<esempio>\nESEMPIO X\n</esempio>')]),
    );
  });

  test('passes example content through anonymization when privacy is enabled', async () => {
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => {
      result.current.setInput('ottimizza questo');
      result.current.setGenSystemUser(true);
    });

    await act(async () => {
      await result.current.handleOptimize([{ content: 'ESEMPIO CON [EMAIL_1]' }]);
    });

    // The assembled instruction (which contains the example) is anonymized too.
    expect(runAnonymization).toHaveBeenCalledWith(
      expect.stringContaining('ESEMPIO CON [EMAIL_1]'),
      expect.anything(),
    );
  });

  test('still injects the example block when privacy is disabled', async () => {
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => {
      result.current.setInput('ottimizza questo');
      result.current.setGenSystemUser(true);
      result.current.setEnablePrivacy(false);
    });

    await act(async () => {
      await result.current.handleOptimize([{ content: 'ESEMPIO X' }]);
    });

    expect(runAnonymization).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('<esempio>\nESEMPIO X\n</esempio>')]),
    );
  });

  test('does not add example-only PII placeholders to the protected-data panel', async () => {
    // Input has no PII; an example does. With privacy on, the example is still
    // scrubbed in the instruction sent to Gemini, but its placeholder must not
    // surface in censoredData (the "Dati protetti" panel).
    runAnonymization.mockImplementation((text: string, censored: { original: string; placeholder: string }[]) => {
      if (text.includes('me@example.com')) {
        return {
          safeText: text.replace('me@example.com', '[EMAIL_1]'),
          detected: [...censored, { original: 'me@example.com', placeholder: '[EMAIL_1]' }],
        };
      }
      return { safeText: text, detected: censored };
    });
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => {
      result.current.setInput('ottimizza questo');
      result.current.setGenSystemUser(true);
    });

    await act(async () => {
      await result.current.handleOptimize([{ content: 'scrivi a me@example.com' }]);
    });

    expect(result.current.censoredData).toEqual([]);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('[EMAIL_1]')]),
    );
  });

  // The examples block carries its own "per tutti i formati selezionati"
  // preamble, so one copy covers every flow. Repeating it per flow wasted
  // tokens and was the most likely path to a truncated response.
  test('inietta il blocco di esempi UNA sola volta anche con più flussi', async () => {
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => {
      result.current.setInput('ottimizza questo');
      result.current.setGenCowork(true);
      result.current.setGenCode(true);
      result.current.setGenSystemUser(true);
      result.current.setGenGemini(true);
    });
    await act(async () => {
      await result.current.handleOptimize([{ content: 'ESEMPIO UNICO' }]);
    });

    const sent = sendMessage.mock.calls[0][0] as string[];
    const occurrences = sent.join('\n').split('ESEMPIO UNICO').length - 1;
    expect(occurrences).toBe(1);
  });

  test('non imposta temperature e passa i vincoli comuni', async () => {
    const { result } = renderHook(() => usePromptOptimizer('sk-key', 'gemini-flash'));
    act(() => { result.current.setInput('ottimizza questo'); });
    await act(async () => { await result.current.handleOptimize(); });

    // Asserting generationConfig EXACTLY (not objectContaining) so that
    // re-introducing `temperature` fails loudly: Google recommends the model
    // default for Gemini 3.x, and omitting it keeps production identical to the
    // eval harness — while they differ, every measured baseline is suspect.
    expect(getGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: expect.anything(),
        },
      }),
    );
    // Pins the two constraints shared by every flow. Asserting the substance
    // rather than a heading keeps the test meaningful across rewordings, while
    // still failing if a constraint is dropped.
    expect(sendMessage).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('riga vuota le sezioni di primo livello')]),
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('segnaposto di anonimizzazione')]),
    );
  });
});
