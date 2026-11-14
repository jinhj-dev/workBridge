import { Prisma } from '../../generated/prisma/client.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// driver adapter 経由の P2002(UNIQUE)・P2003(外部キー)から、違反した制約・インデックスの名前を取り出す。
// 該当しないエラーは undefined
export function violatedConstraintOf(error: unknown, code: 'P2002' | 'P2003'): string | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== code) {
    return undefined;
  }
  const adapterError = error.meta?.driverAdapterError;
  const cause = isRecord(adapterError) ? adapterError.cause : undefined;
  const constraint = isRecord(cause) ? cause.constraint : undefined;
  const index = isRecord(constraint) ? constraint.index : undefined;
  return typeof index === 'string' ? index : undefined;
}
