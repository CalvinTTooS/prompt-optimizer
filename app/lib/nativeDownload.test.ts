import { describe, expect, test, vi, beforeEach } from 'vitest';

const invoke = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({ invoke }));

const { saveTextFile } = await import('./nativeDownload');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('saveTextFile', () => {
  test('invokes the Rust save command with the suggested filename and content', async () => {
    invoke.mockResolvedValue(true);

    const result = await saveTextFile('task.md', '# Claude Code Task\n\nhello');

    expect(invoke).toHaveBeenCalledWith('save_text_file', { name: 'task.md', content: '# Claude Code Task\n\nhello' });
    expect(result).toBe(true);
  });

  test('returns false when the Rust command reports the dialog was cancelled', async () => {
    invoke.mockResolvedValue(false);

    const result = await saveTextFile('task.md', 'content');

    expect(result).toBe(false);
  });
});
