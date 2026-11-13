'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { DateRangeFields } from '@/components/attendance/DateRangeFields';
import {
  ATTENDANCE_STATUS_BADGE,
  MISSING_ROW_CLASS,
} from '@/components/attendance/attendanceStatus';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import {
  inputClass,
  labelClass,
  secondaryButtonClass,
  selectClass,
  textButtonClass,
} from '@/components/form';
import { Pagination } from '@/components/Pagination';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { tdClass, thClass } from '@/components/table';
import { ApiError } from '@/lib/api/client';
import type { Attendance, AttendanceStatus, Department, Paginated } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import {
  parseAdminQuery,
  toQueryString,
  validateDateRange,
  type AdminQuery,
} from '@/lib/date-range';
import { formatClockOut, formatTokyoTime, formatWorkDate, formatWorkMinutes } from '@/lib/format';
import { useSyncedState } from '@/lib/useSyncedState';
import { messages } from '@/messages/ja';
import { AttendanceEditModal } from './AttendanceEditModal';

const t = messages.adminAttendance;
const common = messages.attendance;
const LIMIT = 20;
const STATUS_OPTIONS: AttendanceStatus[] = ['WORKING', 'DONE', 'MISSING_CLOCK_OUT'];

type FilterValues = Omit<AdminQuery, 'page'>;

const smallButtonClass = `${secondaryButtonClass} h-9 px-4 text-sm/5`;

// SCR-008 全体勤怠管理(管理者)。検索条件とページは URL Query に持つ(03 共通規則)
export function AdminAttendanceView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [now] = useState(() => new Date());
  const search = searchParams.toString();
  const applied = parseAdminQuery(searchParams, now);
  const appliedFilters: FilterValues = {
    name: applied.name,
    departmentId: applied.departmentId,
    status: applied.status,
    startDate: applied.startDate,
    endDate: applied.endDate,
  };

  const [form, updateForm] = useSyncedState<FilterValues>(
    appliedFilters,
    toQueryString(appliedFilters),
  );
  const [formError, setFormError] = useState<{ search: string; message: string } | null>(null);
  const [editing, setEditing] = useState<Attendance | null>(null);

  // 部署の取得に失敗しても一覧は使える(部署の選択肢が「すべて」だけになる)
  const departments = useApiQuery<Department[]>('/departments');
  const departmentList = departments.status === 'success' ? (departments.data ?? []) : [];
  const knownDepartment = (id: string) => departmentList.some((d) => d.id === id);
  // 部署一覧の取得が完了するまでは URL の条件を保つ(取得前に [照会] しても条件が消えない)
  const selectedDepartmentId =
    departments.status !== 'success' || knownDepartment(form.departmentId) ? form.departmentId : '';

  const urlError = validateDateRange(applied.startDate, applied.endDate);
  const query = useApiQuery<Paginated<Attendance>>(
    urlError ? null : `/admin/attendance?${toQueryString({ ...applied, limit: LIMIT })}`,
  );
  const serverRangeError =
    query.error instanceof ApiError && query.error.code === 'INVALID_DATE_RANGE'
      ? query.error.message
      : null;
  const submitError = formError?.search === search ? formError.message : null;
  const rangeError = submitError ?? urlError ?? serverRangeError;
  const listBlocked = urlError !== null || serverRangeError !== null;

  function go(values: AdminQuery) {
    router.push(`${pathname}?${toQueryString({ ...values })}`);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const message = validateDateRange(form.startDate, form.endDate);
    if (message) {
      setFormError({ search, message });
      return;
    }
    setFormError(null);
    go({ ...form, name: form.name.trim(), departmentId: selectedDepartmentId, page: 1 });
  }

  function renderList() {
    if (query.status === 'loading') return <SkeletonLines count={6} />;
    if (query.status === 'error' || !query.data) return <SectionError onRetry={query.reload} />;
    const { items, page, totalPages, totalCount } = query.data;
    if (items.length === 0) {
      return (
        <>
          <p className="py-6 text-center text-sm/5 text-general-80">{t.empty}</p>
          {/* 範囲外のページを指定された場合に戻れるよう、件数があるときは Pagination を出す */}
          {totalCount > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              onChange={(next) => go({ ...applied, page: next })}
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
                {common.workDate}
              </th>
              <th scope="col" className={thClass}>
                {t.employee}
              </th>
              <th scope="col" className={thClass}>
                {t.department}
              </th>
              <th scope="col" className={thClass}>
                {common.clockIn}
              </th>
              <th scope="col" className={thClass}>
                {common.clockOut}
              </th>
              <th scope="col" className={`${thClass} text-right`}>
                {common.workTime}
              </th>
              <th scope="col" className={thClass}>
                {common.status}
              </th>
              <th scope="col" className={thClass}>
                <span className="sr-only">{t.edit}</span>
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
                <td className={tdClass}>
                  <Link href={`/admin/users/${item.user.id}`} className={textButtonClass}>
                    {item.user.name}
                  </Link>
                </td>
                <td className={tdClass}>{item.user.departmentName ?? messages.common.noValue}</td>
                <td className={`${tdClass} tabular-nums`}>{formatTokyoTime(item.clockIn)}</td>
                <td className={`${tdClass} tabular-nums`}>
                  {formatClockOut(item.workDate, item.clockOut)}
                </td>
                <td className={`${tdClass} text-right tabular-nums`}>
                  {formatWorkMinutes(item.workMinutes)}
                </td>
                <td className={tdClass}>
                  <Badge variant={ATTENDANCE_STATUS_BADGE[item.status]}>
                    {common.statuses[item.status]}
                  </Badge>
                </td>
                <td className={`${tdClass} text-right`}>
                  <EditButton item={item} onEdit={setEditing} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* md 未満: 同じ情報の一覧 */}
        <ul className="divide-y divide-general-40 border-y border-general-40 md:hidden">
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex flex-col gap-1.5 px-2 py-3 ${
                item.status === 'MISSING_CLOCK_OUT' ? MISSING_ROW_CLASS : ''
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <Link href={`/admin/users/${item.user.id}`} className={textButtonClass}>
                  {item.user.name}
                </Link>
                <Badge variant={ATTENDANCE_STATUS_BADGE[item.status]}>
                  {common.statuses[item.status]}
                </Badge>
              </span>
              <span className="text-xs/4 text-general-80">
                {item.user.departmentName ?? messages.common.noValue}
              </span>
              <span className="text-sm/5 text-general-100 tabular-nums">
                {formatWorkDate(item.workDate)}
              </span>
              <span className="text-sm/5 text-general-100 tabular-nums">
                {common.clockIn} {formatTokyoTime(item.clockIn)} / {common.clockOut}{' '}
                {formatClockOut(item.workDate, item.clockOut)} / {common.workTime}{' '}
                {formatWorkMinutes(item.workMinutes)}
              </span>
              <span>
                <EditButton item={item} onEdit={setEditing} />
              </span>
            </li>
          ))}
        </ul>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          onChange={(next) => go({ ...applied, page: next })}
        />
      </>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <h1 className="text-h5 font-bold text-general-100">{t.title}</h1>

      <Card title={common.searchTitle}>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div>
            <label htmlFor="admin-attendance-name" className={labelClass}>
              {t.name}
            </label>
            <input
              id="admin-attendance-name"
              type="text"
              maxLength={100}
              value={form.name}
              onChange={(e) => updateForm({ name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="admin-attendance-department" className={labelClass}>
              {t.department}
            </label>
            <select
              id="admin-attendance-department"
              value={selectedDepartmentId}
              onChange={(e) => updateForm({ departmentId: e.target.value })}
              className={selectClass}
            >
              <option value="">{messages.common.all}</option>
              {departmentList.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="admin-attendance-status" className={labelClass}>
              {t.status}
            </label>
            <select
              id="admin-attendance-status"
              value={form.status}
              onChange={(e) => updateForm({ status: e.target.value as FilterValues['status'] })}
              className={selectClass}
            >
              <option value="">{messages.common.all}</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {common.statuses[status]}
                </option>
              ))}
            </select>
          </div>
          <DateRangeFields
            idPrefix="admin-attendance"
            startDate={form.startDate}
            endDate={form.endDate}
            onChange={updateForm}
            error={rangeError}
          />
          <div className="sm:col-span-2 lg:col-span-1 lg:mt-6">
            <Button variant="primary" size="lg" type="submit" className="w-full sm:w-auto">
              {messages.dateRange.search}
            </Button>
          </div>
        </form>
      </Card>

      {!listBlocked && <Card title={common.listTitle}>{renderList()}</Card>}

      <AttendanceEditModal
        key={editing?.id ?? 'closed'}
        attendance={editing}
        onClose={() => setEditing(null)}
        onSaved={query.reload}
      />
    </div>
  );
}

function EditButton({ item, onEdit }: { item: Attendance; onEdit: (item: Attendance) => void }) {
  return (
    <button
      type="button"
      onClick={() => onEdit(item)}
      aria-label={t.editLabel(item.user.name, formatWorkDate(item.workDate))}
      className={smallButtonClass}
    >
      {t.edit}
    </button>
  );
}
