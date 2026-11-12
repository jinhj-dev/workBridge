'use client';

import { useState } from 'react';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { usePendingApprovalCount } from '@/components/layout/PendingApprovalCount';
import { LeaveDetailModal } from '@/components/leave/LeaveDetailModal';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { cardThClass } from '@/components/table';
import type { Leave, Paginated } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { formatDays, formatPeriod } from '@/lib/format';
import { useHorizontalOverflow } from '@/lib/useHorizontalOverflow';
import { messages } from '@/messages/ja';
import { CardLink } from './CardLink';
import { ChevronRightIcon, ClipboardCheckIcon, UserIcon } from './icons';

const t = messages.dashboard.pending;
const leaveTypes = messages.leave.types;
const LIMIT = 5;

// 参照デザインの表: 見出し行は淡い灰色の帯、データ行は罫線なし(行高 44)
const headClass = `${cardThClass} h-9 px-3 text-sm/5`;
const cellClass = 'h-10 px-3 text-sm/5 text-general-100';

// 申請者の丸いアイコン(個人写真は持たないため人型で代用)
function Avatar() {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-30 text-primary-100 [&>svg]:size-5"
    >
      <UserIcon />
    </span>
  );
}

interface PendingApprovalsSectionProps {
  // all: 全社の承認待ち(ADMIN) / mine: 自分に割り当てられた承認待ち(承認者の社員)
  scope: 'all' | 'mine';
  // 承認・却下の後に他の領域も取り直すとき
  onProcessed?: () => void;
}

// SCR-002 承認待ちの申請(最大 5 件)。行を押すと休暇詳細モーダルで承認・却下する(既存の処理をそのまま使う)
export function PendingApprovalsSection({ scope, onProcessed }: PendingApprovalsSectionProps) {
  const query = useApiQuery<Paginated<Leave>>(
    `/leaves/pending-approval?scope=${scope}&limit=${LIMIT}`,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { refresh: refreshBadge } = usePendingApprovalCount();
  const [scrollRef, overflowing] = useHorizontalOverflow<HTMLDivElement>();

  function handleProcessed() {
    query.reload();
    refreshBadge();
    onProcessed?.();
  }

  function renderContent() {
    if (query.status === 'loading') return <SkeletonLines count={4} />;
    if (query.status === 'error' || !query.data) return <SectionError onRetry={query.reload} />;
    const items = query.data.items;
    const isEmpty = items.length === 0;

    return (
      <>
        {/* md 以上: 表(狭いときは表の中だけ横スクロール)。0 件のときは見出しを残すため全幅で表を出す */}
        <div
          ref={scrollRef}
          tabIndex={overflowing ? 0 : undefined}
          role={overflowing ? 'region' : undefined}
          aria-label={overflowing ? t.title : undefined}
          className={`overflow-x-auto focus-visible:outline-2 focus-visible:outline-primary-100 ${isEmpty ? '' : 'hidden md:block'}`}
        >
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className={`${headClass} rounded-l-lg pl-3 md:pl-14`}>
                  {t.applicant}
                </th>
                <th scope="col" className={headClass}>
                  {t.department}
                </th>
                <th scope="col" className={headClass}>
                  {t.leaveType}
                </th>
                <th scope="col" className={headClass}>
                  {t.period}
                </th>
                <th scope="col" className={`${headClass} w-8 rounded-r-lg max-md:hidden`}>
                  <span className="sr-only">{t.detailColumn}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {isEmpty && (
                // 0 件でも見出しを残し、データありの表と高さが大きく変わらないよう 3 行分を確保する
                <tr>
                  <td colSpan={5} className="h-30 max-md:h-24 text-center text-sm/5 text-general-80">
                    {t.empty}
                  </td>
                </tr>
              )}
              {items.map((leave) => (
                // 行のどこをクリックしても開く。キーボードでは申請者名のボタンで開く
                <tr
                  key={leave.id}
                  onClick={() => setSelectedId(leave.id)}
                  className="cursor-pointer hover:bg-general-30"
                >
                  <td className={`${cellClass} whitespace-nowrap`}>
                    <span className="flex items-center gap-3">
                      <Avatar />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(leave.id);
                        }}
                        aria-label={t.openDetail(leave.user.name)}
                        className="rounded text-left font-bold text-general-100 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100"
                      >
                        {leave.user.name}
                      </button>
                    </span>
                  </td>
                  <td className={`${cellClass} whitespace-nowrap text-general-80`}>
                    {leave.user.departmentName ?? messages.common.noValue}
                  </td>
                  <td className={cellClass}>
                    <Badge variant="info">{leaveTypes[leave.leaveType]}</Badge>
                  </td>
                  <td className={`${cellClass} tabular-nums`}>
                    {formatPeriod(leave.startDate, leave.endDate)}
                  </td>
                  <td className={`${cellClass} text-general-80`}>
                    <span aria-hidden="true" className="block size-5 [&>svg]:size-full">
                      <ChevronRightIcon />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* md 未満: 同じ情報の一覧 */}
        <ul className="divide-y divide-general-40 md:hidden">
          {items.map((leave) => (
            <li key={leave.id}>
              <button
                type="button"
                onClick={() => setSelectedId(leave.id)}
                className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-general-30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-100"
              >
                <Avatar />
                <span className="flex min-w-0 flex-1 basis-0 flex-col">
                  <span className="line-clamp-2 text-base/6 font-bold wrap-break-word text-general-100">
                    {leave.user.name}
                  </span>
                  {leave.user.departmentName && (
                    <span className="line-clamp-2 text-sm/5 wrap-break-word text-general-80">
                      {leave.user.departmentName}
                    </span>
                  )}
                </span>
                {/* 種別バッジと期間は右側に縦積みし、名前と部署の幅を確保する */}
                <span className="flex shrink-0 flex-col items-end gap-1 text-sm/5 text-general-100 tabular-nums">
                  <span className="whitespace-nowrap">
                    <Badge variant="info">{leaveTypes[leave.leaveType]}</Badge>
                  </span>
                  <span className="whitespace-nowrap">
                    {formatPeriod(leave.startDate, leave.endDate)}
                  </span>
                  <span className="whitespace-nowrap text-general-80">
                    {formatDays(leave.days)}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="size-5 shrink-0 text-general-80 [&>svg]:size-full"
                >
                  <ChevronRightIcon />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  }

  const title = query.data ? t.titleWithCount(query.data.totalCount) : t.title;

  return (
    <Card
      title={title}
      icon={<ClipboardCheckIcon />}
      action={
        <CardLink href={scope === 'all' ? '/leaves/approvals?scope=all' : '/leaves/approvals'}>
          {t.viewAll}
        </CardLink>
      }
    >
      {renderContent()}
      <LeaveDetailModal
        leaveId={selectedId}
        onClose={() => setSelectedId(null)}
        onProcessed={handleProcessed}
      />
    </Card>
  );
}
