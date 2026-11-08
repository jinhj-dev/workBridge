import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from '../../../common/exceptions/app.exception.js';
import type { AuthenticatedRequest } from '../auth.types.js';
import { ALLOW_PASSWORD_CHANGE_REQUIRED_KEY } from '../decorators/allow-password-change-required.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

// パスワード変更が必要なユーザーは、/auth/* 以外の API を使えない(docs/06 §0)。
// JwtAuthGuard が認証後に呼び出す。PUBLIC の API は対象外。
// PUBLIC でないのに user がない場合は、認証が済んでいないので拒否する(fail-closed)。
@Injectable()
export class PasswordChangeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) {
      throw new UnauthorizedException();
    }
    if (!user.mustChangePassword) {
      return true;
    }
    const allowed = this.reflector.getAllAndOverride<boolean | undefined>(
      ALLOW_PASSWORD_CHANGE_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowed) {
      return true;
    }
    throw new AppException(
      'PASSWORD_CHANGE_REQUIRED',
      HttpStatus.FORBIDDEN,
      'パスワードの変更が必要です。',
    );
  }
}
