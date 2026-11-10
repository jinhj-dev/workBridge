'use client';

import { useState } from 'react';
import { Card } from '@/components/Card';
import { primaryButtonClass } from '@/components/form';
import { LeaveApplyModal } from '@/components/leave/LeaveApplyModal';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import type { LeaveBalance } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { formatDays } from '@/lib/format';
import { messages } from '@/messages/ja';

const t = messages.dashboard.leave;

// SCR-002 §3-4 休暇状況(今年)。残日数はサーバーの計算値をそのまま表示する
export function LeaveBalanceSection() {
  const query = useApiQuery<LeaveBalance>('/leaves/balance');
  const [applyOpen, setApplyOpen] = useState(false);
  // 開くたびに入力を初期状態に戻すため、モーダルの key を更新する
  const [applyKey, setApplyKey] = useState(0);
  const balance = query.status === 'success' ? query.data : undefined;

  function renderContent() {
    if (query.status === 'loading') return <SkeletonLines count={3} />;
    if (!balance) return <SectionError onRetry={query.reload} />;
    const items = [
      { label: t.granted, value: balance.grantedDays },
      { label: t.approved, value: balance.approvedDays },
      { label: t.pending, value: balance.pendingDays },
    ];
    return (
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <dt className="text-sm/5 text-general-80">{item.label}</dt>
              <dd className="text-h6 font-bold text-general-100 tabular-nums">
                {formatDays(item.value)}
              </dd>
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <dt className="text-sm/5 text-general-80">{t.remaining}</dt>
            <dd className="text-h6 font-bold text-primary-100 tabular-nums">
              {formatDays(balance.remainingDays)}
            </dd>
          </div>
        </dl>
        {/* DOC_ISSUES の決定: 付与日数 0 を「未登録」とみなす */}
        {balance.grantedDays === 0 && (
          <p className="flex items-start gap-1.5 text-sm/5 text-general-80">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="mt-0.5 size-4 shrink-0"
            >
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
              <path
                d="M12 11v5M12 7.5v.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            {t.notGranted}
          </p>
        )}
      </div>
    );
  }

  return (
    <Card
      title={t.title}
      action={balance && <span className="text-sm/5 text-general-80">{t.year(balance.year)}</span>}
    >
      <div className="flex flex-col gap-6">
        {renderContent()}
        <button
          type="button"
          onClick={() => {
            setApplyKey((key) => key + 1);
            setApplyOpen(true);
          }}
          className={`${primaryButtonClass} flex h-12 items-center justify-center px-6 text-base/6 sm:self-start`}
        >
          {t.apply}
        </button>
      </div>
      <LeaveApplyModal
        key={applyKey}
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        onApplied={() => {
          setApplyOpen(false);
          query.reload();
        }}
        onBalanceStale={query.reload}
      />
    </Card>
  );
}
