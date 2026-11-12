// ダッシュボード専用のアイコン(24px 枠、色は currentColor、装飾なので aria-hidden)
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
    >
      {children}
    </svg>
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

export function UserCheckIcon() {
  return (
    <Icon>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16.5 9.5l2 2 3.5-4" />
    </Icon>
  );
}

export function InboxIcon() {
  return (
    <Icon>
      <path d="M4 13.5l2.4-7.2A2 2 0 0 1 8.3 5h7.4a2 2 0 0 1 1.9 1.3L20 13.5" />
      <path d="M4 13.5V18a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 18v-4.5h-4.5a3.5 3.5 0 0 1-7 0z" />
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

export function ChevronRightIcon() {
  return (
    <Icon>
      <path d="M9 6l6 6-6 6" />
    </Icon>
  );
}

export function SunIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </Icon>
  );
}

export function LaptopIcon() {
  return (
    <Icon>
      <rect x="4.5" y="5" width="15" height="10.5" rx="1.5" />
      <path d="M2.5 19h19M9.5 17.2h5" />
    </Icon>
  );
}

export function CheckIcon() {
  return (
    <Icon>
      <path d="M5.5 12.5l4.2 4.2L18.5 7.5" />
    </Icon>
  );
}

export function ClipboardCheckIcon() {
  return (
    <Icon>
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <path d="M9 4.5V3.5h6v1M8.5 11.5l1.3 1.3 2-2.3M13.5 12h2.5M8.5 16.5l1.3 1.3 2-2.3M13.5 17h2.5" />
    </Icon>
  );
}

export function PieChartIcon() {
  return (
    <Icon>
      <path d="M11 3.5a8.5 8.5 0 1 0 9.5 9.5H11z" />
      <path d="M14 3.7a8.5 8.5 0 0 1 6.3 6.3H14z" />
    </Icon>
  );
}

export function BarChartIcon() {
  return (
    <Icon>
      <rect x="3.5" y="11" width="4" height="9" rx="1" />
      <rect x="10" y="4" width="4" height="16" rx="1" />
      <rect x="16.5" y="8" width="4" height="12" rx="1" />
    </Icon>
  );
}

export function CalendarCheckIcon() {
  return (
    <Icon>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17M9 15l2 2 4-4" />
    </Icon>
  );
}

export function CalendarPlusIcon() {
  return (
    <Icon>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10h17M12 12.5v5M9.5 15h5" />
    </Icon>
  );
}

export function MoonIcon() {
  return (
    <Icon>
      <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />
    </Icon>
  );
}

export function CoffeeIcon() {
  return (
    <Icon>
      <path d="M5 9.5h11v5.5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 11h1.5a2 2 0 0 1 0 4H16M8.5 3.5v3M12 3.5v3" />
    </Icon>
  );
}

export function BriefcaseIcon() {
  return (
    <Icon>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
      <path d="M9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2M3.5 13h17M10.5 13v1.5h3V13" />
    </Icon>
  );
}

export function UmbrellaIcon() {
  return (
    <Icon>
      <path d="M3 11.5a9 9 0 0 1 18 0zM12 11.5v7a2 2 0 0 0 4 0M12 2.5v1" />
    </Icon>
  );
}

export function DocumentListIcon() {
  return (
    <Icon>
      <path d="M6 3.5h8.5L19 8v12.5H6z" />
      <path d="M14 3.5V8h5M9 12h7M9 15.5h7M9 19h4" />
    </Icon>
  );
}

export function UserIcon() {
  return (
    <Icon>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
    </Icon>
  );
}

export function ExitIcon() {
  return (
    <Icon>
      <path d="M13 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h6M10 12h10M16.5 8.5L20 12l-3.5 3.5" />
    </Icon>
  );
}

export function EnterIcon() {
  return (
    <Icon>
      <path d="M11 4.5h6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-6M4 12h10M10.5 8.5L14 12l-3.5 3.5" />
    </Icon>
  );
}
