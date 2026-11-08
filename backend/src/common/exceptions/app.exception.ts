import { HttpException, HttpStatus } from '@nestjs/common';

// 入力検証エラーなどの項目別の理由
export interface ErrorDetail {
  field: string;
  message: string;
}

// すべての API エラー応答の共通形式(docs/06 の「共通 Error Response」)
export interface ErrorResponseBody {
  statusCode: number;
  code: string;
  message: string;
  details: ErrorDetail[];
}

// 業務エラーを投げるための例外。code はクライアントが分岐に使う。
export class AppException extends HttpException {
  constructor(
    readonly code: string,
    status: HttpStatus,
    message: string,
    readonly details: ErrorDetail[] = [],
  ) {
    super(message, status);
  }

  toBody(): ErrorResponseBody {
    return {
      statusCode: this.getStatus(),
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
