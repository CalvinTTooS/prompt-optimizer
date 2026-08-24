import { invoke } from '@tauri-apps/api/core';
import JSZip from 'jszip';

// Both actions open their native dialog inside Rust (the `save_scaffold_to_dir`
// and `save_binary_file` commands), so the frontend never handles a filesystem
// path — the OS dialog is the consent gate and there is no client-supplied
// destination to abuse.

/**
 * Lets the user pick a project directory (native dialog, opened in Rust) and
 * writes every scaffold file into it, creating subdirectories as needed.
 * Returns `false` if the user cancels the picker.
 */
export async function writeScaffoldToDir(files: Record<string, string>): Promise<boolean> {
  return invoke('save_scaffold_to_dir', { files });
}

/**
 * Builds a zip archive of the scaffold (subfolders preserved) and saves it to a
 * user-chosen path (native dialog opened in Rust). Returns `false` if the user
 * cancels the save dialog.
 */
export async function downloadScaffoldZip(files: Record<string, string>): Promise<boolean> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return invoke('save_binary_file', { name: 'claude-scaffold.zip', bytes: Array.from(bytes) });
}
