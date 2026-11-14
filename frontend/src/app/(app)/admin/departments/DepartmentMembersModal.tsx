'use client';

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Badge, type BadgeVariant } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { Pagination } from '@/components/Pagination';
import { SearchInput } from '@/components/SearchInput';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { tdClass, thClass } from '@/components/table';
import { useToast } from '@/components/Toast';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { DepartmentDetail, DepartmentMember, JobTitleTone, Paginated } from '@/lib/api/types';
import { formatDate } from '@/lib/format';
import { useMediaQuery } from '@/lib/useMediaQuery';
import { messages } from '@/messages/ja';
import { ChevronRightIcon, MailIcon, PeopleIcon } from './icons';

const t = messages.departments.membersModal;
// 列数(状態行の colSpan と揃える)
const COLUMN_COUNT = 7;
// 1 ページに表示する人数(全件を取得したうえでクライアント側で分割する)
const PAGE_SIZE = 5;
// lg 以上は表、未満はカード(6 列の表が 800px のダイアログに収まる最小幅から)
const DESKTOP_QUERY = '(min-width: 64rem)';
// Tailwind の sm 未満(スマホ幅)
const NARROW_QUERY = '(max-width: 39.99rem)';
// 役職の色はサーバーの tone で決まる(役職名から色は決めない)
const JOB_TITLE_TONE_BADGE: Record<JobTitleTone, BadgeVariant> = {
  GRAY: 'neutral',
  BLUE: 'info',
  VIOLET: 'violet',
  PINK: 'pink',
};
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

// 部署名は長くても 1 行で省略する
function DepartmentBadge({ name }: { name: string }) {
  return (
    <div className="[&>span]:max-w-full">
      <Badge variant="info">
        <span className="truncate" title={name}>
          {name}
        </span>
      </Badge>
    </div>
  );
}

function JobTitleBadge({ jobTitle }: { jobTitle: DepartmentMember['jobTitle'] }) {
  if (!jobTitle) return <>{messages.common.noValue}</>;
  return <Badge variant={JOB_TITLE_TONE_BADGE[jobTitle.tone]}>{jobTitle.name}</Badge>;
}

// 連絡先は表の列幅に収まらないとき省略し、全文は title で見られるようにする
function ContactText({ email }: { email: string | null }) {
  if (!email) return <>{messages.common.noValue}</>;
  return (
    <span className="flex items-center gap-2">
      <MailIcon className="size-4 shrink-0 text-general-80" />
      <span className="truncate" title={email}>
        {email}
      </span>
    </span>
  );
}

// SCR-010 所属社員確認モーダル。親が部署ごとに key を変えて作り直すので検索語・ページは初期値に戻る
export function DepartmentMembersModal({
  department,
  onClose,
  onNotFound,
}: DepartmentMembersModalProps) {
  const { showToast } = useToast();
  const searchId = useId();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
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
  const isCardLayout = useMediaQuery(DESKTOP_QUERY) === false;
  // スマホ幅ではページ送りを詰めて 1 行に収める
  const isNarrow = useMediaQuery(NARROW_QUERY) === true;

  const members = state.status === 'success' ? state.members : null;
  const filtered = useMemo(() => {
    if (!members) return [];
    const needle = normalizeKeyword(keyword);
    if (needle === '') return members;
    return members.filter((member) => normalizeKeyword(member.name).includes(needle));
  }, [members, keyword]);

  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  // 再取得などで件数が減ったときに存在しないページを指さないようにする
  const currentPage = Math.min(page, totalPages);
  const pageMembers = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // 件数は検索結果ではなく部署の全所属社員数。取得前は一覧の値で代用する
  const totalCount = members ? members.length : (department?.memberCount ?? 0);
  const departmentName = department?.name ?? '';

  function handleKeywordChange(value: string) {
    setKeyword(value);
    setPage(1);
  }

  // 読み込み中・エラー・0 件のときの表示(表とカードで共通)。通常の一覧のときは null
  function renderStatus(): ReactNode {
    if (state.status === 'loading') return <SkeletonLines count={4} />;
    if (state.status === 'error') return <SectionError onRetry={reload} />;
    if (filtered.length === 0) {
      return (
        <p className="py-4 text-center text-sm/5 text-general-80">
          {members?.length === 0 ? t.empty : t.noResult}
        </p>
      );
    }
    return null;
  }

  const status = renderStatus();

  function renderTable() {
    return (
      <table
        aria-label={t.listLabel}
        className="w-full table-fixed border-separate border-spacing-0"
      >
        <colgroup>
          <col className="w-[9%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[16%]" />
          <col className="w-[14%]" />
          <col className="w-[32%]" />
          <col className="w-[5%]" />
        </colgroup>
        <thead>
          <tr>
            {[t.empId, t.name, t.hireDate, t.department, t.jobTitle, t.contact].map((label) => (
              <th key={label} scope="col" className={thClass}>
                {label}
              </th>
            ))}
            {/* 右端の矢印列(飾り)の見出しは空にする */}
            <th scope="col" className={thClass} />
          </tr>
        </thead>
        <tbody>
          {status ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="px-2 py-4">
                {status}
              </td>
            </tr>
          ) : (
            pageMembers.map((member) => (
              <tr key={member.id}>
                <td className={`${tdClass} tabular-nums`}>{member.empId}</td>
                <td className={`${tdClass} font-bold break-words`}>{member.name}</td>
                <td className={`${tdClass} tabular-nums`}>{formatDate(member.hireDate)}</td>
                <td className={tdClass}>
                  <DepartmentBadge name={departmentName} />
                </td>
                <td className={tdClass}>
                  <JobTitleBadge jobTitle={member.jobTitle} />
                </td>
                <td className={tdClass}>
                  <ContactText email={member.contactEmail} />
                </td>
                <td className={`${tdClass} text-right`}>
                  <ChevronRightIcon className="inline-block size-5 text-general-60" />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    );
  }

  // 表と同じ情報を 1 人 1 枚のカードにまとめる(右の矢印は飾り。詳細画面ができるまで操作できない)
  function renderCards() {
    if (status) return <div className="px-2">{status}</div>;
    return (
      <ul aria-label={t.listLabel} className="space-y-2">
        {pageMembers.map((member) => (
          <li
            key={member.id}
            className="flex items-center gap-2 rounded-lg border border-general-40 px-3 py-2"
          >
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="flex min-w-0 gap-2 text-xs/4 text-general-80">
                <span className="shrink-0 tabular-nums">{member.empId}</span>
                <span className="truncate" title={departmentName}>
                  {departmentName}
                </span>
              </p>
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 text-base/6 font-bold break-words text-general-100">
                  {member.name}
                </span>
                <span className="shrink-0 text-sm/5 text-general-100">
                  <JobTitleBadge jobTitle={member.jobTitle} />
                </span>
              </div>
              <p className="flex flex-wrap gap-x-3 text-xs/4 text-general-80">
                <span className="tabular-nums">
                  {t.hireDate}：{formatDate(member.hireDate)}
                </span>
                <span className="flex min-w-0 items-center gap-1 break-all">
                  <span className="sr-only">{t.contact}：</span>
                  {member.contactEmail ? (
                    <>
                      <MailIcon className="size-4 shrink-0" />
                      {member.contactEmail}
                    </>
                  ) : (
                    messages.common.noValue
                  )}
                </span>
              </p>
            </div>
            <ChevronRightIcon className="size-5 shrink-0 text-general-60" />
          </li>
        ))}
      </ul>
    );
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
      size="xl"
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t.close}
        </Button>
      }
    >
      {department && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm/5 text-general-80">
              {t.target}{' '}
              <span className="text-h6 font-bold text-general-100 tabular-nums">{totalCount}</span>{' '}
              {t.countUnit}
            </p>
            <div className="w-full sm:w-64">
              <SearchInput
                id={searchId}
                label={t.searchLabel}
                value={keyword}
                onChange={handleKeywordChange}
                placeholder={t.searchPlaceholder}
              />
            </div>
          </div>
          {/* 一覧は 1 ページ 5 名。高さが足りないときはモーダル本文がスクロールし、ヘッダーと閉じるは固定 */}
          <div className="mt-3">{isCardLayout ? renderCards() : renderTable()}</div>
          {state.status === 'success' && filtered.length > 0 && (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              totalCount={filtered.length}
              onChange={setPage}
              compact={isNarrow}
            />
          )}
        </>
      )}
    </Modal>
  );
}
