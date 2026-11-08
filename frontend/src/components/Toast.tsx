'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type ToastVariant = 'success' | 'error';

interface ToastState {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

// 表示してから自動で消えるまでの時間
const TOAST_DURATION_MS = 4000;

const ToastContext = createContext<ToastContextValue | null>(null);

// 09 の浮動通知: 画面上部に 1 件だけ表示し、一定時間で消す。
// 画面遷移しても消えないよう、layout に置く。
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  // 新しい通知は前の通知を置き換える(id で同じ文言の連続表示でもタイマーを掛け直す)
  const showToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    setToast((prev) => ({ id: (prev?.id ?? 0) + 1, message, variant }));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const variantClass =
    toast?.variant === 'error'
      ? 'border-danger-100 bg-danger-30'
      : 'border-success-100 bg-success-40';

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4"
      >
        {toast && (
          <p
            key={toast.id}
            className={`max-w-120 rounded border px-4 py-3 text-sm/5 text-general-100 shadow-card ${variantClass}`}
          >
            {toast.message}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error('useToast は ToastProvider の内側で使ってください。');
  }
  return value;
}
