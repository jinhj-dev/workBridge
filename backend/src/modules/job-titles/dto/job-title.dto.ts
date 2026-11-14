import { z } from 'zod';

export const JOB_TITLE_TONES = [
  'GRAY',
  'BLUE',
  'VIOLET',
  'PINK',
  'LAVENDER',
  'GREEN',
  'YELLOW',
  'ORANGE',
] as const;

// 役職名に使えない制御文字(社員名と同じ規則)
const CONTROL_CHARACTERS = /[\p{Cc}\p{Zl}\p{Zp}]/u;

const jobTitleNameSchema = z
  .string('役職名を入力してください。')
  .trim()
  .min(1, '役職名を入力してください。')
  .max(50, '役職名は 50 文字以内で入力してください。')
  .refine((value) => !CONTROL_CHARACTERS.test(value), '役職名に使用できない文字が含まれています。');

const jobTitleToneSchema = z.enum(JOB_TITLE_TONES, '色を選択してください。');

export const createJobTitleSchema = z.strictObject({
  name: jobTitleNameSchema,
  tone: jobTitleToneSchema,
});

// 変更する項目だけを送る(最低 1 項目)
export const updateJobTitleSchema = z
  .strictObject({
    name: jobTitleNameSchema.optional(),
    tone: jobTitleToneSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.tone !== undefined, {
    message: '変更する項目を指定してください。',
  });

export type CreateJobTitleDto = z.infer<typeof createJobTitleSchema>;
export type UpdateJobTitleDto = z.infer<typeof updateJobTitleSchema>;
