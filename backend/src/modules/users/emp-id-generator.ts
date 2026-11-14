// 社員番号の自動採番。5 桁の数字の社員番号の最大値 + 1 を 5 桁でゼロ埋めする(なければ 00001)。
// 6 桁以上や数字以外の番号(E2E 用 900001 など)は対象外。99999 を超える場合は採番できず null
const AUTO_EMP_ID_PATTERN = /^[0-9]{5}$/;
const MAX_AUTO_EMP_ID = 99999;

export function nextEmpId(existingEmpIds: readonly string[]): string | null {
  let max = 0;
  for (const empId of existingEmpIds) {
    if (AUTO_EMP_ID_PATTERN.test(empId)) {
      max = Math.max(max, Number(empId));
    }
  }
  const next = max + 1;
  return next > MAX_AUTO_EMP_ID ? null : String(next).padStart(5, '0');
}
