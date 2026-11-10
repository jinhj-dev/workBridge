import { adminDepartmentQuerySchema } from './admin-department-query.dto.js';
import { createDepartmentSchema } from './create-department.dto.js';
import { updateDepartmentSchema } from './update-department.dto.js';

describe('部署 DTO のスキーマ', () => {
  describe('createDepartmentSchema', () => {
    it.each([
      [' dev ', 'DEV'],
      ['dev-01', 'DEV-01'],
      ['A'.repeat(20), 'A'.repeat(20)],
    ])('shouldNormalizeCodeToUpperCaseWhenValid_%s', (input, expected) => {
      const result = createDepartmentSchema.parse({ code: input, name: '開発部' });
      expect(result.code).toBe(expected);
    });

    it.each([
      ['開発', 'Japanese characters'],
      ['a_b', 'underscore'],
      ['A'.repeat(21), 'too long'],
      ['', 'empty'],
      ['   ', 'blank after trim'],
    ])('shouldRejectCodeWhenInvalid_%s(%s)', (input) => {
      expect(createDepartmentSchema.safeParse({ code: input, name: '開発部' }).success).toBe(false);
    });

    it('shouldTrimNameBeforeLengthCheck', () => {
      const result = createDepartmentSchema.parse({ code: 'DEV', name: `  ${'a'.repeat(100)}  ` });
      expect(result.name).toHaveLength(100);
    });

    it('shouldRejectNameWhenBlankOr101Characters', () => {
      expect(createDepartmentSchema.safeParse({ code: 'DEV', name: '   ' }).success).toBe(false);
      expect(createDepartmentSchema.safeParse({ code: 'DEV', name: 'a'.repeat(101) }).success).toBe(
        false,
      );
    });
  });

  describe('updateDepartmentSchema', () => {
    it('shouldRejectEmptyObject', () => {
      expect(updateDepartmentSchema.safeParse({}).success).toBe(false);
    });

    it('shouldAcceptSingleField', () => {
      expect(updateDepartmentSchema.safeParse({ name: '営業部' }).success).toBe(true);
      expect(updateDepartmentSchema.parse({ code: ' sales ' })).toEqual({ code: 'SALES' });
    });
  });

  describe('adminDepartmentQuerySchema', () => {
    it('shouldRejectCodeLongerThan20Characters', () => {
      expect(adminDepartmentQuerySchema.safeParse({ code: 'A'.repeat(21) }).success).toBe(false);
    });

    it('shouldRejectLimitOver100', () => {
      expect(adminDepartmentQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    });
  });
});
