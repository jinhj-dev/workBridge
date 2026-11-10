import { messages } from '@/messages/ja';

// 月カレンダー用の日付計算。文字列演算と Date.UTC のみを使い、実行環境のタイムゾーンに依存しない

// 'YYYY-MM' を前後の月へ動かす(例: 2026-12 に +1 → 2027-01)
export function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

// 日曜始まりの週ごとの配列。対象月以外の前後の枠は null
export function buildMonthWeeks(month: string): (string | null)[][] {
  const [year, mon] = month.split('-').map(Number);
  const firstWeekday = new Date(Date.UTC(year, mon - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();

  const cells: (string | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${month}-${String(day).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// 'YYYY-MM' → 2026年11月
export function formatMonthLabel(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  return messages.calendar.monthLabel(year, mon);
}
