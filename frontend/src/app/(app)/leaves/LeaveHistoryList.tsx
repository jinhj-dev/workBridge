'use client';

import { cardFrameClass } from '@/components/Card';

import { useId } from 'react';
import { DateInput } from '@/components/DateInput';
import { DetailButton } from '@/components/ActionButtons';
import { Button } from '@/components/Button';
import { FieldError, inputClass, labelClass } from '@/components/form';
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge';
import { Pagination } from '@/components/Pagination';
import { SectionError } from '@/components/SectionError';
import { Select } from '@/components/Select';
import { SkeletonLines } from '@/components/Skeleton';
import { bandTdClass, bandThClass } from '@/components/table';
import type { ApiQuery } from '@/lib/api/useApiQuery';
import type { Leave, LeaveStatus, LeaveType, Paginated } from '@/lib/api/types';
import { formatDays, formatPeriod, formatTokyoDate } from '@/lib/format';
import { LEAVE_STATUSES, LEAVE_TYPES } from '@/lib/leave-days';
import type { LeavesQuery } from '@/lib/leave-days';
import { useSyncedState } from '@/lib/useSyncedState';
import { messages } from '@/messages/ja';

const t = messages.leaves.history;
const leaveTypes = messages.leave.types;
const ALL = 'ALL';
type TypeFilter = LeaveType | typeof ALL;
type StatusFilter = LeaveStatus | typeof ALL;

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: ALL, label: t.all },
  ...LEAVE_TYPES.map((type) => ({ value: type, label: leaveTypes[type] })),
];
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: ALL, label: t.all },
  ...LEAVE_STATUSES.map((status) => ({ value: status, label: messages.leave.statuses[status] })),
];

const dateInputClass = `${inputClass} h-11 px-3 text-sm/5`;

interface LeaveHistoryListProps {
  query: ApiQuery<Paginated<Leave>>;
  filters: LeavesQuery;
  // [検索] を押したとき(1 ページ目へ戻すのは呼び出し側)
  onSearch: (next: Omit<LeavesQuery, 'page'>) => void;
  onPageChange: (page: number) => void;
  onOpenDetail: (leaveId: string) => void;
}

// SCR-004 自分の休暇タブ内の申請履歴(検索条件カード + 表)
export function LeaveHistoryList({
  query,
  filters,
  onSearch,
  onPageChange,
  onOpenDetail,
}: LeaveHistoryListProps) {
  const idPrefix = useId();
  // 入力中の値は [検索] を押すまで URL に出さない。戻る操作などで URL が変わったら入力欄も合わせる
  const [draft, updateDraft] = useSyncedState(
    {
      appliedFrom: filters.appliedFrom,
      appliedTo: filters.appliedTo,
      leaveType: filters.leaveType,
      status: filters.status,
    },
    `${filters.appliedFrom}|${filters.appliedTo}|${filters.leaveType}|${filters.status}`,
  );
  const rangeInvalid =
    draft.appliedFrom !== '' && draft.appliedTo !== '' && draft.appliedFrom > draft.appliedTo;
  const rangeErrorId = `${idPrefix}-range-error`;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rangeInvalid) return;
    onSearch(draft);
  }

  function renderDetailButton(leave: Leave) {
    return (
      <DetailButton
        onClick={() => onOpenDetail(leave.id)}
        aria-label={t.detailLabel(
          leaveTypes[leave.leaveType],
          formatPeriod(leave.startDate, leave.endDate),
        )}
      />
    );
  }

  function renderList() {
    if (query.status === 'loading') return <SkeletonLines count={5} />;
    if (query.status === 'error' || !query.data) return <SectionError onRetry={query.reload} />;
    const { items, totalPages, totalCount } = query.data;
    const pagination = (
      <Pagination
        page={query.data.page}
        totalPages={totalPages}
        totalCount={totalCount}
        onChange={onPageChange}
      />
    );

    if (items.length === 0) {
      return (
        <>
          <p className="py-8 text-center text-sm/5 text-general-80">{t.empty}</p>
          {/* 範囲外のページを指定された場合に戻れるよう、件数があるときは Pagination を出す */}
          {totalCount > 0 && pagination}
        </>
      );
    }

    return (
      <>
        {/* md 以上: 表 */}
        <table className="hidden w-full border-collapse md:table">
          <thead>
            <tr>
              <th scope="col" className={bandThClass}>
                {t.createdAt}
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
                <td className={`${bandTdClass} text-right`}>{renderDetailButton(leave)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* md 未満: 同じ情報のカード一覧 */}
        <ul className="flex flex-col gap-3 md:hidden">
          {items.map((leave) => (
            <li
              key={leave.id}
              className="flex flex-col gap-2 rounded-xl border border-general-40 p-4"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-base/6 font-bold text-general-100">
                  {leaveTypes[leave.leaveType]}
                </span>
                <LeaveStatusBadge status={leave.status} soft />
              </span>
              <span className="flex items-baseline justify-between gap-3 text-sm/5 text-general-100 tabular-nums">
                <span>{formatPeriod(leave.startDate, leave.endDate)}</span>
                <span className="shrink-0 font-medium">{formatDays(leave.days)}</span>
              </span>
              <span className="text-xs/4 text-general-80">
                {t.createdAt} {formatTokyoDate(leave.createdAt)}
              </span>
              <div className="pt-1">{renderDetailButton(leave)}</div>
            </li>
          ))}
        </ul>

        {pagination}
      </>
    );
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        aria-label={t.title}
        className={`grid grid-cols-[minmax(0,1fr)] gap-4 ${cardFrameClass} p-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end`}
      >
        <div>
          <span id={`${idPrefix}-period-label`} className={labelClass}>
            {t.appliedPeriod}
          </span>
          <div
            role="group"
            aria-labelledby={`${idPrefix}-period-label`}
            className="flex items-center gap-2"
          >
            <DateInput
              id={`${idPrefix}-from`}
              compact
              aria-label={`${t.appliedPeriod} ${messages.dateRange.startDate}`}
              value={draft.appliedFrom}
              onChange={(e) => updateDraft({ appliedFrom: e.target.value })}
              aria-invalid={rangeInvalid || undefined}
              aria-describedby={rangeInvalid ? rangeErrorId : undefined}
              className={`${dateInputClass} min-w-0 flex-1`}
            />
            <span aria-hidden="true" className="text-general-80">
              ～
            </span>
            <DateInput
              id={`${idPrefix}-to`}
              compact
              aria-label={`${t.appliedPeriod} ${messages.dateRange.endDate}`}
              value={draft.appliedTo}
              onChange={(e) => updateDraft({ appliedTo: e.target.value })}
              aria-invalid={rangeInvalid || undefined}
              aria-describedby={rangeInvalid ? rangeErrorId : undefined}
              className={`${dateInputClass} min-w-0 flex-1`}
            />
          </div>
          {rangeInvalid && <FieldError id={rangeErrorId} message={messages.dateRange.order} />}
        </div>
        <div>
          <label htmlFor={`${idPrefix}-type`} className={labelClass}>
            {t.leaveTypeFilter}
          </label>
          <Select<TypeFilter>
            id={`${idPrefix}-type`}
            value={draft.leaveType === '' ? ALL : draft.leaveType}
            onChange={(value) => updateDraft({ leaveType: value === ALL ? '' : value })}
            options={TYPE_OPTIONS}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-status`} className={labelClass}>
            {t.statusFilter}
          </label>
          <Select<StatusFilter>
            id={`${idPrefix}-status`}
            value={draft.status === '' ? ALL : draft.status}
            onChange={(value) => updateDraft({ status: value === ALL ? '' : value })}
            options={STATUS_OPTIONS}
          />
        </div>
        <Button variant="primary" size="lg" type="submit" className="w-full sm:w-auto">
          {t.search}
        </Button>
      </form>

      <section aria-label={t.title} className={`${cardFrameClass} p-4 md:p-5`}>
        {/* 結果を待つ間は前の一覧を薄く残す(読み込み表示に置き換えず、ちらつかせない) */}
        <div
          aria-busy={query.isStale}
          className={query.isStale ? 'opacity-60 transition-opacity' : undefined}
        >
          {renderList()}
        </div>
      </section>
    </>
  );
}
