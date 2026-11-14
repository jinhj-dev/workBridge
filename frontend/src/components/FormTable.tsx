import type { ReactNode } from 'react';
import { tableFrameClass } from '@/components/DetailTable';
import { RequiredMark } from '@/components/form';

// 項目名と入力欄の 2 列表(入力モーダルなど)。行は FormTableRow で並べる。sm 未満は項目名が上、入力欄が下
export function FormTable({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`${tableFrameClass} ${className ?? ''}`}>{children}</div>;
}

interface FormTableRowProps {
  label: string;
  // コントロールがある行は htmlFor、ない行(読み取り専用・説明文)は labelId で項目名を結ぶ
  htmlFor?: string;
  labelId?: string;
  required?: boolean;
  children: ReactNode;
}

export function FormTableRow({ label, htmlFor, labelId, required, children }: FormTableRowProps) {
  const nameClass = 'text-sm/5 font-medium text-general-80';
  return (
    <div className="grid grid-cols-1 border-b border-general-40 last:border-b-0 sm:grid-cols-[10rem_1fr]">
      <div className="bg-general-30 px-3 py-2 sm:px-5 sm:pt-[26px] sm:pb-3">
        {htmlFor ? (
          <label htmlFor={htmlFor} className={nameClass}>
            {label}
          </label>
        ) : (
          <span id={labelId} className={nameClass}>
            {label}
          </span>
        )}
        {required && <RequiredMark />}
      </div>
      <div className="min-w-0 bg-white px-3 py-3 sm:px-5">{children}</div>
    </div>
  );
}

// 項目名を入力欄の上に置く縦積みの入力欄グループ(社員追加モーダルなど、レファレンス画像の配置)。行は FormStackRow で並べる
export function FormStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-4 ${className ?? ''}`}>{children}</div>;
}

export function FormStackRow({ label, htmlFor, labelId, required, children }: FormTableRowProps) {
  const nameClass = 'mb-1.5 block text-base/6 font-bold text-general-100';
  return (
    <div className="min-w-0">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={nameClass}>
          {label}
          {required && <RequiredMark />}
        </label>
      ) : (
        <span id={labelId} className={nameClass}>
          {label}
          {required && <RequiredMark />}
        </span>
      )}
      {children}
    </div>
  );
}
