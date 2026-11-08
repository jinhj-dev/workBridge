import { z } from 'zod';

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

// ページネーションのクエリ(docs/06 §0)。クエリ文字列を数値に変換して検証する
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

// ページネーション応答の共通形式
export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export function toPage<T>(items: T[], totalCount: number, page: number, limit: number): Page<T> {
  return { items, page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) };
}

// Prisma の skip / take に変換する
export function toSkipTake(query: PaginationQuery): { skip: number; take: number } {
  return { skip: (query.page - 1) * query.limit, take: query.limit };
}
