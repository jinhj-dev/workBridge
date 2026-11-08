import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS,
  REFRESH_TOKEN_TTL_MS,
} from './auth.constants.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { AuthService } from './auth.service.js';
import type { AuthUser } from './auth.types.js';
import { AllowPasswordChangeRequired } from './decorators/allow-password-change-required.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { changePasswordSchema } from './dto/change-password.dto.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import { loginSchema } from './dto/login.dto.js';
import type { LoginDto } from './dto/login.dto.js';

// /auth/* はパスワード変更が必要なユーザーも使える
@AllowPasswordChangeRequired()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Req() req: Request,
    @Body({ schema: loginSchema }) dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string; user: AuthUser }> {
    // API の形式は JSON のみ(docs/06 §0)。フォーム形式などは受け付けない
    if (!req.is('application/json')) {
      throw new AppException(
        'VALIDATION_ERROR',
        HttpStatus.BAD_REQUEST,
        'Content-Type は application/json にしてください。',
      );
    }
    const { accessToken, user, refreshToken } = await this.authService.login(dto);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_TTL_MS,
    });
    return { accessToken, user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    try {
      const { accessToken, refreshToken } = await this.authService.refresh(
        this.readRefreshCookie(req),
      );
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
        ...REFRESH_COOKIE_OPTIONS,
        maxAge: REFRESH_TOKEN_TTL_MS,
      });
      return { accessToken };
    } catch (error) {
      // 失敗時は使えないクッキーを残さない(以後の無駄な再送を止める)。応答は元の 401 のまま
      if (error instanceof UnauthorizedException) {
        res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
      }
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(user.id, this.readRefreshCookie(req));
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
  }

  // 現在のセッション(Access Token・Refresh クッキー)はそのまま使える。他のセッションの Refresh Token は無効化される
  @Patch('password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Body({ schema: changePasswordSchema }) dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(user.id, dto, this.readRefreshCookie(req));
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }

  // Refresh クッキーを文字列のときだけ取り出す(未送信・不正な形は undefined)
  private readRefreshCookie(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const value = cookies?.[REFRESH_COOKIE_NAME];
    return typeof value === 'string' ? value : undefined;
  }
}
