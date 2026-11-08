import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth.types.js';

// 認証 Guard が検証したユーザーを取り出す。クライアントが送った ID は使わない
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (!user) {
    throw new Error('認証済みユーザーがありません。PUBLIC の API では CurrentUser を使えません。');
  }
  return user;
});
