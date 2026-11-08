import { z } from 'zod';

// 社員番号の形式(数字のみ)は DTO では検証しない。形式不正も存在しない場合と同じ 401 にするため、service で判定する(FR-USER-001)。
// ここでは過大な入力だけ拒否する。パスワードは bcrypt が先頭 72 バイトしか見ないが、過大な入力は拒否する
export const loginSchema = z.object({
  empId: z.string().max(256),
  password: z.string().min(1).max(128),
});

export type LoginDto = z.infer<typeof loginSchema>;
