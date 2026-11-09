import { messages } from '@/messages/ja';

// 表示用の日付・時刻・日数の整形。業務の基準時間帯は Asia/Tokyo に固定する

const TIME_ZONE = 'Asia/Tokyo';

const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const todayFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});

// 日時(ISO-8601)の東京での日付 → 2026/11/08
export function formatTokyoDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

// 日時(ISO-8601)の東京での時刻 → 09:01
export function formatTokyoTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

// 日時(ISO-8601)の東京での日付と時刻 → 2026/11/08 09:01
export function formatTokyoDateTime(iso: string): string {
  return `${formatTokyoDate(iso)} ${formatTokyoTime(iso)}`;
}

// 日付だけの値(YYYY-MM-DD)はそのまま区切りだけ変える → 2026/11/10
export function formatDate(ymd: string): string {
  return ymd.replaceAll('-', '/');
}

// 休暇の期間。開始日と終了日が同じなら 1 つだけ表示する
export function formatPeriod(startDate: string, endDate: string): string {
  if (startDate === endDate) return formatDate(startDate);
  return `${formatDate(startDate)} ~ ${formatDate(endDate)}`;
}

// 日数(0.5 単位あり) → 10.5日
export function formatDays(days: number): string {
  return messages.common.days(days);
}

// ダッシュボードの今日の日付 → 2026年11月8日(日)
export function formatTodayLabel(now: Date): string {
  return todayFormatter.format(now);
}
