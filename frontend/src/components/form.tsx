import type { ReactNode } from 'react';
import { messages } from '@/messages/ja';

// ログイン・パスワード変更などのカード型フォームで共通に使う見た目
// フォーカスリングは内側に描く(外側の box-shadow は小数倍率でフォーカス解除後に残像が残るため)
// 高さ・左右余白・文字サイズを除いた入力欄の共通クラス(これらを変える入力欄は inputClass と衝突しないようこちらを使い、各自で指定する)
export const inputBaseClass =
  'w-full rounded-lg border border-input-border bg-white text-general-100 outline-none focus-visible:border-primary-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-100 aria-invalid:border-danger-100 aria-invalid:focus-visible:ring-danger-100';

export const inputClass = `h-12 px-4 text-base/6 ${inputBaseClass}`;

// 09 §3 Dropdown(Regular)。Input と同じ高さ・枠線
export const selectClass = `${inputClass} cursor-pointer`;

// 複数行入力(理由など)。Input と同じ枠線・フォーカス表示
export const textareaClass =
  'w-full resize-y rounded-lg border border-input-border bg-white px-4 py-3 text-base/6 text-general-100 outline-none focus-visible:border-primary-100 focus-visible:ring-2 focus-visible:ring-primary-100 focus-visible:ring-inset aria-invalid:border-danger-100 aria-invalid:focus-visible:ring-danger-100';

// IconField の中に置く入力欄に足す余白(左にアイコン、右にあれば右も空ける)
export const iconInputClass = 'pl-11';
export const iconInputTrailingClass = 'pr-11';

// 入力欄の左(必要なら右)に装飾アイコンを重ねる枠。アイコンはクリックを通さない。
// align="top" は複数行入力用(アイコンを 1 行目に合わせる)
export function IconField({
  icon,
  trailing,
  align = 'center',
  children,
}: {
  icon: ReactNode;
  trailing?: ReactNode;
  align?: 'center' | 'top';
  children: ReactNode;
}) {
  const position = align === 'top' ? 'top-3' : 'top-1/2 -translate-y-1/2';
  const iconClass = `pointer-events-none absolute ${position} text-general-70 [&>svg]:size-5`;
  return (
    <div className="relative">
      <span aria-hidden="true" className={`${iconClass} left-4`}>
        {icon}
      </span>
      {children}
      {trailing && (
        <span aria-hidden="true" className={`${iconClass} right-4`}>
          {trailing}
        </span>
      )}
    </div>
  );
}

export const labelClass = 'mb-1 block text-sm/5 font-medium text-general-80';

// 確認モーダル本文の文言
export const confirmMessageClass = 'break-words text-general-100';

export function ErrorIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="mt-0.5 size-5 shrink-0 text-danger-100"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7.5v5.5M12 16.5v.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="mt-1 flex items-start gap-1.5 text-sm/5 text-general-100">
      <ErrorIcon />
      {message}
    </p>
  );
}

// 必須項目の印。意味はコントロールの aria-required で伝えるため読み上げ対象から外す
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-1 font-bold text-danger-100">
      *
    </span>
  );
}

// 入力欄の下に置く補足(形式の説明など)
export function FieldHint({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1 text-xs/4 text-general-80">
      {children}
    </p>
  );
}

// 文字数カウンター。左にエラー(あれば)、右に「n/max」。length の数え方は呼び出し側が決める
export function CharCount({
  id,
  length,
  max,
  error,
}: {
  id: string;
  length: number;
  max: number;
  error?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>{error}</div>
      <p
        id={id}
        className={`mt-1 shrink-0 text-sm/5 tabular-nums ${length > max ? 'font-medium text-danger-100' : 'text-general-80'}`}
      >
        {messages.common.charCount(length, max)}
      </p>
    </div>
  );
}
