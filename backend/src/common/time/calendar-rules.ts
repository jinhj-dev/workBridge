// 'YYYY-MM' → その月の初日・末日('YYYY-MM-DD')
export function monthRange(month: string): { start: string; end: string } {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, '0')}` };
}

// 土日か(祝日は平日扱い)
export function isWeekend(ymd: string): boolean {
  const weekday = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6;
}
