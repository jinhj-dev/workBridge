import { z } from 'zod';
import { paginationQuerySchema } from '../../../common/pagination/pagination.js';

export const DEPARTMENT_SORT_KEYS = ['code', 'name', 'memberCount', 'updatedAt'] as const;

export const adminDepartmentQuerySchema = paginationQuerySchema.extend({
  code: z.string().trim().max(20).optional(),
  name: z.string().trim().max(100).optional(),
  sort: z.enum(DEPARTMENT_SORT_KEYS).default('code'),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type AdminDepartmentQueryDto = z.infer<typeof adminDepartmentQuerySchema>;
