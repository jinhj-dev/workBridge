'use client';

import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { messages } from '@/messages/ja';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  icon?: ReactNode; // タイトル左のアイコン(24px。装飾なので aria-hidden)
  size?: 'md' | 'lg' | 'xl'; // md: 最大 420px(既定) / lg: 最大 640px / xl: 最大 800px(5 列の表など)
  subtitle?: ReactNode; // タイトル直下の補足(バッジなど。variant="form" では説明文)
  // form: 入力フォーム用(大きな見出し・説明文・丸み 16。ボタンは sm 未満で 2 列の全幅、sm 以上は区切り線の下で右寄せ)
  variant?: 'default' | 'form';
}

const SIZE_CLASS = { md: 'max-w-105', lg: 'max-w-160', xl: 'max-w-200' } as const;

// 09 のモーダル規約: タイトル + 閉じる(X) + 本文 + 右寄せのボタン(上に区切り線)。
// 本文だけが縦スクロールし、ヘッダー・フッターは固定。外側クリックでは閉じない。
// <dialog> の showModal でフォーカストラップと Esc での閉じる操作をブラウザに任せる。
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  icon,
  size = 'md',
  subtitle,
  variant = 'default',
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // 同じ画面に複数のモーダルがあっても見出しの id が重ならないようにする
  const titleId = useId();

  // open の変化を <dialog> の命令的 API に反映する
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const form = variant === 'form';
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // 閉じているとき(display: none)を壊さないよう flex は open:flex で指定する
      className={`m-auto max-h-[calc(100dvh-2rem)] ${
        form
          ? 'w-[calc(100%-1rem)] rounded-2xl shadow-card-soft sm:w-[calc(100%-2rem)]'
          : 'w-[calc(100%-2rem)] rounded-md shadow-card'
      } ${SIZE_CLASS[size]} flex-col bg-white p-0 text-general-100 backdrop:bg-general-100/50 open:flex`}
    >
      <div
        className={`flex shrink-0 items-start justify-between gap-4 px-5 pt-5 ${form ? 'sm:px-8 sm:pt-8' : 'sm:px-7 sm:pt-7'}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-30 text-primary-100 [&>svg]:size-6"
            >
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h2
              id={titleId}
              className={form ? 'text-h6 font-bold sm:text-h5' : 'text-xl/7 font-bold'}
            >
              {title}
            </h2>
            {subtitle && (
              <div className={form ? 'mt-2 text-sm/5 text-general-80 sm:text-base/6' : 'mt-1'}>
                {subtitle}
              </div>
            )}
          </div>
        </div>
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
      <div
        className={`min-h-0 flex-1 overflow-y-auto px-5 text-base/6 text-general-80 ${form ? 'mt-6 sm:px-8' : 'mt-4 sm:px-7'}`}
      >
        {children}
      </div>
      {form ? (
        <div className="shrink-0 px-5 pt-6 pb-5 sm:px-8 sm:pb-8">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end sm:border-t sm:border-general-40 sm:pt-5">
            {footer}
          </div>
        </div>
      ) : (
        <div className="mt-6 flex shrink-0 flex-wrap justify-end gap-3 border-t border-general-40 px-5 py-4 sm:px-7">
          {footer}
        </div>
      )}
    </dialog>
  );
}
