import type { Role } from '../../generated/prisma/client.js';

// 年休残日数(API-LEAVE-006 の応答)
export interface LeaveBalance {
  year: number;
  grantedDays: number;
  approvedDays: number;
  pendingDays: number;
  remainingDays: number;
}

// 残日数 = 付与 − 承認済み − 承認待ち(FR-LEAVE-001)。付与が未登録なら grantedDays に 0 を渡す
export function calculateBalance(params: {
  year: number;
  grantedDays: number;
  approvedDays: number;
  pendingDays: number;
}): LeaveBalance {
  const { year, grantedDays, approvedDays, pendingDays } = params;
  return {
    year,
    grantedDays,
    approvedDays,
    pendingDays,
    remainingDays: grantedDays - approvedDays - pendingDays,
  };
}

// 承認・却下できる人か(FR-LEAVE-002)。申請者本人は ADMIN でも不可。
// 割り当てられた承認者か ADMIN なら可。状態(PENDING かどうか)はここでは見ない
export function canProcessLeave(
  leave: { userId: string; approverId: string | null },
  user: { id: string; role: Role },
): boolean {
  if (leave.userId === user.id) {
    return false;
  }
  return leave.approverId === user.id || user.role === 'ADMIN';
}

// 休暇詳細を見られる人か(FR-LEAVE-005)。申請者、割り当てられた承認者、ADMIN
export function canViewLeave(
  leave: { userId: string; approverId: string | null },
  user: { id: string; role: Role },
): boolean {
  return leave.userId === user.id || leave.approverId === user.id || user.role === 'ADMIN';
}
