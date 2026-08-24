import { describe, expect, test, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const isDebugSwitchEnabled = vi.fn();
const setDebugSwitchEnabled = vi.fn();

vi.mock('../lib/debugSwitch', () => ({ isDebugSwitchEnabled, setDebugSwitchEnabled }));

const { useDebugLogging } = await import('./useDebugLogging');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useDebugLogging', () => {
  test('loads the current switch state on mount', async () => {
    isDebugSwitchEnabled.mockResolvedValue(true);

    const { result } = renderHook(() => useDebugLogging());

    await waitFor(() => expect(result.current.debugLoggingEnabled).toBe(true));
  });

  test('toggling persists the new state and updates immediately', async () => {
    isDebugSwitchEnabled.mockResolvedValue(false);
    setDebugSwitchEnabled.mockResolvedValue(undefined);
    const { result } = renderHook(() => useDebugLogging());
    await waitFor(() => expect(result.current.debugLoggingEnabled).toBe(false));

    await act(async () => {
      await result.current.handleToggleDebugLogging(true);
    });

    expect(setDebugSwitchEnabled).toHaveBeenCalledWith(true);
    expect(result.current.debugLoggingEnabled).toBe(true);
  });
});
