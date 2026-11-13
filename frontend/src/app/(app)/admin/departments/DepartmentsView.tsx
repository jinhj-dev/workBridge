'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import {
  dangerOutlineButtonClass,
  primaryOutlineButtonClass,
  secondaryButtonClass,
  selectClass,
} from '@/components/form';
import { PlusIcon } from '@/components/leave/leaveIcons';
import { Notice } from '@/components/Notice';
import { PageHeader } from '@/components/PageHeader';
import { Pagination } from '@/components/Pagination';
import { SearchInput } from '@/components/SearchInput';
import { SectionError } from '@/components/SectionError';
import { Skeleton, SkeletonLines } from '@/components/Skeleton';
import { StatCard } from '@/components/StatCard';
import { tdClass, thClass } from '@/components/table';
import { useToast } from '@/components/Toast';
import type { DepartmentDetail, DepartmentSummary, Paginated } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { formatTokyoDate } from '@/lib/format';
import { useSyncedState } from '@/lib/useSyncedState';
import { messages } from '@/messages/ja';
import { DepartmentDeleteModal } from './DepartmentDeleteModal';
import { DepartmentDetailModal } from './DepartmentDetailModal';
import { DepartmentFormModal } from './DepartmentFormModal';
import { DepartmentMembersModal } from './DepartmentMembersModal';
import { BuildingIcon, LayersIcon, ListIcon, PeopleIcon, PencilIcon, TrashIcon } from './icons';
import { SortableTh } from './SortableTh';

const t = messages.departments;
const LIMIT = 20;
const DEBOUNCE_MS = 300;

type SortKey = 'name' | 'memberCount' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

const SORT_KEYS: readonly SortKey[] = ['name', 'memberCount', 'updatedAt'];
const DEFAULT_SORT: { sort: SortKey; order: SortOrder } = { sort: 'name', order: 'asc' };
// 列を初めて押したときの向き
const DEFAULT_ORDER: Record<SortKey, SortOrder> = {
  name: 'asc',
  memberCount: 'desc',
  updatedAt: 'desc',
};
const SORT_SELECT_VALUES = [
  'name:asc',
  'name:desc',
  'memberCount:desc',
  'memberCount:asc',
  'updatedAt:desc',
  'updatedAt:asc',
] as const;

interface AppliedQuery {
  name: string;
  sort: SortKey;
  order: SortOrder;
  page: number;
}

function parseQuery(params: URLSearchParams): AppliedQuery {
  const page = Number(params.get('page'));
  const sort = SORT_KEYS.find((key) => key === params.get('sort'));
  const order = params.get('order');
  return {
    name: params.get('name') ?? '',
    // 不正な値は既定の並びに戻す
    sort: sort ?? DEFAULT_SORT.sort,
    order: sort
      ? order === 'asc' || order === 'desc'
        ? order
        : DEFAULT_ORDER[sort]
      : DEFAULT_SORT.order,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

function isDefaultSort(query: AppliedQuery): boolean {
  return query.sort === DEFAULT_SORT.sort && query.order === DEFAULT_SORT.order;
}

// 既定値の条件は付けず、URL を短く保つ
function toQueryString(query: AppliedQuery, limit?: number): string {
  const params = new URLSearchParams();
  if (query.name !== '') params.set('name', query.name);
  if (!isDefaultSort(query) || limit !== undefined) {
    params.set('sort', query.sort);
    params.set('order', query.order);
  }
  if (query.page > 1) params.set('page', String(query.page));
  if (limit !== undefined) {
    params.set('page', String(query.page));
    params.set('limit', String(limit));
  }
  return params.toString();
}

interface RowActionsProps {
  item: DepartmentDetail;
  onDetail: (item: DepartmentDetail) => void;
  onEdit: (item: DepartmentDetail) => void;
  onDelete: (item: DepartmentDetail) => void;
}

const rowButtonClass =
  'inline-flex h-9 items-center justify-center gap-1 px-3 text-sm/5 whitespace-nowrap';

// 編集・削除は未所属(システム部署)には出さない
function RowActions({ item, onDetail, onEdit, onDelete }: RowActionsProps) {
  return (
    <span className="flex flex-wrap items-center gap-2 md:justify-end">
      <button
        type="button"
        onClick={() => onDetail(item)}
        aria-label={t.detailLabel(item.name)}
        className={`${secondaryButtonClass} ${rowButtonClass}`}
      >
        {t.detail}
      </button>
      {!item.isSystem && (
        <>
          <button
            type="button"
            onClick={() => onEdit(item)}
            aria-label={t.editLabel(item.name)}
            className={`${primaryOutlineButtonClass} ${rowButtonClass}`}
          >
            <span aria-hidden="true" className="size-4">
              <PencilIcon />
            </span>
            {t.edit}
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            aria-label={t.deleteLabel(item.name)}
            className={`${dangerOutlineButtonClass} ${rowButtonClass}`}
          >
            <span aria-hidden="true" className="size-4">
              <TrashIcon />
            </span>
            {t.delete}
          </button>
        </>
      )}
    </span>
  );
}

// 部署名の表示(アイコン + 名前 + コード)
function DepartmentName({ item }: { item: DepartmentDetail }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-30 text-primary-100 [&>svg]:size-5"
      >
        <BuildingIcon />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="font-bold break-words text-general-100">{item.name}</span>
          {item.isSystem && <Badge variant="neutral">{t.system}</Badge>}
        </span>
        <span className="block text-xs/4 text-general-80 tabular-nums">{item.code}</span>
      </span>
    </div>
  );
}

// 所属社員数と、その部署の所属社員を確認するボタン(0 名でも押せる)
function MemberCountWithCheck({
  item,
  onCheck,
  className = '',
}: {
  item: DepartmentDetail;
  onCheck: (item: DepartmentDetail) => void;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 tabular-nums ${className}`}>
      {t.members(item.memberCount)}
      <button
        type="button"
        onClick={() => onCheck(item)}
        aria-label={t.viewMembersLabel(item.name)}
        className={`${secondaryButtonClass} ${rowButtonClass}`}
      >
        {t.viewMembers}
      </button>
    </span>
  );
}

// SCR-010 部署管理(管理者)。検索条件・並び順・ページは URL Query に持つ(03 共通規則)
export function DepartmentsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const applied = parseQuery(searchParams);

  // 部署名は入力中の値を手元に持ち、入力が止まってから URL に反映する(replace で履歴を増やさない)
  const [inputs, updateInputs] = useSyncedState({ name: applied.name }, applied.name);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // デバウンス中に並び順が変わっても、反映時は最新の条件を使う
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
  const [formState, setFormState] = useState<{
    key: number;
    open: boolean;
    target: DepartmentDetail | null;
  }>({ key: 0, open: false, target: null });
  const [deleting, setDeleting] = useState<DepartmentDetail | null>(null);
  const [viewingMembers, setViewingMembers] = useState<DepartmentDetail | null>(null);
  const [detailTarget, setDetailTarget] = useState<DepartmentDetail | null>(null);

  const query = useApiQuery<Paginated<DepartmentDetail>>(
    `/admin/departments?${toQueryString(applied, LIMIT)}`,
  );
  const summary = useApiQuery<DepartmentSummary>('/admin/departments/summary');

  function href(values: AppliedQuery): string {
    const qs = toQueryString(values);
    return qs === '' ? pathname : `${pathname}?${qs}`;
  }

  function go(values: AppliedQuery): void {
    router.push(href(values));
  }

  function handleSearchInput(value: string): void {
    updateInputs({ name: value });
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      router.replace(href({ ...latestApplied.current, name: value.trim(), page: 1 }));
    }, DEBOUNCE_MS);
  }

  function handleSort(key: SortKey): void {
    const order =
      applied.sort === key ? (applied.order === 'asc' ? 'desc' : 'asc') : DEFAULT_ORDER[key];
    go({ ...applied, sort: key, order, page: 1 });
  }

  function handleSortSelect(value: string): void {
    const [sort, order] = value.split(':');
    const key = SORT_KEYS.find((k) => k === sort);
    if (key && (order === 'asc' || order === 'desc')) go({ ...applied, sort: key, order, page: 1 });
  }

  function handleClear(): void {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    router.push(pathname);
  }

  function openForm(target: DepartmentDetail | null): void {
    setFormState((prev) => ({ key: prev.key + 1, open: true, target }));
  }

  function closeForm(): void {
    setFormState((prev) => ({ ...prev, open: false }));
  }

  function reloadAll(): void {
    query.reload();
    summary.reload();
  }

  function requestDelete(item: DepartmentDetail): void {
    // 有効な社員がいる部署は、API を呼ばずに理由だけ伝える
    if (item.memberCount > 0) {
      showToast(t.hasMembers, 'error');
      return;
    }
    setDeleting(item);
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
  const direction = (key: SortKey) => (applied.sort === key ? applied.order : null);
  const hasConditions = applied.name !== '' || inputs.name !== '' || !isDefaultSort(applied);
  const actionHandlers = {
    onDetail: setDetailTarget,
    onEdit: openForm,
    onDelete: requestDelete,
  };

  function renderSummary() {
    if (summary.status === 'loading') {
      return (
        <>
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </>
      );
    }
    // 要約の取得に失敗しても一覧は使えるので、数値の位置だけ「—」にする
    const data = summary.status === 'success' ? summary.data : undefined;
    return (
      <>
        <StatCard
          icon={<LayersIcon />}
          label={t.summary.departments}
          value={data ? String(data.departmentCount) : messages.common.noValue}
          unit={data ? t.summary.unitDepartments : undefined}
        />
        <StatCard
          icon={<PeopleIcon />}
          label={t.summary.members}
          value={data ? String(data.memberCount) : messages.common.noValue}
          unit={data ? t.summary.unitPeople : undefined}
        />
      </>
    );
  }

  function renderList() {
    if (query.status === 'loading') return <SkeletonLines count={6} />;
    if (query.status === 'error' || !query.data) return <SectionError onRetry={query.reload} />;
    const { page, totalPages, totalCount } = query.data;
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
        {/* md 以上: 表。見出し 44 + 行 52 x 5 を上限にデータ部だけ縦スクロール(見出しは固定)。
            幅が足りないときは表の中だけ横スクロール */}
        <div className="hidden max-h-76 overflow-auto md:block">
          <table className="w-full border-separate border-spacing-0">
            <thead className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white">
              <tr>
                <SortableTh
                  label={t.name}
                  direction={direction('name')}
                  onSort={() => handleSort('name')}
                />
                <th scope="col" className={thClass}>
                  {t.columns.manager}
                </th>
                <SortableTh
                  label={t.memberCount}
                  direction={direction('memberCount')}
                  onSort={() => handleSort('memberCount')}
                  align="right"
                />
                <th scope="col" className={thClass}>
                  {t.columns.description}
                </th>
                <SortableTh
                  label={t.updatedAt}
                  direction={direction('updatedAt')}
                  onSort={() => handleSort('updatedAt')}
                />
                <th scope="col" className={`${thClass} text-right`}>
                  <span className="sr-only">{t.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const cell = tdClass;
                return (
                  <tr key={item.id}>
                    <td className={cell}>
                      <DepartmentName item={item} />
                    </td>
                    <td className={`${cell} whitespace-nowrap`}>
                      {item.manager?.name ?? messages.common.noValue}
                    </td>
                    <td className={`${cell} text-right whitespace-nowrap`}>
                      <MemberCountWithCheck item={item} onCheck={setViewingMembers} />
                    </td>
                    <td className={cell}>
                      <span
                        title={item.description ?? undefined}
                        className="block max-w-56 truncate"
                      >
                        {item.description ?? messages.common.noValue}
                      </span>
                    </td>
                    <td className={`${cell} whitespace-nowrap tabular-nums`}>
                      {formatTokyoDate(item.updatedAt)}
                    </td>
                    <td className={cell}>
                      <RowActions item={item} {...actionHandlers} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* md 未満: 同じ情報のカード一覧 */}
        <ul className="flex flex-col gap-3 md:hidden">
          {items.map((item) => {
            return (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border border-general-40 p-3"
              >
                <DepartmentName item={item} />
                <span className="text-sm/5 text-general-100">
                  {t.columns.manager}: {item.manager?.name ?? messages.common.noValue}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 text-sm/5 text-general-100">
                  {t.memberCount}
                  <MemberCountWithCheck item={item} onCheck={setViewingMembers} />
                </span>
                <span className="text-sm/5 text-general-100 tabular-nums">
                  {t.updatedAt} {formatTokyoDate(item.updatedAt)}
                </span>
                {item.description && (
                  <span className="line-clamp-2 text-sm/5 break-words text-general-80">
                    {item.description}
                  </span>
                )}
                <RowActions item={item} {...actionHandlers} />
              </li>
            );
          })}
        </ul>

        <div className="mt-3">
          <Notice>
            <ul>
              {t.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Notice>
        </div>

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
      <div className="flex flex-col gap-2">
        <PageHeader
          title={t.title}
          icon={<LayersIcon />}
          action={
            <Button variant="primary" size="lg" icon={<PlusIcon />} onClick={() => openForm(null)}>
              {t.create}
            </Button>
          }
        />
        <p className="text-sm/5 text-general-80">{t.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{renderSummary()}</div>

      <Card
        title={t.listTitle}
        icon={<ListIcon />}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-64">
              <SearchInput
                id="departments-name"
                label={t.searchLabel}
                value={inputs.name}
                onChange={handleSearchInput}
                placeholder={t.searchPlaceholder}
              />
            </div>
            <select
              aria-label={t.sort.label}
              value={`${applied.sort}:${applied.order}`}
              onChange={(e) => handleSortSelect(e.target.value)}
              className={`${selectClass} h-11 w-full text-sm/5 sm:w-auto md:hidden`}
            >
              {SORT_SELECT_VALUES.map((value) => (
                <option key={value} value={value}>
                  {t.sort.options[value]}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={handleClear} disabled={!hasConditions}>
              {t.clear}
            </Button>
          </div>
        }
      >
        {renderList()}
      </Card>

      <DepartmentDetailModal
        key={detailTarget?.id ?? 'detail-closed'}
        department={detailTarget}
        onClose={() => setDetailTarget(null)}
        onEdit={(department) => {
          setDetailTarget(null);
          openForm(department);
        }}
      />

      <DepartmentFormModal
        key={formState.key}
        open={formState.open}
        department={formState.target}
        onClose={closeForm}
        onDone={reloadAll}
      />
      <DepartmentDeleteModal
        key={deleting?.id ?? 'closed'}
        department={deleting}
        onClose={() => setDeleting(null)}
        onDone={handleDeleted}
      />
      <DepartmentMembersModal
        key={viewingMembers?.id ?? 'members-closed'}
        department={viewingMembers}
        onClose={() => setViewingMembers(null)}
        onNotFound={reloadAll}
      />
    </div>
  );
}
