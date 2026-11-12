import { Injectable } from '@nestjs/common';
import { Clock } from '../../common/time/clock.js';
import { toTokyoDate } from '../../common/time/tokyo-date.js';
import { SYSTEM_DEPARTMENT_CODE } from '../departments/department.constants.js';
import { DashboardRepository } from './dashboard.repository.js';
import type { DepartmentTodayCounts } from './dashboard.repository.js';
import { applyWorkday, attendanceRate, isWorkday, sumStatusCounts } from './today-status-rules.js';

// API-DASH-001 の応答
export interface DashboardSummary {
  date: string;
  isWorkday: boolean;
  totalEmployeeCount: number;
  clockedInCount: number;
  notClockedInCount: number;
  onLeaveCount: number;
  attendanceRate: number | null;
  pendingLeaveCount: number;
}

// API-DASH-004 の応答。公開するのは人数のみ(社員 ID・氏名・休暇の種類は含めない)
export interface DepartmentStatusItem {
  departmentId: string | null;
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

@Injectable()
export class DashboardService {
  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly clock: Clock,
  ) {}

  // 管理者向けの当日の全体状況。「今日」は東京の日付。全社は部署別集計の合計(規則は 1 か所)
  async getSummary(): Promise<DashboardSummary> {
    const today = toTokyoDate(this.clock.now());
    const workday = isWorkday(today);
    const [departments, pendingLeaveCount] = await Promise.all([
      this.dashboardRepository.countTodayStatusByDepartment(today),
      this.dashboardRepository.countPendingLeaves(),
    ]);
    const counts = sumStatusCounts(departments.map((item) => applyWorkday(item, workday)));
    return {
      date: today,
      isWorkday: workday,
      totalEmployeeCount: departments.reduce((sum, item) => sum + item.memberCount, 0),
      ...counts,
      attendanceRate: attendanceRate(counts),
      pendingLeaveCount,
    };
  }

  // 部署別の当日の勤務状況(全ログインユーザー向け・人数のみ)。未所属部署は最後に並べる
  async getDepartmentStatus(): Promise<DepartmentStatus> {
    const today = toTokyoDate(this.clock.now());
    const workday = isWorkday(today);
    const departments = await this.dashboardRepository.countTodayStatusByDepartment(today);
    return {
      date: today,
      isWorkday: workday,
      departments: sortUnassignedLast(departments).map((item) => toDepartmentItem(item, workday)),
    };
  }
}

function sortUnassignedLast(departments: DepartmentTodayCounts[]): DepartmentTodayCounts[] {
  const isUnassigned = (item: DepartmentTodayCounts): boolean =>
    item.departmentCode === SYSTEM_DEPARTMENT_CODE;
  return [
    ...departments.filter((item) => !isUnassigned(item)),
    ...departments.filter(isUnassigned),
  ];
}

function toDepartmentItem(item: DepartmentTodayCounts, workday: boolean): DepartmentStatusItem {
  const counts = applyWorkday(item, workday);
  return {
    departmentId: item.departmentCode === SYSTEM_DEPARTMENT_CODE ? null : item.departmentId,
    departmentName: item.departmentName,
    memberCount: item.memberCount,
    ...counts,
    attendanceRate: attendanceRate(counts),
  };
}
