import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator.js';
import { HealthService } from './health.service.js';

// 稼働確認用。フロントエンドからの疎通と DB 接続の確認に使う。
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): Promise<{ status: 'ok' }> {
    return this.healthService.check();
  }
}
