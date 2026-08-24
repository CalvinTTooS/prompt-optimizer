import { describe, expect, test, vi, beforeEach } from 'vitest';

const tauriError = vi.fn();
const tauriWarn = vi.fn();
const tauriInfo = vi.fn();

vi.mock('@tauri-apps/plugin-log', () => ({
  error: tauriError,
  warn: tauriWarn,
  info: tauriInfo,
}));

const { logger } = await import('./logger');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('logger', () => {
  test('error() writes to the console and forwards to the persistent Tauri log', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    tauriError.mockResolvedValue(undefined);

    logger.error('boom');

    expect(consoleSpy).toHaveBeenCalledWith('boom');
    expect(tauriError).toHaveBeenCalledWith('boom');

    consoleSpy.mockRestore();
  });

  test('does not throw when the native log bridge is unavailable (e.g. plain browser dev mode)', async () => {
    // Regression guard: logging must never be the thing that crashes the app.
    // In `npm run dev` (no Tauri runtime), the plugin call rejects — the
    // console line is still the source of truth for the developer.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    tauriError.mockRejectedValue(new Error('no Tauri runtime'));

    expect(() => logger.error('boom')).not.toThrow();
    // let the swallowed rejection's microtask settle before the test ends
    await Promise.resolve();
    await Promise.resolve();

    consoleSpy.mockRestore();
  });

  test('warn() and info() also forward to their matching Tauri log level', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    tauriWarn.mockResolvedValue(undefined);
    tauriInfo.mockResolvedValue(undefined);

    logger.warn('careful');
    logger.info('fyi');

    expect(tauriWarn).toHaveBeenCalledWith('careful');
    expect(tauriInfo).toHaveBeenCalledWith('fyi');

    warnSpy.mockRestore();
    infoSpy.mockRestore();
  });
});
