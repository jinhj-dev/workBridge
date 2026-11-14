// E2E が作成した社員・役職を削除する入口。開発 DB 専用(本番では実行できない)。
// 名前が「E2E社員」で始まり、E2E 専用メール形式で、固定アカウント・サンプル社員の社員番号ではない社員(勤怠・休暇・付与年休・Refresh Token を含む)と、「E2E役職」で始まり使用中でない役職を物理削除する。
// E2E 社員以外の休暇・勤怠が承認者・処理者・修正者として E2E 社員を参照している場合は、何も削除せず件数・社員番号を表示して exit 1 で中止する。
// 実行: npm run db:e2e-users-cleanup(DATABASE_URL が必要)
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { assertLocalDatabaseUrl, E2E_ACCOUNTS } from './e2e-account-data.js';
import { FIRST_EMP_NUMBER, SAMPLE_USER_COUNT } from './sample-users-data.js';

const E2E_USER_NAME_PREFIX = 'E2E社員';
const E2E_JOB_TITLE_NAME_PREFIX = 'E2E役職';
// E2E ヘルパー(createE2eUserThroughModal)は連絡先メールを「<Date.now()>@example.com」で登録する
const E2E_USER_EMAIL_PATTERN = /^\d{13}@example\.com$/;
const PROTECTED_EMP_IDS: ReadonlySet<string> = new Set([
  ...Object.values(E2E_ACCOUNTS).map((account) => account.empId),
  ...Array.from({ length: SAMPLE_USER_COUNT }, (_, index) => String(FIRST_EMP_NUMBER + index)),
]);

// 名前接頭辞だけでは既存社員を巻き込むため、E2E 専用のメール形式かつ保護対象外の社員番号に限定する
function isE2eCreatedUser(user: {
  name: string;
  empId: string;
  contactEmail: string | null;
}): boolean {
  return (
    user.name.startsWith(E2E_USER_NAME_PREFIX) &&
    user.contactEmail !== null &&
    E2E_USER_EMAIL_PATTERN.test(user.contactEmail) &&
    !PROTECTED_EMP_IDS.has(user.empId)
  );
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      '環境変数 DATABASE_URL が設定されていません。backend/.env に設定してください。',
    );
  }
  assertLocalDatabaseUrl(databaseUrl);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('本番環境では E2E 社員を削除できません。');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const candidates = await prisma.user.findMany({
      where: { name: { startsWith: E2E_USER_NAME_PREFIX } },
      select: { id: true, name: true, empId: true, contactEmail: true },
    });
    const users = candidates.filter(isE2eCreatedUser);
    const skipped = candidates.filter((user) => !isE2eCreatedUser(user));
    const userIds = users.map((user) => user.id);
    console.log(
      `削除対象の E2E 社員: ${users.length} 件 [${users.map((user) => user.empId).join(', ')}]`,
    );
    if (skipped.length > 0) {
      console.log(
        `名前は一致するが E2E 専用条件を満たさず削除しない社員: ${skipped.length} 件 [${skipped.map((user) => user.empId).join(', ')}]`,
      );
    }
    // 外部キーはすべて RESTRICT のため、参照する側から順に削除する
    const counts = await prisma.$transaction(async (tx) => {
      // E2E 社員以外の記録が E2E 社員を承認者・処理者・修正者として参照していたら、何も削除せず中止する
      // (参照を null にすると DB の CHECK 制約に違反するため、手動で確認してもらう)
      const foreignLeaves = await tx.leave.findMany({
        where: {
          userId: { notIn: userIds },
          OR: [{ approverId: { in: userIds } }, { processedBy: { in: userIds } }],
        },
        select: { user: { select: { empId: true } } },
      });
      const foreignAttendances = await tx.attendance.findMany({
        where: { userId: { notIn: userIds }, modifiedBy: { in: userIds } },
        select: { user: { select: { empId: true } } },
      });
      if (foreignLeaves.length + foreignAttendances.length > 0) {
        const empIdsOf = (rows: { user: { empId: string } }[]): string =>
          [...new Set(rows.map((row) => row.user.empId))].join(', ');
        throw new Error(
          `E2E 社員以外の記録が E2E 社員を参照しているため、何も削除せず中止しました。休暇: ${foreignLeaves.length} 件 [社員番号: ${empIdsOf(foreignLeaves)}]、勤怠: ${foreignAttendances.length} 件 [社員番号: ${empIdsOf(foreignAttendances)}]`,
        );
      }
      await tx.department.updateMany({
        where: { managerId: { in: userIds } },
        data: { managerId: null },
      });
      await tx.leave.deleteMany({ where: { userId: { in: userIds } } });
      await tx.attendance.deleteMany({ where: { userId: { in: userIds } } });
      await tx.leaveGrant.deleteMany({ where: { userId: { in: userIds } } });
      await tx.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      const deletedUsers = await tx.user.deleteMany({ where: { id: { in: userIds } } });
      // 使用中の役職(保護社員などが持つもの)は外部キー制約で全体が失敗しないよう削除しない
      const inUseJobTitles = await tx.jobTitle.findMany({
        where: { name: { startsWith: E2E_JOB_TITLE_NAME_PREFIX }, users: { some: {} } },
        select: { name: true },
      });
      const deletedJobTitles = await tx.jobTitle.deleteMany({
        where: { name: { startsWith: E2E_JOB_TITLE_NAME_PREFIX }, users: { none: {} } },
      });
      return {
        users: deletedUsers.count,
        jobTitles: deletedJobTitles.count,
        inUseJobTitleNames: inUseJobTitles.map((jobTitle) => jobTitle.name),
      };
    });
    if (counts.inUseJobTitleNames.length > 0) {
      console.log(
        `使用中のため削除しなかった E2E 役職: ${counts.inUseJobTitleNames.length} 件 [${counts.inUseJobTitleNames.join(', ')}]`,
      );
    }
    console.log(`E2E 社員を ${counts.users} 件、E2E 役職を ${counts.jobTitles} 件削除しました。`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('E2E 社員の削除に失敗しました:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
