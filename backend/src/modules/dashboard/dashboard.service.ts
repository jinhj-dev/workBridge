import { Injectable } from '@nestjs/common';
import { Clock } from '../../common/time/clock.js';
import { toDbDate, toTokyoDate } from '../../common/time/tokyo-date.js';
import { DashboardRepository } from './dashboard.repository.js';
import type { TodaySummaryCounts } from './dashboard.repository.js';

// API-DASH-001 の応答
export interface DashboardSummary extends TodaySummaryCounts {
  date: string;
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
}
