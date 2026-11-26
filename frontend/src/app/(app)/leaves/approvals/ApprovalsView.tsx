'use client';

import { cardFrameClass } from '@/components/Card';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ClipboardCheckIcon, ClockIcon } from '@/components/layout/navIcons';
import { DetailButton } from '@/components/ActionButtons';
import { Button } from '@/components/Button';
import { usePendingApprovalCount } from '@/components/layout/PendingApprovalCount';
import { LeaveDetailModal } from '@/components/leave/LeaveDetailModal';
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge';
import { XCircleIcon } from '@/components/leave/leaveIcons';
import { Pagination } from '@/components/Pagination';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { StatCard } from '@/components/StatCard';
import { bandTdClass, bandThClass } from '@/components/table';
import { Tabs } from '@/components/Tabs';
import type { Leave, LeaveStatus, Paginated } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatDays, formatPeriod, formatTokyoDate } from '@/lib/format';
import { messages } from '@/messages/ja';

const t = messages.approvals;
const leaveTypes = messages.leave.types;
const LIMIT = 20;

type Scope = 'mine' | 'all';
type Step = 'detail' | 'approve' | 'reject';
type ApprovalStatus = Extract<LeaveStatus, 'PENDING' | 'APPROVED' | 'REJECTED'>;

const APPROVAL_STATUSES: readonly ApprovalStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

interface ApprovalsQuery {
  scope: Scope;
  status: ApprovalStatus;
  page: number;
}

// URL Query の解釈。scope=all は ADMIN だけ有効、status は PENDING(既定)/APPROVED/REJECTED、page は 1 以上の整数のみ
export function parseApprovalsQuery(params: URLSearchParams, isAdmin: boolean): ApprovalsQuery {
  const scope: Scope = isAdmin && params.get('scope') === 'all' ? 'all' : 'mine';
  const status = APPROVAL_STATUSES.find((s) => s === params.get('status')) ?? 'PENDING';
  const rawPage = params.get('page') ?? '';
  const page = /^\d+$/.test(rawPage) && Number(rawPage) >= 1 ? Number(rawPage) : 1;
  return { scope, status, page };
}

const SUMMARY: { status: ApprovalStatus; label: string; icon: ReactNode }[] = [
  { status: 'PENDING', label: t.statusPending, icon: <ClockIcon /> },
  { status: 'APPROVED', label: t.statusApproved, icon: <ClipboardCheckIcon /> },
  { status: 'REJECTED', label: t.statusRejected, icon: <XCircleIcon /> },
];

function countPath(scope: Scope, status: ApprovalStatus): string {
  return `/leaves/pending-approval?scope=${scope}&status=${status}&limit=1`;
}

// SCR-005 承認タブ。表示の切り替え(scope)・状態・ページは URL Query に持つ(03 共通規則)
export function ApprovalsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user: me } = useAuth();
  const { refresh: refreshBadge } = usePendingApprovalCount();
  const isAdmin = me?.role === 'ADMIN';
  const { scope, status, page } = parseApprovalsQuery(searchParams, isAdmin);
  const [selected, setSelected] = useState<{ id: string; step: Step } | null>(null);

  const query = useApiQuery<Paginated<Leave>>(
    `/leaves/pending-approval?scope=${scope}&status=${status}&page=${page}&limit=${LIMIT}`,
  );
  const pendingCount = useApiQuery<Paginated<Leave>>(countPath(scope, 'PENDING'));
  const approvedCount = useApiQuery<Paginated<Leave>>(countPath(scope, 'APPROVED'));
  const rejectedCount = useApiQuery<Paginated<Leave>>(countPath(scope, 'REJECTED'));
  const counts: Record<ApprovalStatus, typeof pendingCount> = {
    PENDING: pendingCount,
    APPROVED: approvedCount,
    REJECTED: rejectedCount,
  };

  function buildUrl(next: ApprovalsQuery): string {
    const params = new URLSearchParams();
    if (next.scope === 'all') params.set('scope', 'all');
    if (next.status !== 'PENDING') params.set('status', next.status);
    if (next.page > 1) params.set('page', String(next.page));
    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }

  function go(next: ApprovalsQuery) {
    router.push(buildUrl(next));
  }

  function handleProcessed() {
    query.reload();
    pendingCount.reload();
    approvedCount.reload();
    rejectedCount.reload();
    refreshBadge();
  }

  function renderActions(leave: Leave) {
    const name = leave.user.name;
    // 本人の申請は承認・却下できない(SCR-005 §3)
    const own = leave.user.id === me?.id;
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <DetailButton
          onClick={() => setSelected({ id: leave.id, step: 'detail' })}
          aria-label={t.detailLabel(name)}
        />
        {leave.status === 'PENDING' && (
          <>
            <Button
              variant="primary"
              size="sm"
              disabled={own}
              onClick={() => setSelected({ id: leave.id, step: 'approve' })}
              aria-label={t.approveLabel(name)}
            >
              {t.approve}
            </Button>
            <Button
              size="sm"
              disabled={own}
              onClick={() => setSelected({ id: leave.id, step: 'reject' })}
              aria-label={t.rejectLabel(name)}
            >
              {t.reject}
            </Button>
          </>
        )}
      </div>
    );
  }

  function emptyText(): string {
    if (status === 'APPROVED') return t.emptyApproved;
    if (status === 'REJECTED') return t.emptyRejected;
    return scope === 'all' ? t.emptyAll : t.emptyMine;
  }

  function renderList() {
    if (query.status === 'loading') return <SkeletonLines count={5} />;
    if (query.status === 'error' || !query.data) return <SectionError onRetry={query.reload} />;
    const { items, totalPages, totalCount } = query.data;
    const showApprover = scope === 'all';
    const pagination = (
      <Pagination
        page={query.data.page}
        totalPages={totalPages}
        totalCount={totalCount}
        onChange={(next) => go({ scope, status, page: next })}
      />
    );

    if (items.length === 0) {
      return (
        <>
          <p className="py-8 text-center text-sm/5 text-general-80">{emptyText()}</p>
          {/* 範囲外のページを指定された場合に戻れるよう、件数があるときは Pagination を出す */}
          {totalCount > 0 && pagination}
        </>
      );
    }

    return (
      <>
        {/* xl 以上: 表 */}
        <table className="hidden w-full border-collapse xl:table">
          <thead>
            <tr>
              <th scope="col" className={bandThClass}>
                {t.createdAt}
              </th>
              <th scope="col" className={bandThClass}>
                {t.empId}
              </th>
              <th scope="col" className={bandThClass}>
                {t.applicant}
              </th>
              <th scope="col" className={bandThClass}>
                {t.department}
              </th>
              <th scope="col" className={bandThClass}>
                {t.period}
              </th>
              <th scope="col" className={bandThClass}>
                {t.leaveType}
              </th>
              <th scope="col" className={`${bandThClass} text-right`}>
                {t.days}
              </th>
              <th scope="col" className={bandThClass}>
                {t.statusColumn}
              </th>
              {showApprover && (
                <th scope="col" className={bandThClass}>
                  {t.approver}
                </th>
              )}
              <th scope="col" className={`${bandThClass} text-right`}>
                {t.actions}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((leave) => (
              <tr key={leave.id}>
                <td className={`${bandTdClass} tabular-nums`}>
                  {formatTokyoDate(leave.createdAt)}
                </td>
                <td className={`${bandTdClass} tabular-nums`}>{leave.user.empId}</td>
                <td className={`${bandTdClass} font-bold`}>{leave.user.name}</td>
                <td className={bandTdClass}>
                  {leave.user.departmentName ?? messages.common.noValue}
                </td>
                <td className={`${bandTdClass} tabular-nums`}>
                  {formatPeriod(leave.startDate, leave.endDate)}
                </td>
                <td className={bandTdClass}>{leaveTypes[leave.leaveType]}</td>
                <td className={`${bandTdClass} text-right tabular-nums`}>
                  {formatDays(leave.days)}
                </td>
                <td className={bandTdClass}>
                  <LeaveStatusBadge status={leave.status} soft />
                </td>
                {showApprover && (
                  <td className={bandTdClass}>{leave.approver?.name ?? messages.common.noValue}</td>
                )}
                <td className={bandTdClass}>{renderActions(leave)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* xl 未満: 申請者ごとのカード(承認・却下は詳細モーダルの中で行う) */}
        <ul className="flex flex-col gap-3 xl:hidden">
          {items.map((leave) => (
            <li
              key={leave.id}
              className="flex flex-col gap-2 rounded-xl border border-general-40 p-4"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-base/6 font-bold text-general-100">
                    {leave.user.name}
                  </span>
                  <span className="block text-xs/4 text-general-80 tabular-nums">
                    {t.empId}：{leave.user.empId}
                  </span>
                </span>
                <LeaveStatusBadge status={leave.status} soft />
              </span>
              <span className="text-sm/5 text-general-80">
                {leave.user.departmentName ?? messages.common.noValue}
              </span>
              <span className="flex items-baseline justify-between gap-3 text-sm/5 text-general-100 tabular-nums">
                <span>
                  {leaveTypes[leave.leaveType]}・{formatPeriod(leave.startDate, leave.endDate)}
                </span>
                <span className="shrink-0 font-medium">{formatDays(leave.days)}</span>
              </span>
              {showApprover && (
                <span className="text-xs/4 text-general-80">
                  {t.approver}: {leave.approver?.name ?? messages.common.noValue}
                </span>
              )}
              <div className="pt-1">
                <DetailButton
                  onClick={() => setSelected({ id: leave.id, step: 'detail' })}
                  aria-label={t.detailLabel(leave.user.name)}
                />
              </div>
            </li>
          ))}
        </ul>

        {pagination}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {isAdmin && (
        <Tabs
          label={t.scopeLabel}
          items={[
            { value: 'mine', label: t.scopeMine },
            { value: 'all', label: t.scopeAll },
          ]}
          value={scope}
          onChange={(value) =>
            go({ scope: value === 'all' ? 'all' : 'mine', status: 'PENDING', page: 1 })
          }
        />
      )}

      <section aria-label={t.summaryLabel} className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {SUMMARY.map((card) => {
          const result = counts[card.status];
          return (
            <StatCard
              key={card.status}
              label={card.label}
              value={
                result.status === 'success'
                  ? String(result.data?.totalCount ?? 0)
                  : messages.common.noValue
              }
              unit={messages.dashboard.stats.casesUnit}
              icon={card.icon}
              tone={card.status === 'REJECTED' ? 'danger' : 'primary'}
              href={buildUrl({ scope, status: card.status, page: 1 })}
              selected={status === card.status}
            />
          );
        })}
      </section>

      <section className={`${cardFrameClass} p-4 md:p-5`}>{renderList()}</section>

      <LeaveDetailModal
        key={selected ? `${selected.id}-${selected.step}` : 'closed'}
        leaveId={selected?.id ?? null}
        initialStep={selected?.step}
        onClose={() => setSelected(null)}
        onProcessed={handleProcessed}
      />
    </div>
  );
}
