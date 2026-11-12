'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { primaryButtonClass } from '@/components/form';
import { LeaveApplyModal } from '@/components/leave/LeaveApplyModal';
import { PlusIcon } from '@/components/leave/leaveIcons';
import { UmbrellaIcon } from '@/components/layout/navIcons';
import { NavTabs } from '@/components/NavTabs';
import type { NavTabItem } from '@/components/NavTabs';
import { SkeletonLines } from '@/components/Skeleton';
import type { Leave, Paginated } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { useAuth } from '@/lib/auth/AuthProvider';
import { PageHeader } from '@/components/PageHeader';
import { messages } from '@/messages/ja';
import { LeaveDataVersionContext } from './LeaveDataVersion';

const t = messages.leaveManagement;
const APPROVALS_PATH = '/leaves/approvals';
// 承認者かどうか: 自分への依頼が 1 件でもある(処理済みを含む)かで判定する
const APPROVER_CHECK_PATH =
  '/leaves/pending-approval?scope=mine&status=PENDING,APPROVED,REJECTED&limit=1';

// SCR-004 休暇管理の共通枠: 見出し・申請ボタン・タブ 3 つ(自分の休暇 / 休暇カレンダー / 承認)・申請モーダル
export function LeaveManagementLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [version, setVersion] = useState(0);
  const [applyOpen, setApplyOpen] = useState(false);
  // 開くたびに入力を初期状態に戻すため、モーダルの key を更新する
  const [applyKey, setApplyKey] = useState(0);

  // 承認タブの表示判定。管理者は常に表示、それ以外は自分への依頼があるときだけ
  const approverCheck = useApiQuery<Paginated<Leave>>(isAdmin ? null : APPROVER_CHECK_PATH);
  let approvalsVisible: boolean | null = null; // null = 判定前
  if (isAdmin) approvalsVisible = true;
  else if (approverCheck.status === 'success') approvalsVisible = (approverCheck.data?.totalCount ?? 0) > 0;
  else if (approverCheck.status === 'error') approvalsVisible = false;

  const onApprovalsPath = pathname === APPROVALS_PATH;
  useEffect(() => {
    // 承認者でない人が承認タブへ直接来たときは自分の休暇へ戻す
    if (onApprovalsPath && approvalsVisible === false) router.replace('/leaves');
  }, [onApprovalsPath, approvalsVisible, router]);

  const items = useMemo<NavTabItem[]>(() => {
    const base: NavTabItem[] = [
      { href: '/leaves', label: t.tabMine },
      { href: '/leaves/calendar', label: t.tabCalendar },
    ];
    if (approvalsVisible) base.push({ href: APPROVALS_PATH, label: t.tabApprovals });
    return base;
  }, [approvalsVisible]);

  const contextValue = useMemo(
    () => ({ version, bump: () => setVersion((v) => v + 1) }),
    [version],
  );

  function openApply() {
    setApplyKey((key) => key + 1);
    setApplyOpen(true);
  }

  function handleApplied() {
    setApplyOpen(false);
    setVersion((v) => v + 1);
  }

  // 承認タブの判定が終わるまで、本文には何も出さない(権限のない人に一瞬見せない)
  const holdBody = onApprovalsPath && approvalsVisible !== true;

  return (
    <LeaveDataVersionContext.Provider value={contextValue}>
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:gap-6">
        <PageHeader
          title={t.title}
          icon={<UmbrellaIcon />}
          action={
            <button
              type="button"
              onClick={openApply}
              className={`${primaryButtonClass} flex h-11 items-center gap-1.5 px-4 text-sm/5 md:h-12 md:gap-2 md:px-6 md:text-base/6`}
            >
              <span aria-hidden="true" className="size-5">
                <PlusIcon />
              </span>
              {messages.leaves.applyButton}
            </button>
          }
        />
        <NavTabs label={t.tabsLabel} items={items} />
        {holdBody ? <SkeletonLines count={5} /> : children}
      </div>

      <LeaveApplyModal
        key={applyKey}
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        onApplied={handleApplied}
        onBalanceStale={() => setVersion((v) => v + 1)}
      />
    </LeaveDataVersionContext.Provider>
  );
}
