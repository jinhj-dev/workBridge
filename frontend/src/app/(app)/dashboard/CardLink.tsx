import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonClass } from '@/components/Button';
import { ChevronRightIcon } from './icons';

// カード見出し右の「すべて見る >」リンク(参照デザインの矢印付き)
export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClass({ variant: 'text', withIcon: true })}>
      {children}
      <span aria-hidden="true" className="size-4 [&>svg]:size-full">
        <ChevronRightIcon />
      </span>
    </Link>
  );
}
