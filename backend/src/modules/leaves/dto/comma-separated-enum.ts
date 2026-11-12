import { z } from 'zod';

// カンマ区切りの複数指定(例: PENDING,APPROVED)。重複は除き、指定した値のいずれかに一致する。空要素・未知の値は検証エラー
export function commaSeparatedEnum<const T extends readonly [string, ...string[]]>(values: T) {
  return z
    .string()
    .transform((value) => value.split(','))
    .pipe(z.array(z.enum(values)))
    .transform((items) => [...new Set(items)]);
}
