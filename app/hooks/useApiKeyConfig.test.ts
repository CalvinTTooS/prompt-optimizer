import { describe, expect, test, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const getStoredApiKey = vi.fn();
const setStoredApiKey = vi.fn();
const clearStoredApiKey = vi.fn();
const getStoredProviderKey = vi.fn();
const setStoredProviderKey = vi.fn();
const clearStoredProviderKey = vi.fn();
const getEngineFlag = vi.fn(async () => true);
const setEngineFlag = vi.fn();
const loggerError = vi.fn();

vi.mock('../lib/secureApiKeyStore', () => ({
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
  getStoredProviderKey,
  setStoredProviderKey,
  clearStoredProviderKey,
  getEngineFlag,
  setEngineFlag,
}));
vi.mock('../lib/logger', () => ({ logger: { error: loggerError } }));
const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('../lib/toast', () => ({ toast: { error: toastError, success: toastSuccess, info: vi.fn() } }));
// Passthrough: returns the i18n key (plus interpolation vars) instead of the
// Italian copy, so assertions check the right message was requested without
// coupling the test to the current translated text.
vi.mock('../lib/i18n', () => ({
  t: (key: string, vars?: Record<string, unknown>) => (vars ? `${key}:${JSON.stringify(vars)}` : key),
}));

const { useApiKeyConfig } = await import('./useApiKeyConfig');

const modelsResponse = {
  models: [
    { name: 'models/gemini-1.5-flash-latest', displayName: 'Gemini 1.5 Flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemma-2b', displayName: 'Gemma', supportedGenerationMethods: ['generateContent'] },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => modelsResponse }));
  getStoredApiKey.mockResolvedValue(null);
  getStoredProviderKey.mockResolvedValue(null);
  getEngineFlag.mockResolvedValue(true);
});

describe('useApiKeyConfig', () => {
  test('loads a previously stored key on mount and fetches its models', async () => {
    getStoredApiKey.mockResolvedValue('sk-existing');

    const { result } = renderHook(() => useApiKeyConfig());

    await waitFor(() => expect(result.current.isConfigured).toBe(true));

    expect(result.current.apiKey).toBe('sk-existing');
    // gemma models are filtered out, only the usable one remains
    expect(result.current.models).toEqual([{ id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash' }]);
    expect(result.current.selectedModel).toBe('gemini-1.5-flash-latest');
  });

  // The default is the Flash-Lite alias: cheapest tier, and moving, so the app
  // follows Google's current model without a code change. Pinning it here means
  // a future reshuffle of the preference chain has to be deliberate.
  test('preferisce Flash-Lite come modello di default quando è disponibile', async () => {
    getStoredApiKey.mockResolvedValue('sk-existing');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/gemini-3.5-pro', displayName: 'Pro', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-flash-latest', displayName: 'Flash', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-flash-lite-latest', displayName: 'Flash Lite', supportedGenerationMethods: ['generateContent'] },
          ],
        }),
      }),
    );

    const { result } = renderHook(() => useApiKeyConfig());
    await waitFor(() => expect(result.current.modelsStatus).toBe('loaded'));

    expect(result.current.selectedModel).toBe('gemini-flash-lite-latest');
  });

  // Google has renamed model families before, so the chain must degrade instead
  // of falling through to whatever happens to be first in the list.
  test('ripiega su un Flash-Lite versionato se manca l\'alias', async () => {
    getStoredApiKey.mockResolvedValue('sk-existing');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: 'models/gemini-3.5-pro', displayName: 'Pro', supportedGenerationMethods: ['generateContent'] },
            { name: 'models/gemini-3.5-flash-lite', displayName: 'Flash Lite 3.5', supportedGenerationMethods: ['generateContent'] },
          ],
        }),
      }),
    );

    const { result } = renderHook(() => useApiKeyConfig());
    await waitFor(() => expect(result.current.modelsStatus).toBe('loaded'));

    expect(result.current.selectedModel).toBe('gemini-3.5-flash-lite');
  });

  test('stays unconfigured when no key was ever stored', async () => {
    const { result } = renderHook(() => useApiKeyConfig());

    await waitFor(() => expect(getStoredApiKey).toHaveBeenCalled());

    expect(result.current.isConfigured).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  test('saveConfig stores a valid key, marks configured, and loads models', async () => {
    const { result } = renderHook(() => useApiKeyConfig());
    await waitFor(() => expect(getStoredApiKey).toHaveBeenCalled());

    act(() => result.current.setApiKey('a-valid-looking-key'));
    await act(async () => {
      await result.current.saveConfig({ preventDefault: () => {} } as React.FormEvent);
    });

    expect(setStoredApiKey).toHaveBeenCalledWith('a-valid-looking-key');
    expect(result.current.isConfigured).toBe(true);
  });

  test('saveConfig rejects an obviously invalid (too short) key without storing it', async () => {
    const { result } = renderHook(() => useApiKeyConfig());
    await waitFor(() => expect(getStoredApiKey).toHaveBeenCalled());

    act(() => result.current.setApiKey('short'));
    await act(async () => {
      await result.current.saveConfig({ preventDefault: () => {} } as React.FormEvent);
    });

    expect(setStoredApiKey).not.toHaveBeenCalled();
    expect(result.current.isConfigured).toBe(false);
    expect(toastError).toHaveBeenCalledWith('toast.invalidApiKey');
  });

  test('handleResetKey clears storage and resets state', async () => {
    getStoredApiKey.mockResolvedValue('sk-existing');
    const { result } = renderHook(() => useApiKeyConfig());
    await waitFor(() => expect(result.current.isConfigured).toBe(true));

    await act(async () => {
      await result.current.handleResetKey();
    });

    expect(clearStoredApiKey).toHaveBeenCalled();
    expect(result.current.isConfigured).toBe(false);
    expect(result.current.apiKey).toBe('');
    expect(result.current.models).toEqual([]);
  });

  test('loads previously stored Anthropic/OpenAI keys on mount', async () => {
    getStoredProviderKey.mockImplementation(async (id: 'anthropic' | 'openai') =>
      id === 'anthropic' ? 'sk-ant-existing' : 'sk-openai-existing',
    );

    const { result } = renderHook(() => useApiKeyConfig());

    await waitFor(() => expect(result.current.anthropicKey).toBe('sk-ant-existing'));
    expect(result.current.openaiKey).toBe('sk-openai-existing');
  });

  test('saveProviderKeys persists both the Anthropic and OpenAI keys', async () => {
    const { result } = renderHook(() => useApiKeyConfig());
    await waitFor(() => expect(getStoredProviderKey).toHaveBeenCalled());

    act(() => {
      result.current.setAnthropicKey('sk-ant-new');
      result.current.setOpenaiKey('sk-openai-new');
    });
    await act(async () => {
      await result.current.saveProviderKeys();
    });

    expect(setStoredProviderKey).toHaveBeenCalledWith('anthropic', 'sk-ant-new');
    expect(setStoredProviderKey).toHaveBeenCalledWith('openai', 'sk-openai-new');
  });

  test('una modifica alla bozza non attiva la key salvata finché non si chiama saveProviderKeys', async () => {
    const { result } = renderHook(() => useApiKeyConfig());
    await waitFor(() => expect(getStoredProviderKey).toHaveBeenCalled());

    act(() => { result.current.setAnthropicKey('sk-ant-draft'); });
    expect(result.current.anthropicKey).toBe('sk-ant-draft'); // bozza aggiornata
    expect(result.current.savedAnthropicKey).toBe('');        // salvato ancora vuoto

    await act(async () => { await result.current.saveProviderKeys(); });
    expect(result.current.savedAnthropicKey).toBe('sk-ant-draft'); // promosso al salvataggio
  });

  test('i flag motore sono true di default (caricati al mount)', async () => {
    const { result } = renderHook(() => useApiKeyConfig());
    await waitFor(() => expect(getEngineFlag).toHaveBeenCalled());
    expect(result.current.refineMasterEnabled).toBe(true);
    expect(result.current.anthropicEnabled).toBe(true);
    expect(result.current.openaiEnabled).toBe(true);
  });

  test('setRefineMasterEnabled aggiorna stato e persiste subito', async () => {
    const { result } = renderHook(() => useApiKeyConfig());
    await waitFor(() => expect(getEngineFlag).toHaveBeenCalled());
    act(() => { result.current.setRefineMasterEnabled(false); });
    expect(result.current.refineMasterEnabled).toBe(false);
    expect(setEngineFlag).toHaveBeenCalledWith('refineMaster', false);
  });

  test('al mount popola SIA la bozza SIA il salvato dalle key già nello store', async () => {
    getStoredProviderKey.mockImplementation(async (id: 'anthropic' | 'openai') =>
      id === 'anthropic' ? 'sk-ant-existing' : 'sk-openai-existing',
    );
    const { result } = renderHook(() => useApiKeyConfig());

    await waitFor(() => expect(result.current.savedAnthropicKey).toBe('sk-ant-existing'));
    expect(result.current.anthropicKey).toBe('sk-ant-existing');
    expect(result.current.savedOpenaiKey).toBe('sk-openai-existing');
    expect(result.current.openaiKey).toBe('sk-openai-existing');
  });

  test('modelsStatus diventa "loaded" quando i modelli arrivano', async () => {
    getStoredApiKey.mockResolvedValue('sk-existing');
    const { result } = renderHook(() => useApiKeyConfig());

    await waitFor(() => expect(result.current.modelsStatus).toBe('loaded'));
    expect(result.current.models.length).toBeGreaterThan(0);
  });

  test('offline: un fetch che fallisce porta modelsStatus a "error" (niente "caricamento" eterno)', async () => {
    getStoredApiKey.mockResolvedValue('sk-existing');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { result } = renderHook(() => useApiKeyConfig());

    await waitFor(() => expect(result.current.modelsStatus).toBe('error'));
    expect(result.current.models).toEqual([]);
    expect(toastError).toHaveBeenCalledWith('toast.modelsLoadFailed');
  });

  test('reloadModels ricarica i modelli e recupera da uno stato di errore', async () => {
    getStoredApiKey.mockResolvedValue('sk-existing');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { result } = renderHook(() => useApiKeyConfig());
    await waitFor(() => expect(result.current.modelsStatus).toBe('error'));

    // la rete torna disponibile
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => modelsResponse }));
    await act(async () => {
      await result.current.reloadModels();
    });

    await waitFor(() => expect(result.current.modelsStatus).toBe('loaded'));
    expect(result.current.models).toEqual([{ id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash' }]);
  });
});
