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
  description: string | null;
  manager: { id: string; empId: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

// API-DEPT-007
export interface DepartmentSummary {
  departmentCount: number;
  memberCount: number;
}

// API-DEPT-008
export interface DepartmentMember {
  id: string;
  empId: string;
  name: string;
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

// API-DASH-001(全社の本日の状況。出勤 > 休暇 > 未出勤の排他分類。休日は出勤者のみ)
export interface AdminDashboardSummary {
  date: string;
  isWorkday: boolean;
  totalEmployeeCount: number;
  clockedInCount: number;
  notClockedInCount: number;
  onLeaveCount: number;
  attendanceRate: number | null; // % 小数 1 位。分母 0 は null
  pendingLeaveCount: number;
}

// API-DASH-004(部署別の本日の状況。人数だけで個人は含まない)
export interface DepartmentStatusItem {
  departmentId: string | null; // 未所属は null
  departmentName: string;
  memberCount: number;
  clockedInCount: number;
  onLeaveCount: number;
  notClockedInCount: number;
  attendanceRate: number | null;
}

export interface DepartmentStatus {
  date: string;
  isWorkday: boolean;
  departments: DepartmentStatusItem[];
}

// API-ATT-007(出勤簿の月間表)
export type SheetDayType = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY';

export interface SheetLeave {
  id: string;
  leaveType: LeaveType;
  status: LeaveStatus;
}

export interface SheetDay {
  date: string; // YYYY-MM-DD
  dayType: SheetDayType; // 祝日の判定はサーバー側の値だけを使う
  holidayName: string | null;
  attendance: {
    id: string;
    clockIn: string;
    clockOut: string | null;
    status: AttendanceStatus;
    modifiedAt: string | null;
  } | null;
  // 法定最低休憩からの計算値(実際の記録ではない)。退勤済みの日だけ
  breakTime: {
    minutes: number;
    source: 'LEGAL_MINIMUM';
    start: string | null;
    end: string | null;
  } | null;
  actualWorkMinutes: number | null;
  overtimeMinutes: number;
  nightMinutes: number;
  leaves: SheetLeave[];
}

export interface SheetSummary {
  scheduledWorkDays: number;
  actualWorkDays: number;
  actualWorkMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  holidayWorkMinutes: number;
  paidLeaveDays: number;
}

export interface AttendanceSheet {
  month: string; // YYYY-MM
  days: SheetDay[];
  summary: SheetSummary;
}

// API-LEAVE-010(休暇カレンダー。承認済みの休暇だけ。種別は PAID / SPECIAL / OTHER に丸めて公開)
export type LeaveCategory = 'PAID' | 'SPECIAL' | 'OTHER';
export type HalfDay = 'AM' | 'PM';

export interface LeaveCalendarItem {
  name: string;
  empId: string;
  departmentName: string | null;
  startDate: string; // YYYY-MM-DD(月の外のことがある)
  endDate: string; // YYYY-MM-DD(月の外のことがある)
  category: LeaveCategory;
  halfDay: HalfDay | null;
}

export interface LeaveCalendarResponse {
  month: string; // YYYY-MM
  holidays: { date: string; name: string }[];
  items: LeaveCalendarItem[];
}
