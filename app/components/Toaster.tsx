'use client';
import { useSyncExternalStore } from 'react';
import { subscribe, getToasts, dismissToast, type ToastKind } from '../lib/toast';

const KIND_CLASS: Record<ToastKind, string> = {
  success: 'bg-green-600 border-green-700',
  error: 'bg-red-600 border-red-700',
  info: 'bg-gray-800 border-gray-900',
};

export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, getToasts, getToasts);
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismissToast(t.id)}
          className={`text-left text-white text-sm font-bold px-4 py-3 rounded-xl shadow-lg border ${KIND_CLASS[t.kind]}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
