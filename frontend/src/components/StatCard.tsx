import Link from 'next/link';
import type { ReactNode } from 'react';

export type StatCardTone = 'primary' | 'danger';

interface StatCardProps {
  label: string;
  value: string;
  // 数値の右に小さく添える単位(名・件)
  unit?: string;
  // 左に置く装飾アイコン(aria-hidden のものを渡す)。指定すると色付きグラデーションの大きな表示になる
  icon?: ReactNode;
  // アイコンを白い円形の台に載せる(社員管理のレファレンス画像)。既定はアイコンのみ
  iconCircle?: boolean;
  // アイコン付きカードの背景色(primary: 淡い青 / danger: 淡いピンク)
  tone?: StatCardTone;
  // 指定するとカード全体がリンクになる
  href?: string;
  // 絞り込みの選択中(リンクのカードのみ。primary-100 の枠で示し、aria-current で伝える)
  selected?: boolean;
}

const plainClass = 'flex flex-col gap-1 rounded-md bg-white p-5 shadow-card';
const TONE_CLASS: Record<StatCardTone, string> = {
  primary: 'bg-linear-to-br from-white to-primary-30',
  danger: 'bg-linear-to-br from-white to-danger-30',
};
const iconCardClass =
  'grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 rounded-2xl border p-3 shadow-card-soft sm:gap-x-4 sm:px-6 sm:py-4';

// 09 §4 の stats カード: 項目名 + 数値。icon を渡すとダッシュボードの色付きカード(参照デザイン)になる
export function StatCard({
  label,
  value,
  unit,
  icon,
  iconCircle = false,
  tone = 'primary',
  href,
  selected = false,
}: StatCardProps) {
  const valueNode = (
    <span className="tabular-nums">
      {value}
      {unit && <span className="ml-1 text-base/6 font-bold sm:text-xl/7">{unit}</span>}
    </span>
  );

  if (!icon) {
    const plain = (
      <>
        <span className="text-sm/5 text-general-80">{label}</span>
        <span className="text-h6 font-bold text-general-100">{valueNode}</span>
      </>
    );
    if (!href) return <div className={plainClass}>{plain}</div>;
    return (
      <Link
        href={href}
        className={`${plainClass} transition-colors hover:bg-primary-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100`}
      >
        {plain}
      </Link>
    );
  }

  const className = `${iconCardClass} ${TONE_CLASS[tone]} ${selected ? 'border-primary-100 ring-1 ring-primary-100' : 'border-general-40'}`;
  const content = (
    <>
      <span
        aria-hidden="true"
        className={`text-primary-100 sm:row-span-2 ${iconCircle ? 'flex size-8 items-center justify-center rounded-full bg-white/70 p-1.5 sm:size-16 sm:p-4' : 'size-6 sm:size-10'} [&>svg]:size-full`}
      >
        {icon}
      </span>
      <span className="text-xs/4 font-bold text-general-100 sm:text-base/6">{label}</span>
      <span className="col-span-2 text-2xl/8 font-bold text-general-100 sm:col-span-1 sm:text-stat sm:leading-10">
        {valueNode}
      </span>
    </>
  );

  if (!href) return <div className={className}>{content}</div>;
  return (
    <Link
      href={href}
      aria-current={selected ? 'true' : undefined}
      className={`${className} transition-shadow hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100`}
    >
      {content}
    </Link>
  );
}
