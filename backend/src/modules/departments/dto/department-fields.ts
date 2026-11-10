import { z } from 'zod';

// 部署コード: 英数字とハイフンの 1〜20 文字。大文字に正規化して保存・比較する
export const departmentCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9-]{1,20}$/, '部署コードは英数字とハイフンの 1〜20 文字で入力してください。')
  .transform((value) => value.toUpperCase());

export const departmentNameSchema = z
  .string()
  .trim()
  .min(1, '部署名を入力してください。')
  .max(100, '部署名は 100 文字以内で入力してください。');
