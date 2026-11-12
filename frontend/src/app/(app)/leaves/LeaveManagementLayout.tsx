'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { primaryButtonClass } from '@/components/form';
import { LeaveApplyModal } from '@/components/leave/LeaveApplyModal';
import { PlusIcon } from '@/components/leave/leaveIcons';
import { UmbrellaIcon } from '@/components/layout/navIcons';
import { useApprovalsVisible } from '@/components/layout/ApprovalsAccess';
import { SkeletonLines } from '@/components/Skeleton';
import { PageHeader } from '@/components/PageHeader';
import { messages } from '@/messages/ja';
import { LeaveDataVersionContext } from './LeaveDataVersion';

const t = messages.leaveManagement;
const APPROVALS_PATH = '/leaves/approvals';

// SCR-004 休暇管理の共通枠: 見出し・申請ボタン・申請モーダル(画面の切替はサイドバーの休暇管理サブメニュー)
export function LeaveManagementLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // 承認画面の表示判定(サイドバーのサブメニューと同じ判定)。null = 判定前
  const approvalsVisible = useApprovalsVisible();

  const [version, setVersion] = useState(0);
  const [applyOpen, setApplyOpen] = useState(false);
  // 開くたびに入力を初期状態に戻すため、モーダルの key を更新する
  const [applyKey, setApplyKey] = useState(0);

  const onApprovalsPath = pathname === APPROVALS_PATH;
  useEffect(() => {
    // 承認者でない人が承認画面へ直接来たときは自分の休暇へ戻す
    if (onApprovalsPath && approvalsVisible === false) router.replace('/leaves');
  }, [onApprovalsPath, approvalsVisible, router]);

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

  // 承認画面の判定が終わるまで、本文には何も出さない(権限のない人に一瞬見せない)
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
