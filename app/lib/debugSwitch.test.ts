import { describe, expect, test, vi, beforeEach } from 'vitest';

const existsFn = vi.fn();
const mkdirFn = vi.fn();
const writeTextFileFn = vi.fn();
const removeFn = vi.fn();
const appConfigDirFn = vi.fn();
const joinFn = vi.fn();

vi.mock('@tauri-apps/plugin-fs', () => ({
  exists: existsFn,
  mkdir: mkdirFn,
  writeTextFile: writeTextFileFn,
  remove: removeFn,
}));
vi.mock('@tauri-apps/api/path', () => ({
  appConfigDir: appConfigDirFn,
  join: joinFn,
}));

const { isDebugSwitchEnabled, setDebugSwitchEnabled, DEBUG_SWITCH_FILE_NAME } = await import('./debugSwitch');

beforeEach(() => {
  vi.clearAllMocks();
  appConfigDirFn.mockResolvedValue('C:\\Users\\me\\AppData\\Roaming\\com.prompt.optimizer');
  joinFn.mockImplementation(async (...parts: string[]) => parts.join('\\'));
});

describe('isDebugSwitchEnabled', () => {
  test('returns true when the switch file exists in the app config dir', async () => {
    existsFn.mockResolvedValue(true);

    const result = await isDebugSwitchEnabled();

    expect(joinFn).toHaveBeenCalledWith('C:\\Users\\me\\AppData\\Roaming\\com.prompt.optimizer', DEBUG_SWITCH_FILE_NAME);
    expect(existsFn).toHaveBeenCalledWith('C:\\Users\\me\\AppData\\Roaming\\com.prompt.optimizer\\debug.on');
    expect(result).toBe(true);
  });

  test('returns false when the switch file does not exist', async () => {
    existsFn.mockResolvedValue(false);

    const result = await isDebugSwitchEnabled();

    expect(result).toBe(false);
  });
});

describe('setDebugSwitchEnabled', () => {
  test('enabling it creates the config dir and writes an empty marker file', async () => {
    await setDebugSwitchEnabled(true);

    expect(mkdirFn).toHaveBeenCalledWith('C:\\Users\\me\\AppData\\Roaming\\com.prompt.optimizer', { recursive: true });
    expect(writeTextFileFn).toHaveBeenCalledWith('C:\\Users\\me\\AppData\\Roaming\\com.prompt.optimizer\\debug.on', '');
  });

  test('disabling it removes the marker file when present', async () => {
    existsFn.mockResolvedValue(true);

    await setDebugSwitchEnabled(false);

    expect(removeFn).toHaveBeenCalledWith('C:\\Users\\me\\AppData\\Roaming\\com.prompt.optimizer\\debug.on');
  });

  test('disabling it is a no-op when the marker file is already absent', async () => {
    existsFn.mockResolvedValue(false);

    await setDebugSwitchEnabled(false);

    expect(removeFn).not.toHaveBeenCalled();
  });
});
