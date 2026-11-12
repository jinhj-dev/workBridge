import { messages } from '@/messages/ja';

// 月カレンダー用の日付計算。文字列演算と Date.UTC のみを使い、実行環境のタイムゾーンに依存しない

// 'YYYY-MM' を前後の月へ動かす(例: 2026-12 に +1 → 2027-01)
export function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

// 'YYYY-MM' → 2026年11月
export function formatMonthLabel(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  return messages.calendar.monthLabel(year, mon);
}
