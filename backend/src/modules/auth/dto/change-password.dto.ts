import { z } from 'zod';

// パスワード規則(8 文字以上・英数字・72 バイト以下)は DTO では検証せず、service で PASSWORD_POLICY_VIOLATION とする。
// ここでは型と過大な入力だけ拒否する
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().max(128),
});

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
