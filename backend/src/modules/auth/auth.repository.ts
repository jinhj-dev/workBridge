import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const USER_SELECT = {
  id: true,
  name: true,
  empId: true,
  role: true,
  approvalRequired: true,
  isActive: true,
  mustChangePassword: true,
  department: { select: { name: true } },
} as const satisfies Prisma.UserSelect;

// 認証で扱うユーザー行。select の定義から型を導く
export type UserRow = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;
export type UserWithPasswordHashRow = UserRow & { passwordHash: string };

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ログイン用。パスワードハッシュを含むので、応答には使わないこと
  findUserByEmpId(empId: string): Promise<UserWithPasswordHashRow | null> {
    return this.prisma.user.findUnique({
      where: { empId },
      select: { ...USER_SELECT, passwordHash: true },
    });
  }

  findUserById(id: string): Promise<UserRow | null> {
    return this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  }

  // パスワード変更用。パスワードハッシュを含むので、応答には使わないこと
  findUserWithPasswordHashById(id: string): Promise<UserWithPasswordHashRow | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { ...USER_SELECT, passwordHash: true },
    });
  }

  // パスワードを更新し、keepTokenHash 以外の有効な Refresh Token をすべて無効化する。1 トランザクションで行う(docs/05 §3)。
  // 照合したハッシュから変わっていた(同時に別の変更が先に行われた等)なら何も変更せず false を返す
  async updatePasswordAndRevokeOtherTokens(params: {
    userId: string;
    oldPasswordHash: string;
    newPasswordHash: string;
    keepTokenHash: string | null;
    now: Date;
  }): Promise<boolean> {
    const { userId, oldPasswordHash, newPasswordHash, keepTokenHash, now } = params;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: { id: userId, passwordHash: oldPasswordHash },
        data: { passwordHash: newPasswordHash, mustChangePassword: false },
      });
      if (updated.count === 0) {
        return false;
      }
      await tx.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
          expiresAt: { gt: now },
          ...(keepTokenHash ? { NOT: { tokenHash: keepTokenHash } } : {}),
        },
        data: { revokedAt: now },
      });
      return true;
    });
  }

  // 期限切れ・無効化済みの行を削除し(docs/05 §3 の整理規則)、新しいトークンを登録する。1 トランザクションで行う
  async replaceRefreshToken(params: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<void> {
    const { userId, tokenHash, expiresAt, now } = params;
    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({
        where: { userId, OR: [{ revokedAt: { not: null } }, { expiresAt: { lte: now } }] },
      }),
      this.prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } }),
    ]);
  }

  // 本人のトークンで、まだ有効なものだけを無効化する
  async revokeRefreshToken(userId: string, tokenHash: string, now: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  // Refresh Token のハッシュから、有効(未無効化・未期限切れ)なトークンの id と所有ユーザーを引く
  async findValidRefreshToken(
    tokenHash: string,
    now: Date,
  ): Promise<{ id: string; user: UserRow } | null> {
    const row = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
      select: { id: true, user: { select: USER_SELECT } },
    });
    return row;
  }

  // 回転: 使ったトークンの無効化と新トークンの登録を同じトランザクションで行う(docs/05 §3)。
  // 条件付き UPDATE が 0 件(同時に別の要求が先に使った等)なら何も登録せず false を返す
  async rotateRefreshToken(params: {
    oldTokenId: string;
    userId: string;
    newTokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<boolean> {
    const { oldTokenId, userId, newTokenHash, expiresAt, now } = params;
    return this.prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.updateMany({
        where: { id: oldTokenId, revokedAt: null, expiresAt: { gt: now } },
        data: { revokedAt: now },
      });
      if (revoked.count === 0) {
        return false;
      }
      await tx.refreshToken.create({ data: { userId, tokenHash: newTokenHash, expiresAt } });
      return true;
    });
  }
}
