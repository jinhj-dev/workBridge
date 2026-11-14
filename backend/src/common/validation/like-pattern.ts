// LIKE のワイルドカード(%, _)とエスケープ文字(\)を文字そのものとして一致させる
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
