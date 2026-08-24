import { describe, expect, test } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFewShotExamples, MAX_EXAMPLE_FILE_BYTES } from './useFewShotExamples';

describe('useFewShotExamples', () => {
  test('addExample appends a blank example', () => {
    const { result } = renderHook(() => useFewShotExamples());
    act(() => result.current.addExample());
    expect(result.current.examples).toEqual([{ content: '' }]);
  });

  test('updateExample sets the content by index', () => {
    const { result } = renderHook(() => useFewShotExamples());
    act(() => result.current.addExample());
    act(() => result.current.updateExample(0, 'CONTENUTO'));
    expect(result.current.examples[0]).toEqual({ content: 'CONTENUTO' });
  });

  test('removeExample drops the example at the index', () => {
    const { result } = renderHook(() => useFewShotExamples());
    act(() => result.current.addExample());
    act(() => result.current.updateExample(0, 'A'));
    act(() => result.current.addExample());
    act(() => result.current.removeExample(0));
    expect(result.current.examples).toEqual([{ content: '' }]);
  });

  test('loadFromFile populates the content with file text', async () => {
    const { result } = renderHook(() => useFewShotExamples());
    act(() => result.current.addExample());
    const file = new File(['CONTENUTO DA FILE'], 'ex.txt', { type: 'text/plain' });
    await act(async () => {
      await result.current.loadFromFile(0, file);
    });
    expect(result.current.examples[0].content).toBe('CONTENUTO DA FILE');
  });

  test('loadFromFile refuses a file over the size limit', async () => {
    const { result } = renderHook(() => useFewShotExamples());
    act(() => result.current.addExample());
    const big = new File(['x'.repeat(MAX_EXAMPLE_FILE_BYTES + 1)], 'big.txt', { type: 'text/plain' });
    let outcome: { loaded: boolean; reason?: string } = { loaded: true };
    await act(async () => {
      outcome = await result.current.loadFromFile(0, big);
    });
    expect(outcome).toEqual({ loaded: false, reason: 'oversize' });
    expect(result.current.examples[0].content).toBe('');
  });

  test('loadFromFile returns read-error and leaves state unchanged when the file cannot be read', async () => {
    const { result } = renderHook(() => useFewShotExamples());
    act(() => result.current.addExample());
    const bad = new File(['x'], 'bad.txt', { type: 'text/plain' });
    bad.text = () => Promise.reject(new Error('boom'));
    let outcome: { loaded: boolean; reason?: string } = { loaded: true };
    await act(async () => {
      outcome = await result.current.loadFromFile(0, bad);
    });
    expect(outcome).toEqual({ loaded: false, reason: 'read-error' });
    expect(result.current.examples[0].content).toBe('');
  });
});
