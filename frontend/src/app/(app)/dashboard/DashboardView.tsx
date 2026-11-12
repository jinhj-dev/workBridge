'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePendingApprovalCount } from '@/components/layout/PendingApprovalCount';
import type {
  AdminDashboardSummary,
  AttendanceSheet,
  DepartmentStatus,
  Leave,
  LeaveBalance,
  Paginated,
} from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { useAuth } from '@/lib/auth/AuthProvider';
import { AdminStatsSection } from './AdminStatsSection';
import { AttendanceSection } from './AttendanceSection';
import { CompanyAttendanceSection } from './CompanyAttendanceSection';
import { DashboardHeader } from './DashboardHeader';
import { DepartmentStatusSection } from './DepartmentStatusSection';
import { LeaveBalanceSection } from './LeaveBalanceSection';
import { MonthlyWorkSection } from './MonthlyWorkSection';
import { PendingApprovalsSection } from './PendingApprovalsSection';
import { RecentRequestsSection } from './RecentRequestsSection';

const RECENT_LIMIT = 3;

// ADMIN の 1 列の並び(全社 → 承認待ち → 今日 → 今月 → 休暇 → 部署 → 直近)。xl 以上は DOM 順に戻す。
// Tailwind が検出できるよう、クラス名は完全な文字列で書く
const ADMIN_ORDER = {
  company: 'order-1 xl:order-none',
  pending: 'order-2 xl:order-none',
  attendance: 'order-3 xl:order-none',
  monthly: 'order-4 xl:order-none',
  leave: 'order-5 xl:order-none',
  departments: 'order-6 xl:order-none',
  recent: 'order-7 xl:order-none',
} as const;

// カードの置き場。1 列では ADMIN だけ並びを変える(order)
function Slot({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`flex flex-col [&>section]:flex-1 ${className}`}>{children}</div>;
}

// xl 以上は参照デザインの行(列幅の比は行ごとに異なる)、未満は行を解いて 1 列に流す(contents)
function Row({ columns, children }: { columns: string; children: ReactNode }) {
  return <div className={`contents xl:grid xl:gap-4 ${columns}`}>{children}</div>;
}

// SCR-002 ダッシュボード。PC・モバイルで同じカードと同じ取得を使い、配置は CSS だけで変える。
// 各カードは自分の領域だけ失敗表示にし、1 つが失敗しても他は表示する
export function DashboardView() {
  const { user } = useAuth();
  const [now] = useState(() => new Date());
  const { count: pendingCount } = usePendingApprovalCount();
  const isAdmin = user?.role === 'ADMIN';

  // 全社の状況は統計 3 枚と全社の出勤状況で共有する(1 回だけ取得)
  const summary = useApiQuery<AdminDashboardSummary>(isAdmin ? '/admin/dashboard/summary' : null);
  const departments = useApiQuery<DepartmentStatus>('/dashboard/department-status');
  const monthly = useApiQuery<AttendanceSheet>('/attendance/monthly');
  const balance = useApiQuery<LeaveBalance>('/leaves/balance');
  const recent = useApiQuery<Paginated<Leave>>(`/leaves/me?limit=${RECENT_LIMIT}`);

  if (!user) return null;

  // 承認待ちは ADMIN は常に、承認者の社員は割り当てがあるときだけ表示する
  const showPending = isAdmin || (pendingCount ?? 0) > 0;
  const order = (key: keyof typeof ADMIN_ORDER) => (isAdmin ? ADMIN_ORDER[key] : '');

  function reloadAfterClock() {
    summary.reload();
    departments.reload();
    monthly.reload();
  }

  function reloadAfterProcessed() {
    summary.reload();
    departments.reload();
  }

  const pendingCard = showPending && (
    <Slot className={order('pending')}>
      <PendingApprovalsSection
        scope={isAdmin ? 'all' : 'mine'}
        onProcessed={reloadAfterProcessed}
      />
    </Slot>
  );
  const attendanceCard = (
    <Slot className={order('attendance')}>
      <AttendanceSection onClocked={reloadAfterClock} />
    </Slot>
  );
  const monthlyCard = (
    <Slot className={`${order('monthly')} xl:flex-1`}>
      <MonthlyWorkSection query={monthly} />
    </Slot>
  );
  const leaveCard = (
    <Slot className={`${order('leave')} xl:flex-1`}>
      <LeaveBalanceSection query={balance} showHistoryLink={!isAdmin} />
    </Slot>
  );
  const departmentsCard = (
    <Slot className={order('departments')}>
      <DepartmentStatusSection query={departments} isAdmin={isAdmin} />
    </Slot>
  );
  const recentCard = (
    <Slot className={order('recent')}>
      <RecentRequestsSection
        query={recent}
        onProcessed={() => {
          recent.reload();
          balance.reload();
        }}
      />
    </Slot>
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4">
      <DashboardHeader name={user.name} now={now} />

      {isAdmin ? (
        <>
          <AdminStatsSection query={summary} />
          <Row columns="xl:grid-cols-[1fr_1.04fr]">
            {attendanceCard}
            {pendingCard}
          </Row>
          <Row columns="xl:grid-cols-[1fr_1.24fr]">
            <Slot className={order('company')}>
              <CompanyAttendanceSection query={summary} />
            </Slot>
            {monthlyCard}
          </Row>
          <Row columns="xl:grid-cols-[1fr_1.17fr_1.17fr]">
            {leaveCard}
            {departmentsCard}
            {recentCard}
          </Row>
        </>
      ) : (
        <>
          {pendingCard && <Row columns="xl:grid-cols-1">{pendingCard}</Row>}
          <Row columns="xl:grid-cols-[1fr_1.18fr]">
            {attendanceCard}
            {/* 今月の勤務状況と休暇の残り日数は右列に縦に積む */}
            <div className="contents xl:flex xl:flex-col xl:gap-4">
              {monthlyCard}
              {leaveCard}
            </div>
          </Row>
          <Row columns="xl:grid-cols-[1fr_1.18fr]">
            {departmentsCard}
            {recentCard}
          </Row>
        </>
      )}
    </div>
  );
}
