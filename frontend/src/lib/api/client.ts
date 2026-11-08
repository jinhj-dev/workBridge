import { messages } from '@/messages/ja';

// バックエンドの共通エラー応答の項目別の理由
export interface ErrorDetail {
  field: string;
  message: string;
}

interface ErrorResponseBody {
  statusCode: number;
  code: string;
  message: string;
  details: ErrorDetail[];
}

// API がエラー応答を返したとき(code で分岐し、message はそのまま表示できる)
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// サーバーに届かなかったとき(通信障害など)
export class NetworkError extends Error {
  constructor() {
    super(messages.error.network);
    this.name = 'NetworkError';
  }
}

function isErrorResponseBody(body: unknown): body is ErrorResponseBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as ErrorResponseBody).code === 'string' &&
    typeof (body as ErrorResponseBody).message === 'string'
  );
}

// Access Token はメモリにだけ保持する(localStorage / sessionStorage には保存しない)
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

// 再取得(refresh)にも失敗したときに呼ばれる。認証状態を破棄する側が登録する
let authFailureHandler: (() => void) | null = null;

export function setAuthFailureHandler(handler: (() => void) | null): void {
  authFailureHandler = handler;
}

// 401 でも Access Token の再取得を試みないパス(認証の入口そのもの)
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh'];

// /api/v1 配下の API を 1 回呼ぶ(再取得処理を含まない)
async function request<T>(path: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  // JSON 文字列のときだけ指定する(FormData はブラウザが境界付きで設定する)
  if (typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, { ...init, headers });
  } catch (error) {
    // 通信失敗は TypeError になる。中断(AbortError)などはそのまま投げ直す
    if (error instanceof TypeError) {
      throw new NetworkError();
    }
    throw error;
  }

  if (res.ok) {
    // 本文が空の成功応答(201 で本文なし等)もある
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  const body: unknown = await res.json().catch(() => null);
  if (isErrorResponseBody(body)) {
    throw new ApiError(res.status, body.code, body.message, body.details ?? []);
  }
  throw new ApiError(res.status, 'UNKNOWN_ERROR', messages.error.unknown);
}

// 進行中の refresh 呼び出し。同じ Refresh Token で同時に 2 回呼ぶと片方が 401 になるため 1 回にまとめる
let refreshInFlight: Promise<string> | null = null;

// Refresh Token(httpOnly Cookie)で Access Token を再取得して保持する。同時呼び出しは 1 回に合流する。
export function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = request<{ accessToken: string }>('/auth/refresh', { method: 'POST' })
      .then((data) => {
        accessToken = data.accessToken;
        return data.accessToken;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

// /api/v1 配下の API を呼ぶ。成功時は応答本文を返し、失敗時は ApiError か NetworkError を投げる。
// 401 のときは Access Token を 1 回だけ再取得して再実行する。
// 相対 URL を使うためブラウザ専用。サーバー側のコードからは使わない。
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokenUsed = accessToken;
  try {
    return await request<T>(path, init);
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.statusCode !== 401 ||
      NO_REFRESH_PATHS.includes(path)
    ) {
      throw error;
    }
  }

  // 他のリクエストの再取得が先に終わっていれば、そのトークンで再実行するだけでよい
  if (accessToken === tokenUsed) {
    // 再取得に失敗したら認証状態を破棄し、元の 401 ではなく再取得の失敗を投げる
    try {
      await refreshAccessToken();
    } catch (refreshError) {
      if (refreshError instanceof ApiError) {
        accessToken = null;
        authFailureHandler?.();
      }
      throw refreshError;
    }
  }
  // 再取得した Access Token で 1 回だけ再実行する(request が新しいトークンを付ける)
  return request<T>(path, init);
}
