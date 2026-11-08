import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../auth.types.js';
import { ADMIN_ONLY_KEY } from '../decorators/admin-only.decorator.js';

// Role Guard。@AdminOnly() が付いた API は ADMIN 以外を 403 FORBIDDEN にする(docs/07 §3)。
// JwtAuthGuard がパスワード変更チェックの後に呼び出す。
// パスの文字列では判定しない(Express のルーティングは大文字小文字を区別せず、回避されうるため)。
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const adminOnly = this.reflector.getAllAndOverride<boolean | undefined>(ADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!adminOnly) {
      return true;
    }
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    // 認証が済んでいなければ拒否する(fail-closed)
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException();
    }
    return true;
  }
}
