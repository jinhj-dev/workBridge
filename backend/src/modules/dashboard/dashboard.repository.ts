import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { StatusCounts } from './today-status-rules.js';

export interface DepartmentTodayCounts extends StatusCounts {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  memberCount: number;
}

interface DepartmentTodayRow {
  department_id: string;
  department_code: string;
  department_name: string;
  member_count: bigint;
  clocked_in_count: bigint;
  on_leave_count: bigint;
  not_clocked_in_count: bigint;
}

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  // 部署ごとの当日の状況を集計する(FR-DASH-001)。対象は活性かつ入社日が今日以前の社員。
  // 社員ごとに 出勤 > 休暇(承認済み・種類不問・半休含む)> 未出勤 の排他 3 分類にして数える。
  // today は 'YYYY-MM-DD'(パラメータバインドのみ。::date で比較しセッションのタイムゾーンに依存しない)
  async countTodayStatusByDepartment(today: string): Promise<DepartmentTodayCounts[]> {
    const rows = await this.prisma.$queryRaw<DepartmentTodayRow[]>`
      SELECT
        d.id AS department_id,
        d.code AS department_code,
        d.name AS department_name,
        COUNT(*) AS member_count,
        COUNT(*) FILTER (WHERE s.status = 'IN') AS clocked_in_count,
        COUNT(*) FILTER (WHERE s.status = 'LEAVE') AS on_leave_count,
        COUNT(*) FILTER (WHERE s.status = 'ABSENT') AS not_clocked_in_count
      FROM (
        SELECT
          u.department_id,
          CASE
            WHEN EXISTS (
              SELECT 1 FROM attendance a WHERE a.user_id = u.id AND a.work_date = ${today}::date
            ) THEN 'IN'
            WHEN EXISTS (
              SELECT 1 FROM leaves l
              WHERE l.user_id = u.id
                AND l.status = 'APPROVED'
                AND l.start_date <= ${today}::date
                AND l.end_date >= ${today}::date
            ) THEN 'LEAVE'
            ELSE 'ABSENT'
          END AS status
        FROM users u
        WHERE u.is_active AND u.hire_date <= ${today}::date
      ) AS s
      JOIN departments d ON d.id = s.department_id
      GROUP BY d.id, d.code, d.name
      HAVING COUNT(*) > 0
      ORDER BY d.code`;
    return rows.map((row) => ({
      departmentId: row.department_id,
      departmentCode: row.department_code,
      departmentName: row.department_name,
      memberCount: Number(row.member_count),
      clockedInCount: Number(row.clocked_in_count),
      onLeaveCount: Number(row.on_leave_count),
      notClockedInCount: Number(row.not_clocked_in_count),
    }));
  }

  // 承認待ちの休暇申請の総数(全件)
  countPendingLeaves(): Promise<number> {
    return this.prisma.leave.count({ where: { status: 'PENDING' } });
  }
}
