import { describe, it, expect, vi, beforeEach } from 'vitest';

const storeSet = vi.fn();
const storeSave = vi.fn();
const storeGet = vi.fn();
vi.mock('@tauri-apps/plugin-store', () => ({
  load: async () => ({
    get: (...a: unknown[]) => storeGet(...a),
    set: (...a: unknown[]) => storeSet(...a),
    save: (...a: unknown[]) => storeSave(...a),
  }),
}));

import { getStoredRefineModel, setStoredRefineModel } from './claudeRefineBridge';

beforeEach(() => {
  storeGet.mockReset();
  storeSet.mockReset();
  storeSave.mockReset();
});

describe('getStoredRefineModel', () => {
  it('ritorna il valore valido dalla allowlist', async () => {
    storeGet.mockResolvedValueOnce('opus');
    const model = await getStoredRefineModel();
    expect(model).toBe('opus');
  });

  it('ritorna DEFAULT_REFINE_MODEL quando il valore è corrotto o undefined', async () => {
    storeGet.mockResolvedValueOnce('gpt-4');
    let model = await getStoredRefineModel();
    expect(model).toBe('sonnet');

    storeGet.mockResolvedValueOnce(undefined);
    model = await getStoredRefineModel();
    expect(model).toBe('sonnet');
  });
});

describe('setStoredRefineModel', () => {
  it('chiama store.set con il campo e il valore, poi store.save', async () => {
    await setStoredRefineModel('opus');
    expect(storeSet).toHaveBeenCalledWith('refineModel', 'opus');
    expect(storeSave).toHaveBeenCalled();
  });
});
