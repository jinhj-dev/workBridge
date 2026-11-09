import type { AttendanceStatus } from '@/lib/api/types';
import { messages } from '@/messages/ja';

// 勤怠の照会期間(SCR-003・SCR-008)の既定値・検証・URL Query の解釈。業務の基準時間帯は Asia/Tokyo

const MAX_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;
const YMD_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME_MAX_LENGTH = 100;

const tokyoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export interface DateRange {
  startDate: string;
  endDate: string;
}

const STATUSES: readonly string[] = ['WORKING', 'DONE', 'MISSING_CLOCK_OUT'];

export interface HistoryQuery extends DateRange {
  page: number;
}

export interface AdminQuery extends HistoryQuery {
  name: string;
  departmentId: string; // 空文字は「すべて」
  status: AttendanceStatus | ''; // 空文字は「すべて」
}

// URLSearchParams と ReadonlyURLSearchParams の両方を受ける
interface ParamsLike {
  get(name: string): string | null;
}

// 東京の今日 → 2026-11-08
export function tokyoToday(now: Date): string {
  return tokyoDateFormatter.format(now);
}

// 既定の照会期間: 今月 1 日 〜 今日(東京)
export function defaultDateRange(now: Date): DateRange {
  const today = tokyoToday(now);
  return { startDate: `${today.slice(0, 8)}01`, endDate: today };
}

function isRealDate(value: string): boolean {
  if (!YMD_PATTERN.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(value);
}

// 最初に見つかった誤りの文言を返す。問題なければ null
export function validateDateRange(startDate: string, endDate: string): string | null {
  if (startDate === '' || endDate === '') return messages.dateRange.required;
  if (startDate > endDate) return messages.dateRange.order;
  const days =
    (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / DAY_MS + 1;
  if (days > MAX_RANGE_DAYS) return messages.dateRange.tooLong;
  return null;
}

function parseDate(value: string | null, fallback: string): string {
  return value !== null && isRealDate(value) ? value : fallback;
}

function parsePage(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

// 不正・欠落した値は既定値に置き換える(03 共通規則: URL Query に検索条件とページを持つ)
export function parseHistoryQuery(params: ParamsLike, now: Date): HistoryQuery {
  const defaults = defaultDateRange(now);
  return {
    startDate: parseDate(params.get('startDate'), defaults.startDate),
    endDate: parseDate(params.get('endDate'), defaults.endDate),
    page: parsePage(params.get('page')),
  };
}

export function parseAdminQuery(params: ParamsLike, now: Date): AdminQuery {
  const departmentId = params.get('departmentId') ?? '';
  const status = params.get('status') ?? '';
  return {
    ...parseHistoryQuery(params, now),
    name: (params.get('name') ?? '').trim().slice(0, NAME_MAX_LENGTH),
    departmentId: UUID_PATTERN.test(departmentId) ? departmentId : '',
    status: STATUSES.includes(status) ? (status as AttendanceStatus) : '',
  };
}

// 値のある項目だけを Query 文字列にする(空の条件は URL に出さない)
export function toQueryString(values: Record<string, string | number>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== '') params.set(key, String(value));
  }
  return params.toString();
}
