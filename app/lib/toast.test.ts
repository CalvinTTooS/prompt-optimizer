import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast, subscribe, getToasts, dismissToast } from './toast';

beforeEach(() => {
  for (const t of [...getToasts()]) dismissToast(t.id); // svuota lo store residuo
});

describe('toast store', () => {
  it('error/success/info aggiungono un item col kind giusto', () => {
    toast.error('E'); toast.success('S'); toast.info('I');
    expect(getToasts().map((t) => `${t.kind}:${t.message}`)).toEqual(['error:E', 'success:S', 'info:I']);
  });
  it('subscribe è notificato al push e al dismiss', () => {
    const fn = vi.fn();
    const unsub = subscribe(fn);
    const id = toast.info('X');
    expect(fn).toHaveBeenCalledTimes(1);
    dismissToast(id);
    expect(fn).toHaveBeenCalledTimes(2);
    unsub();
  });
  it('dismissToast rimuove per id; getToasts stabile se nulla cambia', () => {
    const id = toast.info('Y');
    const before = getToasts();
    dismissToast(999);
    expect(getToasts()).toBe(before);
    dismissToast(id);
    expect(getToasts().length).toBe(0);
  });
  it('auto-dismiss dopo il timeout', () => {
    vi.useFakeTimers();
    toast.success('Z');
    expect(getToasts().length).toBe(1);
    vi.advanceTimersByTime(4000);
    expect(getToasts().length).toBe(0);
    vi.useRealTimers();
  });
});
