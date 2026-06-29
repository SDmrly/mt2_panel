// apps/backend/test/auth.e2e-spec.ts
import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login with correct creds → 200 + tokens + user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: process.env.PANEL_ADMIN_USER, password: process.env.PANEL_ADMIN_PASS })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBeDefined();
    expect(res.body.user.username).toBe(process.env.PANEL_ADMIN_USER);
    expect(res.body.user.role).toBeDefined();

    accessToken = res.body.accessToken;
  });

  it('POST /auth/login with wrong password → 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: process.env.PANEL_ADMIN_USER, password: 'wrongpassword' })
      .expect(401);
  });

  it('GET /auth/me with Bearer → 200 {id, username, role}', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.id).toBeDefined();
    expect(res.body.username).toBe(process.env.PANEL_ADMIN_USER);
    expect(res.body.role).toBeDefined();
  });

  it('GET /auth/me without token → 401', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(401);
  });
});
