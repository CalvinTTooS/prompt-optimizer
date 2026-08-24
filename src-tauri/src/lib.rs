// Must match `identifier` in tauri.conf.json — duplicated here because this
// check runs before the Tauri app (and its config-derived path resolver)
// exists.
const APP_IDENTIFIER: &str = "com.prompt.optimizer";
const DEBUG_SWITCH_FILE_NAME: &str = "debug.on";

/// Presence of an empty `debug.on` file in the app's config dir
/// (`%APPDATA%\com.prompt.optimizer\` on Windows) enables verbose logging at
/// startup, without requiring the terminal — the file can be created by hand
/// via File Explorer, or via the in-app toggle (`app/lib/debugSwitch.ts`),
/// which writes to the same path.
fn is_debug_switch_active() -> bool {
  std::env::var("APPDATA")
    .map(|appdata| {
      std::path::Path::new(&appdata)
        .join(APP_IDENTIFIER)
        .join(DEBUG_SWITCH_FILE_NAME)
        .exists()
    })
    .unwrap_or(false)
}

// File-save commands: the native dialog is opened HERE, in Rust — the frontend
// never supplies a destination path, only the content to write. This removes
// the "arbitrary file write from client parameters" surface entirely (there is
// no client-controlled path), while the OS dialog remains the consent gate.
use std::collections::HashMap;
use std::path::{Component, Path};
use tauri_plugin_dialog::DialogExt;

/// A scaffold entry name is safe only if it is a relative path made purely of
/// normal components — no absolute root, no drive prefix, no `..` — so joining
/// it onto the chosen folder can never escape that folder (path traversal).
fn is_safe_relative(name: &str) -> bool {
  !name.is_empty() && Path::new(name).components().all(|c| matches!(c, Component::Normal(_)))
}

#[tauri::command]
async fn save_text_file(app: tauri::AppHandle, name: String, content: String) -> Result<bool, String> {
  let Some(file) = app.dialog().file().set_file_name(&name).blocking_save_file() else {
    return Ok(false);
  };
  let path = file.into_path().map_err(|e| e.to_string())?;
  std::fs::write(&path, content).map_err(|e| e.to_string())?;
  Ok(true)
}

#[tauri::command]
async fn save_binary_file(app: tauri::AppHandle, name: String, bytes: Vec<u8>) -> Result<bool, String> {
  let Some(file) = app.dialog().file().set_file_name(&name).blocking_save_file() else {
    return Ok(false);
  };
  let path = file.into_path().map_err(|e| e.to_string())?;
  std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
  Ok(true)
}

#[tauri::command]
async fn save_scaffold_to_dir(app: tauri::AppHandle, files: HashMap<String, String>) -> Result<bool, String> {
  let Some(folder) = app.dialog().file().blocking_pick_folder() else {
    return Ok(false);
  };
  let base = folder.into_path().map_err(|e| e.to_string())?;
  for (name, content) in &files {
    if !is_safe_relative(name) {
      return Err(format!("percorso di file non valido: {name}"));
    }
    let path = base.join(name);
    if let Some(parent) = path.parent() {
      std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
  }
  Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let verbose_logging = cfg!(debug_assertions) || is_debug_switch_active();

  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_store::Builder::default().build())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_http::init())
    .plugin(
      tauri_plugin_log::Builder::default()
        .level(if verbose_logging {
          log::LevelFilter::Debug
        } else {
          log::LevelFilter::Info
        })
        .build(),
    );

  let builder = builder.invoke_handler(tauri::generate_handler![
    save_text_file,
    save_binary_file,
    save_scaffold_to_dir
  ]);

  builder
    .setup(|_app| Ok(()))
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
  use super::is_safe_relative;

  #[test]
  fn accepts_plain_relative_scaffold_names() {
    assert!(is_safe_relative("CLAUDE.md"));
    assert!(is_safe_relative("profiles/desktop.md"));
  }

  #[test]
  fn rejects_traversal_absolute_and_empty_names() {
    assert!(!is_safe_relative(""));
    assert!(!is_safe_relative("../secret"));
    assert!(!is_safe_relative("profiles/../../secret"));
    assert!(!is_safe_relative("/etc/passwd"));
    assert!(!is_safe_relative("C:\\Windows\\System32\\x"));
  }
}
