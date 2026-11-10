'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { inputClass, labelClass, primaryButtonClass, textButtonClass } from '@/components/form';
import { Pagination } from '@/components/Pagination';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { tdClass, thClass } from '@/components/table';
import { useToast } from '@/components/Toast';
import type { DepartmentDetail, Paginated } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { formatTokyoDate } from '@/lib/format';
import { useSyncedState } from '@/lib/useSyncedState';
import { messages } from '@/messages/ja';
import { DepartmentDeleteModal } from './DepartmentDeleteModal';
import { DepartmentFormModal } from './DepartmentFormModal';

const t = messages.departments;
const LIMIT = 20;

interface Filters {
  code: string;
  name: string;
}

interface AppliedQuery extends Filters {
  page: number;
}

function parseQuery(params: URLSearchParams): AppliedQuery {
  const page = Number(params.get('page'));
  return {
    code: params.get('code') ?? '',
    name: params.get('name') ?? '',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

// 空の条件は付けない。page=1 も省略して URL を短く保つ
function toQueryString(query: AppliedQuery, limit?: number): string {
  const params = new URLSearchParams();
  if (query.code !== '') params.set('code', query.code);
  if (query.name !== '') params.set('name', query.name);
  if (query.page > 1) params.set('page', String(query.page));
  if (limit !== undefined) {
    params.set('page', String(query.page));
    params.set('limit', String(limit));
  }
  return params.toString();
}

// 編集・削除は未所属(システム部署)には出さない
function RowActions({
  item,
  onEdit,
  onDelete,
}: {
  item: DepartmentDetail;
  onEdit: (item: DepartmentDetail) => void;
  onDelete: (item: DepartmentDetail) => void;
}) {
  if (item.isSystem) return null;
  return (
    <span className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={() => onEdit(item)}
        aria-label={t.editLabel(item.name)}
        className={textButtonClass}
      >
        {t.edit}
      </button>
      <button
        type="button"
        onClick={() => onDelete(item)}
        aria-label={t.deleteLabel(item.name)}
        className={textButtonClass}
      >
        {t.delete}
      </button>
    </span>
  );
}

// SCR-010 部署管理(管理者)。検索条件とページは URL Query に持つ(03 共通規則)
export function DepartmentsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const applied = parseQuery(searchParams);

  const [form, updateForm] = useSyncedState<Filters>(
    { code: applied.code, name: applied.name },
    toQueryString({ ...applied, page: 1 }),
  );
  // key は開くたびに変えて、モーダルの入力値を初期化する
  const [formState, setFormState] = useState<{
    key: number;
    open: boolean;
    target: DepartmentDetail | null;
  }>({ key: 0, open: false, target: null });
  const [deleting, setDeleting] = useState<DepartmentDetail | null>(null);

  const query = useApiQuery<Paginated<DepartmentDetail>>(
    `/admin/departments?${toQueryString(applied, LIMIT)}`,
  );

  function go(values: AppliedQuery): void {
    const qs = toQueryString(values);
    router.push(qs === '' ? pathname : `${pathname}?${qs}`);
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    go({ code: form.code.trim(), name: form.name.trim(), page: 1 });
  }

  function openForm(target: DepartmentDetail | null): void {
    setFormState((prev) => ({ key: prev.key + 1, open: true, target }));
  }

  function closeForm(): void {
    setFormState((prev) => ({ ...prev, open: false }));
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
    if (query.data && query.data.items.length === 1 && applied.page > 1) {
      go({ ...applied, page: applied.page - 1 });
      return;
    }
    query.reload();
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
        <p className="mb-3 text-sm/5 text-general-80">{t.memberCountNote}</p>

        {/* md 以上: 表 */}
        <table className="hidden w-full border-collapse md:table">
          <thead>
            <tr>
              <th scope="col" className={thClass}>
                {t.code}
              </th>
              <th scope="col" className={thClass}>
                {t.name}
              </th>
              <th scope="col" className={`${thClass} text-right`}>
                {t.memberCount}
              </th>
              <th scope="col" className={thClass}>
                {t.updatedAt}
              </th>
              <th scope="col" className={`${thClass} text-right`}>
                <span className="sr-only">{t.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className={`${tdClass} tabular-nums`}>{item.code}</td>
                <td className={tdClass}>
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 break-words">{item.name}</span>
                    {item.isSystem && <Badge variant="neutral">{t.system}</Badge>}
                  </span>
                </td>
                <td className={`${tdClass} text-right tabular-nums`}>
                  {t.members(item.memberCount)}
                </td>
                <td className={`${tdClass} tabular-nums`}>{formatTokyoDate(item.updatedAt)}</td>
                <td className={tdClass}>
                  <RowActions item={item} onEdit={openForm} onDelete={requestDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* md 未満: 同じ情報の一覧 */}
        <ul className="divide-y divide-general-40 border-y border-general-40 md:hidden">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-1.5 px-2 py-3">
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0 break-words font-medium text-general-100">
                  {item.name}
                </span>
                {item.isSystem && <Badge variant="neutral">{t.system}</Badge>}
              </span>
              <span className="text-xs/4 text-general-80 tabular-nums">{item.code}</span>
              <span className="text-sm/5 text-general-100 tabular-nums">
                {t.memberCount} {t.members(item.memberCount)} / {t.updatedAt}{' '}
                {formatTokyoDate(item.updatedAt)}
              </span>
              {!item.isSystem && (
                <span className="flex gap-3">
                  <RowActions item={item} onEdit={openForm} onDelete={requestDelete} />
                </span>
              )}
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
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-h5 font-bold text-general-100">{t.title}</h1>
        <button
          type="button"
          onClick={() => openForm(null)}
          className={`${primaryButtonClass} h-10 px-6 text-sm/5`}
        >
          {t.create}
        </button>
      </div>

      <Card title={t.searchTitle}>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <div>
            <label htmlFor="departments-code" className={labelClass}>
              {t.code}
            </label>
            <input
              id="departments-code"
              type="text"
              maxLength={20}
              value={form.code}
              onChange={(e) => updateForm({ code: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="departments-name" className={labelClass}>
              {t.name}
            </label>
            <input
              id="departments-name"
              type="text"
              maxLength={100}
              value={form.name}
              onChange={(e) => updateForm({ name: e.target.value })}
              className={inputClass}
            />
          </div>
          <button type="submit" className={`${primaryButtonClass} h-12 w-full px-8 sm:w-auto`}>
            {t.search}
          </button>
        </form>
      </Card>

      <Card title={t.listTitle}>{renderList()}</Card>

      <DepartmentFormModal
        key={formState.key}
        open={formState.open}
        department={formState.target}
        onClose={closeForm}
        onDone={query.reload}
      />
      <DepartmentDeleteModal
        key={deleting?.id ?? 'closed'}
        department={deleting}
        onClose={() => setDeleting(null)}
        onDone={handleDeleted}
      />
    </div>
  );
}
