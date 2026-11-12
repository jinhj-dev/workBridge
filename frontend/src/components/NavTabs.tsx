'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export interface NavTabItem {
  href: string;
  label: string;
  // ラベル右の補助表示(件数など)
  badge?: ReactNode;
}

interface NavTabsProps {
  label: string;
  items: NavTabItem[];
}

// パス基準のタブ(画面遷移を伴う)。選択中は Bold + primary-100 + 下 3px の線、下に区切り線。
// あふれたときはタブの行だけが横スクロールする(ページは横スクロールさせない)
export function NavTabs({ label, items }: NavTabsProps) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="overflow-x-auto border-b border-general-40">
      <ul className="flex min-w-max gap-5 sm:gap-8">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-13 items-center gap-2 text-base/6 whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-100 md:text-lg/7 ${
                  active
                    ? 'font-bold text-primary-100'
                    : 'font-medium text-general-80 hover:text-general-100'
                }`}
              >
                {item.label}
                {item.badge}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-primary-100"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
