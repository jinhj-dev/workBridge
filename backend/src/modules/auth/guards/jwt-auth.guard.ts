import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service.js';
import type { AuthenticatedRequest } from '../auth.types.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { PasswordChangeGuard } from './password-change.guard.js';

// 全 API に適用する認証 Guard。Bearer Access Token を検証し、毎回 DB でユーザーの存在と活性を確認する。
// 認証後にパスワード変更チェックを行う(認証 → チェックの順をここで固定する)
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly passwordChangeGuard: PasswordChangeGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException();
    }
    request.user = await this.authService.authenticateAccessToken(token);
    return this.passwordChangeGuard.canActivate(context);
  }

  private extractBearerToken(header: string | undefined): string | null {
    const match = /^Bearer (\S+)$/.exec(header ?? '');
    return match ? match[1] : null;
  }
}
