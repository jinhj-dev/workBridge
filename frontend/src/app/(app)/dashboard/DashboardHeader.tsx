import { CalendarIcon } from '@/components/CalendarIcon';
import { greetingOf } from '@/lib/greeting';
import { formatTodayLabel } from '@/lib/format';
import { messages } from '@/messages/ja';
import { SunIcon } from './icons';

const t = messages.dashboard;

// SCR-002 ヘッダー: 太陽アイコン + 挨拶 + 名前、補足の一文、今日の日付
export function DashboardHeader({ name, now }: { name: string; now: Date }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="size-9 shrink-0 text-warning-100 sm:size-11 [&>svg]:size-full"
        >
          <SunIcon />
        </span>
        <div>
          <h1 className="text-xl/8 font-bold text-general-100 sm:text-greeting">
            {t.greeting.heading(greetingOf(now), name)}
          </h1>
          <p className="text-sm/5 text-general-80">{t.subtitle}</p>
        </div>
      </div>
      <p className="flex items-center gap-2 text-sm/5 font-medium text-general-90 sm:pt-3">
        <span aria-hidden="true" className="size-5 shrink-0 text-general-90 [&>svg]:size-full">
          <CalendarIcon />
        </span>
        {formatTodayLabel(now)}
      </p>
    </header>
  );
}
