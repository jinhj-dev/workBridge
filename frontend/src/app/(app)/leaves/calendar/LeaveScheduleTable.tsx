import { bandTdClass, bandThClass } from '@/components/table';
import { Notice } from '@/components/Notice';
import { LeaveCategoryBadge } from '@/components/leave/LeaveCategoryBadge';
import { UserCircleIcon } from '@/components/leave/leaveIcons';
import type { LeaveCalendarItem } from '@/lib/api/types';
import { formatLeavePeriod } from '@/lib/leave-calendar';
import { messages } from '@/messages/ja';

const t = messages.leaveCalendar;
// 共通の band 表クラスに、右カード用の sticky 見出しと狭い余白だけ足す
const thClass = `${bandThClass} sticky top-0 z-10 !h-10 !px-1.5 !text-xs/4`;
const tdClass = `${bandTdClass} !px-1.5 whitespace-nowrap`;

// PC の休暇予定一覧(右カード内の表)。表の領域だけが縦スクロールし、見出しは固定
export function LeaveScheduleTable({
  items,
  filtered,
}: {
  items: readonly LeaveCalendarItem[];
  filtered: boolean; // 検索条件が入っているか(空のときの文言を変える)
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        // キーボードだけの人も表をスクロールできるよう Tab 停止にする
        tabIndex={0}
        role="region"
        aria-label={t.listScrollLabel}
        className="min-h-0 flex-1 overflow-auto rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100"
      >
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th scope="col" className={thClass}>
                {t.empId}
              </th>
              <th scope="col" className={thClass}>
                {t.name}
              </th>
              <th scope="col" className={thClass}>
                {t.department}
              </th>
              <th scope="col" className={thClass}>
                {t.period}
              </th>
              <th scope="col" className={`${thClass} text-right`}>
                {t.category}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm/5 text-general-80">
                  {filtered ? t.empty : t.emptyMonth}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={`${item.empId}-${item.startDate}-${item.endDate}-${item.halfDay ?? ''}-${item.category}`}
                >
                  <td className={tdClass}>
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="hidden size-6 shrink-0 text-general-60 2xl:block">
                        <UserCircleIcon />
                      </span>
                      <span className="rounded-md bg-general-30 px-2 py-0.5 text-xs/4 text-general-90 tabular-nums">
                        {item.empId}
                      </span>
                    </span>
                  </td>
                  <td className={`${tdClass} font-bold`}>{item.name}</td>
                  <td className={`${tdClass} text-general-80`}>
                    {item.departmentName ?? t.noDepartment}
                  </td>
                  <td className={`${tdClass} min-w-32 !whitespace-normal tabular-nums`}>
                    {formatLeavePeriod(item)}
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <LeaveCategoryBadge category={item.category} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Notice>{t.listNote}</Notice>
    </div>
  );
}
