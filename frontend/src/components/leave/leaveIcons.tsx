// 休暇管理(カレンダー・一覧)用の線画アイコン。24px 枠・色は currentColor、装飾なので aria-hidden。大きさは呼び出し側で指定する
import type { ReactNode } from 'react';

interface IconProps {
  className?: string;
}

function Icon({ children, className }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? 'size-full'}
    >
      {children}
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </Icon>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m15 6-6 6 6 6" />
    </Icon>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

// 有給などの休暇(かばん)
export function BagIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="4" y="8" width="16" height="12" rx="2.5" />
      <path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8" />
    </Icon>
  );
}

// 特別休暇(葉)
export function LeafIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14" />
      <path d="M5 19c2.5-4 5.5-7 9-9" />
    </Icon>
  );
}

export function UserCircleIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 18c1-2.5 3-3.5 5.5-3.5s4.5 1 5.5 3.5" />
    </Icon>
  );
}

export function CalendarSmallIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v3M15.5 3.5v3" />
    </Icon>
  );
}

export function ClipboardCheckSummaryIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <rect x="5" y="4.5" width="14" height="16" rx="2.5" />
      <path d="M9 4.5h6M9 13l2.2 2.2L15.5 11" />
    </Icon>
  );
}

export function XCircleIcon({ className }: IconProps) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </Icon>
  );
}
