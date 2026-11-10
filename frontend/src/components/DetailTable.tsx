import type { ReactNode } from 'react';

// 項目名と値の 2 列表(詳細モーダルなど)。行は DetailTableRow で並べる
export function DetailTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dl className={`overflow-hidden rounded-md border border-general-40 ${className ?? ''}`}>
      {children}
    </dl>
  );
}

export function DetailTableRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] border-b border-general-40 last:border-b-0 sm:grid-cols-[10rem_1fr]">
      <dt className="bg-general-30 px-3 py-3 text-sm/5 font-medium text-general-80 sm:px-5">
        {label}
      </dt>
      <dd className="min-w-0 bg-white px-3 py-3 text-sm/5 break-words text-general-100 sm:px-5">
        {children}
      </dd>
    </div>
  );
}
