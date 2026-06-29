// apps/backend/test/health.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, Controller, Get, Module } from '@nestjs/common';
import * as request from 'supertest';

@Controller('health')
class HealthController { @Get() ok() { return { status: 'ok' }; } }
@Module({ controllers: [HealthController] })
class HealthModule {}

describe('Health', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [HealthModule] }).compile();
    app = mod.createNestApplication(); await app.init();
  });
  afterAll(() => app.close());
  it('GET /health → ok', () =>
    request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' }));
});
