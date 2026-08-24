import { invoke } from '@tauri-apps/api/core';

/**
 * Saves `content` to a file the user chooses in a native "Save As" dialog. The
 * dialog is opened by the Rust `save_text_file` command (which also does the
 * write), so the frontend never handles a filesystem path — no arbitrary-write
 * surface. Returns `false` if the user cancels the dialog.
 */
export async function saveTextFile(defaultFileName: string, content: string): Promise<boolean> {
  return invoke('save_text_file', { name: defaultFileName, content });
}
