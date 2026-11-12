import Link from 'next/link';
import type { ReactNode } from 'react';
import { textButtonClass } from '@/components/form';
import { ChevronRightIcon } from './icons';

// カード見出し右の「すべて見る >」リンク(参照デザインの矢印付き)
export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={`${textButtonClass} flex items-center gap-0.5`}>
      {children}
      <span aria-hidden="true" className="size-4 [&>svg]:size-full">
        <ChevronRightIcon />
      </span>
    </Link>
  );
}
