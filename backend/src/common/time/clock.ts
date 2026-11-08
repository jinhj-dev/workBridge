import { Injectable } from '@nestjs/common';

// 現在時刻の取得元。テストで時刻を固定できるよう、new Date() を直接使わずこれを注入する(docs/08 §3)
export abstract class Clock {
  abstract now(): Date;
}

// 実際の時刻を返す Clock
@Injectable()
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
