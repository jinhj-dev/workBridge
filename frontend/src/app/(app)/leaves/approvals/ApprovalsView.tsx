'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@/components/Card';
import { primaryButtonClass, secondaryButtonClass } from '@/components/form';
import { usePendingApprovalCount } from '@/components/layout/PendingApprovalCount';
import { LeaveDetailModal } from '@/components/leave/LeaveDetailModal';
import { Pagination } from '@/components/Pagination';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { tdClass, thClass } from '@/components/table';
import { Tabs } from '@/components/Tabs';
import type { Leave, Paginated } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatDays, formatPeriod, formatTokyoDate } from '@/lib/format';
import { messages } from '@/messages/ja';

const t = messages.approvals;
const leaveTypes = messages.leave.types;
const LIMIT = 20;

type Scope = 'mine' | 'all';
type Step = 'detail' | 'approve' | 'reject';

// URL Query の解釈。scope=all は ADMIN だけ有効、page は 1 以上の整数のみ
export function parseApprovalsQuery(
  params: URLSearchParams,
  isAdmin: boolean,
): { scope: Scope; page: number } {
  const scope: Scope = isAdmin && params.get('scope') === 'all' ? 'all' : 'mine';
  const rawPage = params.get('page') ?? '';
  const page = /^\d+$/.test(rawPage) && Number(rawPage) >= 1 ? Number(rawPage) : 1;
  return { scope, page };
}

const smallButtonClass = 'h-9 px-4 text-sm/5 disabled:cursor-not-allowed';
const detailButtonClass = `${secondaryButtonClass} ${smallButtonClass}`;
const approveButtonClass = `${primaryButtonClass} ${smallButtonClass} disabled:bg-primary-60 disabled:hover:bg-primary-60`;

// SCR-005 休暇承認。表示の切り替え(scope)とページは URL Query に持つ(03 共通規則)
export function ApprovalsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user: me } = useAuth();
  const { refresh: refreshBadge } = usePendingApprovalCount();
  const isAdmin = me?.role === 'ADMIN';
  const { scope, page } = parseApprovalsQuery(searchParams, isAdmin);
  const [selected, setSelected] = useState<{ id: string; step: Step } | null>(null);

  const query = useApiQuery<Paginated<Leave>>(
    `/leaves/pending-approval?scope=${scope}&page=${page}&limit=${LIMIT}`,
  );

  function go(next: { scope: Scope; page: number }) {
    const params = new URLSearchParams();
    if (next.scope === 'all') params.set('scope', 'all');
    if (next.page > 1) params.set('page', String(next.page));
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function handleProcessed() {
    query.reload();
    refreshBadge();
  }

  function renderActions(leave: Leave) {
    const name = leave.user.name;
    // 本人の申請は承認・却下できない(SCR-005 §3)
    const own = leave.user.id === me?.id;
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => setSelected({ id: leave.id, step: 'detail' })}
          aria-label={t.detailLabel(name)}
          className={detailButtonClass}
        >
          {t.detail}
        </button>
        <button
          type="button"
          disabled={own}
          onClick={() => setSelected({ id: leave.id, step: 'approve' })}
          aria-label={t.approveLabel(name)}
          className={approveButtonClass}
        >
          {t.approve}
        </button>
        <button
          type="button"
          disabled={own}
          onClick={() => setSelected({ id: leave.id, step: 'reject' })}
          aria-label={t.rejectLabel(name)}
          className={`${detailButtonClass} disabled:text-general-60 disabled:hover:bg-white`}
        >
          {t.reject}
        </button>
      </div>
    );
  }

  function renderList() {
    if (query.status === 'loading') return <SkeletonLines count={5} />;
    if (query.status === 'error' || !query.data) return <SectionError onRetry={query.reload} />;
    const { items, totalPages, totalCount } = query.data;
    const showApprover = scope === 'all';

    if (items.length === 0) {
      return (
        <>
          <p className="py-6 text-center text-sm/5 text-general-80">
            {scope === 'all' ? t.emptyAll : t.emptyMine}
          </p>
          {/* 範囲外のページを指定された場合に戻れるよう、件数があるときは Pagination を出す */}
          {totalCount > 0 && (
            <Pagination
              page={query.data.page}
              totalPages={totalPages}
              totalCount={totalCount}
              onChange={(next) => go({ scope, page: next })}
            />
          )}
        </>
      );
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
              {showApprover && (
                <th scope="col" className={thClass}>
                  {t.approver}
                </th>
              )}
              <th scope="col" className={thClass}>
                {t.createdAt}
              </th>
              <th scope="col" className={`${thClass} text-right`}>
                {t.actions}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((leave) => (
              <tr key={leave.id}>
                <td className={tdClass}>{leave.user.name}</td>
                <td className={tdClass}>{leave.user.departmentName ?? messages.common.noValue}</td>
                <td className={tdClass}>{leaveTypes[leave.leaveType]}</td>
                <td className={`${tdClass} tabular-nums`}>
                  {formatPeriod(leave.startDate, leave.endDate)}
                </td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatDays(leave.days)}</td>
                {showApprover && (
                  <td className={tdClass}>{leave.approver?.name ?? messages.common.noValue}</td>
                )}
                <td className={`${tdClass} tabular-nums`}>{formatTokyoDate(leave.createdAt)}</td>
                <td className={tdClass}>{renderActions(leave)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* md 未満: 同じ情報の一覧 */}
        <ul className="divide-y divide-general-40 border-y border-general-40 md:hidden">
          {items.map((leave) => (
            <li key={leave.id} className="flex flex-col gap-1.5 px-2 py-3">
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
              {showApprover && (
                <span className="text-xs/4 text-general-80">
                  {t.approver}: {leave.approver?.name ?? messages.common.noValue}
                </span>
              )}
              <div className="pt-1">{renderActions(leave)}</div>
            </li>
          ))}
        </ul>

        <Pagination
          page={query.data.page}
          totalPages={totalPages}
          totalCount={totalCount}
          onChange={(next) => go({ scope, page: next })}
        />
      </>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <h1 className="text-h5 font-bold text-general-100">{t.title}</h1>

      {isAdmin && (
        <Tabs
          label={t.scopeLabel}
          items={[
            { value: 'mine', label: t.scopeMine },
            { value: 'all', label: t.scopeAll },
          ]}
          value={scope}
          onChange={(value) => go({ scope: value === 'all' ? 'all' : 'mine', page: 1 })}
        />
      )}

      <Card title={t.listTitle}>{renderList()}</Card>

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
