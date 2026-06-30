// apps/backend/test/auth-audit.e2e-spec.ts
import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');
import { AppModule } from '../src/app.module';

describe('Auth Audit (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Obtain admin token for querying /audit
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: process.env.PANEL_ADMIN_USER, password: process.env.PANEL_ADMIN_PASS });
    adminToken = res.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('wrong password → 401 and login_failed audit row with attempted username', async () => {
    const attemptedUsername = process.env.PANEL_ADMIN_USER as string;

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: attemptedUsername, password: 'wrongpassword_audit_test' })
      .expect(401);

    // Give a brief moment for async audit write (record() is awaited, but just in case)
    await new Promise(r => setTimeout(r, 100));

    const auditRes = await request(app.getHttpServer())
      .get('/audit?action=login_failed&limit=10')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const rows: any[] = auditRes.body.rows;
    const failRow = rows.find((r: any) => r.action === 'login_failed' && r.username === attemptedUsername);
    expect(failRow).toBeDefined();
    expect(failRow.result).toBe('failure');
  });

  it('correct login → 200 and login success audit row', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: process.env.PANEL_ADMIN_USER, password: process.env.PANEL_ADMIN_PASS })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();

    await new Promise(r => setTimeout(r, 100));

    const auditRes = await request(app.getHttpServer())
      .get('/audit?action=login&limit=10')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const rows: any[] = auditRes.body.rows;
    const successRow = rows.find((r: any) => r.action === 'login' && r.result === 'success' && r.username === process.env.PANEL_ADMIN_USER);
    expect(successRow).toBeDefined();
    expect(successRow.userId).toBeTruthy();
  });
});
