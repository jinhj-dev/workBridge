'use client';

import { Card } from '@/components/Card';
import { labelClass, secondaryButtonClass, selectClass } from '@/components/form';
import { Badge } from '@/components/Badge';
import { LEAVE_STATUS_BADGE } from '@/components/leave/LeaveDetailModal';
import { LeaveFilterButtons } from '@/components/leave/LeaveFilterButtons';
import { Pagination } from '@/components/Pagination';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { tdClass, thClass } from '@/components/table';
import type { ApiQuery } from '@/lib/api/useApiQuery';
import type { Leave, Paginated } from '@/lib/api/types';
import { formatDays, formatPeriod, formatTokyoDate } from '@/lib/format';
import { LEAVE_STATUSES, LEAVE_TYPES, yearOptions } from '@/lib/leave-days';
import type { LeavesQuery } from '@/lib/leave-days';
import { useSyncedState } from '@/lib/useSyncedState';
import { messages } from '@/messages/ja';

const t = messages.leaves.history;
const leaveTypes = messages.leave.types;
const FILTER_HINT_ID = 'leaves-filter-hint';
const detailButtonClass = `${secondaryButtonClass} h-9 px-4 text-sm/5`;

interface LeaveHistoryListProps {
  query: ApiQuery<Paginated<Leave>>;
  filters: LeavesQuery;
  currentYear: number;
  // 絞り込み・ページが変わったとき(絞り込みを変えるときは 1 ページ目にして渡す)
  onChange: (next: LeavesQuery, options?: { scroll: boolean }) => void;
  onOpenDetail: (leaveId: string) => void;
}

// SCR-004 §3.3 内 申請履歴(絞り込み + 一覧)
export function LeaveHistoryList({
  query,
  filters,
  currentYear,
  onChange,
  onOpenDetail,
}: LeaveHistoryListProps) {
  // 続けて押されても取りこぼさないよう、次の選択は URL ではなく画面上の選択から作る
  const [toggles, updateToggles] = useSyncedState(
    { statuses: filters.statuses, leaveTypes: filters.leaveTypes },
    `${filters.statuses.join(',')}|${filters.leaveTypes.join(',')}`,
  );

  // 状態・種別は押した時点で反映する。画面の位置は動かさない(ページ先頭へ戻さない)
  function handleToggleChange(patch: Partial<Pick<LeavesQuery, 'statuses' | 'leaveTypes'>>) {
    updateToggles(patch);
    onChange({ ...filters, ...toggles, ...patch, page: 1 }, { scroll: false });
  }

  function renderDetailButton(leave: Leave) {
    return (
      <button
        type="button"
        onClick={() => onOpenDetail(leave.id)}
        aria-label={t.detailLabel(
          leaveTypes[leave.leaveType],
          formatPeriod(leave.startDate, leave.endDate),
        )}
        className={detailButtonClass}
      >
        {t.detail}
      </button>
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
        onChange={(page) => onChange({ ...filters, page })}
      />
    );

    if (items.length === 0) {
      return (
        <>
          <p className="py-6 text-center text-sm/5 text-general-80">{t.empty}</p>
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
              <th scope="col" className={thClass}>
                {t.createdAt}
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
                {t.approver}
              </th>
              <th scope="col" className={thClass}>
                {t.statusColumn}
              </th>
              <th scope="col" className={`${thClass} text-right`}>
                {t.actions}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((leave) => (
              <tr key={leave.id}>
                <td className={`${tdClass} tabular-nums`}>{formatTokyoDate(leave.createdAt)}</td>
                <td className={tdClass}>{leaveTypes[leave.leaveType]}</td>
                <td className={`${tdClass} tabular-nums`}>
                  {formatPeriod(leave.startDate, leave.endDate)}
                </td>
                <td className={`${tdClass} text-right tabular-nums`}>{formatDays(leave.days)}</td>
                <td className={tdClass}>
                  {leave.approver?.name ?? messages.leave.detail.autoApproved}
                </td>
                <td className={tdClass}>
                  <Badge variant={LEAVE_STATUS_BADGE[leave.status]}>
                    {messages.leave.statuses[leave.status]}
                  </Badge>
                </td>
                <td className={`${tdClass} text-right`}>{renderDetailButton(leave)}</td>
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
                  {leaveTypes[leave.leaveType]}
                </span>
                <Badge variant={LEAVE_STATUS_BADGE[leave.status]}>
                  {messages.leave.statuses[leave.status]}
                </Badge>
              </span>
              <span className="flex items-baseline justify-between gap-3 text-sm/5 text-general-100 tabular-nums">
                <span>{formatPeriod(leave.startDate, leave.endDate)}</span>
                <span className="shrink-0">{formatDays(leave.days)}</span>
              </span>
              <span className="text-xs/4 text-general-80">
                {t.approver}: {leave.approver?.name ?? messages.leave.detail.autoApproved}
                {' ・ '}
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
    <Card title={t.title}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          {/* sm 未満は「年」と選択欄を横 1 列に並べる */}
          <div className="flex items-center gap-3 sm:block sm:max-w-xs">
            <label htmlFor="leaves-year" className={`${labelClass} shrink-0 max-sm:mb-0`}>
              {t.year}
            </label>
            <select
              id="leaves-year"
              value={filters.year}
              onChange={(e) => onChange({ ...filters, year: Number(e.target.value), page: 1 })}
              className={`${selectClass} min-w-0 flex-1`}
            >
              {yearOptions(currentYear).map((year) => (
                <option key={year} value={year}>
                  {t.yearOption(year)}
                </option>
              ))}
            </select>
          </div>
          <LeaveFilterButtons
            idPrefix="leaves-status"
            label={t.status}
            options={LEAVE_STATUSES}
            optionLabel={(status) => messages.leave.statuses[status]}
            variantOf={(status) => LEAVE_STATUS_BADGE[status]}
            selected={toggles.statuses}
            onChange={(statuses) => handleToggleChange({ statuses })}
            describedBy={FILTER_HINT_ID}
          />
          <LeaveFilterButtons
            idPrefix="leaves-leave-type"
            label={t.leaveType}
            options={LEAVE_TYPES}
            optionLabel={(type) => leaveTypes[type]}
            variantOf={() => 'neutral'}
            selected={toggles.leaveTypes}
            onChange={(next) => handleToggleChange({ leaveTypes: next })}
            describedBy={FILTER_HINT_ID}
          />
          <p id={FILTER_HINT_ID} className="-mt-2 text-xs/4 text-general-80">
            {t.filterHint}
          </p>
        </div>
        {/* 絞り込みの結果を待つ間は前の一覧を薄く残す(読み込み表示に置き換えず、ちらつかせない) */}
        <div
          aria-busy={query.isStale}
          className={query.isStale ? 'opacity-60 transition-opacity' : undefined}
        >
          {renderList()}
        </div>
      </div>
    </Card>
  );
}
