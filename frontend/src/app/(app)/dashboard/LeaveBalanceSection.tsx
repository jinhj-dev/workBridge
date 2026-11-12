'use client';

import { Card } from '@/components/Card';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import type { LeaveBalance } from '@/lib/api/types';
import type { ApiQuery } from '@/lib/api/useApiQuery';
import { formatDays } from '@/lib/format';
import { messages } from '@/messages/ja';
import { CardLink } from './CardLink';
import { BriefcaseIcon, CalendarPlusIcon, InfoIcon, UmbrellaIcon } from './icons';
import { MetricValue } from './MetricValue';

const t = messages.dashboard.leave;

interface LeaveBalanceSectionProps {
  query: ApiQuery<LeaveBalance>;
  // 履歴への導線(ADMIN は参照デザインに合わせて出さない)
  showHistoryLink?: boolean;
}

// SCR-002 休暇の残り日数(今年)。残日数はサーバーの計算値をそのまま表示する
export function LeaveBalanceSection({ query, showHistoryLink = true }: LeaveBalanceSectionProps) {
  const balance = query.status === 'success' ? query.data : undefined;

  function renderContent() {
    if (query.status === 'loading') return <SkeletonLines count={2} />;
    if (!balance) return <SectionError onRetry={query.reload} />;
    return (
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2">
          <div className="flex flex-col-reverse items-center gap-0.5">
            <dt className="text-sm/5 text-general-80">{t.remaining}</dt>
            <dd className="flex flex-col items-center">
              <span aria-hidden="true" className="size-8 text-primary-100 [&>svg]:size-full">
                <BriefcaseIcon />
              </span>
              <span className="text-stat font-bold text-general-100 tabular-nums">
                <MetricValue value={formatDays(balance.remainingDays)} />
              </span>
            </dd>
          </div>
          <div className="flex flex-col-reverse items-center gap-0.5 border-l border-general-50">
            <dt className="text-sm/5 text-general-80">{t.approved}</dt>
            <dd className="flex flex-col items-center">
              <span aria-hidden="true" className="size-8 text-primary-100 [&>svg]:size-full">
                <CalendarPlusIcon />
              </span>
              <span className="text-stat font-bold text-general-100 tabular-nums">
                <MetricValue value={formatDays(balance.approvedDays)} />
              </span>
            </dd>
          </div>
        </dl>
        {/* 付与日数 0 は「未登録」とみなして案内する */}
        {balance.grantedDays === 0 && (
          <p className="flex items-start gap-1.5 text-sm/5 text-general-80">
            <span aria-hidden="true" className="mt-0.5 size-4 shrink-0 [&>svg]:size-full">
              <InfoIcon />
            </span>
            {t.notGranted}
          </p>
        )}
      </div>
    );
  }

  return (
    <Card
      title={t.title}
      icon={<UmbrellaIcon />}
      action={showHistoryLink && <CardLink href="/leaves">{t.viewHistory}</CardLink>}
    >
      {renderContent()}
    </Card>
  );
}
