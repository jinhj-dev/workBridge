import { cardFrameClass } from '@/components/Card';
import { LeaveCategoryBadge } from '@/components/leave/LeaveCategoryBadge';
import { CalendarSmallIcon, UserCircleIcon } from '@/components/leave/leaveIcons';
import type { LeaveCalendarItem } from '@/lib/api/types';
import { formatDateLabel, formatLeavePeriodWithCount } from '@/lib/leave-calendar';
import { messages } from '@/messages/ja';

const t = messages.leaveCalendar;

export type DayListView = 'day' | 'month';

interface DayLeaveListProps {
  date: string; // 選択日 YYYY-MM-DD
  view: DayListView;
  items: readonly LeaveCalendarItem[]; // 表示する休暇(選択日 or 月全体。呼び出し側で絞り込み済み)
  filtered: boolean; // 検索条件が入っているか(空のときの文言を変える)
  onViewChange: (view: DayListView) => void;
}

const segmentClass = (active: boolean) =>
  `h-9 px-2 text-xs/5 font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-100 ${
    active ? 'bg-primary-30 font-bold text-primary-100' : 'bg-white text-general-80'
  }`;

// モバイルの休暇者リスト(選択日の休暇予定 / 月全体)
export function DayLeaveList({ date, view, items, filtered, onViewChange }: DayLeaveListProps) {
  const emptyText = filtered ? t.empty : view === 'day' ? t.emptyDay : t.emptyMonth;
  return (
    <section
      aria-label={t.dayTitle(formatDateLabel(date))}
      className={`${cardFrameClass} p-4`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-general-40 pb-3">
        <div className="flex min-w-0 items-center gap-1">
          <h2 className="min-w-0 truncate text-xs/5 font-bold min-[390px]:text-sm/5 text-general-100">
            {view === 'day' ? t.dayTitle(formatDateLabel(date)) : t.listTitle}
          </h2>
          <span className="shrink-0 rounded-full bg-primary-30 px-1.5 text-xs/5 font-medium text-primary-100 tabular-nums">
            {t.people(items.length)}
          </span>
        </div>
        <div
          role="group"
          aria-label={t.segmentLabel}
          className="flex shrink-0 overflow-hidden rounded-lg border border-general-50"
        >
          <button
            type="button"
            aria-pressed={view === 'day'}
            onClick={() => onViewChange('day')}
            className={segmentClass(view === 'day')}
          >
            {t.segmentDay}
          </button>
          <button
            type="button"
            aria-pressed={view === 'month'}
            onClick={() => onViewChange('month')}
            className={`${segmentClass(view === 'month')} border-l border-general-50`}
          >
            {t.segmentMonth}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm/5 text-general-80">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-general-40">
          {items.map((item) => {
            const { period, count } = formatLeavePeriodWithCount(item);
            return (
              <li
                key={`${item.empId}-${item.startDate}-${item.endDate}-${item.halfDay ?? ''}-${item.category}`}
                className="flex gap-3 py-4 last:pb-1"
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-30 text-primary-100"
                >
                  <span className="size-6">
                    <UserCircleIcon />
                  </span>
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-base/6 font-bold text-general-100">{item.name}</p>
                    <LeaveCategoryBadge category={item.category} compact />
                  </div>
                  <p className="text-sm/5 text-general-80">
                    {t.empIdLine(item.empId, item.departmentName ?? t.noDepartment)}
                  </p>
                  <p className="flex items-start gap-1.5 text-sm/5 text-general-100 tabular-nums">
                    <span aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-general-80">
                      <CalendarSmallIcon />
                    </span>
                    <span>{t.periodLine(period, count)}</span>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
