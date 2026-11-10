'use client';

import { useEffect, useState } from 'react';
import { weekdayIndex } from '@/lib/attendance-sheet';
import { tokyoToday } from '@/lib/date-range';
import { formatTokyoTime } from '@/lib/format';
import { messages } from '@/messages/ja';

const t = messages.attendance.sheet;
const MINUTE_MS = 60_000;

// SCR-003 現在の日時(東京)。分が変わる瞬間に合わせて更新する。出勤・退勤ボタンは置かない
export function CurrentDateTimeCard() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    // 次の分の境目まで待ち、そこから 60 秒ごとに更新する
    const timeout = setTimeout(
      () => {
        setNow(new Date());
        interval = setInterval(() => setNow(new Date()), MINUTE_MS);
      },
      MINUTE_MS - (Date.now() % MINUTE_MS),
    );
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  const today = tokyoToday(now);
  const [year, month, day] = today.split('-');
  const time = formatTokyoTime(now.toISOString());
  const weekday = messages.calendar.weekdays[weekdayIndex(today)];

  return (
    <time
      dateTime={`${today}T${time}`}
      className="flex w-fit items-center gap-6 rounded-md bg-white px-5 py-3 shadow-card sm:px-7"
    >
      <span className="flex flex-col text-sm/5 text-general-80">
        <span>{t.year(year)}</span>
        <span className="font-medium text-general-100">
          {t.monthDay(Number(month), Number(day), weekday)}
        </span>
      </span>
      <span className="text-h4 font-bold text-general-100 tabular-nums">{time}</span>
    </time>
  );
}
