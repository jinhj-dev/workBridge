// 06_API_SPECIFICATION §0 の共通オブジェクトと、ダッシュボードで使う応答の型

export interface UserSummary {
  id: string; // UUID
  name: string;
  empId: string;
  departmentName: string | null;
}

export type LeaveType = 'ANNUAL' | 'HALF_AM' | 'HALF_PM' | 'SPECIAL' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface Leave {
  id: string;
  user: UserSummary;
  approver: UserSummary | null; // 即時承認の申請は null
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  days: number; // 半休は 0.5
  reason: string;
  status: LeaveStatus;
  autoApproved: boolean;
  processedBy: UserSummary | null;
  processedAt: string | null; // ISO-8601(+09:00)
  rejectReason: string | null;
  createdAt: string; // ISO-8601(+09:00)
}

export type AttendanceStatus = 'WORKING' | 'DONE' | 'MISSING_CLOCK_OUT';

export interface Attendance {
  id: string;
  user: UserSummary;
  workDate: string; // YYYY-MM-DD
  clockIn: string;
  clockOut: string | null;
  workMinutes: number | null;
  status: AttendanceStatus;
  modifiedAt: string | null; // 管理者が修正した日時(未修正は null)
}

// API-DEPT-001
export interface Department {
  id: string;
  name: string;
}

// API-DEPT-002〜006(管理者用の部署詳細)
export interface DepartmentDetail {
  id: string;
  code: string;
  name: string;
  memberCount: number;
  inactiveMemberCount: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

// API-LEAVE-006
export interface LeaveBalance {
  year: number;
  grantedDays: number;
  approvedDays: number;
  pendingDays: number;
  remainingDays: number;
}

// API-DASH-001
export interface AdminDashboardSummary {
  date: string;
  clockedInCount: number;
  notClockedInCount: number;
  onLeaveCount: number;
  pendingLeaveCount: number;
}

// API-DASH-002(月間の休暇取得人数。人数 1 以上の日だけ)
export interface LeaveCalendarMonth {
  month: string;
  days: { date: string; count: number }[];
}

export type HalfDay = 'AM' | 'PM';

// API-DASH-003(1 日分の休暇取得者。種別・理由は含まない)
export interface LeaveCalendarMember {
  userId: string;
  empId: string;
  name: string;
  departmentName: string;
  halfDay: HalfDay | null;
}

export interface LeaveCalendarDay {
  date: string;
  items: LeaveCalendarMember[];
}
