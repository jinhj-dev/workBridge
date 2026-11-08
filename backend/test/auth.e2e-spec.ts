// 認証 API(login / logout / me / refresh / password)と認証 Guard の e2e。実際のテスト用 DB(workbridge_test)を使う。
// 活性 ADMIN を残さないよう、作るユーザーは EMPLOYEE のみ。
import { Controller, Get } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import { createTestPrisma, TestDataTracker, uniqueSuffix } from './db/db-helpers.js';

// 認証 Guard の検証用。テストモジュールにだけ追加する保護ルート(PUBLIC でも AllowPasswordChangeRequired でもない)
@Controller('test-protected')
class TestProtectedController {
  @Get()
  get(): { ok: true } {
    return { ok: true };
  }
}

// 社員番号は数字のみ(先頭が 0 のものも含む)。テスト間で衝突しないよう 20 桁のランダム値にする
function numericEmpId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => b % 10).join('');
}

const PASSWORD = 'Correct1pass';
const REFRESH_COOKIE = 'refreshToken';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// Set-Cookie ヘッダーから refreshToken の行を取り出す
function findRefreshSetCookie(res: request.Response): string {
  const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
  const line = cookies?.find((c) => c.startsWith(`${REFRESH_COOKIE}=`));
  if (!line) {
    throw new Error('Set-Cookie に refreshToken がありません');
  }
  return line;
}

// 応答 body を、検証に使う項目だけの型で読む
interface ResponseBody {
  code?: string;
  details?: { field: string }[];
  user?: { empId: string; mustChangePassword: boolean };
}
function bodyOf(res: request.Response): ResponseBody {
  return res.body as ResponseBody;
}

function cookieValue(setCookie: string): string {
  return setCookie.split(';')[0].slice(REFRESH_COOKIE.length + 1);
}

describe('認証 API(e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let tracker: TestDataTracker;
  let passwordHash: string;
  const secret = process.env.JWT_ACCESS_SECRET ?? '';

  // 発行済み Access Token を作る(本物の署名、または別の鍵・期限切れ)
  const signer = new JwtService({ secret, signOptions: { algorithm: 'HS256' } });

  beforeAll(async () => {
    prisma = createTestPrisma();
    tracker = new TestDataTracker(prisma);
    passwordHash = await bcrypt.hash(PASSWORD, 4);
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestProtectedController],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    // beforeAll が途中で失敗しても、元の原因を TypeError で隠さないよう、作れたものだけ片付ける
    try {
      await tracker?.cleanup();
    } finally {
      await app?.close();
      await prisma?.$disconnect();
    }
  });

  async function createUser(overrides: Record<string, unknown> = {}) {
    const department = await tracker.createDepartment();
    return tracker.createUser({
      empId: numericEmpId(),
      passwordHash,
      departmentId: department.id,
      mustChangePassword: false,
      ...overrides,
    });
  }

  function login(empId: string, password = PASSWORD): request.Test {
    return request(app.getHttpServer()).post('/api/v1/auth/login').send({ empId, password });
  }

  describe('POST /api/v1/auth/login', () => {
    it('shouldReturnAccessTokenAndUserWithoutSensitiveData', async () => {
      const user = await createUser({ approvalRequired: false });
      const res = await login(user.empId).expect(200);

      expect(Object.keys(res.body as object).sort()).toEqual(['accessToken', 'user']);
      expect(bodyOf(res).user).toEqual({
        id: user.id,
        name: user.name,
        empId: user.empId,
        role: 'EMPLOYEE',
        departmentName: expect.stringContaining('テスト部署') as string,
        approvalRequired: false,
        mustChangePassword: false,
      });
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
      expect(JSON.stringify(res.body)).not.toContain('refreshToken');
    });

    it('shouldIssueJwtThatExpiresInFifteenMinutes', async () => {
      const user = await createUser();
      const res = await login(user.empId).expect(200);

      const payload = signer.decode<{ sub: string; iat: number; exp: number }>(
        (res.body as { accessToken: string }).accessToken,
      );
      expect(payload.sub).toBe(user.id);
      expect(payload.exp - payload.iat).toBe(15 * 60);
      // ペイロードは最小限
      expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub']);
    });

    it('shouldSetRefreshTokenCookieWithSecureAttributes', async () => {
      const user = await createUser();
      const res = await login(user.empId).expect(200);

      const line = findRefreshSetCookie(res);
      expect(line).toMatch(/;\s*HttpOnly/i);
      expect(line).toMatch(/;\s*Secure/i);
      expect(line).toMatch(/;\s*SameSite=Strict/i);
      expect(line).toMatch(/;\s*Path=\/api\/v1\/auth(;|$)/);
      expect(line).toMatch(/;\s*Max-Age=604800/);
    });

    it('shouldTrimEmpIdAndKeepLeadingZeros', async () => {
      const user = await createUser({ empId: `00${numericEmpId()}` });
      expect(user.empId.startsWith('00')).toBe(true);
      const res = await login(`  ${user.empId}\t`).expect(200);
      expect(bodyOf(res).user?.empId).toBe(user.empId);
    });

    it('shouldStoreOnlySha256HashOfRefreshTokenExpiringInSevenDays', async () => {
      const user = await createUser();
      const before = Date.now();
      const res = await login(user.empId).expect(200);
      const plain = cookieValue(findRefreshSetCookie(res));

      const rows = await prisma.refreshToken.findMany({ where: { userId: user.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0].tokenHash).toBe(sha256(plain));
      expect(rows[0].tokenHash).not.toBe(plain);
      expect(rows[0].revokedAt).toBeNull();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const diff = rows[0].expiresAt.getTime() - before;
      expect(diff).toBeGreaterThanOrEqual(sevenDays - 1000);
      expect(diff).toBeLessThanOrEqual(sevenDays + 10_000);
    });

    it('shouldDeleteExpiredAndRevokedTokensOfTheUserOnlyOnLogin', async () => {
      const user = await createUser();
      const other = await createUser();
      const past = new Date(Date.now() - 60_000);
      const future = new Date(Date.now() + 60_000);
      const make = (userId: string, hash: string, expiresAt: Date, revokedAt: Date | null) =>
        prisma.refreshToken.create({
          data: { userId, tokenHash: hash, expiresAt, revokedAt },
        });
      const prefix = uniqueSuffix();
      await make(user.id, `${prefix}-expired`, past, null);
      await make(user.id, `${prefix}-revoked`, future, past);
      await make(user.id, `${prefix}-valid`, future, null);
      await make(other.id, `${prefix}-other-expired`, past, null);

      await login(user.empId).expect(200);

      const hashes = (await prisma.refreshToken.findMany({ where: { userId: user.id } })).map(
        (r) => r.tokenHash,
      );
      expect(hashes).toContain(`${prefix}-valid`);
      expect(hashes).not.toContain(`${prefix}-expired`);
      expect(hashes).not.toContain(`${prefix}-revoked`);
      expect(hashes).toHaveLength(2);
      // 他ユーザーの行は触らない
      expect(await prisma.refreshToken.count({ where: { userId: other.id } })).toBe(1);
    });

    it('shouldReturnIdenticalInvalidCredentialsForUnknownEmpIdAndWrongPassword', async () => {
      const user = await createUser();
      const unknown = await login(numericEmpId()).expect(401);
      const wrong = await login(user.empId, 'Wrong1pass').expect(401);

      expect(unknown.body).toEqual(wrong.body);
      expect(unknown.body).toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
      expect(unknown.headers['set-cookie']).toBeUndefined();
      expect(wrong.headers['set-cookie']).toBeUndefined();
    });

    it('shouldReturnAccountDisabledOnlyWhenPasswordIsCorrect', async () => {
      const user = await createUser({ isActive: false });
      const ok = await login(user.empId).expect(403);
      expect(ok.body).toMatchObject({ statusCode: 403, code: 'ACCOUNT_DISABLED' });
      expect(ok.headers['set-cookie']).toBeUndefined();

      const wrong = await login(user.empId, 'Wrong1pass').expect(401);
      expect(bodyOf(wrong).code).toBe('INVALID_CREDENTIALS');
      expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
    });

    it.each([
      ['empId なし', { password: PASSWORD }, 'empId'],
      ['password なし', { empId: '1' }, 'password'],
      ['password が空', { empId: '1', password: '' }, 'password'],
      ['empId が数値', { empId: 1, password: PASSWORD }, 'empId'],
      ['empId が 257 文字', { empId: '1'.repeat(257), password: PASSWORD }, 'empId'],
      ['password が 129 文字', { empId: '1', password: 'a'.repeat(129) }, 'password'],
    ])('shouldReturnValidationErrorWhen(%s)', async (_name, body, field) => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send(body);
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: '入力内容に誤りがあります。',
      });
      expect((bodyOf(res).details ?? []).map((d) => d.field)).toContain(field);
    });

    it.each([
      ['空文字', ''],
      ['空白のみ', '   '],
      ['英字を含む', 'E0001'],
      ['小文字の英字', 'e0001'],
      ['51 桁', '1'.repeat(51)],
      ['全角数字', '１２３'],
      ['途中に空白', '12 34'],
      ['NUL を含む(D-01)', '12\u000034'],
      ['SQL 断片', "1' OR '1'='1"],
    ])('shouldReturnInvalidCredentialsWhenEmpIdIsNotNumeric(%s)', async (_name, empId) => {
      const res = await login(empId).expect(401);
      expect(res.body).toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('shouldNotReturn500WhenPasswordContainsNul', async () => {
      const user = await createUser();
      const res = await login(user.empId, `${PASSWORD}\u0000x`).expect(401);
      expect(bodyOf(res).code).toBe('INVALID_CREDENTIALS');
    });

    it('shouldRejectFormUrlEncodedBodyWithValidationError', async () => {
      const user = await createUser();
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .type('form')
        .send({ empId: user.empId, password: PASSWORD })
        .expect(400);
      expect(res.body).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
      expect(res.headers['set-cookie']).toBeUndefined();
      expect(await prisma.refreshToken.count({ where: { userId: user.id } })).toBe(0);
    });

    it('shouldReturnValidationErrorWhenBodyIsEmpty', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').expect(400);
      expect(bodyOf(res).code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/auth/me と認証 Guard', () => {
    it('shouldReturnSameUserStructureAsLoginWithValidToken', async () => {
      const user = await createUser();
      const loginRes = await login(user.empId).expect(200);
      const token = (loginRes.body as { accessToken: string }).accessToken;

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body).toEqual(bodyOf(loginRes).user);
    });

    const unauthorized = {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: '認証が必要です。',
      details: [],
    };

    it('shouldReturn401WhenTokenIsMissing', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
      expect(res.body).toEqual(unauthorized);
    });

    it.each(['Bearer', 'Bearer ', 'Token abc', 'abc', 'Bearer not.a.jwt'])(
      'shouldReturn401WhenAuthorizationIsMalformed(%s)',
      async (header) => {
        const res = await request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', header)
          .expect(401);
        expect(res.body).toEqual(unauthorized);
      },
    );

    it('shouldReturn401WhenSignatureIsForged', async () => {
      const user = await createUser();
      const forger = new JwtService({ secret: 'x'.repeat(40) });
      const token = await forger.signAsync({ sub: user.id }, { expiresIn: 900 });
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      expect(res.body).toEqual(unauthorized);
    });

    it.each(['HS384', 'HS512'] as const)(
      'shouldReturn401WhenSignedWithSameSecretButAlgorithmIs(%s)',
      async (algorithm) => {
        const user = await createUser();
        const token = await signer.signAsync({ sub: user.id }, { algorithm, expiresIn: 900 });
        const res = await request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
        expect(res.body).toEqual(unauthorized);
      },
    );

    it('shouldReturn401WhenAlgorithmIsNone', async () => {
      const user = await createUser();
      const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
      const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: user.id, exp: 9999999999 })}.`;
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      expect(res.body).toEqual(unauthorized);
    });

    it('shouldReturn401WhenTokenIsExpired', async () => {
      const user = await createUser();
      const token = await signer.signAsync({ sub: user.id }, { expiresIn: -10 });
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      expect(bodyOf(res).code).toBe('UNAUTHORIZED');
    });

    it('shouldReturn401WhenUserDoesNotExist', async () => {
      const token = await signer.signAsync({ sub: crypto.randomUUID() }, { expiresIn: 900 });
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      expect(res.body).toEqual(unauthorized);
    });

    it.each(['not-a-uuid', '1', "' OR 1=1 --", 'a\u0000b'])(
      'shouldReturn401NotErrorWhenSubIsNotUuid(%j)',
      async (sub) => {
        const token = await signer.signAsync({ sub }, { expiresIn: 900 });
        const res = await request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
        expect(res.body).toEqual(unauthorized);
      },
    );

    it('shouldReturn401WhenAccountIsDeactivatedAfterTokenIssued', async () => {
      const user = await createUser();
      const loginRes = await login(user.empId).expect(200);
      const token = (loginRes.body as { accessToken: string }).accessToken;
      await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      expect(bodyOf(res).code).toBe('UNAUTHORIZED');
    });

    it('shouldAllowAuthEndpointsWhenPasswordChangeRequired', async () => {
      const user = await createUser({ mustChangePassword: true });
      const loginRes = await login(user.empId).expect(200);
      expect(bodyOf(loginRes).user?.mustChangePassword).toBe(true);
      const token = (loginRes.body as { accessToken: string }).accessToken;
      const auth = { Authorization: `Bearer ${token}` };

      await request(app.getHttpServer()).get('/api/v1/auth/me').set(auth).expect(200);
      await request(app.getHttpServer()).post('/api/v1/auth/logout').set(auth).expect(204);
    });
  });

  describe('パスワード変更チェック(保護ルート)', () => {
    const PROTECTED = '/api/v1/test-protected';

    async function tokenOf(overrides: Record<string, unknown>): Promise<string> {
      const user = await createUser(overrides);
      const res = await login(user.empId).expect(200);
      return (res.body as { accessToken: string }).accessToken;
    }

    it('shouldReturn403PasswordChangeRequiredWhenMustChangePassword', async () => {
      const token = await tokenOf({ mustChangePassword: true });
      const res = await request(app.getHttpServer())
        .get(PROTECTED)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(res.body).toMatchObject({ statusCode: 403, code: 'PASSWORD_CHANGE_REQUIRED' });
    });

    it('shouldReturn200ForRegularUser', async () => {
      const token = await tokenOf({ mustChangePassword: false });
      await request(app.getHttpServer())
        .get(PROTECTED)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect({ ok: true });
    });

    it('shouldReturn401WhenUnauthenticated', async () => {
      const res = await request(app.getHttpServer()).get(PROTECTED).expect(401);
      expect(res.body).toMatchObject({ statusCode: 401, code: 'UNAUTHORIZED' });
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('shouldRevokeRefreshTokenAndClearCookie', async () => {
      const user = await createUser();
      const loginRes = await login(user.empId).expect(200);
      const token = (loginRes.body as { accessToken: string }).accessToken;
      const plain = cookieValue(findRefreshSetCookie(loginRes));

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', `${REFRESH_COOKIE}=${plain}`)
        .expect(204);

      expect(res.text).toBe('');
      const cleared = findRefreshSetCookie(res);
      expect(cleared).toMatch(/^refreshToken=;/);
      expect(cleared).toMatch(/Path=\/api\/v1\/auth/);
      expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);

      const row = await prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: sha256(plain) },
      });
      expect(row.revokedAt).not.toBeNull();
    });

    it('shouldReturn401WithoutAccessToken', async () => {
      const user = await createUser();
      const loginRes = await login(user.empId).expect(200);
      const plain = cookieValue(findRefreshSetCookie(loginRes));

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Cookie', `${REFRESH_COOKIE}=${plain}`)
        .expect(401);

      const row = await prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: sha256(plain) },
      });
      expect(row.revokedAt).toBeNull();
    });

    it('shouldNotRevokeTokenOfAnotherUser', async () => {
      const owner = await createUser();
      const attacker = await createUser();
      const ownerLogin = await login(owner.empId).expect(200);
      const ownerPlain = cookieValue(findRefreshSetCookie(ownerLogin));
      const attackerLogin = await login(attacker.empId).expect(200);
      const attackerToken = (attackerLogin.body as { accessToken: string }).accessToken;

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${attackerToken}`)
        .set('Cookie', `${REFRESH_COOKIE}=${ownerPlain}`)
        .expect(204);

      const row = await prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: sha256(ownerPlain) },
      });
      expect(row.revokedAt).toBeNull();
    });

    it('shouldReturn204EvenWhenCookieIsMissingOrUnknown', async () => {
      const user = await createUser();
      const loginRes = await login(user.empId).expect(200);
      const auth = `Bearer ${(loginRes.body as { accessToken: string }).accessToken}`;

      const noCookie = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', auth)
        .expect(204);
      expect(findRefreshSetCookie(noCookie)).toMatch(/^refreshToken=;/);
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', auth)
        .set('Cookie', `${REFRESH_COOKIE}=unknown`)
        .expect(204);
    });

    it('shouldNotChangeRevokedAtOfAlreadyRevokedToken', async () => {
      const user = await createUser();
      const loginRes = await login(user.empId).expect(200);
      const auth = `Bearer ${(loginRes.body as { accessToken: string }).accessToken}`;
      const plain = cookieValue(findRefreshSetCookie(loginRes));
      const send = () =>
        request(app.getHttpServer())
          .post('/api/v1/auth/logout')
          .set('Authorization', auth)
          .set('Cookie', `${REFRESH_COOKIE}=${plain}`)
          .expect(204);

      await send();
      const first = await prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: sha256(plain) },
      });
      await send();
      const second = await prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: sha256(plain) },
      });
      expect(second.revokedAt).toEqual(first.revokedAt);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    const REFRESH = '/api/v1/auth/refresh';
    const unauthorized = {
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: '認証が必要です。',
      details: [],
    };

    function refresh(plain?: string): request.Test {
      const req = request(app.getHttpServer()).post(REFRESH);
      return plain === undefined ? req : req.set('Cookie', `${REFRESH_COOKIE}=${plain}`);
    }

    async function loginAs(overrides: Record<string, unknown> = {}) {
      const user = await createUser(overrides);
      const res = await login(user.empId).expect(200);
      return {
        user,
        plain: cookieValue(findRefreshSetCookie(res)),
        accessToken: (res.body as { accessToken: string }).accessToken,
      };
    }

    function expectClearedCookie(res: request.Response): void {
      const cleared = findRefreshSetCookie(res);
      expect(cleared).toMatch(/^refreshToken=;/);
      expect(cleared).toMatch(/Path=\/api\/v1\/auth/);
      expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
    }

    it('shouldRotateTokenAndSetNewCookieWithSecureAttributes', async () => {
      const { user, plain } = await loginAs();
      const before = Date.now();
      const res = await refresh(plain).expect(200);

      expect(Object.keys(res.body as object)).toEqual(['accessToken']);
      const line = findRefreshSetCookie(res);
      expect(line).toMatch(/;\s*HttpOnly/i);
      expect(line).toMatch(/;\s*Secure/i);
      expect(line).toMatch(/;\s*SameSite=Strict/i);
      expect(line).toMatch(/;\s*Path=\/api\/v1\/auth(;|$)/);
      expect(line).toMatch(/;\s*Max-Age=604800/);

      const newPlain = cookieValue(line);
      expect(newPlain).not.toBe(plain);
      // 応答 body に Refresh Token の原文は含めない
      expect(JSON.stringify(res.body)).not.toContain(newPlain);
      expect(JSON.stringify(res.body)).not.toContain('refreshToken');

      const oldRow = await prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: sha256(plain) },
      });
      expect(oldRow.revokedAt).not.toBeNull();
      const newRow = await prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: sha256(newPlain) },
      });
      expect(newRow.userId).toBe(user.id);
      expect(newRow.revokedAt).toBeNull();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const diff = newRow.expiresAt.getTime() - before;
      expect(diff).toBeGreaterThanOrEqual(sevenDays - 1000);
      expect(diff).toBeLessThanOrEqual(sevenDays + 10_000);
    });

    it('shouldIssueAccessTokenUsableForMe', async () => {
      const { user, plain } = await loginAs();
      const res = await refresh(plain).expect(200);
      const token = (res.body as { accessToken: string }).accessToken;

      const payload = signer.decode<{ sub: string; iat: number; exp: number }>(token);
      expect(payload.sub).toBe(user.id);
      expect(payload.exp - payload.iat).toBe(15 * 60);
      const me = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect((me.body as { id: string }).id).toBe(user.id);
    });

    it('shouldAllowChainedRefreshWithNewCookie', async () => {
      const { plain } = await loginAs();
      const first = await refresh(plain).expect(200);
      await refresh(cookieValue(findRefreshSetCookie(first))).expect(200);
    });

    it('shouldReturn401AndClearCookieWhenReusingOldToken', async () => {
      const { plain } = await loginAs();
      await refresh(plain).expect(200);
      const res = await refresh(plain).expect(401);
      expect(res.body).toEqual(unauthorized);
      expectClearedCookie(res);
    });

    it('shouldReturn401WhenCookieIsMissing', async () => {
      const res = await refresh().expect(401);
      expect(res.body).toEqual(unauthorized);
      expectClearedCookie(res);
    });

    it.each(['unknown', 'A'.repeat(43)])('shouldReturn401WhenTokenIsUnknown(%s)', async (v) => {
      const res = await refresh(v).expect(401);
      expect(res.body).toEqual(unauthorized);
    });

    it('shouldReturn401WhenTokenIsExpired', async () => {
      const { plain } = await loginAs();
      await prisma.refreshToken.update({
        where: { tokenHash: sha256(plain) },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const res = await refresh(plain).expect(401);
      expect(res.body).toEqual(unauthorized);
      // 期限切れの行は更新しない
      const row = await prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: sha256(plain) },
      });
      expect(row.revokedAt).toBeNull();
    });

    it('shouldReturn401AfterLogout', async () => {
      const { plain, accessToken } = await loginAs();
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', `${REFRESH_COOKIE}=${plain}`)
        .expect(204);

      const res = await refresh(plain).expect(401);
      expect(res.body).toEqual(unauthorized);
    });

    it('shouldReturn401AndNotRotateWhenUserIsInactive', async () => {
      const { user, plain } = await loginAs();
      await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
      const res = await refresh(plain).expect(401);
      expect(res.body).toEqual(unauthorized);
      expectClearedCookie(res);
      const rows = await prisma.refreshToken.findMany({ where: { userId: user.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0].revokedAt).toBeNull();
    });

    it('shouldAllowOnlyOneSuccessWhenRefreshingConcurrentlyWithSameToken', async () => {
      const { user, plain } = await loginAs();
      const results = await Promise.all(Array.from({ length: 5 }, () => refresh(plain)));

      expect(results.map((r) => r.status).sort()).toEqual([200, 401, 401, 401, 401]);
      // 旧 1 行(無効化)と新 1 行だけ
      const rows = await prisma.refreshToken.findMany({ where: { userId: user.id } });
      expect(rows).toHaveLength(2);
      expect(rows.filter((r) => r.revokedAt === null)).toHaveLength(1);
    });

    it('shouldAllowRefreshWhenPasswordChangeRequired', async () => {
      const { plain } = await loginAs({ mustChangePassword: true });
      await refresh(plain).expect(200);
    });
  });

  describe('PATCH /api/v1/auth/password', () => {
    const PASSWORD_PATH = '/api/v1/auth/password';
    const NEW_PASSWORD = 'NewPass123';

    interface Session {
      plain: string;
      accessToken: string;
    }

    async function startSession(empId: string): Promise<Session> {
      const res = await login(empId).expect(200);
      return {
        plain: cookieValue(findRefreshSetCookie(res)),
        accessToken: (res.body as { accessToken: string }).accessToken,
      };
    }

    function changePassword(
      session: Session | null,
      body: Record<string, unknown>,
      withCookie = true,
    ): request.Test {
      let req = request(app.getHttpServer()).patch(PASSWORD_PATH);
      if (session) {
        req = req.set('Authorization', `Bearer ${session.accessToken}`);
        if (withCookie) {
          req = req.set('Cookie', `${REFRESH_COOKIE}=${session.plain}`);
        }
      }
      return req.send(body);
    }

    function refresh(plain: string): request.Test {
      return request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', `${REFRESH_COOKIE}=${plain}`);
    }

    async function passwordHashOf(userId: string): Promise<string> {
      const row = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      return row.passwordHash;
    }

    it('shouldChangePasswordAndClearMustChangePasswordWhenRequired(IT-AUTH-05)', async () => {
      const user = await createUser({ mustChangePassword: true });
      const session = await startSession(user.empId);

      const res = await changePassword(session, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      }).expect(204);
      expect(res.text).toBe('');
      expect(res.headers['set-cookie']).toBeUndefined();

      const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(row.mustChangePassword).toBe(false);
      expect(row.passwordHash).not.toBe(passwordHash);
      expect(row.passwordHash).not.toContain(NEW_PASSWORD);
      await expect(bcrypt.compare(NEW_PASSWORD, row.passwordHash)).resolves.toBe(true);

      // 同じ Access Token のまま、パスワード変更チェックが即座に外れる
      await request(app.getHttpServer())
        .get('/api/v1/test-protected')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);
      const me = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);
      expect((me.body as { mustChangePassword: boolean }).mustChangePassword).toBe(false);
    });

    it('shouldAcceptNewPasswordAndRejectOldPasswordAfterChange', async () => {
      const user = await createUser();
      const session = await startSession(user.empId);
      await changePassword(session, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      }).expect(204);

      await login(user.empId, NEW_PASSWORD).expect(200);
      const old = await login(user.empId, PASSWORD).expect(401);
      expect(bodyOf(old).code).toBe('INVALID_CREDENTIALS');
    });

    it('shouldKeepCurrentSessionAndRevokeOtherSessions', async () => {
      const user = await createUser();
      const sessionA = await startSession(user.empId);
      const sessionB = await startSession(user.empId);
      const other = await createUser();
      const otherSession = await startSession(other.empId);

      await changePassword(sessionA, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      }).expect(204);

      const rowA = await prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: sha256(sessionA.plain) },
      });
      expect(rowA.revokedAt).toBeNull();
      const rowB = await prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: sha256(sessionB.plain) },
      });
      expect(rowB.revokedAt).not.toBeNull();

      await refresh(sessionA.plain).expect(200);
      await refresh(sessionB.plain).expect(401);
      // 他のユーザーのセッションには影響しない
      await refresh(otherSession.plain).expect(200);
    });

    it('shouldRevokeAllSessionsWhenCookieIsMissing', async () => {
      const user = await createUser();
      const sessionA = await startSession(user.empId);
      const sessionB = await startSession(user.empId);

      await changePassword(
        sessionA,
        { currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
        false,
      ).expect(204);

      const rows = await prisma.refreshToken.findMany({ where: { userId: user.id } });
      expect(rows).toHaveLength(2);
      expect(rows.every((r) => r.revokedAt !== null)).toBe(true);
      await refresh(sessionA.plain).expect(401);
      await refresh(sessionB.plain).expect(401);
    });

    it('shouldReturnPolicyViolationAndKeepDbWhenNewPasswordEqualsCurrent(IT-AUTH-06)', async () => {
      const user = await createUser({ mustChangePassword: true });
      const session = await startSession(user.empId);

      const res = await changePassword(session, {
        currentPassword: PASSWORD,
        newPassword: PASSWORD,
      }).expect(400);
      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'PASSWORD_POLICY_VIOLATION',
        message: '現在のパスワードと異なるパスワードを入力してください。',
      });

      const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(row.passwordHash).toBe(passwordHash);
      expect(row.mustChangePassword).toBe(true);
    });

    it('shouldReturnInvalidCurrentPasswordAndKeepDbAndTokensWhenCurrentIsWrong', async () => {
      const user = await createUser({ mustChangePassword: true });
      const sessionA = await startSession(user.empId);
      const sessionB = await startSession(user.empId);

      const res = await changePassword(sessionA, {
        currentPassword: 'Wrong1pass',
        newPassword: NEW_PASSWORD,
      }).expect(400);
      expect(res.body).toEqual({
        statusCode: 400,
        code: 'INVALID_CURRENT_PASSWORD',
        message: '現在のパスワードが正しくありません。',
        details: [],
      });

      const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(row.passwordHash).toBe(passwordHash);
      expect(row.mustChangePassword).toBe(true);
      const tokens = await prisma.refreshToken.findMany({ where: { userId: user.id } });
      expect(tokens).toHaveLength(2);
      expect(tokens.every((t) => t.revokedAt === null)).toBe(true);
      await refresh(sessionB.plain).expect(200);
    });

    it.each([
      ['abcdefgh', 'パスワードは8文字以上で、英字と数字を含めてください。'],
      ['abc1234', 'パスワードは8文字以上で、英字と数字を含めてください。'],
      [`${'a'.repeat(72)}1`, 'パスワードは72バイト以内で入力してください。'],
    ])(
      'shouldReturnPolicyViolationWhenNewPasswordViolatesRule(%j)',
      async (newPassword, message) => {
        const user = await createUser();
        const session = await startSession(user.empId);
        const res = await changePassword(session, {
          currentPassword: PASSWORD,
          newPassword,
        }).expect(400);
        expect(res.body).toMatchObject({ code: 'PASSWORD_POLICY_VIOLATION', message });
        expect(await passwordHashOf(user.id)).toBe(passwordHash);
      },
    );

    it.each([
      [{ newPassword: NEW_PASSWORD }, 'currentPassword'],
      [{ currentPassword: PASSWORD }, 'newPassword'],
      [{ currentPassword: 12345678, newPassword: NEW_PASSWORD }, 'currentPassword'],
      [{ currentPassword: PASSWORD, newPassword: 12345678 }, 'newPassword'],
      [{ currentPassword: '', newPassword: NEW_PASSWORD }, 'currentPassword'],
      [{ currentPassword: PASSWORD, newPassword: `${'a'.repeat(128)}1` }, 'newPassword'],
      [{ currentPassword: 'a'.repeat(129), newPassword: NEW_PASSWORD }, 'currentPassword'],
    ])('shouldReturnValidationErrorWhenBodyIsInvalid(%j)', async (body, field) => {
      const user = await createUser();
      const session = await startSession(user.empId);
      const res = await changePassword(session, body).expect(400);
      expect(bodyOf(res).code).toBe('VALIDATION_ERROR');
      expect(bodyOf(res).details?.map((d) => d.field)).toContain(field);
      expect(await passwordHashOf(user.id)).toBe(passwordHash);
    });

    it('shouldReturn401WhenAuthorizationIsMissing', async () => {
      const res = await changePassword(null, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      }).expect(401);
      expect(bodyOf(res).code).toBe('UNAUTHORIZED');
    });

    it('shouldAllowOnlyOneSuccessWhenChangingConcurrently', async () => {
      const user = await createUser();
      const session = await startSession(user.empId);
      const candidates = ['NewPass111', 'NewPass222'];

      const results = await Promise.all(
        candidates.map((newPassword) =>
          changePassword(session, { currentPassword: PASSWORD, newPassword }),
        ),
      );

      expect(results.map((r) => r.status).sort()).toEqual([204, 400]);
      const failed = results.find((r) => r.status === 400);
      expect(bodyOf(failed as request.Response).code).toBe('INVALID_CURRENT_PASSWORD');
      const winner = candidates[results.findIndex((r) => r.status === 204)];
      const loser = candidates[results.findIndex((r) => r.status === 400)];
      const hash = await passwordHashOf(user.id);
      await expect(bcrypt.compare(winner, hash)).resolves.toBe(true);
      await expect(bcrypt.compare(loser, hash)).resolves.toBe(false);
    });

    it('shouldNotIncludePasswordsOrHashesInResponses', async () => {
      const user = await createUser();
      const session = await startSession(user.empId);
      const responses = [
        await changePassword(session, { currentPassword: 'Wrong1pass', newPassword: NEW_PASSWORD }),
        await changePassword(session, { currentPassword: PASSWORD, newPassword: 'abcdefgh' }),
        await changePassword(session, { currentPassword: PASSWORD, newPassword: 123 }),
        await changePassword(session, { currentPassword: PASSWORD, newPassword: NEW_PASSWORD }),
      ];
      expect(responses.map((r) => r.status)).toEqual([400, 400, 400, 204]);
      const newHash = await passwordHashOf(user.id);
      for (const res of responses) {
        for (const secretValue of [PASSWORD, 'Wrong1pass', NEW_PASSWORD, passwordHash, newHash]) {
          expect(res.text).not.toContain(secretValue);
        }
        expect(res.text).not.toContain('passwordHash');
      }
    });
  });

  describe('PUBLIC エンドポイント', () => {
    it('shouldKeepHealthAccessibleWithoutAuthentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/health').expect(200).expect({ status: 'ok' });
    });
  });
});
