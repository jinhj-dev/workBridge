import type { ReactNode } from 'react';

// 入力欄の下などに置く補足の案内帯(primary-30 の背景 + 情報アイコン)。長い文は折り返す
export function InfoNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-primary-30 px-4 py-3 text-sm/5 font-medium text-general-100">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="size-5 shrink-0 text-primary-100"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5.5M12 7.5v.01" />
      </svg>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
