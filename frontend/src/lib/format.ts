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

// 日付だけの値(YYYY-MM-DD)を年月日表記にする → 2026年11月05日
export function formatDateJa(ymd: string): string {
  const [year, month, day] = ymd.split('-');
  return `${year}年${month}月${day}日`;
}

const weekdayFormatter = new Intl.DateTimeFormat('ja-JP', { timeZone: 'UTC', weekday: 'short' });

// 勤務日(YYYY-MM-DD)を曜日付きで → 2026/11/07(土)
export function formatWorkDate(ymd: string): string {
  const weekday = weekdayFormatter.format(new Date(`${ymd}T00:00:00Z`));
  return `${formatDate(ymd)}(${weekday})`;
}

// 勤務時間(分) → 8:05。退勤前(null)は「—」
export function formatWorkMinutes(minutes: number | null): string {
  if (minutes === null) return messages.common.noValue;
  const hours = Math.floor(minutes / 60);
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`;
}

// 退勤時刻。勤務日の翌日以降(日付をまたぐ勤務)のときだけ日付も付ける。未退勤は「—」
export function formatClockOut(workDate: string, clockOut: string | null): string {
  if (clockOut === null) return messages.common.noValue;
  return formatTokyoDate(clockOut) === formatDate(workDate)
    ? formatTokyoTime(clockOut)
    : formatTokyoDateTime(clockOut);
}

// datetime-local 入力の値(YYYY-MM-DDTHH:mm)にする。東京の壁時計で表す
export function toTokyoDateTimeInput(iso: string): string {
  const date = formatTokyoDate(iso).replaceAll('/', '-');
  return `${date}T${formatTokyoTime(iso)}`;
}

// 休暇の期間。開始日と終了日が同じなら 1 つだけ表示する
export function formatPeriod(startDate: string, endDate: string): string {
  if (startDate === endDate) return formatDate(startDate);
  return `${formatDate(startDate)} ～ ${formatDate(endDate)}`;
}

// 日数(0.5 単位あり) → 10.5日
export function formatDays(days: number): string {
  return messages.common.days(days);
}

// ダッシュボードの今日の日付 → 2026年11月8日(日)
export function formatTodayLabel(now: Date): string {
  return todayFormatter.format(now);
}
