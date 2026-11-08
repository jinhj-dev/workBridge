import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppException } from '../../common/exceptions/app.exception.js';
import { DUMMY_PASSWORD_HASH } from '../../common/security/credentials.js';
import { REFRESH_TOKEN_TTL_MS } from './auth.constants.js';
import type { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';

const PASSWORD = 'Correct1pass';
const USER_ID = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    name: 'テスト太郎',
    empId: '00001',
    role: 'EMPLOYEE',
    approvalRequired: true,
    isActive: true,
    mustChangePassword: false,
    department: { name: '開発チーム' },
    passwordHash: '',
    ...overrides,
  };
}

describe('AuthService', () => {
  let passwordHash: string;
  let repository: {
    findUserByEmpId: ReturnType<typeof vi.fn>;
    findUserById: ReturnType<typeof vi.fn>;
    replaceRefreshToken: ReturnType<typeof vi.fn>;
    revokeRefreshToken: ReturnType<typeof vi.fn>;
    findValidRefreshToken: ReturnType<typeof vi.fn>;
    rotateRefreshToken: ReturnType<typeof vi.fn>;
    findUserWithPasswordHashById: ReturnType<typeof vi.fn>;
    updatePasswordAndRevokeOtherTokens: ReturnType<typeof vi.fn>;
  };
  let jwtService: { signAsync: ReturnType<typeof vi.fn>; verifyAsync: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
  });

  beforeEach(() => {
    repository = {
      findUserByEmpId: vi.fn(),
      findUserById: vi.fn(),
      replaceRefreshToken: vi.fn().mockResolvedValue(undefined),
      revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
      findValidRefreshToken: vi.fn(),
      rotateRefreshToken: vi.fn().mockResolvedValue(true),
      findUserWithPasswordHashById: vi.fn(),
      updatePasswordAndRevokeOtherTokens: vi.fn().mockResolvedValue(true),
    };
    jwtService = {
      signAsync: vi.fn().mockResolvedValue('signed-jwt'),
      verifyAsync: vi.fn(),
    };
    service = new AuthService(
      repository as unknown as AuthRepository,
      jwtService as unknown as JwtService,
    );
  });

  describe('login', () => {
    it('shouldTrimEmpIdAndKeepLeadingZerosBeforeLookup', async () => {
      repository.findUserByEmpId.mockResolvedValue(makeRow({ passwordHash }));
      await service.login({ empId: '  00001 ', password: PASSWORD });
      expect(repository.findUserByEmpId).toHaveBeenCalledWith('00001');
    });

    it.each(['', '   ', 'E0001', 'e0001', '1'.repeat(51), '００１', '1\u00002', '12 34'])(
      'shouldThrowInvalidCredentialsWithoutDbLookupButWithDummyCompareWhenEmpIdIsNotNumeric(%j)',
      async (empId) => {
        const compareSpy = vi.spyOn(bcrypt, 'compare');
        await expect(service.login({ empId, password: PASSWORD })).rejects.toMatchObject({
          code: 'INVALID_CREDENTIALS',
          status: 401,
        });
        expect(repository.findUserByEmpId).not.toHaveBeenCalled();
        expect(compareSpy).toHaveBeenCalledTimes(1);
        expect(compareSpy.mock.calls[0][1]).toBe(DUMMY_PASSWORD_HASH);
        compareSpy.mockRestore();
      },
    );

    it('shouldNotFailWhenPasswordContainsNul', async () => {
      repository.findUserByEmpId.mockResolvedValue(makeRow({ passwordHash }));
      await expect(
        service.login({ empId: '00001', password: `${PASSWORD}\u0000x` }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
    });

    it('shouldReturnTokensAndUserWithoutPasswordHashWhenCredentialsAreValid', async () => {
      repository.findUserByEmpId.mockResolvedValue(makeRow({ passwordHash }));
      const result = await service.login({ empId: '00001', password: PASSWORD });

      expect(result.accessToken).toBe('signed-jwt');
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: USER_ID });
      expect(result.user).toEqual({
        id: USER_ID,
        name: 'テスト太郎',
        empId: '00001',
        role: 'EMPLOYEE',
        departmentName: '開発チーム',
        approvalRequired: true,
        mustChangePassword: false,
      });
      expect(JSON.stringify(result.user)).not.toContain('passwordHash');
    });

    it('shouldStoreOnlySha256HashOfRefreshTokenWithSevenDayExpiry', async () => {
      repository.findUserByEmpId.mockResolvedValue(makeRow({ passwordHash }));
      const result = await service.login({ empId: '00001', password: PASSWORD });

      const params = repository.replaceRefreshToken.mock.calls[0][0] as {
        userId: string;
        tokenHash: string;
        expiresAt: Date;
        now: Date;
      };
      expect(params.userId).toBe(USER_ID);
      expect(params.tokenHash).toBe(createHash('sha256').update(result.refreshToken).digest('hex'));
      expect(params.tokenHash).not.toBe(result.refreshToken);
      expect(params.expiresAt.getTime() - params.now.getTime()).toBe(REFRESH_TOKEN_TTL_MS);
      // 256bit の乱数(base64url で 43 文字)
      expect(result.refreshToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    });

    it('shouldThrowInvalidCredentialsWhenPasswordIsWrong', async () => {
      repository.findUserByEmpId.mockResolvedValue(makeRow({ passwordHash }));
      await expect(service.login({ empId: '00001', password: 'Wrong1pass' })).rejects.toMatchObject(
        { code: 'INVALID_CREDENTIALS', status: 401 },
      );
      expect(repository.replaceRefreshToken).not.toHaveBeenCalled();
    });

    it('shouldThrowSameInvalidCredentialsAndStillRunBcryptWhenUserDoesNotExist', async () => {
      repository.findUserByEmpId.mockResolvedValue(null);
      const compareSpy = vi.spyOn(bcrypt, 'compare');

      const error = await service
        .login({ empId: 'NOONE', password: PASSWORD })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).toBody()).toMatchObject({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
      });
      expect(compareSpy).toHaveBeenCalledTimes(1);
      // 比較相手は、コストが本物と同じダミーハッシュ
      expect(compareSpy.mock.calls[0][1]).toBe(DUMMY_PASSWORD_HASH);
      compareSpy.mockRestore();
    });

    it('shouldThrowAccountDisabledOnlyWhenPasswordIsCorrect', async () => {
      repository.findUserByEmpId.mockResolvedValue(makeRow({ passwordHash, isActive: false }));
      await expect(service.login({ empId: '00001', password: PASSWORD })).rejects.toMatchObject({
        code: 'ACCOUNT_DISABLED',
        status: 403,
      });
      await expect(service.login({ empId: '00001', password: 'Wrong1pass' })).rejects.toMatchObject(
        { code: 'INVALID_CREDENTIALS', status: 401 },
      );
      expect(repository.replaceRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('authenticateAccessToken', () => {
    it('shouldReturnUserWhenTokenIsValidAndUserIsActive', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: USER_ID });
      repository.findUserById.mockResolvedValue(makeRow());
      const user = await service.authenticateAccessToken('token');
      expect(user.id).toBe(USER_ID);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('token', { algorithms: ['HS256'] });
    });

    it('shouldThrowUnauthorizedWhenVerificationFails', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
      await expect(service.authenticateAccessToken('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('shouldThrowUnauthorizedWhenSubIsMissing', async () => {
      jwtService.verifyAsync.mockResolvedValue({});
      await expect(service.authenticateAccessToken('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it.each(['not-a-uuid', '1', "' OR 1=1 --", '', '3f2b8c1e9a4d4e6f8b7a1c2d3e4f5a6b'])(
      'shouldThrowUnauthorizedWithoutDbLookupWhenSubIsNotUuid(%j)',
      async (sub) => {
        jwtService.verifyAsync.mockResolvedValue({ sub });
        await expect(service.authenticateAccessToken('token')).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
        expect(repository.findUserById).not.toHaveBeenCalled();
      },
    );

    it('shouldThrowUnauthorizedWhenSubIsNotString', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 123 });
      await expect(service.authenticateAccessToken('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repository.findUserById).not.toHaveBeenCalled();
    });

    it('shouldThrowUnauthorizedWhenUserDoesNotExistOrIsInactive', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: USER_ID });
      repository.findUserById.mockResolvedValue(null);
      await expect(service.authenticateAccessToken('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      repository.findUserById.mockResolvedValue(makeRow({ isActive: false }));
      await expect(service.authenticateAccessToken('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('shouldRevokeOnlyTokenOwnedByUserUsingHash', async () => {
      await service.logout(USER_ID, 'plain-token');
      expect(repository.revokeRefreshToken).toHaveBeenCalledWith(
        USER_ID,
        createHash('sha256').update('plain-token').digest('hex'),
        expect.any(Date),
      );
    });

    it('shouldDoNothingWhenCookieIsMissing', async () => {
      await service.logout(USER_ID, undefined);
      expect(repository.revokeRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    const VALID_TOKEN = 'A'.repeat(43);
    const TOKEN_ID = 'token-row-id';

    it('shouldRotateTokenAndReturnNewTokensWhenValid', async () => {
      repository.findValidRefreshToken.mockResolvedValue({ id: TOKEN_ID, user: makeRow() });
      const before = Date.now();
      const result = await service.refresh(VALID_TOKEN);

      expect(repository.findValidRefreshToken).toHaveBeenCalledWith(
        createHash('sha256').update(VALID_TOKEN).digest('hex'),
        expect.any(Date),
      );
      const params = repository.rotateRefreshToken.mock.calls[0][0] as {
        oldTokenId: string;
        userId: string;
        newTokenHash: string;
        expiresAt: Date;
      };
      expect(params.oldTokenId).toBe(TOKEN_ID);
      expect(params.userId).toBe(USER_ID);
      expect(params.newTokenHash).toBe(
        createHash('sha256').update(result.refreshToken).digest('hex'),
      );
      expect(result.refreshToken).not.toBe(VALID_TOKEN);
      expect(params.expiresAt.getTime() - before).toBeGreaterThanOrEqual(
        REFRESH_TOKEN_TTL_MS - 1000,
      );
      expect(result.accessToken).toBe('signed-jwt');
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: USER_ID });
    });

    it.each([
      undefined,
      '',
      'short',
      `${'A'.repeat(42)}=`,
      `${'A'.repeat(42)}\u0000`,
      'A'.repeat(44),
    ])(
      'shouldThrowUnauthorizedWithoutDbLookupWhenCookieIsMissingOrMalformed(%j)',
      async (token) => {
        await expect(service.refresh(token)).rejects.toBeInstanceOf(UnauthorizedException);
        expect(repository.findValidRefreshToken).not.toHaveBeenCalled();
      },
    );

    it('shouldThrowUnauthorizedWhenTokenIsUnknownExpiredOrRevoked', async () => {
      repository.findValidRefreshToken.mockResolvedValue(null);
      await expect(service.refresh(VALID_TOKEN)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(repository.rotateRefreshToken).not.toHaveBeenCalled();
    });

    it('shouldThrowUnauthorizedAndNotRotateWhenUserIsInactive', async () => {
      repository.findValidRefreshToken.mockResolvedValue({
        id: TOKEN_ID,
        user: makeRow({ isActive: false }),
      });
      await expect(service.refresh(VALID_TOKEN)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(repository.rotateRefreshToken).not.toHaveBeenCalled();
    });

    it('shouldThrowUnauthorizedWhenRotationLostRace', async () => {
      repository.findValidRefreshToken.mockResolvedValue({ id: TOKEN_ID, user: makeRow() });
      repository.rotateRefreshToken.mockResolvedValue(false);
      await expect(service.refresh(VALID_TOKEN)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const NEW_PASSWORD = 'NewPass123';
    const COOKIE_TOKEN = 'B'.repeat(43);

    interface UpdateParams {
      userId: string;
      oldPasswordHash: string;
      newPasswordHash: string;
      keepTokenHash: string | null;
      now: Date;
    }

    function updateParams(): UpdateParams {
      return repository.updatePasswordAndRevokeOtherTokens.mock.calls[0][0] as UpdateParams;
    }

    it('shouldUpdateHashAndKeepCurrentTokenWhenRequestIsValid', async () => {
      repository.findUserWithPasswordHashById.mockResolvedValue(makeRow({ passwordHash }));
      await service.changePassword(
        USER_ID,
        { currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
        COOKIE_TOKEN,
      );

      expect(repository.findUserWithPasswordHashById).toHaveBeenCalledWith(USER_ID);
      const params = updateParams();
      expect(params.userId).toBe(USER_ID);
      expect(params.oldPasswordHash).toBe(passwordHash);
      expect(params.newPasswordHash).not.toBe(NEW_PASSWORD);
      await expect(bcrypt.compare(NEW_PASSWORD, params.newPasswordHash)).resolves.toBe(true);
      expect(params.keepTokenHash).toBe(createHash('sha256').update(COOKIE_TOKEN).digest('hex'));
      expect(params.now).toBeInstanceOf(Date);
    });

    it.each([undefined, '', 'short', `${'A'.repeat(42)}=`, 'A'.repeat(44)])(
      'shouldRevokeAllTokensWhenCookieIsMissingOrMalformed(%j)',
      async (token) => {
        repository.findUserWithPasswordHashById.mockResolvedValue(makeRow({ passwordHash }));
        await service.changePassword(
          USER_ID,
          { currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
          token,
        );
        expect(updateParams().keepTokenHash).toBeNull();
      },
    );

    it('shouldThrowInvalidCurrentPasswordWithoutUpdateWhenCurrentPasswordIsWrong', async () => {
      repository.findUserWithPasswordHashById.mockResolvedValue(makeRow({ passwordHash }));
      await expect(
        service.changePassword(
          USER_ID,
          { currentPassword: 'Wrong1pass', newPassword: NEW_PASSWORD },
          COOKIE_TOKEN,
        ),
      ).rejects.toMatchObject({ code: 'INVALID_CURRENT_PASSWORD', status: 400 });
      expect(repository.updatePasswordAndRevokeOtherTokens).not.toHaveBeenCalled();
    });

    it('shouldThrowPolicyViolationWithoutUpdateWhenNewPasswordEqualsCurrent', async () => {
      repository.findUserWithPasswordHashById.mockResolvedValue(makeRow({ passwordHash }));
      await expect(
        service.changePassword(
          USER_ID,
          { currentPassword: PASSWORD, newPassword: PASSWORD },
          COOKIE_TOKEN,
        ),
      ).rejects.toMatchObject({
        code: 'PASSWORD_POLICY_VIOLATION',
        status: 400,
        message: '現在のパスワードと異なるパスワードを入力してください。',
      });
      expect(repository.updatePasswordAndRevokeOtherTokens).not.toHaveBeenCalled();
    });

    it.each([
      ['abcdefgh', 'パスワードは8文字以上で、英字と数字を含めてください。'],
      ['abc1234', 'パスワードは8文字以上で、英字と数字を含めてください。'],
      ['', 'パスワードは8文字以上で、英字と数字を含めてください。'],
      [`${'a'.repeat(72)}1`, 'パスワードは72バイト以内で入力してください。'],
    ])(
      'shouldThrowPolicyViolationWithoutDbLookupWhenNewPasswordViolatesPolicy(%j)',
      async (newPassword, message) => {
        await expect(
          service.changePassword(USER_ID, { currentPassword: PASSWORD, newPassword }, COOKIE_TOKEN),
        ).rejects.toMatchObject({ code: 'PASSWORD_POLICY_VIOLATION', status: 400, message });
        expect(repository.findUserWithPasswordHashById).not.toHaveBeenCalled();
        expect(repository.updatePasswordAndRevokeOtherTokens).not.toHaveBeenCalled();
      },
    );

    it('shouldThrowUnauthorizedWhenUserDoesNotExistOrIsInactive', async () => {
      const dto = { currentPassword: PASSWORD, newPassword: NEW_PASSWORD };
      repository.findUserWithPasswordHashById.mockResolvedValue(null);
      await expect(service.changePassword(USER_ID, dto, COOKIE_TOKEN)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      repository.findUserWithPasswordHashById.mockResolvedValue(
        makeRow({ passwordHash, isActive: false }),
      );
      await expect(service.changePassword(USER_ID, dto, COOKIE_TOKEN)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repository.updatePasswordAndRevokeOtherTokens).not.toHaveBeenCalled();
    });

    it('shouldThrowInvalidCurrentPasswordWhenConditionalUpdateLostRace', async () => {
      repository.findUserWithPasswordHashById.mockResolvedValue(makeRow({ passwordHash }));
      repository.updatePasswordAndRevokeOtherTokens.mockResolvedValue(false);
      await expect(
        service.changePassword(
          USER_ID,
          { currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
          COOKIE_TOKEN,
        ),
      ).rejects.toMatchObject({ code: 'INVALID_CURRENT_PASSWORD', status: 400 });
    });
  });
});
