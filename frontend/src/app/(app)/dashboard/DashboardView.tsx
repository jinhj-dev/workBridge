'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatTodayLabel } from '@/lib/format';
import { messages } from '@/messages/ja';
import { AdminSummarySection } from './AdminSummarySection';
import { AttendanceSection } from './AttendanceSection';
import { LeaveBalanceSection } from './LeaveBalanceSection';
import { LeaveCalendarSection } from './LeaveCalendarSection';
import { PendingApprovalsSection } from './PendingApprovalsSection';

// SCR-002 ダッシュボード。各領域は自分の API を個別に取得し、1 つが失敗しても他は表示する
export function DashboardView() {
  const { user } = useAuth();
  const [today] = useState(() => formatTodayLabel(new Date()));
  // 承認・却下の後に本日の全体状況を取り直すため、key を変えて作り直す
  const [summaryKey, setSummaryKey] = useState(0);
  // 承認・申請の直後に休暇カレンダーを取り直すための合図
  const [calendarSignal, setCalendarSignal] = useState(0);

  if (!user) return null;
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-h5 font-bold text-general-100">{messages.dashboard.title}</h1>
          <p className="mt-1 text-sm/5 text-general-80">
            {user.name}
            {user.departmentName && <span> / {user.departmentName}</span>}
          </p>
        </div>
        <p className="text-sm/5 font-medium text-general-80">{today}</p>
      </header>

      {isAdmin && <AdminSummarySection key={summaryKey} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <AttendanceSection />
        <LeaveBalanceSection onApplied={() => setCalendarSignal((n) => n + 1)} />
      </div>

      <PendingApprovalsSection
        onProcessed={() => {
          if (isAdmin) setSummaryKey((k) => k + 1);
          setCalendarSignal((n) => n + 1);
        }}
      />

      <LeaveCalendarSection refreshSignal={calendarSignal} />
    </div>
  );
}
