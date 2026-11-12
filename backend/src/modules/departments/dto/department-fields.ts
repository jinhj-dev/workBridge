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

// 部署の説明: 前後の空白を除き、空文字は null にする(0〜500 文字、改行可)
export const departmentDescriptionSchema = z
  .string()
  .trim()
  .max(500, '説明は 500 文字以内で入力してください。')
  .transform((value) => (value === '' ? null : value))
  .nullable();

// 部署責任者: 社員 ID(UUID)。null は未指定・解除
export const departmentManagerIdSchema = z.uuid('部署責任者の形式が正しくありません。').nullable();
