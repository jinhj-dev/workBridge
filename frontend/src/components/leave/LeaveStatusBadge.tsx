import type { ReactNode } from 'react';
import { Badge } from '@/components/Badge';
import type { BadgeVariant } from '@/components/Badge';
import type { LeaveStatus } from '@/lib/api/types';
import { messages } from '@/messages/ja';

// 休暇ステータスの配色(一覧・フィルタ・出勤簿・詳細モーダルで共通)
export const LEAVE_STATUS_BADGE: Record<LeaveStatus, BadgeVariant> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

// 装飾用のアイコン(意味は文言で伝わるため aria-hidden)
const ICON_CLASS = 'size-4 shrink-0';

function StatusIcon({ status }: { status: LeaveStatus }) {
  const common = {
    'aria-hidden': true,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (status) {
    case 'APPROVED':
      return (
        <svg {...common} className={`${ICON_CLASS} text-success-100`}>
          <circle cx="8" cy="8" r="6.25" />
          <path d="M5.25 8.25l1.9 1.9 3.6-3.9" />
        </svg>
      );
    case 'PENDING':
      return (
        <svg {...common} className={`${ICON_CLASS} text-warning-100`}>
          <circle cx="8" cy="8" r="6.25" />
          <path d="M8 4.5V8l2.25 1.5" />
        </svg>
      );
    case 'REJECTED':
      return (
        <svg {...common} className={`${ICON_CLASS} text-danger-100`}>
          <circle cx="8" cy="8" r="6.25" />
          <path d="M5.75 5.75l4.5 4.5M10.25 5.75l-4.5 4.5" />
        </svg>
      );
    case 'CANCELLED':
      return (
        <svg {...common} className={`${ICON_CLASS} text-general-80`}>
          <circle cx="8" cy="8" r="6.25" />
          <path d="M3.6 12.4l8.8-8.8" />
        </svg>
      );
  }
}

// 休暇ステータスのバッジ(pill + アイコン)。children で文言を差し替えられる(出勤簿の「休暇 承認済み」)
export function LeaveStatusBadge({
  status,
  children,
}: {
  status: LeaveStatus;
  children?: ReactNode;
}) {
  return (
    <Badge variant={LEAVE_STATUS_BADGE[status]} shape="pill">
      <StatusIcon status={status} />
      {children ?? messages.leave.statuses[status]}
    </Badge>
  );
}
