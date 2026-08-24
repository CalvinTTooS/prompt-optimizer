import { exists, mkdir, remove, writeTextFile } from '@tauri-apps/plugin-fs';
import { appConfigDir, join } from '@tauri-apps/api/path';

/**
 * Presence of this empty file in the app config dir enables verbose logging
 * at the next launch (checked by the Rust backend at startup, before any
 * window exists) — the same mechanism this module toggles from the UI.
 */
export const DEBUG_SWITCH_FILE_NAME = 'debug.on';

async function getDebugSwitchPath(): Promise<string> {
  return join(await appConfigDir(), DEBUG_SWITCH_FILE_NAME);
}

export async function isDebugSwitchEnabled(): Promise<boolean> {
  return exists(await getDebugSwitchPath());
}

export async function setDebugSwitchEnabled(enabled: boolean): Promise<void> {
  const path = await getDebugSwitchPath();

  if (enabled) {
    await mkdir(await appConfigDir(), { recursive: true });
    await writeTextFile(path, '');
  } else if (await exists(path)) {
    await remove(path);
  }
}
