import { HttpStatus, StandardSchemaValidationPipe } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { AppException } from '../exceptions/app.exception.js';

// 検証エラーを VALIDATION_ERROR と項目別の details に変換する
export function toValidationException(issues: readonly StandardSchemaV1.Issue[]): AppException {
  const details = issues.map((issue) => ({
    field: (issue.path ?? [])
      .map((segment) => String(typeof segment === 'object' ? segment.key : segment))
      .join('.'),
    message: issue.message,
  }));
  return new AppException(
    'VALIDATION_ERROR',
    HttpStatus.BAD_REQUEST,
    '入力内容に誤りがあります。',
    details,
  );
}

// zod スキーマで入力を検証する。スキーマにないキーは zod が取り除く。
export function createValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({ exceptionFactory: toValidationException });
}
