import type { ReactNode } from 'react';

// ログイン・パスワード変更などのカード型フォームで共通に使う見た目
// フォーカスリングは内側に描く(外側の box-shadow は小数倍率でフォーカス解除後に残像が残るため)
export const inputClass =
  'h-12 w-full rounded-lg border border-input-border bg-white px-4 text-base/6 text-general-100 outline-none focus-visible:border-primary-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-100 aria-invalid:border-danger-100 aria-invalid:focus-visible:ring-danger-100';

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

export const primaryButtonClass =
  'rounded-lg bg-primary-100 font-bold text-white hover:bg-primary-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100';

// 09 §3 Button の White(アウトライン)。キャンセルなど主操作の隣に置く操作に使う
export const secondaryButtonClass =
  'rounded-lg border border-general-50 bg-white font-bold text-general-100 hover:bg-general-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100';

// 09 §3 Button の Primary アウトライン(白地 + primary の枠・文字)。主操作の次段階の操作(退勤など)に使う
export const primaryOutlineButtonClass =
  'rounded-lg border border-primary-100 bg-white font-bold text-primary-100 hover:bg-primary-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100 disabled:cursor-not-allowed disabled:border-general-50 disabled:text-general-60 disabled:hover:bg-white';

// 09 §3 Button の Danger アウトライン(白地 + danger の枠・文字)。削除など取り消せない操作の入口に使う
export const dangerOutlineButtonClass =
  'rounded-lg border border-danger-100 bg-white font-bold text-danger-100 hover:bg-danger-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-100 disabled:cursor-not-allowed disabled:border-general-50 disabled:text-general-60 disabled:hover:bg-white';

// モーダル footer のボタン(詳細・申請モーダル共通)。高さ 40
export const modalPrimaryButtonClass = `${primaryButtonClass} flex h-10 items-center justify-center gap-2 px-4 text-sm/5 disabled:cursor-not-allowed disabled:bg-primary-60`;
export const modalSecondaryButtonClass = `${secondaryButtonClass} h-10 px-4 text-sm/5`;

// 枠も背景もない文字だけのボタン(補助的な操作)。大きさ・余白は呼び出し側で指定する
export const textButtonClass =
  'rounded text-sm/5 font-medium text-primary-100 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100';

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
