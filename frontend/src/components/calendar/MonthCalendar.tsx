import type { ReactNode } from 'react';
import { buildMonthWeeks, formatMonthLabel } from '@/lib/calendar';
import { formatDate } from '@/lib/format';
import { messages } from '@/messages/ja';

interface MonthCalendarProps {
  // 表示する月 'YYYY-MM'
  month: string;
  // 今日 'YYYY-MM-DD'(東京)。強調と過去日の判定に使う
  today: string;
  onSelectDate: (date: string) => void;
  // 日付セルの中に追加で表示する内容
  renderDay?: (date: string) => ReactNode;
  // セルのアクセシブルネームに足す説明
  getDayDescription?: (date: string) => string | undefined;
}

// 列(日曜始まり)ごとの曜日の色
function weekdayColor(col: number): string {
  if (col === 0) return 'text-danger-100';
  if (col === 6) return 'text-primary-100';
  return 'text-general-100';
}

// 09 §6 月カレンダー(日曜始まり)。月の移動 UI は持たず、使う側が month を渡す。
// 過去日も操作できる(見た目だけ弱める)。
// 狭い幅ではセルの左右余白をなくし、renderDay の内容をセル幅いっぱいに広げられるようにする
export function MonthCalendar({
  month,
  today,
  onSelectDate,
  renderDay,
  getDayDescription,
}: MonthCalendarProps) {
  const weeks = buildMonthWeeks(month);

  return (
    <table aria-label={formatMonthLabel(month)} className="w-full table-fixed border-collapse">
      <thead>
        <tr>
          {messages.calendar.weekdays.map((weekday, col) => (
            <th
              key={weekday}
              scope="col"
              className={`h-9 border border-general-40 text-sm/5 font-medium ${
                col === 0 || col === 6 ? weekdayColor(col) : 'text-general-80'
              }`}
            >
              {weekday}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, weekIndex) => (
          <tr key={weekIndex}>
            {week.map((date, col) => {
              if (!date) {
                return <td key={col} className="border border-general-40 bg-general-30/50" />;
              }
              const isToday = date === today;
              const isPast = date < today;
              const description = getDayDescription?.(date);
              return (
                <td key={date} className="h-14 border border-general-40 p-0 align-top md:h-24">
                  <button
                    type="button"
                    onClick={() => onSelectDate(date)}
                    aria-label={
                      description ? `${formatDate(date)} ${description}` : formatDate(date)
                    }
                    aria-current={isToday ? 'date' : undefined}
                    className={`flex h-full min-h-14 w-full cursor-pointer flex-col items-start gap-1 px-0 py-1 text-left hover:bg-primary-30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-100 md:min-h-24 md:p-2 ${
                      isPast ? 'bg-general-30' : 'bg-white'
                    } ${isToday ? 'ring-2 ring-primary-100 ring-inset' : ''}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`ml-1 inline-flex size-5 items-center justify-center rounded-full text-xs/4 tabular-nums md:ml-0 md:size-6 md:text-sm/5 ${
                        isToday
                          ? 'bg-primary-100 font-bold text-white'
                          : `font-medium ${isPast ? 'text-general-60' : weekdayColor(col)}`
                      }`}
                    >
                      {Number(date.slice(8))}
                    </span>
                    {renderDay && (
                      <span
                        className={`w-full md:w-auto md:max-w-full ${isPast ? 'opacity-60' : ''}`}
                      >
                        {renderDay(date)}
                      </span>
                    )}
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
