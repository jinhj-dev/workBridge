import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, setAccessToken, setAuthFailureHandler } from './client';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

const unauthorized = { statusCode: 401, code: 'UNAUTHORIZED', message: 'x', details: [] };

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
  setAuthFailureHandler(null);
});

describe('apiFetch の 401 再取得', () => {
  it('shouldRefreshOnceWhenTwoRequestsGet401Concurrently', async () => {
    setAccessToken('old');
    let refreshCalls = 0;
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (url === '/api/v1/auth/refresh') {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return json(200, { accessToken: 'new' });
      }
      const auth = new Headers(init.headers).get('Authorization');
      return auth === 'Bearer new' ? json(200, { ok: url }) : json(401, unauthorized);
    });
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([apiFetch('/a'), apiFetch('/b')]);

    expect(refreshCalls).toBe(1);
    expect(a).toEqual({ ok: '/api/v1/a' });
    expect(b).toEqual({ ok: '/api/v1/b' });
  });

  it('shouldNotRefreshWhenLoginReturns401', async () => {
    const fetchMock = vi.fn(async () =>
      json(401, { ...unauthorized, code: 'INVALID_CREDENTIALS' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/auth/login', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shouldCallAuthFailureHandlerWhenRefreshFails', async () => {
    setAccessToken('old');
    const handler = vi.fn();
    setAuthFailureHandler(handler);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(401, unauthorized)),
    );

    await expect(apiFetch('/a')).rejects.toMatchObject({ statusCode: 401 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('shouldRetryOnlyOnceWhenRetryAlsoGets401', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url === '/api/v1/auth/refresh' ? json(200, { accessToken: 'new' }) : json(401, unauthorized),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/a')).rejects.toMatchObject({ statusCode: 401 });
    // /a 2 回 + refresh 1 回
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
