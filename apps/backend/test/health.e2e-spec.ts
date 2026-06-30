// apps/backend/test/health.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, Controller, Get, Module } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');

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
