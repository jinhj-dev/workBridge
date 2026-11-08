import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthService } from '../auth.service.js';
import type { AuthUser } from '../auth.types.js';
import { AdminOnly } from '../decorators/admin-only.decorator.js';
import { AllowPasswordChangeRequired } from '../decorators/allow-password-change-required.decorator.js';
import { Public } from '../decorators/public.decorator.js';
import { AdminGuard } from './admin.guard.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { PasswordChangeGuard } from './password-change.guard.js';

const USER: AuthUser = {
  id: 'user-1',
  name: 'テスト太郎',
  empId: '00001',
  role: 'EMPLOYEE',
  departmentName: null,
  approvalRequired: true,
  mustChangePassword: false,
};

class PlainController {
  handler(): void {}
}

@Public()
class PublicController {
  handler(): void {}
}

@AllowPasswordChangeRequired()
class AuthLikeController {
  handler(): void {}
}

@AdminOnly()
class AdminController {
  handler(): void {}
}

function makeContext(
  controller: { prototype: { handler: () => void } },
  request: Record<string, unknown>,
): ExecutionContext {
  return {
    getHandler: () => controller.prototype.handler,
    getClass: () => controller as unknown as new () => object,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let authService: { authenticateAccessToken: ReturnType<typeof vi.fn> };
  let guard: JwtAuthGuard;
  const passwordChangeGuard = new PasswordChangeGuard(new Reflector());
  const adminGuard = new AdminGuard(new Reflector());

  beforeEach(() => {
    authService = { authenticateAccessToken: vi.fn().mockResolvedValue(USER) };
    guard = new JwtAuthGuard(
      new Reflector(),
      authService as unknown as AuthService,
      passwordChangeGuard,
      adminGuard,
    );
  });

  it('shouldAllowPublicEndpointWithoutToken', async () => {
    const ctx = makeContext(PublicController, { headers: {} });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(authService.authenticateAccessToken).not.toHaveBeenCalled();
  });

  it('shouldRejectWhenAuthorizationHeaderIsMissing', async () => {
    const ctx = makeContext(PlainController, { headers: {} });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each(['abc', 'Basic abc', 'Bearer', 'Bearer a b', 'bearer abc'])(
    'shouldRejectMalformedHeader(%s)',
    async (header) => {
      const ctx = makeContext(PlainController, { headers: { authorization: header } });
      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(authService.authenticateAccessToken).not.toHaveBeenCalled();
    },
  );

  it('shouldAttachUserWhenTokenIsValid', async () => {
    const request: Record<string, unknown> = { headers: { authorization: 'Bearer good' } };
    await expect(guard.canActivate(makeContext(PlainController, request))).resolves.toBe(true);
    expect(authService.authenticateAccessToken).toHaveBeenCalledWith('good');
    expect(request.user).toEqual(USER);
  });

  it('shouldRunPasswordChangeCheckAfterAuthenticationSoUserIsAlwaysSet', async () => {
    authService.authenticateAccessToken.mockResolvedValue({ ...USER, mustChangePassword: true });
    const ctx = makeContext(PlainController, { headers: { authorization: 'Bearer good' } });
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      code: 'PASSWORD_CHANGE_REQUIRED',
      status: 403,
    });
    const allowed = makeContext(AuthLikeController, { headers: { authorization: 'Bearer good' } });
    await expect(guard.canActivate(allowed)).resolves.toBe(true);
  });

  it('shouldCheckPasswordChangeBeforeRoleWhenAdminMustChangePassword', async () => {
    authService.authenticateAccessToken.mockResolvedValue({
      ...USER,
      role: 'ADMIN',
      mustChangePassword: true,
    });
    const ctx = makeContext(AdminController, { headers: { authorization: 'Bearer good' } });
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      code: 'PASSWORD_CHANGE_REQUIRED',
      status: 403,
    });
  });

  it('shouldCheckPasswordChangeBeforeRoleWhenEmployeeMustChangePassword', async () => {
    authService.authenticateAccessToken.mockResolvedValue({ ...USER, mustChangePassword: true });
    const ctx = makeContext(AdminController, { headers: { authorization: 'Bearer good' } });
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      code: 'PASSWORD_CHANGE_REQUIRED',
    });
  });

  it('shouldRejectEmployeeOnAdminEndpointAfterAuthentication', async () => {
    const ctx = makeContext(AdminController, { headers: { authorization: 'Bearer good' } });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
    expect(authService.authenticateAccessToken).toHaveBeenCalledWith('good');
  });

  it('shouldRejectAdminEndpointWithoutTokenAs401', async () => {
    const ctx = makeContext(AdminController, { headers: {} });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('shouldAllowAdminOnAdminEndpoint', async () => {
    authService.authenticateAccessToken.mockResolvedValue({ ...USER, role: 'ADMIN' });
    const ctx = makeContext(AdminController, { headers: { authorization: 'Bearer good' } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('shouldRejectWhenServiceRejectsToken', async () => {
    authService.authenticateAccessToken.mockRejectedValue(new UnauthorizedException());
    const ctx = makeContext(PlainController, { headers: { authorization: 'Bearer forged' } });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('PasswordChangeGuard', () => {
  const guard = new PasswordChangeGuard(new Reflector());

  it('shouldAllowWhenUserDoesNotNeedPasswordChange', () => {
    expect(guard.canActivate(makeContext(PlainController, { user: USER }))).toBe(true);
  });

  it('shouldRejectNonPublicRequestWithoutUserAsFailClosed', () => {
    expect(() => guard.canActivate(makeContext(PlainController, {}))).toThrow(
      UnauthorizedException,
    );
    expect(() => guard.canActivate(makeContext(AuthLikeController, {}))).toThrow(
      UnauthorizedException,
    );
  });

  it('shouldAllowPublicRequestWithoutUser', () => {
    expect(guard.canActivate(makeContext(PublicController, {}))).toBe(true);
  });

  it('shouldBlockNonAuthEndpointWhenPasswordChangeIsRequired', () => {
    const ctx = makeContext(PlainController, { user: { ...USER, mustChangePassword: true } });
    expect(() => guard.canActivate(ctx)).toThrowError(
      expect.objectContaining({ code: 'PASSWORD_CHANGE_REQUIRED', status: 403 }) as Error,
    );
  });

  it('shouldAllowAuthEndpointWhenPasswordChangeIsRequired', () => {
    const ctx = makeContext(AuthLikeController, { user: { ...USER, mustChangePassword: true } });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});

describe('AdminGuard', () => {
  const guard = new AdminGuard(new Reflector());

  it('shouldAllowWhenAdminOnlyMetadataIsAbsent', () => {
    expect(guard.canActivate(makeContext(PlainController, { user: USER }))).toBe(true);
    expect(guard.canActivate(makeContext(PlainController, {}))).toBe(true);
  });

  it('shouldAllowAdminOnAdminOnlyEndpoint', () => {
    const ctx = makeContext(AdminController, { user: { ...USER, role: 'ADMIN' } });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('shouldRejectEmployeeOnAdminOnlyEndpointWith403', () => {
    const ctx = makeContext(AdminController, { user: USER });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('shouldRejectAdminOnlyEndpointWithoutUserAs401', () => {
    expect(() => guard.canActivate(makeContext(AdminController, {}))).toThrow(
      UnauthorizedException,
    );
  });
});
