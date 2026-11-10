import { z } from 'zod';
import { departmentCodeSchema, departmentNameSchema } from './department-fields.js';

export const createDepartmentSchema = z.object({
  code: departmentCodeSchema,
  name: departmentNameSchema,
});

export type CreateDepartmentDto = z.infer<typeof createDepartmentSchema>;
