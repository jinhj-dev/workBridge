'use client';

import { useCallback, useEffect, useEffectEvent, useId, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { modalSecondaryButtonClass } from '@/components/form';
import { UserCircleIcon } from '@/components/leave/leaveIcons';
import { SearchInput } from '@/components/SearchInput';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { tdClass, thClass } from '@/components/table';
import { useToast } from '@/components/Toast';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { DepartmentDetail, DepartmentMember, Paginated } from '@/lib/api/types';
import { messages } from '@/messages/ja';
import { PeopleIcon } from './icons';

const t = messages.departments.membersModal;
// API-DEPT-008 の limit 上限。全ページを集めて検索対象を部署の全所属社員にする
const FETCH_LIMIT = 100;

type MembersState =
  { status: 'loading' } | { status: 'error' } | { status: 'success'; members: DepartmentMember[] };

interface DepartmentMembersModalProps {
  department: DepartmentDetail | null; // null のときは閉じている
  onClose: () => void;
  // 部署が見つからなかったとき(一覧の再取得用)
  onNotFound: () => void;
}

// 検索は空白(半角・全角)を無視した大文字小文字無視の部分一致
function normalizeKeyword(value: string): string {
  return value.replace(/[\s　]/g, '').toLowerCase();
}

// 部署の所属社員を全ページ分取得する(取得中は loading、失敗は error)
function useAllMembers(
  departmentId: string | null,
  onError: (error: unknown) => void,
): { state: MembersState; reload: () => void } {
  const [state, setState] = useState<MembersState>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);
  const notifyError = useEffectEvent(onError);

  useEffect(() => {
    if (departmentId === null) return;
    // アンマウント後や再取得後に古い応答で上書きしない
    let ignore = false;
    const base = `/admin/departments/${departmentId}/members`;
    async function fetchAll(): Promise<DepartmentMember[]> {
      const first = await apiFetch<Paginated<DepartmentMember>>(
        `${base}?page=1&limit=${FETCH_LIMIT}`,
      );
      const rest = await Promise.all(
        Array.from({ length: Math.max(first.totalPages - 1, 0) }, (_, i) =>
          apiFetch<Paginated<DepartmentMember>>(`${base}?page=${i + 2}&limit=${FETCH_LIMIT}`),
        ),
      );
      // 取得の合間に所属が変わると同じ社員が複数ページに出るため id で重複を除く
      const all = [first, ...rest].flatMap((page) => page.items);
      return all.filter((member, i) => all.findIndex((m) => m.id === member.id) === i);
    }
    fetchAll().then(
      (members) => {
        if (!ignore) setState({ status: 'success', members });
      },
      (error: unknown) => {
        if (ignore) return;
        setState({ status: 'error' });
        notifyError(error);
      },
    );
    return () => {
      ignore = true;
    };
  }, [departmentId, nonce]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setNonce((n) => n + 1);
  }, []);

  return { state, reload };
}

// SCR-010 所属社員確認モーダル。親が部署ごとに key を変えて作り直すので検索語は空に戻る
export function DepartmentMembersModal({
  department,
  onClose,
  onNotFound,
}: DepartmentMembersModalProps) {
  const { showToast } = useToast();
  const searchId = useId();
  const [keyword, setKeyword] = useState('');
  // 404 の通知は 1 回だけ(再取得が走っても トースト・閉じる・一覧の再取得を重複させない)
  const notFoundHandled = useRef(false);
  const { state, reload } = useAllMembers(department?.id ?? null, (error) => {
    if (error instanceof ApiError && error.statusCode === 404 && !notFoundHandled.current) {
      notFoundHandled.current = true;
      showToast(error.message, 'error');
      onClose();
      onNotFound();
    }
  });

  const members = state.status === 'success' ? state.members : null;
  const filtered = useMemo(() => {
    if (!members) return [];
    const needle = normalizeKeyword(keyword);
    if (needle === '') return members;
    return members.filter((member) => normalizeKeyword(member.name).includes(needle));
  }, [members, keyword]);

  // 件数は検索結果ではなく部署の全所属社員数。取得前は一覧の値で代用する
  const totalCount = members ? members.length : (department?.memberCount ?? 0);
  const departmentName = department?.name ?? '';

  function renderRows() {
    if (state.status === 'loading') {
      return (
        <tr>
          <td colSpan={3} className="px-2 py-4">
            <SkeletonLines count={4} />
          </td>
        </tr>
      );
    }
    if (state.status === 'error') {
      return (
        <tr>
          <td colSpan={3} className="px-2 py-4">
            <SectionError onRetry={reload} />
          </td>
        </tr>
      );
    }
    if (filtered.length === 0) {
      return (
        <tr>
          <td colSpan={3} className="px-2 py-8 text-center text-sm/5 text-general-80">
            {members?.length === 0 ? t.empty : t.noResult}
          </td>
        </tr>
      );
    }
    return filtered.map((member) => (
      <tr key={member.id}>
        <td className={`${tdClass} tabular-nums`}>{member.empId}</td>
        <td className={`${tdClass} break-words`}>
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-30 text-primary-100"
            >
              <UserCircleIcon className="size-5" />
            </span>
            {member.name}
          </span>
        </td>
        <td className={tdClass}>
          <Badge variant="info">{departmentName}</Badge>
        </td>
      </tr>
    ));
  }

  return (
    <Modal
      open={department !== null}
      title={t.title}
      icon={<PeopleIcon />}
      subtitle={
        department && (
          // 長い部署名は 1 行で省略し、ダイアログ幅を超えないようにする
          <div className="[&>span]:max-w-full">
            <Badge variant="info">
              <span className="truncate" title={t.subtitle(departmentName, totalCount)}>
                {t.subtitle(departmentName, totalCount)}
              </span>
            </Badge>
          </div>
        )
      }
      size="lg"
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={modalSecondaryButtonClass}>
          {t.close}
        </button>
      }
    >
      {department && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm/5 text-general-80">
              {t.target}{' '}
              <span className="text-xl/7 font-bold text-general-100 tabular-nums">
                {totalCount}
              </span>{' '}
              {t.countUnit}
            </p>
            <div className="w-full sm:w-64">
              <SearchInput
                id={searchId}
                label={t.searchLabel}
                value={keyword}
                onChange={setKeyword}
                placeholder={t.searchPlaceholder}
              />
            </div>
          </div>
          {/* 短い画面では内側の上限を外し、モーダル本文のスクロールだけにする */}
          <div className="mt-3 overflow-auto [@media(min-height:40rem)]:max-h-[50dvh]">
            <table aria-label={t.listLabel} className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th scope="col" className={`${thClass} sticky top-0 z-10 bg-white`}>
                    {t.empId}
                  </th>
                  <th scope="col" className={`${thClass} sticky top-0 z-10 bg-white`}>
                    {t.name}
                  </th>
                  <th scope="col" className={`${thClass} sticky top-0 z-10 bg-white`}>
                    {t.department}
                  </th>
                </tr>
              </thead>
              <tbody>{renderRows()}</tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}
