'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDownIcon } from './navIcons';

export interface SidebarSubmenuItem {
  href: string;
  label: string;
}

interface SidebarSubmenuProps {
  label: string;
  icon: ReactNode;
  // 配下の画面の URL の共通の接頭辞。このパス配下にいるときは自動で開く
  basePath: string;
  items: SidebarSubmenuItem[];
  // メニューを選んだとき(ドロワーを閉じるため)
  onNavigate?: () => void;
  // 親項目の右(開閉の矢印の左)に出す補助表示(承認待ち件数など)
  badge?: ReactNode;
}

// 親項目と同じ高さ・余白の行(09 §2.3 サイドバーメニュー)
const rowClass =
  'mx-4 flex items-center rounded-lg px-4 text-sm/5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100';

// サイドバーの開閉式サブメニュー。親項目の押下で下へ開閉し、配下の画面にいるときは自動で開く
export function SidebarSubmenu({
  label,
  icon,
  basePath,
  items,
  onNavigate,
  badge,
}: SidebarSubmenuProps) {
  const pathname = usePathname();
  const listId = useId();
  const inGroup = pathname === basePath || pathname.startsWith(`${basePath}/`);

  const [open, setOpen] = useState(inGroup);
  // 配下の画面へ入った(直接アクセス・戻る/進む・他メニューからの遷移)ときに開く。
  // 開いている間に利用者が閉じた状態は、画面を移るまで保つ
  const [wasInGroup, setWasInGroup] = useState(inGroup);
  if (inGroup !== wasInGroup) {
    setWasInGroup(inGroup);
    if (inGroup) setOpen(true);
  }

  // 閉じていて配下の画面にいるとき、親項目で現在地を示す
  const parentActive = inGroup && !open;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={listId}
        className={`${rowClass} h-11 w-[calc(100%-2rem)] justify-between gap-2 ${
          parentActive
            ? 'bg-primary-30 text-primary-100'
            : `hover:bg-general-30 ${inGroup ? 'text-primary-100' : 'text-general-100'}`
        }`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="size-5 shrink-0">
            {icon}
          </span>
          {label}
        </span>
        <span className="flex items-center gap-2">
          {badge}
          <span
            aria-hidden="true"
            className={`size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
              open ? 'rotate-180' : ''
            }`}
          >
            <ChevronDownIcon />
          </span>
        </span>
      </button>
      {/* 高さを 0fr ↔ 1fr で動かして開閉する。閉じている間は inert と invisible でフォーカス・読み上げ・表示の対象から外す(invisible は閉じ切ってから効く) */}
      <div
        id={listId}
        inert={!open}
        className={`grid transition-[grid-template-rows,opacity,visibility] duration-200 ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0'
        }`}
      >
        <ul className="min-h-0 overflow-hidden">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`${rowClass} h-10 pl-12 ${
                    active
                      ? 'bg-primary-30 text-primary-100'
                      : 'text-general-100 hover:bg-general-30'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </li>
  );
}
