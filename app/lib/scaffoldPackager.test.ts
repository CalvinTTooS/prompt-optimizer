import { describe, expect, test, vi, beforeEach } from 'vitest';

const invoke = vi.fn();

const zipFile = vi.fn();
const generateAsync = vi.fn();
class MockJSZip {
  file = zipFile;
  generateAsync = generateAsync;
}

vi.mock('@tauri-apps/api/core', () => ({ invoke }));
vi.mock('jszip', () => ({ default: MockJSZip }));

const { writeScaffoldToDir, downloadScaffoldZip } = await import('./scaffoldPackager');

const FILES = {
  'CLAUDE.md': 'claude content',
  'METHOD.md': 'method content',
  'profiles/desktop.md': 'desktop content',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('writeScaffoldToDir', () => {
  test('hands the whole file set to the Rust command (which opens the dir picker and writes)', async () => {
    invoke.mockResolvedValue(true);

    const result = await writeScaffoldToDir(FILES);

    expect(invoke).toHaveBeenCalledWith('save_scaffold_to_dir', { files: FILES });
    expect(result).toBe(true);
  });

  test('returns false when the Rust command reports the picker was cancelled', async () => {
    invoke.mockResolvedValue(false);

    const result = await writeScaffoldToDir(FILES);

    expect(result).toBe(false);
  });
});

describe('downloadScaffoldZip', () => {
  test('adds every file to the zip (subfolders preserved) and hands the bytes to the Rust save command', async () => {
    const fakeBytes = new Uint8Array([1, 2, 3]);
    generateAsync.mockResolvedValue(fakeBytes);
    invoke.mockResolvedValue(true);

    const result = await downloadScaffoldZip(FILES);

    expect(zipFile).toHaveBeenCalledWith('CLAUDE.md', 'claude content');
    expect(zipFile).toHaveBeenCalledWith('profiles/desktop.md', 'desktop content');
    expect(generateAsync).toHaveBeenCalledWith({ type: 'uint8array' });
    expect(invoke).toHaveBeenCalledWith('save_binary_file', { name: 'claude-scaffold.zip', bytes: [1, 2, 3] });
    expect(result).toBe(true);
  });

  test('returns false when the Rust command reports the save dialog was cancelled', async () => {
    generateAsync.mockResolvedValue(new Uint8Array([1]));
    invoke.mockResolvedValue(false);

    const result = await downloadScaffoldZip(FILES);

    expect(result).toBe(false);
  });
});
