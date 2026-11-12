import { Card } from '@/components/Card';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { cardThClass } from '@/components/table';
import { formatPercent } from '@/lib/attendance-rate';
import type { DepartmentStatus } from '@/lib/api/types';
import type { ApiQuery } from '@/lib/api/useApiQuery';
import { useHorizontalOverflow } from '@/lib/useHorizontalOverflow';
import { messages } from '@/messages/ja';
import { CardLink } from './CardLink';
import { UsersIcon } from './icons';

const t = messages.dashboard.departments;

interface DepartmentStatusSectionProps {
  query: ApiQuery<DepartmentStatus>;
  // 「すべて見る」は全体勤怠(管理者用)への導線なので ADMIN のみ
  isAdmin: boolean;
}

// 参照デザインの表: 見出し行は淡い灰色の帯、データ行は細い罫線
const thClass = `${cardThClass} h-8 px-1.5 text-xs/4 sm:px-2`;
const tdClass = 'h-9 border-b border-general-40 px-1.5 text-sm/5 sm:px-2 text-general-100';
const numberCellClass = `${tdClass} text-right tabular-nums whitespace-nowrap`;
const numberHeadClass = `${thClass} text-right whitespace-nowrap`;

// SCR-002 各部署の状況(全利用者。人数だけを表示し、個人は出さない)
export function DepartmentStatusSection({ query, isAdmin }: DepartmentStatusSectionProps) {
  const [scrollRef, overflowing] = useHorizontalOverflow<HTMLDivElement>();

  function renderContent() {
    if (query.status === 'loading') return <SkeletonLines count={4} />;
    if (query.status === 'error' || !query.data) return <SectionError onRetry={query.reload} />;
    const { departments, isWorkday } = query.data;
    if (departments.length === 0) {
      return <p className="py-6 text-center text-sm/5 text-general-80">{t.empty}</p>;
    }
    return (
      <div className="flex flex-col gap-3">
        {/* 360px でも収まるよう列を詰め、率は折り返さず 1 行に保つ。あふれたときだけ表の中を横スクロール(キーボードで操作できる) */}
        <div
          ref={scrollRef}
          tabIndex={overflowing ? 0 : undefined}
          role={overflowing ? 'region' : undefined}
          aria-label={overflowing ? t.title : undefined}
          className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-primary-100"
        >
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th scope="col" className={`${thClass} rounded-l-lg`}>
                  {t.name}
                </th>
                <th scope="col" className={numberHeadClass}>
                  {t.members}
                </th>
                <th scope="col" className={numberHeadClass}>
                  {t.clockedIn}
                </th>
                <th scope="col" className={numberHeadClass}>
                  {t.onLeave}
                </th>
                <th scope="col" className={`${numberHeadClass} rounded-r-lg`}>
                  {t.notClockedIn}
                </th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.departmentId ?? 'unassigned'}>
                  <th scope="row" className={`${tdClass} text-left font-medium`}>
                    {d.departmentName}
                  </th>
                  <td className={numberCellClass}>{t.people(d.memberCount)}</td>
                  <td className={numberCellClass}>
                    {t.people(d.clockedInCount)}
                    <span className="ml-0.5 text-xs/4 text-general-80 sm:ml-1">
                      {t.rateInParens(formatPercent(d.attendanceRate))}
                    </span>
                  </td>
                  <td className={numberCellClass}>{t.people(d.onLeaveCount)}</td>
                  <td className={numberCellClass}>{t.people(d.notClockedInCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isWorkday && (
          <p className="text-sm/5 text-general-80">{messages.dashboard.holidayNote}</p>
        )}
      </div>
    );
  }

  return (
    <Card
      title={t.title}
      icon={<UsersIcon />}
      action={isAdmin && <CardLink href="/admin/attendance">{t.viewAll}</CardLink>}
    >
      {renderContent()}
    </Card>
  );
}
