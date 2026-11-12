import type { ReactNode } from 'react';

// フォームモーダルの先頭に置く読み取り専用の要約(社員名・勤務日など)。行は ReadOnlySummaryItem で並べる
export function ReadOnlySummary({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl
      className={`grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-general-30 px-5 py-4 text-sm/5 ${className ?? ''}`}
    >
      {children}
    </dl>
  );
}

export function ReadOnlySummaryItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-general-80">{label}</dt>
      <dd className="min-w-0 wrap-anywhere text-general-100">{children}</dd>
    </>
  );
}
