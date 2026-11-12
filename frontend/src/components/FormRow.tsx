import type { ReactNode } from 'react';
import { RequiredMark } from '@/components/form';

// 入力モーダル用の 1 行。sm 以上は左に項目名・右に入力欄の 2 列、sm 未満は項目名が上・入力欄が下の 1 列。
// 項目名は入力欄と同じ高さの中央に揃える(複数行入力でも 1 行目に合わせる)
export function FormRow({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-4">
      <div className="text-base/6 font-bold text-general-100 sm:pt-3">
        <label htmlFor={htmlFor}>{label}</label>
        {required && <RequiredMark />}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
