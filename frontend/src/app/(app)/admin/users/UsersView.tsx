'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { JobTitleBadge } from '@/components/JobTitleBadge';
import { PencilIcon, PlusIcon } from '@/components/leave/leaveIcons';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { SearchInput } from '@/components/SearchInput';
import { Select } from '@/components/Select';
import { SectionError } from '@/components/SectionError';
import { Skeleton, SkeletonLines } from '@/components/Skeleton';
import { StatCard } from '@/components/StatCard';
import { bandTdClass, bandThClass } from '@/components/table';
import { useToast } from '@/components/Toast';
import { ApiError, NetworkError, apiFetch } from '@/lib/api/client';
import type {
  Department,
  EmploymentStatus,
  JobTitle,
  Paginated,
  UserDetail,
  UserListItem,
  UserSummaryCounts,
} from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { formatDate } from '@/lib/format';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { useSyncedState } from '@/lib/useSyncedState';
import { messages } from '@/messages/ja';
import { TrashIcon } from '../departments/icons';
import { EmploymentStatusBadge } from './EmploymentStatusBadge';
import { EyeIcon, OrgChartIcon, PeopleIcon, ShieldIcon, UserIcon, UserPlusIcon } from './icons';
import { JobTitlesModal } from './JobTitlesModal';
import { UserCreateModal } from './UserCreateModal';
import { UserDeleteDialog } from './UserDeleteDialog';
import { UserDetailModal } from './UserDetailModal';
import { UserEditModal } from './UserEditModal';

const t = messages.users;
const LIMIT = 10;
const DEBOUNCE_MS = 300;
// Tailwind の sm 未満(スマホ幅)
const NARROW_QUERY = '(max-width: 39.99rem)';
// xl 以上は表、未満はカード(8 列の表が収まる最小幅から)
const TABLE_QUERY = '(min-width: 80rem)';
const STATUSES: readonly EmploymentStatus[] = ['ACTIVE', 'UPCOMING', 'INACTIVE'];

interface AppliedQuery {
  keyword: string;
  departmentId: string;
  jobTitleId: string;
  status: EmploymentStatus | '';
  page: number;
}

function parseQuery(params: URLSearchParams): AppliedQuery {
  const page = Number(params.get('page'));
  return {
    keyword: params.get('keyword') ?? '',
    departmentId: params.get('departmentId') ?? '',
    jobTitleId: params.get('jobTitleId') ?? '',
    // 不正な値は「すべて」に戻す
    status: STATUSES.find((status) => status === params.get('status')) ?? '',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

// 既定値の条件は付けず、URL を短く保つ
function toQueryString(query: AppliedQuery, limit?: number): string {
  const params = new URLSearchParams();
  if (query.keyword !== '') params.set('keyword', query.keyword);
  if (query.departmentId !== '') params.set('departmentId', query.departmentId);
  if (query.jobTitleId !== '') params.set('jobTitleId', query.jobTitleId);
  if (query.status !== '') params.set('status', query.status);
  if (query.page > 1 || limit !== undefined) params.set('page', String(query.page));
  if (limit !== undefined) params.set('limit', String(limit));
  return params.toString();
}

interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}

// ラベル付きの絞り込み select(先頭は選択できる「すべて」。共通 Select の sm サイズ)
function FilterSelect({ id, label, value, onChange, options }: FilterSelectProps) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs/4 font-medium text-general-80">
        {label}
      </label>
      <Select
        id={id}
        size="sm"
        value={value}
        onChange={onChange}
        options={[{ value: '', label: messages.common.all }, ...options]}
      />
    </div>
  );
}

// 氏名(円形アイコン + 太字)
function UserName({ item }: { item: UserListItem }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-30 text-primary-100 [&>svg]:size-5"
      >
        <UserIcon />
      </span>
      <span className="min-w-0 font-bold break-words text-general-100">{item.name}</span>
    </span>
  );
}

interface RowActionsProps {
  item: UserListItem;
  busy: boolean;
  onDetail: (item: UserListItem) => void;
  onEdit: (item: UserListItem) => void;
  onDelete: (item: UserListItem) => void;
}

// 無効の社員は削除済みなので [削除] を出さない
function RowActions({ item, busy, onDetail, onEdit, onDelete }: RowActionsProps) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        icon={<EyeIcon />}
        onClick={() => onDetail(item)}
        aria-label={t.detailLabel(item.name)}
      >
        {t.detail}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        icon={<PencilIcon />}
        disabled={busy}
        onClick={() => onEdit(item)}
        aria-label={t.editLabel(item.name)}
      >
        {t.edit}
      </Button>
      {item.isActive && (
        <Button
          size="sm"
          variant="dangerOutline"
          iconOnly
          icon={<TrashIcon />}
          disabled={busy}
          onClick={() => onDelete(item)}
          aria-label={t.deleteLabel(item.name)}
        />
      )}
    </span>
  );
}

interface ModalSlot {
  key: number;
  open: boolean;
}

// SCR-006 社員管理(管理者)。検索条件・ページは URL Query に持つ(03 共通規則)
export function UsersView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const searchId = useId();
  const applied = parseQuery(searchParams);
  const isNarrow = useMediaQuery(NARROW_QUERY) === true;
  const showTable = useMediaQuery(TABLE_QUERY) === true;

  // キーワードは入力中の値を手元に持ち、入力が止まってから URL に反映する(replace で履歴を増やさない)
  const [inputs, updateInputs] = useSyncedState({ keyword: applied.keyword }, applied.keyword);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestApplied = useRef(applied);
  useEffect(() => {
    latestApplied.current = applied;
  });
  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    },
    [],
  );

  // key は開くたびに変えて、モーダルの入力値を初期化する
  const [jobTitlesSlot, setJobTitlesSlot] = useState<ModalSlot>({ key: 0, open: false });
  const [createSlot, setCreateSlot] = useState<ModalSlot>({ key: 0, open: false });
  const [detailTarget, setDetailTarget] = useState<string | null>(null);
  const [editSlot, setEditSlot] = useState<ModalSlot & { user: UserDetail | null }>({
    key: 0,
    open: false,
    user: null,
  });
  const [deleteSlot, setDeleteSlot] = useState<{ open: boolean; user: UserDetail | null }>({
    open: false,
    user: null,
  });
  // 編集・削除の前に詳細を取得している社員の id(二重操作の防止)
  const [fetchingId, setFetchingId] = useState<string | null>(null);

  const query = useApiQuery<Paginated<UserListItem>>(
    `/admin/users?${toQueryString(applied, LIMIT)}`,
    {
      keepPreviousData: true,
    },
  );
  const summary = useApiQuery<UserSummaryCounts>('/admin/users/summary');
  const departments = useApiQuery<Department[]>('/departments');
  const jobTitles = useApiQuery<JobTitle[]>('/admin/job-titles');

  function href(values: AppliedQuery): string {
    const qs = toQueryString(values);
    return qs === '' ? pathname : `${pathname}?${qs}`;
  }

  function go(values: AppliedQuery): void {
    router.push(href(values));
  }

  function handleKeywordInput(value: string): void {
    updateInputs({ keyword: value });
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      router.replace(href({ ...latestApplied.current, keyword: value.trim(), page: 1 }), {
        scroll: false,
      });
    }, DEBOUNCE_MS);
  }

  // select の変更は即時反映(1 ページ目へ)。履歴は増やさない
  function handleFilter(patch: Partial<AppliedQuery>): void {
    router.replace(href({ ...applied, ...patch, page: 1 }), { scroll: false });
  }

  function handleClear(): void {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    router.replace(pathname, { scroll: false });
  }

  function reloadAll(): void {
    query.reload();
    summary.reload();
  }

  // 編集・削除は最新の詳細(承認待ち件数を含む)を取ってから開く
  async function openWithDetail(
    item: UserListItem,
    open: (user: UserDetail) => void,
  ): Promise<void> {
    if (fetchingId) return;
    setFetchingId(item.id);
    try {
      open(await apiFetch<UserDetail>(`/admin/users/${item.id}`));
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) {
        showToast(error.message, 'error');
        if (error instanceof ApiError && error.statusCode === 404) reloadAll();
      } else {
        throw error;
      }
    } finally {
      setFetchingId(null);
    }
  }

  function openEdit(user: UserDetail): void {
    setEditSlot((prev) => ({ key: prev.key + 1, open: true, user }));
  }

  // 削除後に現在のページが空になるときは前のページへ戻る
  function handleDeleted(): void {
    summary.reload();
    if (query.data && query.data.items.length === 1 && applied.page > 1) {
      go({ ...applied, page: applied.page - 1 });
      return;
    }
    query.reload();
  }

  const items = query.data?.items ?? [];
  const totalCount = query.data?.totalCount;
  const hasConditions =
    applied.keyword !== '' ||
    inputs.keyword !== '' ||
    applied.departmentId !== '' ||
    applied.jobTitleId !== '' ||
    applied.status !== '';
  const actionHandlers = {
    busy: fetchingId !== null,
    onDetail: (item: UserListItem) => setDetailTarget(item.id),
    onEdit: (item: UserListItem) => void openWithDetail(item, openEdit),
    onDelete: (item: UserListItem) =>
      void openWithDetail(item, (user) => setDeleteSlot({ open: true, user })),
  };

  function renderSummary() {
    if (summary.status === 'loading') {
      return [0, 1, 2].map((index) => <Skeleton key={index} className="h-24 w-full rounded-2xl" />);
    }
    // 要約の取得に失敗しても一覧は使えるので、数値の位置だけ「—」にする
    const data = summary.status === 'success' ? summary.data : undefined;
    const unit = data ? t.summary.unit : undefined;
    const value = (count: number | undefined) =>
      count === undefined ? messages.common.noValue : String(count);
    return (
      <>
        <StatCard
          icon={<PeopleIcon />}
          iconCircle
          label={t.summary.employees}
          value={value(data?.employeeCount)}
          unit={unit}
        />
        <StatCard
          icon={<ShieldIcon />}
          iconCircle
          label={t.summary.admins}
          value={value(data?.adminCount)}
          unit={unit}
        />
        <StatCard
          icon={<UserPlusIcon />}
          iconCircle
          tone="danger"
          label={t.summary.hiredThisMonth}
          value={value(data?.hiredThisMonthCount)}
          unit={unit}
        />
      </>
    );
  }

  function renderList() {
    if (query.status === 'loading') return <SkeletonLines count={6} />;
    if (query.status === 'error' || !query.data) return <SectionError onRetry={query.reload} />;
    const { page, totalPages } = query.data;
    const pagination = (
      <Pagination
        page={page}
        totalPages={totalPages}
        totalCount={query.data.totalCount}
        pageSize={LIMIT}
        compact={isNarrow}
        variant="boxed"
        onChange={(next) => go({ ...applied, page: next })}
      />
    );
    if (items.length === 0) {
      return (
        <>
          <p className="py-6 text-center text-sm/5 text-general-80">{t.empty}</p>
          {/* 範囲外のページを指定された場合に戻れるよう、件数があるときは Pagination を出す */}
          {query.data.totalCount > 0 && pagination}
        </>
      );
    }

    return (
      <>
        {/* xl 以上: 表。幅が足りないときは表の中だけ横スクロール */}
        {showTable ? (
          <div className="overflow-x-auto">
            <table aria-label={t.listLabel} className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  {[
                    t.columns.empId,
                    t.columns.name,
                    t.columns.jobTitle,
                    t.columns.email,
                    t.columns.department,
                    t.columns.hireDate,
                    t.columns.status,
                    t.columns.actions,
                  ].map((label) => (
                    <th key={label} scope="col" className={bandThClass}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className={`${bandTdClass} tabular-nums`}>{item.empId}</td>
                    <td className={bandTdClass}>
                      <UserName item={item} />
                    </td>
                    <td className={bandTdClass}>
                      <JobTitleBadge jobTitle={item.jobTitle} />
                    </td>
                    <td className={bandTdClass}>
                      <span
                        className="block max-w-52 truncate"
                        title={item.contactEmail ?? undefined}
                      >
                        {item.contactEmail ?? messages.common.noValue}
                      </span>
                    </td>
                    <td className={`${bandTdClass} whitespace-nowrap`}>{item.departmentName}</td>
                    <td className={`${bandTdClass} whitespace-nowrap tabular-nums`}>
                      {formatDate(item.hireDate)}
                    </td>
                    <td className={bandTdClass}>
                      <EmploymentStatusBadge status={item.employmentStatus} />
                    </td>
                    <td className={bandTdClass}>
                      <RowActions item={item} {...actionHandlers} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* xl 未満: 同じ情報のカード一覧 */
          <ul aria-label={t.listLabel} className="flex flex-col gap-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-general-40 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <UserName item={item} />
                  <EmploymentStatusBadge status={item.employmentStatus} />
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm/5 sm:grid-cols-[auto_1fr_auto_1fr]">
                  <dt className="text-general-80">{t.columns.empId}</dt>
                  <dd className="tabular-nums">{item.empId}</dd>
                  <dt className="text-general-80">{t.columns.jobTitle}</dt>
                  <dd>
                    <JobTitleBadge jobTitle={item.jobTitle} />
                  </dd>
                  <dt className="text-general-80">{t.columns.department}</dt>
                  <dd className="min-w-0 break-words">{item.departmentName}</dd>
                  <dt className="text-general-80">{t.columns.hireDate}</dt>
                  <dd className="tabular-nums">{formatDate(item.hireDate)}</dd>
                  <dt className="text-general-80">{t.columns.email}</dt>
                  <dd className="min-w-0 break-all sm:col-span-3">
                    {item.contactEmail ?? messages.common.noValue}
                  </dd>
                </dl>
                <RowActions item={item} {...actionHandlers} />
              </li>
            ))}
          </ul>
        )}

        {pagination}
      </>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title={t.title}
        description={t.description}
        icon={<PeopleIcon />}
        action={
          <div className="flex gap-2 max-md:[&>*]:flex-1">
            <Button
              variant="primaryOutline"
              size="lg"
              icon={<OrgChartIcon />}
              onClick={() => setJobTitlesSlot((prev) => ({ key: prev.key + 1, open: true }))}
            >
              {t.jobTitleCheck}
            </Button>
            <Button
              variant="primary"
              size="lg"
              icon={<PlusIcon />}
              onClick={() => setCreateSlot((prev) => ({ key: prev.key + 1, open: true }))}
            >
              {t.create}
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">{renderSummary()}</div>
        {summary.status === 'error' && <SectionError onRetry={summary.reload} />}
      </div>

      <Card
        title={totalCount === undefined ? t.listTitleLoading : t.listTitle(totalCount)}
        icon={<PeopleIcon />}
      >
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] xl:items-end">
          <div className="md:col-span-4 xl:col-span-1">
            <SearchInput
              id={searchId}
              label={t.searchLabel}
              value={inputs.keyword}
              onChange={handleKeywordInput}
              placeholder={t.searchPlaceholder}
            />
          </div>
          <FilterSelect
            id={`${searchId}-department`}
            label={t.filters.department}
            value={applied.departmentId}
            onChange={(value) => handleFilter({ departmentId: value })}
            options={(departments.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
          />
          <FilterSelect
            id={`${searchId}-job-title`}
            label={t.filters.jobTitle}
            value={applied.jobTitleId}
            onChange={(value) => handleFilter({ jobTitleId: value })}
            options={(jobTitles.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
          />
          <FilterSelect
            id={`${searchId}-status`}
            label={t.filters.status}
            value={applied.status}
            onChange={(value) =>
              handleFilter({ status: STATUSES.find((status) => status === value) ?? '' })
            }
            options={STATUSES.map((status) => ({ value: status, label: t.status[status] }))}
          />
          <Button variant="secondary" onClick={handleClear} disabled={!hasConditions}>
            {t.filters.clear}
          </Button>
        </div>
        {renderList()}
      </Card>

      <JobTitlesModal
        key={`job-titles-${jobTitlesSlot.key}`}
        open={jobTitlesSlot.open}
        onClose={() => setJobTitlesSlot((prev) => ({ ...prev, open: false }))}
        onChanged={() => {
          query.reload();
          jobTitles.reload();
        }}
      />
      <UserCreateModal
        key={`create-${createSlot.key}`}
        open={createSlot.open}
        onClose={() => setCreateSlot((prev) => ({ ...prev, open: false }))}
        onCreated={reloadAll}
      />
      <UserDetailModal
        key={detailTarget ?? 'detail-closed'}
        open={detailTarget !== null}
        userId={detailTarget}
        onClose={() => setDetailTarget(null)}
        onEdit={(user) => {
          setDetailTarget(null);
          openEdit(user);
        }}
        onNotFound={reloadAll}
      />
      {editSlot.user && (
        <UserEditModal
          key={`edit-${editSlot.key}`}
          open={editSlot.open}
          user={editSlot.user}
          onClose={() => setEditSlot((prev) => ({ ...prev, open: false }))}
          onSaved={reloadAll}
        />
      )}
      <UserDeleteDialog
        key={deleteSlot.user?.id ?? 'delete-closed'}
        open={deleteSlot.open}
        user={deleteSlot.user}
        onClose={() => setDeleteSlot((prev) => ({ ...prev, open: false }))}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
