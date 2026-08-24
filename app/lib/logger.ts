import * as tauriLog from '@tauri-apps/plugin-log';

type Level = 'trace' | 'debug' | 'info' | 'warn' | 'error';

function write(level: Level, message: string): void {
  console[level](message);

  // Best-effort: persist to the Tauri log file too. Swallowed on failure so
  // logging itself can never crash the app — this also covers `npm run dev`
  // in a plain browser, where there is no Tauri runtime to forward to.
  tauriLog[level](message).catch(() => {});
}

export const logger = {
  trace: (message: string) => write('trace', message),
  debug: (message: string) => write('debug', message),
  info: (message: string) => write('info', message),
  warn: (message: string) => write('warn', message),
  error: (message: string) => write('error', message),
};
