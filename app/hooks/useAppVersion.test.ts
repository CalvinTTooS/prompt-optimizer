import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@tauri-apps/api/app', () => ({ getVersion: vi.fn() }));

import { getVersion } from '@tauri-apps/api/app';
import { useAppVersion } from './useAppVersion';

beforeEach(() => {
  vi.mocked(getVersion).mockReset();
});

describe('useAppVersion', () => {
  it('espone la versione', async () => {
    vi.mocked(getVersion).mockResolvedValue('0.1.0');
    const { result } = renderHook(() => useAppVersion());
    await waitFor(() => expect(result.current.version).toBe('0.1.0'));
  });

  it('versione resta vuota se getVersion fallisce (runtime non-Tauri)', async () => {
    vi.mocked(getVersion).mockRejectedValue(new Error('not tauri'));
    const { result } = renderHook(() => useAppVersion());
    await waitFor(() => expect(getVersion).toHaveBeenCalled());
    expect(result.current.version).toBe('');
  });
});
