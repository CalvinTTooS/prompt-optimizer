import { describe, expect, test, vi, beforeEach } from 'vitest';

const mockStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  save: vi.fn(),
};
const load = vi.fn(async () => mockStore);

vi.mock('@tauri-apps/plugin-store', () => ({ load }));

// Imported after the mock so the module under test picks up the mocked plugin.
const {
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
  API_KEY_STORE_FILE,
  API_KEY_FIELD,
  getStoredProviderKey,
  setStoredProviderKey,
  clearStoredProviderKey,
  getEngineFlag,
  setEngineFlag,
} = await import('./secureApiKeyStore');

beforeEach(() => {
  vi.clearAllMocks();
  mockStore.get.mockResolvedValue(undefined);
});

describe('secureApiKeyStore', () => {
  test('getStoredApiKey reads the key from the Tauri store under the well-known field', async () => {
    mockStore.get.mockResolvedValue('sk-existing-key');

    const result = await getStoredApiKey();

    expect(load).toHaveBeenCalledWith(API_KEY_STORE_FILE, { defaults: {}, autoSave: false });
    expect(mockStore.get).toHaveBeenCalledWith(API_KEY_FIELD);
    expect(result).toBe('sk-existing-key');
  });

  test('getStoredApiKey returns null (not undefined) when nothing is stored yet', async () => {
    const result = await getStoredApiKey();

    expect(result).toBeNull();
  });

  test('setStoredApiKey writes and persists the key', async () => {
    await setStoredApiKey('sk-new-key');

    expect(mockStore.set).toHaveBeenCalledWith(API_KEY_FIELD, 'sk-new-key');
    expect(mockStore.save).toHaveBeenCalled();
  });

  test('clearStoredApiKey deletes and persists the removal', async () => {
    await clearStoredApiKey();

    expect(mockStore.delete).toHaveBeenCalledWith(API_KEY_FIELD);
    expect(mockStore.save).toHaveBeenCalled();
  });
});

describe('secureApiKeyStore provider keys (anthropic/openai)', () => {
  test.each([
    ['anthropic', 'anthropicApiKey'],
    ['openai', 'openaiApiKey'],
  ] as const)('setStoredProviderKey(%s) writes and persists under the %s field', async (id, field) => {
    await setStoredProviderKey(id, 'sk-provider-key');

    expect(mockStore.set).toHaveBeenCalledWith(field, 'sk-provider-key');
    expect(mockStore.save).toHaveBeenCalled();
  });

  test('getStoredProviderKey returns the stored key for the given provider', async () => {
    mockStore.get.mockResolvedValue('sk-anthropic-key');

    const result = await getStoredProviderKey('anthropic');

    expect(mockStore.get).toHaveBeenCalledWith('anthropicApiKey');
    expect(result).toBe('sk-anthropic-key');
  });

  test('getStoredProviderKey returns null (not undefined) when nothing is stored yet', async () => {
    const result = await getStoredProviderKey('openai');

    expect(mockStore.get).toHaveBeenCalledWith('openaiApiKey');
    expect(result).toBeNull();
  });

  test('clearStoredProviderKey deletes and persists the removal for the given provider', async () => {
    await clearStoredProviderKey('openai');

    expect(mockStore.delete).toHaveBeenCalledWith('openaiApiKey');
    expect(mockStore.save).toHaveBeenCalled();
  });
});

describe('secureApiKeyStore engine flags', () => {
  test('getEngineFlag: true di default quando assente', async () => {
    await expect(getEngineFlag('refineMaster')).resolves.toBe(true);
  });

  test('getEngineFlag ritorna il valore memorizzato quando presente', async () => {
    mockStore.get.mockResolvedValue(false);

    const result = await getEngineFlag('anthropic');

    expect(mockStore.get).toHaveBeenCalledWith('engineAnthropicEnabled');
    expect(result).toBe(false);
  });

  test('setEngineFlag persiste sotto il campo giusto', async () => {
    await setEngineFlag('openai', false);

    expect(mockStore.set).toHaveBeenCalledWith('engineOpenaiEnabled', false);
    expect(mockStore.save).toHaveBeenCalled();
  });
});
