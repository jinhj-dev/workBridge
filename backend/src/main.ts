// .env を最初に読み込む(他のモジュールより先に評価させるため先頭に置く)
import 'dotenv/config';
import './config/zod-locale.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ENV } from './config/env.js';
import type { Env } from './config/env.js';
import { configureApp } from './configure-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  app.enableShutdownHooks();
  // 外部からの直接アクセスを避け、ローカル(Next.js の転送)からだけ受け付ける
  await app.listen(app.get<Env>(ENV).PORT, '127.0.0.1');
}
await bootstrap();
