// ページネーション確認用の勤怠サンプルデータ(社員番号 00001 の 2026 年 10 月・平日)。実行の入口は sample-attendance.ts。
import { toDbDate } from '../src/common/time/tokyo-date.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';

export const SAMPLE_EMP_ID = '00001';

const SAMPLE_YEAR = 2026;
const SAMPLE_MONTH = 10;

// 退勤漏れ(退勤なし)にする日。状態の絞り込みを確かめられるよう、数日だけ混ぜる
const MISSING_CLOCK_OUT_DAYS = [7, 15, 22];

export interface SampleAttendance {
  workDate: string; // YYYY-MM-DD(東京)
  clockIn: string; // +09:00 付きの ISO 8601
  clockOut: string | null;
}

const pad = (value: number): string => String(value).padStart(2, '0');

// 月〜金の勤務日(土日のみ除く。祝日は除かない)。出勤は 8:50〜9:09、勤務は 9 時間前後で日ごとに少しずらす
export function buildSampleAttendance(): SampleAttendance[] {
  const rows: SampleAttendance[] = [];
  for (let day = 1; day <= 31; day += 1) {
    const date = new Date(Date.UTC(SAMPLE_YEAR, SAMPLE_MONTH - 1, day));
    if (date.getUTCMonth() !== SAMPLE_MONTH - 1) break;
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;

    const workDate = `${SAMPLE_YEAR}-${pad(SAMPLE_MONTH)}-${pad(day)}`;
    const clockInMinutes = 8 * 60 + 50 + ((day * 7) % 20);
    const clockOutMinutes = clockInMinutes + 9 * 60 + ((day * 11) % 30);
    const toIso = (minutes: number): string =>
      `${workDate}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00+09:00`;
    rows.push({
      workDate,
      clockIn: toIso(clockInMinutes),
      clockOut: MISSING_CLOCK_OUT_DAYS.includes(day) ? null : toIso(clockOutMinutes),
    });
  }
  return rows;
}

// 00001 のサンプル勤怠を登録し、新規に登録した件数を返す。
// すでにある勤務日の記録は変更しない(再実行しても重複しない)。00001 がいなければ何も登録せず例外にする
export async function insertSampleAttendance(prisma: PrismaClient): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { empId: SAMPLE_EMP_ID },
    select: { id: true },
  });
  if (!user) {
    throw new Error(`社員番号 ${SAMPLE_EMP_ID} のユーザーが存在しないため、登録できません。`);
  }
  const result = await prisma.attendance.createMany({
    data: buildSampleAttendance().map((row) => ({
      userId: user.id,
      workDate: toDbDate(row.workDate),
      clockIn: new Date(row.clockIn),
      clockOut: row.clockOut === null ? null : new Date(row.clockOut),
    })),
    skipDuplicates: true,
  });
  return result.count;
}
