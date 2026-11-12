import { z } from 'zod';
import {
  departmentCodeSchema,
  departmentDescriptionSchema,
  departmentManagerIdSchema,
  departmentNameSchema,
} from './department-fields.js';

export const createDepartmentSchema = z.object({
  code: departmentCodeSchema,
  name: departmentNameSchema,
  description: departmentDescriptionSchema.optional(),
  managerId: departmentManagerIdSchema.optional(),
});

export type CreateDepartmentDto = z.infer<typeof createDepartmentSchema>;
