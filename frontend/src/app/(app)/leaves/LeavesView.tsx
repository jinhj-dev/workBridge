'use client';

import { cardFrameClass } from '@/components/Card';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CalendarSmallIcon } from '@/components/leave/leaveIcons';
import { LeaveDetailModal } from '@/components/leave/LeaveDetailModal';
import { SectionError } from '@/components/SectionError';
import { Skeleton } from '@/components/Skeleton';
import type { Leave, LeaveBalance, Paginated } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { toQueryString } from '@/lib/date-range';
import { formatDays } from '@/lib/format';
import { parseLeavesQuery } from '@/lib/leave-days';
import type { LeavesQuery } from '@/lib/leave-days';
import { messages } from '@/messages/ja';
import { LeaveHistoryList } from './LeaveHistoryList';
import { useLeaveDataVersion } from './LeaveDataVersion';

const t = messages.leaves;
const LIMIT = 20;

function buildHistoryPath(q: LeavesQuery): string {
  return `/leaves/me?${toQueryString({
    appliedFrom: q.appliedFrom,
    appliedTo: q.appliedTo,
    leaveType: q.leaveType,
    status: q.status,
    page: q.page,
    limit: LIMIT,
  })}`;
}

// SCR-004 自分の休暇タブ。検索条件・ページは URL Query に持つ(03 共通規則)。既定値は URL に出さない
export function LeavesView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseLeavesQuery(searchParams);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { version } = useLeaveDataVersion();

  const balance = useApiQuery<LeaveBalance>('/leaves/balance');
  // 条件・ページを変えるとき、結果が届くまで前の一覧を残す(読み込み表示に置き換えない)
  const history = useApiQuery<Paginated<Leave>>(buildHistoryPath(filters), {
    keepPreviousData: true,
  });

  // 申請が成功したら(layout が version を進める)残高と一覧を取り直す。検索条件はそのまま
  const handledVersion = useRef(version);
  useEffect(() => {
    if (handledVersion.current === version) return;
    handledVersion.current = version;
    balance.reload();
    history.reload();
  }, [version, balance, history]);

  function go(next: LeavesQuery) {
    const queryString = toQueryString({
      appliedFrom: next.appliedFrom,
      appliedTo: next.appliedTo,
      leaveType: next.leaveType,
      status: next.status,
      page: next.page > 1 ? next.page : '',
    });
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function handleProcessed() {
    history.reload();
    balance.reload();
  }

  function renderSummary() {
    if (balance.status === 'loading') {
      return (
        <div role="status" className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
          <span className="sr-only">{messages.common.loading}</span>
        </div>
      );
    }
    if (balance.status === 'error' || !balance.data) return <SectionError onRetry={balance.reload} />;
    const b = balance.data;
    const valueClass = 'text-stat font-bold text-general-100 tabular-nums';
    return (
      <div className="grid gap-5 md:grid-cols-3 md:gap-0 md:divide-x md:divide-general-40">
        <div className="flex items-center gap-4 md:pr-6">
          <span
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-30 text-primary-100"
          >
            <span className="size-7">
              <CalendarSmallIcon />
            </span>
          </span>
          <div className="min-w-0">
            <p className="text-sm/5 text-general-80">{t.summary.remaining}</p>
            <p className={valueClass}>{formatDays(b.remainingDays)}</p>
          </div>
        </div>
        <div className="md:px-6">
          <p className="text-sm/5 text-general-80">{t.summary.taken}</p>
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className={valueClass}>{formatDays(b.approvedDays)}</span>
            <span className="text-sm/5 text-general-80">
              {t.summary.granted(formatDays(b.grantedDays))}
            </span>
          </p>
        </div>
        <div className="md:pl-6">
          <p className="text-sm/5 text-general-80">{t.summary.pending}</p>
          <p className={valueClass}>{formatDays(b.pendingDays)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <section aria-label={t.summaryTitle} className={`${cardFrameClass} px-5 py-5 md:px-8 md:py-6`}>
        {renderSummary()}
      </section>

      <LeaveHistoryList
        query={history}
        filters={filters}
        onSearch={(next) => go({ ...next, page: 1 })}
        onPageChange={(page) => go({ ...filters, page })}
        onOpenDetail={setSelectedId}
      />

      <LeaveDetailModal
        key={selectedId ?? 'closed'}
        leaveId={selectedId}
        onClose={() => setSelectedId(null)}
        onProcessed={handleProcessed}
      />
    </div>
  );
}
