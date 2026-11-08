import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { createHash, randomBytes } from 'node:crypto';
import { AppException } from '../../common/exceptions/app.exception.js';
import {
  BCRYPT_COST,
  DUMMY_PASSWORD_HASH,
  EMP_ID_PATTERN,
} from '../../common/security/credentials.js';
import { checkPasswordPolicy } from '../../common/security/password-policy.js';
import { JWT_ALGORITHM, REFRESH_TOKEN_TTL_MS } from './auth.constants.js';
import { AuthRepository } from './auth.repository.js';
import type { UserRow } from './auth.repository.js';
import type { AuthUser } from './auth.types.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { LoginDto } from './dto/login.dto.js';

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
  refreshToken: string;
}

// sub は UUID 形式でなければ DB を引かない(不正な値で DB エラーにならないようにする)
const uuidSchema = z.guid();

// 発行する Refresh Token の形式(32 バイトの base64url = 43 文字)。これ以外は DB を引かない
const REFRESH_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

// Refresh Token は SHA-256(16 進数)で保存・照合する(docs/05 §3)
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    empId: row.empId,
    role: row.role,
    departmentName: row.department?.name ?? null,
    approvalRequired: row.approvalRequired,
    mustChangePassword: row.mustChangePassword,
  };
}

function invalidCurrentPassword(): AppException {
  return new AppException(
    'INVALID_CURRENT_PASSWORD',
    HttpStatus.BAD_REQUEST,
    '現在のパスワードが正しくありません。',
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    // 社員番号は前後の空白を除いて検証する。数字以外は DB を引かず、存在しない場合と同じ扱いにする(FR-USER-001)
    const empId = dto.empId.trim();
    const row = EMP_ID_PATTERN.test(empId)
      ? await this.authRepository.findUserByEmpId(empId)
      : null;

    // 存在しない社員番号でもダミーハッシュと比較し、応答時間の差を作らない
    const passwordMatched = await bcrypt.compare(
      dto.password,
      row?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!row || !passwordMatched) {
      throw new AppException(
        'INVALID_CREDENTIALS',
        HttpStatus.UNAUTHORIZED,
        '社員番号またはパスワードが正しくありません。',
      );
    }
    // 無効アカウントはパスワードが合った後にだけ通知する(アカウントの存在を漏らさないため)
    if (!row.isActive) {
      throw new AppException(
        'ACCOUNT_DISABLED',
        HttpStatus.FORBIDDEN,
        'このアカウントは無効化されています。',
      );
    }

    const refreshToken = randomBytes(32).toString('base64url');
    const now = new Date();
    await this.authRepository.replaceRefreshToken({
      userId: row.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
      now,
    });

    // ペイロードは最小限(sub のみ)。権限などの変わり得る値は入れず、毎回 DB から読む
    const accessToken = await this.jwtService.signAsync({ sub: row.id });
    return { accessToken, user: toAuthUser(row), refreshToken };
  }

  // Access Token を検証し、DB 上の現在のユーザーを返す。無効・期限切れ・ユーザー不在・無効アカウント・sub が UUID でないものはすべて 401
  async authenticateAccessToken(token: string): Promise<AuthUser> {
    let userId: unknown;
    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: unknown }>(token, {
        algorithms: [JWT_ALGORITHM],
      });
      userId = payload.sub;
    } catch {
      // 署名不正・期限切れ・形式不正。理由は応答に出さず 401 にまとめる
      throw new UnauthorizedException();
    }
    if (typeof userId !== 'string' || !uuidSchema.safeParse(userId).success) {
      throw new UnauthorizedException();
    }
    const row = await this.authRepository.findUserById(userId);
    if (!row?.isActive) {
      throw new UnauthorizedException();
    }
    return toAuthUser(row);
  }

  // Refresh Token を無効化する。トークンがない・他人のもの・無効済みでも何もしない(冪等)
  async logout(userId: string, refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }
    await this.authRepository.revokeRefreshToken(
      userId,
      hashRefreshToken(refreshToken),
      new Date(),
    );
  }

  // パスワードを変更する(FR-AUTH-003)。現在のセッションの Refresh Token は残し、他のセッションの Refresh Token はすべて無効化する。
  // 現在のトークンが無い・形式不正なら、本人の有効なトークンをすべて無効化する(安全側)
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    currentRefreshToken: string | undefined,
  ): Promise<void> {
    // 規則違反は DB を引く前に返す
    const policyViolation = checkPasswordPolicy(dto.newPassword);
    if (policyViolation) {
      throw new AppException('PASSWORD_POLICY_VIOLATION', HttpStatus.BAD_REQUEST, policyViolation);
    }

    const row = await this.authRepository.findUserWithPasswordHashById(userId);
    if (!row?.isActive) {
      throw new UnauthorizedException();
    }
    const currentPasswordMatched = await bcrypt.compare(dto.currentPassword, row.passwordHash);
    if (!currentPasswordMatched) {
      throw invalidCurrentPassword();
    }
    if (dto.newPassword === dto.currentPassword) {
      throw new AppException(
        'PASSWORD_POLICY_VIOLATION',
        HttpStatus.BAD_REQUEST,
        '現在のパスワードと異なるパスワードを入力してください。',
      );
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, BCRYPT_COST);
    const keepTokenHash =
      currentRefreshToken && REFRESH_TOKEN_PATTERN.test(currentRefreshToken)
        ? hashRefreshToken(currentRefreshToken)
        : null;
    const updated = await this.authRepository.updatePasswordAndRevokeOtherTokens({
      userId,
      oldPasswordHash: row.passwordHash,
      newPasswordHash,
      keepTokenHash,
      now: new Date(),
    });
    // 照合後に別の要求でパスワードが変わっていた場合は、照合したパスワードがもう正しくない
    if (!updated) {
      throw invalidCurrentPassword();
    }
  }

  // Refresh Token を回転する。トークンなし・形式不正・未知・期限切れ・無効化済み・ユーザー不在・無効アカウント・同時使用の負けは、理由を区別せず 401
  async refresh(refreshToken: string | undefined): Promise<RefreshResult> {
    if (!refreshToken || !REFRESH_TOKEN_PATTERN.test(refreshToken)) {
      throw new UnauthorizedException();
    }
    const now = new Date();
    const current = await this.authRepository.findValidRefreshToken(
      hashRefreshToken(refreshToken),
      now,
    );
    if (!current?.user.isActive) {
      throw new UnauthorizedException();
    }

    const newRefreshToken = randomBytes(32).toString('base64url');
    const rotated = await this.authRepository.rotateRefreshToken({
      oldTokenId: current.id,
      userId: current.user.id,
      newTokenHash: hashRefreshToken(newRefreshToken),
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
      now,
    });
    if (!rotated) {
      throw new UnauthorizedException();
    }

    const accessToken = await this.jwtService.signAsync({ sub: current.user.id });
    return { accessToken, refreshToken: newRefreshToken };
  }
}
