import type { BadgeVariant } from '@/components/Badge';
import type { AttendanceStatus } from '@/lib/api/types';

// 退勤漏れの行は薄い赤で強調する(バッジと同色にならないよう濃度を下げる)
export const MISSING_ROW_CLASS = 'bg-danger-30/40';

// 勤怠の状態バッジ(SCR-003・SCR-008)。文言は messages.attendance.statuses
export const ATTENDANCE_STATUS_BADGE: Record<AttendanceStatus, BadgeVariant> = {
  WORKING: 'success',
  DONE: 'neutral',
  MISSING_CLOCK_OUT: 'danger',
};
