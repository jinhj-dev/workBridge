// Asia/Tokyo 基準の日付・日時の変換(docs/05 §9)。
// 日本は夏時間がなく常に UTC+9 なので、固定オフセットで計算する。
const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;

// 東京時間にずらした Date の ISO 文字列(末尾の Z は東京時刻としての表記にすぎない)
function toShiftedIso(instant: Date): string {
  return new Date(instant.getTime() + TOKYO_OFFSET_MS).toISOString();
}

// 時刻 → 東京の日付 'YYYY-MM-DD'
export function toTokyoDate(instant: Date): string {
  return toShiftedIso(instant).slice(0, 10);
}

// 時刻 → 東京の年
export function tokyoYear(instant: Date): number {
  return Number(toShiftedIso(instant).slice(0, 4));
}

// 時刻 → '2026-11-08T09:01:00+09:00'(秒単位、docs/06 §0)
export function formatTokyoDateTime(instant: Date): string {
  return `${toShiftedIso(instant).slice(0, 19)}+09:00`;
}

// 'YYYY-MM-DD' → その東京日付の 0 時の時刻
export function tokyoDayStart(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+09:00`);
}

// 'YYYY-MM-DD' → その翌日の東京 0 時の時刻(その日の範囲の排他的な終端)
export function tokyoNextDayStart(ymd: string): Date {
  return new Date(tokyoDayStart(ymd).getTime() + 24 * 60 * 60 * 1000);
}

// 'YYYY-MM-DD' → DATE カラム用の Date(UTC 0 時)
export function toDbDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

// DATE カラムの Date(UTC 0 時)→ 'YYYY-MM-DD'
export function fromDbDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
