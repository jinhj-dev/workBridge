import { formatTokyoDateTime, fromDbDate } from '../../common/time/tokyo-date.js';
import type { JobTitleTone, Role } from '../../generated/prisma/client.js';
import { employmentStatusOf } from './employment-status.js';
import type { EmploymentStatus } from './employment-status.js';

// リポジトリが返す社員(passwordHash は含めない)
export interface UserRow {
  id: string;
  empId: string;
  name: string;
  hireDate: Date;
  departmentId: string;
  department: { name: string };
  role: Role;
  approvalRequired: boolean;
  isActive: boolean;
  mustChangePassword: boolean;
  jobTitle: { id: string; name: string; tone: JobTitleTone } | null;
  contactEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// docs/06 API-USER-001 の UserListItem
export interface UserListItem {
  id: string;
  empId: string;
  name: string;
  hireDate: string;
  departmentId: string;
  departmentName: string;
  role: Role;
  approvalRequired: boolean;
  isActive: boolean;
  employmentStatus: EmploymentStatus;
  jobTitle: { id: string; name: string; tone: JobTitleTone } | null;
  contactEmail: string | null;
  createdAt: string;
}

// docs/06 API-USER-003 の UserDetail
export interface UserDetail extends UserListItem {
  mustChangePassword: boolean;
  updatedAt: string;
  pendingApprovalCount: number;
  leaveGrants: { year: number; grantedDays: number }[];
}

// docs/06 API-USER-006
export interface UserSummaryCounts {
  employeeCount: number;
  adminCount: number;
  hiredThisMonthCount: number;
}

export interface UserDetailExtras {
  pendingApprovalCount: number;
  leaveGrants: { year: number; grantedDays: number }[];
}

export function toUserListItem(row: UserRow, now: Date): UserListItem {
  const hireDate = fromDbDate(row.hireDate);
  return {
    id: row.id,
    empId: row.empId,
    name: row.name,
    hireDate,
    departmentId: row.departmentId,
    departmentName: row.department.name,
    role: row.role,
    approvalRequired: row.approvalRequired,
    isActive: row.isActive,
    employmentStatus: employmentStatusOf({ hireDate, isActive: row.isActive }, now),
    jobTitle: row.jobTitle,
    contactEmail: row.contactEmail,
    createdAt: formatTokyoDateTime(row.createdAt),
  };
}

export function toUserDetail(row: UserRow, extras: UserDetailExtras, now: Date): UserDetail {
  return {
    ...toUserListItem(row, now),
    mustChangePassword: row.mustChangePassword,
    updatedAt: formatTokyoDateTime(row.updatedAt),
    ...extras,
  };
}
