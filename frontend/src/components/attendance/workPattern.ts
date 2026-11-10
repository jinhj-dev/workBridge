import type { BadgeVariant } from '@/components/Badge';
import type { WorkPatternKind } from '@/lib/attendance-sheet';

// 出勤簿の勤務パターン Pill の色(SCR-003)。文言は messages.attendance.sheet / messages.leave.types
export const WORK_PATTERN_BADGE: Record<WorkPatternKind, BadgeVariant> = {
  NORMAL: 'neutral',
  DAY_OFF: 'danger',
  HOLIDAY: 'danger',
  LEAVE: 'success',
};
