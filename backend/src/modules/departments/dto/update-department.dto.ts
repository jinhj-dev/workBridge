import { z } from 'zod';
import { departmentCodeSchema, departmentNameSchema } from './department-fields.js';

// 変更する項目だけを送る(最低 1 項目)
export const updateDepartmentSchema = z
  .object({
    code: departmentCodeSchema.optional(),
    name: departmentNameSchema.optional(),
  })
  .refine((value) => value.code !== undefined || value.name !== undefined, {
    message: '変更する項目を指定してください。',
  });

export type UpdateDepartmentDto = z.infer<typeof updateDepartmentSchema>;
