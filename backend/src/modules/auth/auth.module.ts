import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ENV } from '../../config/env.js';
import type { Env } from '../../config/env.js';
import { ACCESS_TOKEN_TTL_SECONDS, JWT_ALGORITHM } from './auth.constants.js';
import { AuthController } from './auth.controller.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { AdminGuard } from './guards/admin.guard.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { PasswordChangeGuard } from './guards/password-change.guard.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        secret: env.JWT_ACCESS_SECRET,
        signOptions: { algorithm: JWT_ALGORITHM, expiresIn: ACCESS_TOKEN_TTL_SECONDS },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    // 全 API に適用する Guard は JwtAuthGuard の 1 つだけ。
    // パスワード変更チェックと Role チェックは JwtAuthGuard が認証後に呼ぶ(実行順を登録順に頼らないため)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    PasswordChangeGuard,
    AdminGuard,
  ],
})
export class AuthModule {}
