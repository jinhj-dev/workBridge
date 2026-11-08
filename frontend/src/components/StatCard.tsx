import Link from 'next/link';

interface StatCardProps {
  label: string;
  value: string;
  // 指定するとカード全体がリンクになる
  href?: string;
}

const baseClass = 'flex flex-col gap-1 rounded-md bg-white p-5 shadow-card';

// 09 §4 の stats カード: 項目名 + 数値(Heading 6)
export function StatCard({ label, value, href }: StatCardProps) {
  const content = (
    <>
      <span className="flex items-center justify-between gap-2 text-sm/5 text-general-80">
        {label}
        {href && (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="size-5 shrink-0">
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="text-h6 font-bold text-general-100 tabular-nums">{value}</span>
    </>
  );

  if (!href) return <div className={baseClass}>{content}</div>;
  return (
    <Link
      href={href}
      className={`${baseClass} transition-colors hover:bg-primary-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100`}
    >
      {content}
    </Link>
  );
}
