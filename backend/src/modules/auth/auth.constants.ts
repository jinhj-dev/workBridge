// Access Token の有効期間(秒)。15 分
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

// Refresh Token の有効期間(ミリ秒)。発行から 7 日(docs/05 §3)
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// JWT の署名アルゴリズム。検証側でも固定する(alg 差し替え対策)
export const JWT_ALGORITHM = 'HS256';

// Refresh Token を載せるクッキーの名前と属性。
// Path は認証 API(refresh / logout など)にだけ送られるよう /api/v1/auth に絞る。
// SameSite=Strict: フロントエンドは同一オリジン経由で呼ぶ前提のため、他サイトからの送信を完全に止める。
export const REFRESH_COOKIE_NAME = 'refreshToken';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';
export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: REFRESH_COOKIE_PATH,
} as const;
