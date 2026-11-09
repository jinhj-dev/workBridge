import { HttpStatus } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import { toDbDate, toTokyoDate } from '../../common/time/tokyo-date.js';

// 照会期間の上限(両端を含む日数)
export const MAX_RANGE_DAYS = 366;
const DAY_MS = 86400000;

// 期間の既定値を補い、順序と長さを検証する(開始日は今月1日、終了日は今日。東京基準)
export function resolveDateRange(
  range: { startDate?: string; endDate?: string },
  today: string,
): { startDate: string; endDate: string } {
  const startDate = range.startDate ?? `${today.slice(0, 7)}-01`;
  const endDate = range.endDate ?? today;
  const diffMs = toDbDate(endDate).getTime() - toDbDate(startDate).getTime();
  if (diffMs < 0) {
    throw new AppException(
      'INVALID_DATE_RANGE',
      HttpStatus.BAD_REQUEST,
      '開始日は終了日より後にできません。',
    );
  }
  if (diffMs / DAY_MS + 1 > MAX_RANGE_DAYS) {
    throw new AppException('INVALID_DATE_RANGE', HttpStatus.BAD_REQUEST, '照会期間は最大1年です。');
  }
  return { startDate, endDate };
}

// 出退勤時刻の検証(docs/05 §4 の CHECK 制約より先に実行する)
export function assertValidTimeRange(params: {
  workDate: string;
  clockIn: Date;
  clockOut: Date | null;
}): void {
  const { workDate, clockIn, clockOut } = params;
  const invalid =
    toTokyoDate(clockIn) !== workDate ||
    (clockOut !== null &&
      (clockOut.getTime() <= clockIn.getTime() || clockOut.getTime() - clockIn.getTime() > DAY_MS));
  if (invalid) {
    throw new AppException(
      'INVALID_TIME_RANGE',
      HttpStatus.BAD_REQUEST,
      '出退勤時刻を確認してください。',
    );
  }
}
