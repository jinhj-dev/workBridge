'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card } from '@/components/Card';
import { textButtonClass } from '@/components/form';
import { usePendingApprovalCount } from '@/components/layout/PendingApprovalCount';
import { LeaveDetailModal } from '@/components/leave/LeaveDetailModal';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import type { Leave, Paginated } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { formatDays, formatPeriod, formatTokyoDate } from '@/lib/format';
import { messages } from '@/messages/ja';

const t = messages.dashboard.pending;
const leaveTypes = messages.leave.types;
const LIMIT = 5;

const thClass =
  'h-11 border-b-2 border-general-40 px-2 text-left text-sm/5 font-medium text-general-80';
const tdClass = 'h-13 border-b border-general-40 px-2 text-sm/5 text-general-100';

interface PendingApprovalsSectionProps {
  // 承認・却下の後に他の領域も取り直すとき
  onProcessed?: () => void;
}

// SCR-002 §3-5 自分に割り当てられた承認待ち(最大 5 件、申請日の新しい順)
export function PendingApprovalsSection({ onProcessed }: PendingApprovalsSectionProps) {
  const query = useApiQuery<Paginated<Leave>>(`/leaves/pending-approval?scope=mine&limit=${LIMIT}`);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { refresh: refreshBadge } = usePendingApprovalCount();

  function handleProcessed() {
    query.reload();
    refreshBadge();
    onProcessed?.();
  }

  function renderContent() {
    if (query.status === 'loading') return <SkeletonLines count={5} />;
    if (query.status === 'error' || !query.data) return <SectionError onRetry={query.reload} />;
    const items = query.data.items;
    if (items.length === 0) {
      return <p className="py-6 text-center text-sm/5 text-general-80">{t.empty}</p>;
    }

    return (
      <>
        {/* md 以上: 表 */}
        <table className="hidden w-full border-collapse md:table">
          <thead>
            <tr>
              <th scope="col" className={thClass}>
                {t.applicant}
              </th>
              <th scope="col" className={thClass}>
                {t.department}
              </th>
              <th scope="col" className={thClass}>
                {t.leaveType}
              </th>
              <th scope="col" className={thClass}>
                {t.period}
              </th>
              <th scope="col" className={`${thClass} text-right`}>
                {t.days}
              </th>
              <th scope="col" className={thClass}>
                {t.createdAt}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((leave) => (
              // 行のどこをクリックしても開く。キーボードでは申請者名のボタンで開く
              <tr
                key={leave.id}
                onClick={() => setSelectedId(leave.id)}
                className="cursor-pointer hover:bg-general-30"
              >
                <td className={tdClass}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(leave.id);
                    }}
                    aria-label={t.openDetail(leave.user.name)}
                    className={`${textButtonClass} text-left`}
                  >
                    {leave.user.name}
                  </button>
                </td>
                <td className={tdClass}>{leave.user.departmentName ?? messages.common.noValue}</td>
                <td className={tdClass}>{leaveTypes[leave.leaveType]}</td>
                <td className={`${tdClass} tabular-nums`}>
                  {formatPeriod(leave.startDate, leave.endDate)}
                </td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatDays(leave.days)}</td>
                <td className={`${tdClass} tabular-nums`}>{formatTokyoDate(leave.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* md 未満: 同じ情報の一覧 */}
        <ul className="divide-y divide-general-40 border-y border-general-40 md:hidden">
          {items.map((leave) => (
            <li key={leave.id}>
              <button
                type="button"
                onClick={() => setSelectedId(leave.id)}
                className="flex w-full flex-col gap-1 px-2 py-3 text-left hover:bg-general-30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-100"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-sm/5 font-medium text-general-100">
                    {leave.user.name}
                    {leave.user.departmentName && (
                      <span className="font-normal text-general-80">
                        {' '}
                        / {leave.user.departmentName}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs/4 text-general-80 tabular-nums">
                    {t.createdAt} {formatTokyoDate(leave.createdAt)}
                  </span>
                </span>
                <span className="flex items-baseline justify-between gap-3 text-sm/5 text-general-100 tabular-nums">
                  <span>
                    {leaveTypes[leave.leaveType]}・{formatPeriod(leave.startDate, leave.endDate)}
                  </span>
                  <span className="shrink-0">{formatDays(leave.days)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <Card
      title={t.title}
      action={
        <Link href="/leaves/approvals" className={textButtonClass}>
          {t.viewAll}
        </Link>
      }
    >
      {renderContent()}
      <LeaveDetailModal
        leaveId={selectedId}
        onClose={() => setSelectedId(null)}
        onProcessed={handleProcessed}
      />
    </Card>
  );
}
