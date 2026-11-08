'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { messages } from '@/messages/ja';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}

// 09 のモーダル規約: タイトル + 閉じる(X) + 本文 + 右寄せのボタン。
// <dialog> の showModal でフォーカストラップと Esc での閉じる操作をブラウザに任せる。
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  // open の変化を <dialog> の命令的 API に反映する
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClose={onClose}
      className="m-auto w-[calc(100%-2rem)] max-w-105 rounded-md bg-white p-7 text-general-100 shadow-card backdrop:bg-general-100/50"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id="modal-title" className="text-xl/7 font-bold">
          {title}
        </h2>
        <button
          type="button"
          aria-label={messages.common.close}
          onClick={onClose}
          className="-m-2 flex size-10 shrink-0 items-center justify-center rounded text-general-80 hover:bg-general-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-6">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <div className="mt-4 text-base/6 text-general-80">{children}</div>
      <div className="mt-6 flex justify-end gap-3">{footer}</div>
    </dialog>
  );
}
