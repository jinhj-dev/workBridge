'use client';

import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/Button';
import { messages } from '@/messages/ja';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  icon: ReactNode; // タイトル左のアイコン(24px。装飾なので aria-hidden。全モーダル必須)
  size?: 'md' | 'lg' | 'xl'; // md: 最大 420px(既定) / lg: 最大 640px / xl: 最大 800px(5 列の表など)
  subtitle?: ReactNode; // タイトル直下の補足(バッジなど)
  description?: ReactNode; // タイトル直下の説明文(あると dialog の aria-describedby に結びつく)
  iconVariant?: 'square' | 'circle'; // circle: 淡紫の円形アイコン(48px)。社員管理のモーダル用。既定は square
  busy?: boolean; // 送信中。Esc・閉じる(X)での閉じる操作を止める
}

const SIZE_CLASS = { md: 'max-w-105', lg: 'max-w-160', xl: 'max-w-200' } as const;

// 09 のモーダル規約: タイトル + 閉じる(X) + 本文 + フッターのボタン(モバイルは全幅/2 列、sm 以上は右寄せ+上に区切り線)。
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
  description,
  iconVariant = 'square',
  busy = false,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // 同じ画面に複数のモーダルがあっても見出しの id が重ならないようにする
  const titleId = useId();
  const descId = useId();
  // close イベントで最新の busy・open を読むための ref(open 用の effect より先に更新する)
  const busyRef = useRef(busy);
  const openRef = useRef(open);
  useEffect(() => {
    busyRef.current = busy;
    openRef.current = open;
  });

  // open の変化を <dialog> の命令的 API に反映する
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // 開いた直後の初期フォーカス。指定がなければブラウザの既定に任せる
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // 送信中は Esc を連続で押されても閉じない(Chrome の close watcher 対策で、閉じられたら開き直す)
  function handleClose() {
    const dialog = ref.current;
    if (busyRef.current && openRef.current && dialog && !dialog.open) {
      dialog.showModal();
      return;
    }
    onClose();
  }

  // md は確認・一覧向けに余白と見出しを一段小さくする
  const compact = size === 'md';
  const circle = iconVariant === 'circle';
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        if (busy) e.preventDefault();
      }}
      onClose={handleClose}
      // 閉じているとき(display: none)を壊さないよう flex は open:flex で指定する
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-1rem)] rounded-2xl shadow-card-soft sm:w-[calc(100%-2rem)] ${SIZE_CLASS[size]} flex-col bg-white p-0 text-general-100 backdrop:bg-general-100/50 open:flex`}
    >
      <div
        className={`flex shrink-0 items-start justify-between gap-4 px-5 pt-5 ${compact ? 'sm:px-7 sm:pt-7' : 'sm:px-8 sm:pt-8'}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className={`flex shrink-0 items-center justify-center text-primary-100 [&>svg]:size-6 ${circle ? 'size-12 rounded-full bg-violet-30' : 'size-10 rounded-md bg-primary-30'}`}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <h2
              id={titleId}
              className={compact ? 'text-h6 font-bold' : 'text-h6 font-bold sm:text-h5'}
            >
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-2 text-sm/5 text-general-80 sm:text-base/6">
                {description}
              </p>
            )}
            {subtitle && <div className="mt-1">{subtitle}</div>}
          </div>
        </div>
        <Button
          variant="ghost"
          iconOnly
          aria-label={messages.common.close}
          className="-m-2"
          disabled={busy}
          onClick={onClose}
          icon={
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          }
        />
      </div>
      <div
        className={`min-h-0 flex-1 overflow-y-auto px-5 text-base/6 text-general-80 ${compact ? 'mt-4 sm:px-7' : 'mt-6 sm:px-8'}`}
      >
        {children}
      </div>
      <div className={`shrink-0 px-5 pt-6 pb-5 ${compact ? 'sm:px-7 sm:pb-7' : 'sm:px-8 sm:pb-8'}`}>
        {/* ボタン数は DOM の子の数で判定する: 1 個=全幅 / 2 個=2 列 / 3 個以上=右寄せで折り返し。sm 以上は区切り線の下で右寄せ */}
        <div className="grid grid-cols-2 gap-3 has-[>:only-child]:grid-cols-1 has-[>:nth-child(3)]:flex has-[>:nth-child(3)]:flex-wrap has-[>:nth-child(3)]:justify-end sm:flex sm:flex-wrap sm:justify-end sm:border-t sm:border-general-40 sm:pt-5">
          {footer}
        </div>
      </div>
    </dialog>
  );
}
