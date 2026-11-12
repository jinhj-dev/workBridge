// 部署管理専用のアイコン(24px 枠、色は currentColor、装飾なので aria-hidden)
import type { ReactNode } from 'react';

function Icon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function LayersIcon() {
  return (
    <Icon>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 16 9 5 9-5" />
    </Icon>
  );
}

export function BuildingIcon() {
  return (
    <Icon>
      <path d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h7A1.5 1.5 0 0 1 15 4.5V21" />
      <path d="M15 10h3.5A1.5 1.5 0 0 1 20 11.5V21" />
      <path d="M3 21h18" />
      <path d="M8.5 7h3M8.5 11h3M8.5 15h3" />
    </Icon>
  );
}

export function PeopleIcon() {
  return (
    <Icon>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.3c2 .8 3.5 2.6 3.5 5.7" />
    </Icon>
  );
}

export function ListIcon() {
  return (
    <Icon>
      <path d="M7 3h8l4 4v14H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M9.5 12h6M9.5 16h6M9.5 8h3" />
    </Icon>
  );
}

export function PencilIcon() {
  return (
    <Icon>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </Icon>
  );
}

export function TrashIcon() {
  return (
    <Icon>
      <path d="M4 7h16M10 3h4M6 7l1 13h10l1-13" />
      <path d="M10 11v5M14 11v5" />
    </Icon>
  );
}

// 昇順・降順の矢印(active のときだけ向きを濃く示す)
export function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
  return (
    <Icon className="size-4">
      <path d="m8 9 4-4 4 4" opacity={direction === 'desc' ? 0.35 : 1} />
      <path d="m8 15 4 4 4-4" opacity={direction === 'asc' ? 0.35 : 1} />
    </Icon>
  );
}
