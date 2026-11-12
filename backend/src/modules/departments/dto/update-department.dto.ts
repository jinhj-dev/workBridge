import { z } from 'zod';
import {
  departmentCodeSchema,
  departmentDescriptionSchema,
  departmentManagerIdSchema,
  departmentNameSchema,
} from './department-fields.js';

// 変更する項目だけを送る(最低 1 項目。null も指定として扱う)
export const updateDepartmentSchema = z
  .object({
    code: departmentCodeSchema.optional(),
    name: departmentNameSchema.optional(),
    description: departmentDescriptionSchema.optional(),
    managerId: departmentManagerIdSchema.optional(),
  })
  .refine(
    (value) =>
      value.code !== undefined ||
      value.name !== undefined ||
      value.description !== undefined ||
      value.managerId !== undefined,
    { message: '変更する項目を指定してください。' },
  );

export type UpdateDepartmentDto = z.infer<typeof updateDepartmentSchema>;
