import type { Prisma } from '../../generated/prisma/client.js';

// UserSummary に必要な列だけを取る select(password_hash などを含めない)
export const USER_SUMMARY_SELECT = {
  id: true,
  name: true,
  empId: true,
  department: { select: { name: true } },
} as const satisfies Prisma.UserSelect;

export type UserSummaryRow = Prisma.UserGetPayload<{ select: typeof USER_SUMMARY_SELECT }>;

// docs/06 §0 の UserSummary
export interface UserSummary {
  id: string;
  name: string;
  empId: string;
  departmentName: string | null;
}

export function toUserSummary(row: UserSummaryRow): UserSummary {
  return {
    id: row.id,
    name: row.name,
    empId: row.empId,
    departmentName: row.department?.name ?? null,
  };
}
