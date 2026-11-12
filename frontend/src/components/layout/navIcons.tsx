// アプリ枠(サイドバー・上部バー・下部タブ)用アイコン。24px 枠・線画・色は currentColor、装飾なので aria-hidden
import type { ReactNode } from 'react';

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-full"
    >
      {children}
    </svg>
  );
}

export function HomeIcon() {
  return (
    <Icon>
      <path d="M4 11l8-6.5 8 6.5" />
      <path d="M6 9.5V19a1 1 0 0 0 1 1h3.5v-5.5h3V20H17a1 1 0 0 0 1-1V9.5" />
    </Icon>
  );
}

export function CalendarCheckIcon() {
  return (
    <Icon>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3.5v3M16 3.5v3M9 15l2 2 4-4" />
    </Icon>
  );
}

export function UmbrellaIcon() {
  return (
    <Icon>
      <path d="M3 12a9 9 0 0 1 18 0z" />
      <path d="M12 12v6.5a2 2 0 0 0 4 0" />
    </Icon>
  );
}

export function ClipboardCheckIcon() {
  return (
    <Icon>
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <path d="M9 4.5V3.5h6v1M9 13l2 2 4-4.5" />
    </Icon>
  );
}

export function UsersIcon() {
  return (
    <Icon>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.3c2 .8 3.5 2.6 3.5 5.7" />
    </Icon>
  );
}

export function BuildingIcon() {
  return (
    <Icon>
      <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
      <path d="M9 8h2M13 8h2M9 12h2M13 12h2M10 20.5v-4h4v4" />
    </Icon>
  );
}

export function ClockIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Icon>
  );
}

export function BellIcon() {
  return (
    <Icon>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </Icon>
  );
}

export function UserIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
    </Icon>
  );
}

export function ChevronDownIcon() {
  return (
    <Icon>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  );
}

export function MenuIcon() {
  return (
    <Icon>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  );
}
