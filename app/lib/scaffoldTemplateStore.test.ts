import { describe, expect, test, vi, beforeEach } from 'vitest';

const get = vi.fn();
const set = vi.fn();
const del = vi.fn();
const save = vi.fn();
const load = vi.fn(async () => ({ get, set, delete: del, save }));
vi.mock('@tauri-apps/plugin-store', () => ({ load }));

const {
  getScaffoldOverride, setScaffoldOverride, clearScaffoldOverride, getAllScaffoldOverrides,
} = await import('./scaffoldTemplateStore');

beforeEach(() => { vi.clearAllMocks(); });

describe('scaffoldTemplateStore', () => {
  test('get ritorna null se assente', async () => {
    get.mockResolvedValue(undefined);
    expect(await getScaffoldOverride('METHOD.md')).toBeNull();
  });
  test('set salva sotto la chiave del file', async () => {
    await setScaffoldOverride('CLAUDE.md', 'X');
    expect(set).toHaveBeenCalledWith('CLAUDE.md', 'X');
    expect(save).toHaveBeenCalled();
  });
  test('clear elimina la chiave', async () => {
    await clearScaffoldOverride('GEMINI.md');
    expect(del).toHaveBeenCalledWith('GEMINI.md');
    expect(save).toHaveBeenCalled();
  });
  test('getAll raccoglie solo gli override stringa presenti', async () => {
    get.mockImplementation(async (k: string) => (k === 'METHOD.md' ? 'M' : undefined));
    expect(await getAllScaffoldOverrides()).toEqual({ 'METHOD.md': 'M' });
  });
});
