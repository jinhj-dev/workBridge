'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { DateRangeFields } from '@/components/attendance/DateRangeFields';
import {
  ATTENDANCE_STATUS_BADGE,
  MISSING_ROW_CLASS,
} from '@/components/attendance/attendanceStatus';
import { StatusFilterButtons } from '@/components/attendance/StatusFilterButtons';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { primaryButtonClass } from '@/components/form';
import { Pagination } from '@/components/Pagination';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { tdClass, thClass } from '@/components/table';
import { Tooltip } from '@/components/Tooltip';
import { ApiError } from '@/lib/api/client';
import type { Attendance, AttendanceStatus, Paginated } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { parseMyHistoryQuery, toQueryString, validateDateRange } from '@/lib/date-range';
import { formatClockOut, formatTokyoTime, formatWorkDate, formatWorkMinutes } from '@/lib/format';
import { useSyncedState } from '@/lib/useSyncedState';
import { messages } from '@/messages/ja';

const t = messages.attendance;
const LIMIT = 20;

// SCR-003 勤怠管理。検索条件とページは URL Query に持つ(03 共通規則)
export function AttendanceHistoryView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [now] = useState(() => new Date());
  const search = searchParams.toString();
  const applied = parseMyHistoryQuery(searchParams, now);
  const appliedStatus = applied.statuses.join(',');

  const [form, updateForm] = useSyncedState(
    { startDate: applied.startDate, endDate: applied.endDate, statuses: applied.statuses },
    `${applied.startDate}|${applied.endDate}|${appliedStatus}`,
  );
  // [照会] での検証エラー。表示は発生時の URL に限る(戻る操作で古いエラーを残さない)
  const [formError, setFormError] = useState<{ search: string; message: string } | null>(null);

  const urlError = validateDateRange(applied.startDate, applied.endDate);
  const query = useApiQuery<Paginated<Attendance>>(
    urlError
      ? null
      : `/attendance?${toQueryString({
          startDate: applied.startDate,
          endDate: applied.endDate,
          status: appliedStatus,
          page: applied.page,
          limit: LIMIT,
        })}`,
    // 状態ボタンで絞り込むとき、結果が届くまで前の一覧を残す(読み込み表示に置き換えない)
    { keepPreviousData: true },
  );
  const serverRangeError =
    query.error instanceof ApiError && query.error.code === 'INVALID_DATE_RANGE'
      ? query.error.message
      : null;
  const submitError = formError?.search === search ? formError.message : null;
  const rangeError = submitError ?? urlError ?? serverRangeError;
  const listBlocked = urlError !== null || serverRangeError !== null;

  function go(
    values: {
      startDate: string;
      endDate: string;
      statuses: AttendanceStatus[];
      page: number;
    },
    options?: { scroll: boolean },
  ) {
    const { startDate, endDate, statuses, page } = values;
    const url = `${pathname}?${toQueryString({ startDate, endDate, status: statuses.join(','), page })}`;
    if (options) {
      router.push(url, options);
    } else {
      router.push(url);
    }
  }

  function goToPage(page: number) {
    go({
      startDate: applied.startDate,
      endDate: applied.endDate,
      statuses: applied.statuses,
      page,
    });
  }

  // 状態は押した時点で反映する。期間は [照会] を押すまで反映しないため、URL の期間のまま 1 ページ目へ移る。
  // 続けて押されても取りこぼさないよう、次の選択は画面上の選択(form)から作る
  function handleStatusChange(statuses: AttendanceStatus[]) {
    updateForm({ statuses });
    // 画面の位置を動かさない(ページ先頭へ戻さない)
    go(
      { startDate: applied.startDate, endDate: applied.endDate, statuses, page: 1 },
      { scroll: false },
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const message = validateDateRange(form.startDate, form.endDate);
    if (message) {
      setFormError({ search, message });
      return;
    }
    setFormError(null);
    go({ ...form, page: 1 });
  }

  function renderList() {
    if (query.status === 'loading') return <SkeletonLines count={6} />;
    if (query.status === 'error' || !query.data) return <SectionError onRetry={query.reload} />;
    const { items, page, totalPages, totalCount } = query.data;
    if (items.length === 0) {
      return (
        <>
          <p className="py-6 text-center text-sm/5 text-general-80">
            {applied.statuses.length > 0 ? t.emptyFiltered : t.empty}
          </p>
          {/* 範囲外のページを指定された場合に戻れるよう、件数があるときは Pagination を出す */}
          {totalCount > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              onChange={goToPage}
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
                {t.workDate}
              </th>
              <th scope="col" className={thClass}>
                {t.clockIn}
              </th>
              <th scope="col" className={thClass}>
                {t.clockOut}
              </th>
              <th scope="col" className={`${thClass} text-right`}>
                {t.workTime}
              </th>
              <th scope="col" className={thClass}>
                {t.status}
              </th>
              <th scope="col" className={thClass}>
                {t.remarks}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className={item.status === 'MISSING_CLOCK_OUT' ? MISSING_ROW_CLASS : undefined}
              >
                <td className={`${tdClass} tabular-nums`}>{formatWorkDate(item.workDate)}</td>
                <td className={`${tdClass} tabular-nums`}>{formatTokyoTime(item.clockIn)}</td>
                <td className={`${tdClass} tabular-nums`}>
                  {formatClockOut(item.workDate, item.clockOut)}
                </td>
                <td className={`${tdClass} text-right tabular-nums`}>
                  {formatWorkMinutes(item.workMinutes)}
                </td>
                <td className={tdClass}>
                  <StatusBadge item={item} withTooltip />
                </td>
                <td className={tdClass}>{item.modifiedAt ? t.modified : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* md 未満: 同じ情報の一覧。ツールチップの文言は直接表示する */}
        <ul className="divide-y divide-general-40 border-y border-general-40 md:hidden">
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex flex-col gap-1 px-2 py-3 ${
                item.status === 'MISSING_CLOCK_OUT' ? MISSING_ROW_CLASS : ''
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm/5 font-medium text-general-100 tabular-nums">
                  {formatWorkDate(item.workDate)}
                </span>
                <StatusBadge item={item} />
              </span>
              <span className="text-sm/5 text-general-100 tabular-nums">
                {t.clockIn} {formatTokyoTime(item.clockIn)} / {t.clockOut}{' '}
                {formatClockOut(item.workDate, item.clockOut)} / {t.workTime}{' '}
                {formatWorkMinutes(item.workMinutes)}
              </span>
              {item.modifiedAt && (
                <span className="text-xs/4 text-general-80">
                  {t.remarks}: {t.modified}
                </span>
              )}
              {item.status === 'MISSING_CLOCK_OUT' && (
                <span className="text-xs/4 text-general-80">{t.missingHint}</span>
              )}
            </li>
          ))}
        </ul>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          onChange={goToPage}
        />
      </>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <h1 className="text-h5 font-bold text-general-100">{t.title}</h1>

      <Card title={t.searchTitle}>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4 sm:flex-row sm:items-start"
        >
          <div className="flex flex-col gap-4 sm:flex-1">
            <DateRangeFields
              idPrefix="attendance"
              startDate={form.startDate}
              endDate={form.endDate}
              onChange={updateForm}
              error={rangeError}
            />
            <StatusFilterButtons
              idPrefix="attendance"
              selected={form.statuses}
              onChange={handleStatusChange}
            />
          </div>
          <button type="submit" className={`${primaryButtonClass} h-12 px-8 sm:mt-6`}>
            {messages.dateRange.search}
          </button>
        </form>
      </Card>

      {!listBlocked && (
        <Card title={t.listTitle}>
          {/* 絞り込みの結果を待つ間は前の一覧を薄く残す(読み込み表示に置き換えず、ちらつかせない) */}
          <div
            aria-busy={query.isStale}
            className={query.isStale ? 'opacity-60 transition-opacity' : undefined}
          >
            {renderList()}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ item, withTooltip = false }: { item: Attendance; withTooltip?: boolean }) {
  const badge = (
    <Badge variant={ATTENDANCE_STATUS_BADGE[item.status]}>{t.statuses[item.status]}</Badge>
  );
  if (withTooltip && item.status === 'MISSING_CLOCK_OUT') {
    return <Tooltip content={t.missingHint}>{badge}</Tooltip>;
  }
  return badge;
}
