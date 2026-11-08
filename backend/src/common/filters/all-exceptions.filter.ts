import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppException } from '../exceptions/app.exception.js';
import type { ErrorResponseBody } from '../exceptions/app.exception.js';

// Nest 標準の例外を共通形式に変換するときの code と message
const STANDARD_ERRORS: Partial<Record<number, { code: string; message: string }>> = {
  [HttpStatus.BAD_REQUEST]: {
    code: 'VALIDATION_ERROR',
    message: 'リクエストの形式が正しくありません。',
  },
  [HttpStatus.UNAUTHORIZED]: { code: 'UNAUTHORIZED', message: '認証が必要です。' },
  [HttpStatus.FORBIDDEN]: { code: 'FORBIDDEN', message: 'この操作を行う権限がありません。' },
  [HttpStatus.NOT_FOUND]: { code: 'NOT_FOUND', message: '対象が見つかりません。' },
};

// すべての例外を { statusCode, code, message, details } の形式で返す
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const body = this.toBody(exception);
    if (body.statusCode >= 500) {
      // 内部情報はログにだけ残し、応答には含めない
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }
    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorResponseBody {
    if (exception instanceof AppException) {
      return exception.toBody();
    }
    if (exception instanceof HttpException && exception.getStatus() < 500) {
      const statusCode = exception.getStatus();
      const standard = STANDARD_ERRORS[statusCode] ?? {
        code: HttpStatus[statusCode] ?? 'HTTP_ERROR',
        message: 'リクエストを処理できませんでした。',
      };
      return { statusCode, ...standard, details: [] };
    }
    // 5xx の HttpException(503 等)は状態コードだけ残し、内容は隠す
    if (exception instanceof HttpException) {
      return {
        statusCode: exception.getStatus(),
        code: HttpStatus[exception.getStatus()] ?? 'INTERNAL_SERVER_ERROR',
        message: 'サーバーでエラーが発生しました。',
        details: [],
      };
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'サーバーでエラーが発生しました。',
      details: [],
    };
  }
}
