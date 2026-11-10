'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { primaryButtonClass } from '@/components/form';
import { LeaveApplyModal } from '@/components/leave/LeaveApplyModal';
import { LeaveDetailModal } from '@/components/leave/LeaveDetailModal';
import { SectionError } from '@/components/SectionError';
import { Skeleton } from '@/components/Skeleton';
import { StatCard } from '@/components/StatCard';
import type { Leave, LeaveBalance, Paginated } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { tokyoToday, toQueryString } from '@/lib/date-range';
import { formatDays } from '@/lib/format';
import { parseLeavesQuery } from '@/lib/leave-days';
import type { LeavesQuery } from '@/lib/leave-days';
import { messages } from '@/messages/ja';
import { LeaveHistoryList } from './LeaveHistoryList';

const t = messages.leaves;
const LIMIT = 20;

function buildHistoryPath(q: LeavesQuery): string {
  return `/leaves/me?${toQueryString({
    year: q.year,
    status: q.statuses.join(','),
    leaveType: q.leaveTypes.join(','),
    page: q.page,
    limit: LIMIT,
  })}`;
}

// SCR-004 休暇管理。絞り込み・ページは URL Query に持つ(03 共通規則)。既定値は URL に出さない
export function LeavesView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentYear = Number(tokyoToday(new Date()).slice(0, 4));
  const { year, statuses, leaveTypes, page } = parseLeavesQuery(searchParams, currentYear);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  // 開くたびに入力を初期状態に戻すため、モーダルの key を更新する
  const [applyKey, setApplyKey] = useState(0);

  const balance = useApiQuery<LeaveBalance>('/leaves/balance');
  const historyPath = buildHistoryPath({ year, statuses, leaveTypes, page });
  // 状態・種別で絞り込むとき、結果が届くまで前の一覧を残す(読み込み表示に置き換えない)
  const history = useApiQuery<Paginated<Leave>>(historyPath, { keepPreviousData: true });

  function buildUrl(next: LeavesQuery): string {
    const queryString = toQueryString({
      year: next.year === currentYear ? '' : next.year,
      status: next.statuses.join(','),
      leaveType: next.leaveTypes.join(','),
      page: next.page > 1 ? next.page : '',
    });
    return queryString ? `${pathname}?${queryString}` : pathname;
  }

  function openApply() {
    setApplyKey((key) => key + 1);
    setApplyOpen(true);
  }

  function handleApplied(leave: Leave) {
    setApplyOpen(false);
    balance.reload();
    // 来年など別の年の申請でも新しい申請が一覧に見えるように、年を合わせて絞り込みを解除する
    const next = buildUrl({
      year: Number(leave.startDate.slice(0, 4)),
      statuses: [],
      leaveTypes: [],
      page: 1,
    });
    const nextQuery = parseLeavesQuery(new URLSearchParams(next.split('?')[1] ?? ''), currentYear);
    // 移動しても一覧の取得先が変わらない場合(旧 URL・範囲外の年など)は、再取得して新しい申請を見せる
    if (buildHistoryPath(nextQuery) === historyPath) history.reload();
    const query = searchParams.toString();
    if (next !== (query ? `${pathname}?${query}` : pathname)) router.push(next);
  }

  function handleProcessed() {
    history.reload();
    balance.reload();
  }

  function renderSummary() {
    if (balance.status === 'loading') {
      return (
        <div role="status" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-23 rounded-md" />
          ))}
          <span className="sr-only">{messages.common.loading}</span>
        </div>
      );
    }
    if (balance.status === 'error' || !balance.data) {
      return (
        <div className="rounded-md bg-white p-5 shadow-card sm:p-7">
          <SectionError onRetry={balance.reload} />
        </div>
      );
    }
    const b = balance.data;
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t.granted} value={formatDays(b.grantedDays)} />
        <StatCard label={t.approved} value={formatDays(b.approvedDays)} />
        <StatCard label={t.pending} value={formatDays(b.pendingDays)} />
        <StatCard label={t.remaining} value={formatDays(b.remainingDays)} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-h5 font-bold text-general-100">{t.title}</h1>
        <button
          type="button"
          onClick={openApply}
          className={`${primaryButtonClass} h-12 px-6 text-base/6 sm:h-10 sm:px-5 sm:text-sm/5`}
        >
          {t.applyButton}
        </button>
      </div>

      <section aria-label={t.summaryTitle}>{renderSummary()}</section>

      <LeaveHistoryList
        query={history}
        filters={{ year, statuses, leaveTypes, page }}
        currentYear={currentYear}
        onChange={(next, options) =>
          options ? router.push(buildUrl(next), options) : router.push(buildUrl(next))
        }
        onOpenDetail={setSelectedId}
      />

      <LeaveDetailModal
        key={selectedId ?? 'closed'}
        leaveId={selectedId}
        onClose={() => setSelectedId(null)}
        onProcessed={handleProcessed}
      />

      <LeaveApplyModal
        key={applyKey}
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        onApplied={handleApplied}
        onBalanceStale={balance.reload}
      />
    </div>
  );
}
