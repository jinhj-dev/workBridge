import type { LeaveStatus, LeaveType } from '../../generated/prisma/client.js';
import { toUserSummary } from '../../common/mappers/user-summary.js';
import type { UserSummary } from '../../common/mappers/user-summary.js';
import { formatTokyoDateTime, fromDbDate } from '../../common/time/tokyo-date.js';
import type { LeaveRow } from './leaves.repository.js';

// docs/06 §0 の Leave
export interface LeaveResponse {
  id: string;
  user: UserSummary;
  approver: UserSummary | null;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  autoApproved: boolean;
  processedBy: UserSummary | null;
  processedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
}

export function toLeaveResponse(row: LeaveRow): LeaveResponse {
  return {
    id: row.id,
    user: toUserSummary(row.user),
    approver: row.approver ? toUserSummary(row.approver) : null,
    leaveType: row.leaveType,
    startDate: fromDbDate(row.startDate),
    endDate: fromDbDate(row.endDate),
    days: row.days.toNumber(),
    reason: row.reason,
    status: row.status,
    // 即時承認の申請は状態に関係なく approver_id IS NULL で判別する(docs/05 §6)
    autoApproved: row.approverId === null,
    processedBy: row.processor ? toUserSummary(row.processor) : null,
    processedAt: row.processedAt ? formatTokyoDateTime(row.processedAt) : null,
    rejectReason: row.rejectReason,
    createdAt: formatTokyoDateTime(row.createdAt),
  };
}
