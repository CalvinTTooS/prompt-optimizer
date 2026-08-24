export type ToastKind = 'success' | 'error' | 'info';
export interface ToastItem { id: number; message: string; kind: ToastKind }

const DURATION_MS = 4000;
const listeners = new Set<() => void>();
let toasts: ToastItem[] = [];
let nextId = 1;

function emit(): void { for (const l of listeners) l(); }

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getToasts(): ToastItem[] { return toasts; }

export function dismissToast(id: number): void {
  const next = toasts.filter((t) => t.id !== id);
  if (next.length !== toasts.length) { toasts = next; emit(); }
}

function push(kind: ToastKind, message: string): number {
  const id = nextId++;
  toasts = [...toasts, { id, message, kind }];
  emit();
  if (typeof setTimeout !== 'undefined') setTimeout(() => dismissToast(id), DURATION_MS);
  return id;
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
  info: (message: string) => push('info', message),
};
