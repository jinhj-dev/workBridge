import { Injectable } from '@nestjs/common';
import { Clock } from '../../common/time/clock.js';
import { toDbDate, toTokyoDate } from '../../common/time/tokyo-date.js';
import { DashboardRepository } from './dashboard.repository.js';
import type { LeaveCalendarDayCount, TodaySummaryCounts } from './dashboard.repository.js';
import { isWeekend, monthRange, resolveHalfDay } from './leave-calendar-rules.js';
import type { HalfDay } from './leave-calendar-rules.js';

// API-DASH-001 の応答
export interface DashboardSummary extends TodaySummaryCounts {
  date: string;
}

// API-DASH-002 の応答
export interface LeaveCalendar {
  month: string;
  days: LeaveCalendarDayCount[];
}

// API-DASH-003 の応答。公開するのは社員番号・氏名・部署・半休の区分のみ
export interface LeaveCalendarDay {
  date: string;
  items: {
    userId: string;
    empId: string;
    name: string;
    departmentName: string;
    halfDay: HalfDay | null;
  }[];
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly clock: Clock,
  ) {}

  // 管理者向けの当日の全体状況。「今日」は東京の日付
  async getSummary(): Promise<DashboardSummary> {
    const today = toTokyoDate(this.clock.now());
    const counts = await this.dashboardRepository.countTodaySummary(toDbDate(today));
    return { date: today, ...counts };
  }

  // 月間休暇カレンダー。month 省略時は東京の今月
  async getLeaveCalendar(month?: string): Promise<LeaveCalendar> {
    const targetMonth = month ?? toTokyoDate(this.clock.now()).slice(0, 7);
    const { start, end } = monthRange(targetMonth);
    const days = await this.dashboardRepository.countApprovedLeavesByDay(start, end);
    return { month: targetMonth, days };
  }

  // 指定日の休暇者一覧。土日は休暇者を数えないため DB を引かない
  async getLeaveCalendarDay(date: string): Promise<LeaveCalendarDay> {
    if (isWeekend(date)) {
      return { date, items: [] };
    }
    const users = await this.dashboardRepository.findUsersOnApprovedLeave(toDbDate(date));
    return {
      date,
      items: users.map((user) => ({
        userId: user.id,
        empId: user.empId,
        name: user.name,
        departmentName: user.departmentName,
        halfDay: resolveHalfDay(user.leaveTypes),
      })),
    };
  }
}
