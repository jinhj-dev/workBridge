import { z } from 'zod';
import { paginationQuerySchema } from '../../../common/pagination/pagination.js';

export const adminDepartmentQuerySchema = paginationQuerySchema.extend({
  code: z.string().trim().max(20).optional(),
  name: z.string().trim().max(100).optional(),
});

export type AdminDepartmentQueryDto = z.infer<typeof adminDepartmentQuerySchema>;
