import { describe, expect, test, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const buildScaffoldSchema = vi.fn(() => ({ mockSchema: true }));
const parseOptimizerResponse = vi.fn();
const buildScaffold = vi.fn();
const writeScaffoldToDir = vi.fn();
const downloadScaffoldZip = vi.fn();
const loggerError = vi.fn();
const sendMessage = vi.fn();
const startChat = vi.fn(() => ({ sendMessage }));
const getGenerativeModel = vi.fn(() => ({ startChat }));
const GoogleGenerativeAI = vi.fn(function GoogleGenerativeAIMock() {
  return { getGenerativeModel };
});
const getAllScaffoldOverrides = vi.fn(async () => ({}));
const setScaffoldOverride = vi.fn();
const clearScaffoldOverride = vi.fn();

// Partial mock: only the two functions this suite spies on are replaced, so
// wrapUserInput/USER_INPUT_FRAMING stay REAL and the delimiter the hook actually
// ships is the one under test.
vi.mock('../lib/promptOptimizer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/promptOptimizer')>()),
  buildScaffoldSchema,
  parseOptimizerResponse,
}));
vi.mock('../lib/scaffoldBuilder', () => ({ buildScaffold }));
vi.mock('../lib/scaffoldPackager', () => ({ writeScaffoldToDir, downloadScaffoldZip }));
vi.mock('../lib/logger', () => ({ logger: { error: loggerError } }));
vi.mock('@google/generative-ai', () => ({ GoogleGenerativeAI }));
vi.mock('../lib/scaffoldTemplateStore', () => ({ getAllScaffoldOverrides, setScaffoldOverride, clearScaffoldOverride }));
const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('../lib/toast', () => ({ toast: { error: toastError, success: toastSuccess, info: vi.fn() } }));
// Passthrough: returns the i18n key (plus interpolation vars) instead of the
// Italian copy, so assertions check the right message was requested without
// coupling the test to the current translated text.
vi.mock('../lib/i18n', () => ({
  t: (key: string, vars?: Record<string, unknown>) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
}));

const { useScaffoldGenerator } = await import('./useScaffoldGenerator');

const FILES = { 'CLAUDE.md': 'claude', 'METHOD.md': 'method' };

beforeEach(() => {
  vi.clearAllMocks();
  sendMessage.mockResolvedValue({
    response: { text: () => '{"progetto":"## Contesto\\n..."}', candidates: [{ finishReason: 'STOP' }] },
  });
  parseOptimizerResponse.mockReturnValue({ progetto: '## Contesto\n...' });
  buildScaffold.mockReturnValue(FILES);
  getAllScaffoldOverrides.mockResolvedValue({});
});

describe('useScaffoldGenerator.generateScaffold', () => {
  test('fills the project section via Gemini and assembles the scaffold files', async () => {
    const { result } = renderHook(() => useScaffoldGenerator('sk-key', 'gemini-flash'));

    await act(async () => {
      await result.current.generateScaffold('un progetto desktop in Rust');
    });

    expect(GoogleGenerativeAI).toHaveBeenCalledWith('sk-key');
    expect(buildScaffold).toHaveBeenCalledWith('## Contesto\n...', expect.any(Object));
    expect(result.current.scaffoldFiles).toEqual(FILES);
    expect(result.current.generating).toBe(false);
  });

  test('does nothing when the input is empty', async () => {
    const { result } = renderHook(() => useScaffoldGenerator('sk-key', 'gemini-flash'));

    await act(async () => {
      await result.current.generateScaffold('   ');
    });

    expect(GoogleGenerativeAI).not.toHaveBeenCalled();
    expect(result.current.scaffoldFiles).toBeNull();
  });

  test('does nothing when there is no API key', async () => {
    const { result } = renderHook(() => useScaffoldGenerator('', 'gemini-flash'));

    await act(async () => {
      await result.current.generateScaffold('un progetto');
    });

    expect(GoogleGenerativeAI).not.toHaveBeenCalled();
  });

  test('surfaces a friendly error and logs the detail on failure, leaving files null', async () => {
    parseOptimizerResponse.mockImplementation(() => {
      throw new Error('risposta troncata');
    });
    const { result } = renderHook(() => useScaffoldGenerator('sk-key', 'gemini-flash'));

    await act(async () => {
      await result.current.generateScaffold('un progetto');
    });

    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('risposta troncata'));
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/^toast\.error:/));
    expect(loggerError).toHaveBeenCalled();
    expect(result.current.scaffoldFiles).toBeNull();
    expect(result.current.generating).toBe(false);
  });
});

describe('useScaffoldGenerator packaging actions', () => {
  test('writeToDir delegates the generated files to writeScaffoldToDir', async () => {
    writeScaffoldToDir.mockResolvedValue(true);
    const { result } = renderHook(() => useScaffoldGenerator('sk-key', 'gemini-flash'));
    await act(async () => {
      await result.current.generateScaffold('un progetto');
    });

    await act(async () => {
      await result.current.writeToDir();
    });

    expect(writeScaffoldToDir).toHaveBeenCalledWith(FILES);
    expect(toastSuccess).toHaveBeenCalledWith('toast.scaffoldWritten');
  });

  test('downloadZip delegates the generated files to downloadScaffoldZip', async () => {
    downloadScaffoldZip.mockResolvedValue(true);
    const { result } = renderHook(() => useScaffoldGenerator('sk-key', 'gemini-flash'));
    await act(async () => {
      await result.current.generateScaffold('un progetto');
    });

    await act(async () => {
      await result.current.downloadZip();
    });

    expect(downloadScaffoldZip).toHaveBeenCalledWith(FILES);
    expect(toastSuccess).toHaveBeenCalledWith('toast.scaffoldZipDownloaded');
  });

  test('packaging actions do nothing when no scaffold has been generated yet', async () => {
    const { result } = renderHook(() => useScaffoldGenerator('sk-key', 'gemini-flash'));

    await act(async () => {
      await result.current.writeToDir();
      await result.current.downloadZip();
    });

    expect(writeScaffoldToDir).not.toHaveBeenCalled();
    expect(downloadScaffoldZip).not.toHaveBeenCalled();
  });
});

describe('useScaffoldGenerator istruzioni aggiuntive', () => {
  test('al mount carica gli override e isModified riflette quelli presenti', async () => {
    getAllScaffoldOverrides.mockResolvedValue({ 'METHOD.md': 'CUSTOM' });
    const { result } = renderHook(() => useScaffoldGenerator('sk', 'm'));
    await waitFor(() => expect(result.current.isModified('METHOD.md')).toBe(true));
    expect(result.current.effectiveContent('METHOD.md')).toBe('CUSTOM');
    expect(result.current.isModified('CLAUDE.md')).toBe(false);
  });

  test('saveEdit persiste la bozza e marca il file modificato', async () => {
    const { result } = renderHook(() => useScaffoldGenerator('sk', 'm'));
    await waitFor(() => expect(getAllScaffoldOverrides).toHaveBeenCalled());
    act(() => { result.current.selectFile('METHOD.md'); result.current.startEdit(); });
    act(() => { result.current.changeDraft('NUOVO'); });
    await act(async () => { await result.current.saveEdit(); });
    expect(setScaffoldOverride).toHaveBeenCalledWith('METHOD.md', 'NUOVO');
    expect(result.current.isModified('METHOD.md')).toBe(true);
    expect(result.current.effectiveContent('METHOD.md')).toBe('NUOVO');
  });

  test('restore pulisce override e stato', async () => {
    getAllScaffoldOverrides.mockResolvedValue({ 'METHOD.md': 'CUSTOM' });
    const { result } = renderHook(() => useScaffoldGenerator('sk', 'm'));
    await waitFor(() => expect(result.current.isModified('METHOD.md')).toBe(true));
    await act(async () => { await result.current.restore('METHOD.md'); });
    expect(clearScaffoldOverride).toHaveBeenCalledWith('METHOD.md');
    expect(result.current.isModified('METHOD.md')).toBe(false);
  });
});
