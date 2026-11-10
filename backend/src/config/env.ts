import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(6000),
  DATABASE_URL: z.url(),
  // Access Token の署名鍵。HS256 の鍵として十分な長さを要求する
  JWT_ACCESS_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof envSchema>;

// 環境変数を注入するためのトークン
export const ENV = Symbol('ENV');

// 起動時に環境変数を検証する。不正な場合は理由を示して起動を止める。
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const reasons = result.error.issues.map(
      (issue) => `- ${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(
      `環境変数が正しくありません。backend/.env を確認してください。\n${reasons.join('\n')}`,
    );
  }
  return result.data;
}
