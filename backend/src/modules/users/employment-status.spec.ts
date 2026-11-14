// 在籍ステータス(ACTIVE 在籍中 / UPCOMING 入社予定 / INACTIVE 無効)の計算
// 前提シグネチャ: employmentStatusOf(user: { hireDate: string; isActive: boolean }, now: Date)
// 基準日は Clock の時刻を東京日付にしたもの。実装が異なる場合は RUN フェーズで合わせる
import { employmentStatusOf } from './employment-status.js';

// 東京 2026-11-14 23:59 (UTC 14:59)
const JST_LATE_14 = new Date('2026-11-14T14:59:00Z');
// 東京 2026-11-15 00:00 (UTC 15:00 の前後で日付が変わる)
const JST_MIDNIGHT_15 = new Date('2026-11-14T15:00:00Z');

describe('employmentStatusOf', () => {
  it('shouldReturnActiveWhenHireDateIsToday', () => {
    expect(employmentStatusOf({ hireDate: '2026-11-14', isActive: true }, JST_LATE_14)).toBe(
      'ACTIVE',
    );
  });

  it('shouldReturnUpcomingWhenHireDateIsTomorrow', () => {
    expect(employmentStatusOf({ hireDate: '2026-11-15', isActive: true }, JST_LATE_14)).toBe(
      'UPCOMING',
    );
  });

  it('shouldReturnInactiveWhenIsActiveIsFalseEvenIfHireDateIsFuture', () => {
    expect(employmentStatusOf({ hireDate: '2099-01-01', isActive: false }, JST_LATE_14)).toBe(
      'INACTIVE',
    );
  });

  it('shouldUseTokyoDateAtUtcMidnightBoundary', () => {
    // UTC 14:59 は東京 23:59 で 11-14 のまま、UTC 15:00 は東京 0:00 で 11-15
    expect(employmentStatusOf({ hireDate: '2026-11-15', isActive: true }, JST_LATE_14)).toBe(
      'UPCOMING',
    );
    expect(employmentStatusOf({ hireDate: '2026-11-15', isActive: true }, JST_MIDNIGHT_15)).toBe(
      'ACTIVE',
    );
  });
});
