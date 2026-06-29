// apps/backend/src/main.ts
import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { loadConfig } from './config/config';
import { LogSanitizeInterceptor } from './common/interceptors/log-sanitize.interceptor';

async function bootstrap() {
  const cfg = loadConfig();
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new LogSanitizeInterceptor());
  app.enableCors({ origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map(s => s.trim()), credentials: true });
  await app.listen(cfg.backendPort);
}
bootstrap().catch((err) => { console.error(err); process.exit(1); });
