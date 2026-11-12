import { messages } from '@/messages/ja';

// count が denominator に占める割合(%)を小数 1 位で返す。分母 0 は null
export function shareOf(count: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((count / denominator) * 1000) / 10;
}

// 割合の表示。null は「—」 → 83.3%
export function formatPercent(value: number | null): string {
  return value === null ? messages.common.noValue : `${value.toFixed(1)}%`;
}
