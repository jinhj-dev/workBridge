import holidayJp from '@holiday-jp/holiday_jp';

// 'YYYY-MM-DD' に 1 日足す(UTC 演算のみ。サーバーのタイムゾーンに依存しない)
function nextDay(ymd: string): string {
  const next = new Date(`${ymd}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

// 期間(両端を含む)内の日本の祝日 → Map<'YYYY-MM-DD', 祝日名>。
// ライブラリの祝日表は 'YYYY-MM-DD' 文字列キーなので Date を介さない。
// 収録範囲(1970〜2050 年)外の日付は祝日なしとして扱う。
// 祝日データの更新はライブラリのバージョンアップでのみ行う。
export function japaneseHolidaysInRange(start: string, end: string): Map<string, string> {
  const holidays: Record<string, { name: string } | undefined> = holidayJp.holidays;
  const result = new Map<string, string>();
  for (let day = start; day <= end; day = nextDay(day)) {
    const holiday = holidays[day];
    if (holiday) {
      result.set(day, holiday.name);
    }
  }
  return result;
}
