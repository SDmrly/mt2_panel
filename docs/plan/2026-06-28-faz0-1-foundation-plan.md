# MT2 Panel — Faz 0 + Faz 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Çalışan bir yönetim paneli: panel kullanıcısı giriş yapar, Docker Desktop'taki gerçek MT2 container'larını (auth/db/channel/database/haproxy/quest-compiler) dinamik olarak listeler, health/stats görür, restart/stop yapar.

**Architecture:** npm workspaces monorepo. NestJS backend (TypeORM+Postgres, Redis, Dockerode via socket-proxy, JWT auth). React+Vite frontend (TanStack Query, Zustand, shadcn). Dev'de panel kodu host'ta hot-reload; sadece postgres+redis+socket-proxy Docker'da. Servis keşfi `com.docker.compose.service` label + `Config.Env` (MT2_ROLE/CHANNEL) üzerinden.

**Tech Stack:** NestJS 10, TypeORM 0.3, PostgreSQL 16, Redis 7 (ioredis), Dockerode 4, @nestjs/jwt + passport-jwt, bcrypt, React 18, Vite 5, Tailwind 3, shadcn/ui, TanStack Query 5, Zustand 4, React Router 6, axios, Recharts 2. Tests: Jest (backend), Vitest + React Testing Library (frontend).

## Global Constraints

- Node 20+ LTS.
- Tek kök `.env`; tüm servisler okur. `.env` commit'lenmez, `.env.example` commit'lenir.
- Şifre hash: **bcrypt** (panel kullanıcıları). SHA-256 KULLANILMAZ (o sadece oyun DB içindi, bu fazda yok).
- Token **in-memory** (Zustand). `localStorage` YASAK. Token URL'de/query'de YASAK; sadece `Authorization: Bearer`.
- Docker erişimi her zaman **socket-proxy** üzerinden (`DOCKER_HOST`). Doğrudan socket'e bağlanılmaz. socket-proxy `EXEC=0`, `BUILD=0`.
- Servis keşfi sabit liste TUTMAZ; `com.docker.compose.project == MT2_PROJECT` filtresi + `com.docker.compose.service` label + `Config.Env`.
- Compose proje adı dev'de: `metin2-svfiles`.
- **Git: commit/push YAPMA** — kullanıcı git/GitHub'ı kendisi yönetir. Aşağıdaki "Commit" adımları kullanıcı içindir; sen `git commit` çalıştırma, sadece adımı işaretle ve kullanıcıya bırak.
- Write işlemleri (restart/stop) `operator` ve `admin` rollerine açık; `viewer` reddedilir.

---

## File Structure

```
mt2-panel/
├── package.json                         # workspaces: apps/*
├── .gitignore
├── .env.example
├── infra/
│   └── docker-compose.dev.yml           # postgres, redis, socket-proxy
├── apps/
│   ├── backend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/config.ts                 # env okuma + validation
│   │   │   ├── database/
│   │   │   │   ├── data-source.ts               # TypeORM CLI datasource
│   │   │   │   ├── entities/panel-user.entity.ts
│   │   │   │   ├── migrations/                   # generated
│   │   │   │   └── seed.ts                       # admin seed
│   │   │   ├── redis/redis.module.ts            # ioredis provider
│   │   │   ├── common/
│   │   │   │   └── interceptors/log-sanitize.interceptor.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── hash.service.ts
│   │   │   │   ├── token-blacklist.service.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── dto/login.dto.ts
│   │   │   │   ├── decorators/roles.decorator.ts
│   │   │   │   └── guards/{jwt-auth.guard.ts,roles.guard.ts}
│   │   │   └── containers/
│   │   │       ├── containers.module.ts
│   │   │       ├── docker.provider.ts            # Dockerode factory
│   │   │       ├── service-role.ts               # resolveRole (pure)
│   │   │       ├── containers.service.ts         # discovery, stats, health, actions
│   │   │       ├── containers.controller.ts
│   │   │       └── types.ts                      # ServiceCard, ServiceRole
│   │   └── test/                                  # jest e2e
│   └── frontend/
│       ├── package.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx                            # router
│           ├── lib/{api.ts,queryClient.ts}
│           ├── store/auth.ts                      # zustand
│           ├── types/service.ts
│           ├── components/
│           │   ├── ui/                            # shadcn
│           │   ├── ProtectedRoute.tsx
│           │   ├── ServiceCard.tsx
│           │   ├── HealthChain.tsx
│           │   └── ConfirmModal.tsx
│           ├── hooks/{useServices.ts,useServiceStats.ts}
│           └── pages/{Login.tsx,Dashboard.tsx,Services.tsx,ServiceDetail.tsx}
```

---

## Task 1: Monorepo iskeleti + .env.example + .gitignore

**Files:**
- Create: `package.json`, `.gitignore`, `.env.example`

**Interfaces:**
- Produces: npm workspaces (`apps/*`); scriptler `dev`, `dev:be`, `dev:fe`.

- [ ] **Step 1: Kök `package.json` oluştur**

```json
{
  "name": "mt2-panel",
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev:be": "npm run start:dev --workspace apps/backend",
    "dev:fe": "npm run dev --workspace apps/frontend",
    "infra:up": "docker compose -f infra/docker-compose.dev.yml --env-file .env up -d",
    "infra:down": "docker compose -f infra/docker-compose.dev.yml down"
  }
}
```

- [ ] **Step 2: `.gitignore` oluştur**

```gitignore
node_modules/
dist/
.env
*.log
apps/*/dist/
coverage/
```

- [ ] **Step 3: `.env.example` oluştur**

```bash
# App
NODE_ENV=development
BACKEND_PORT=3001
# Frontend
VITE_API_URL=http://localhost:3001
# JWT  (üret: openssl rand -hex 64)
JWT_SECRET=REPLACE_WITH_64_CHAR_RANDOM_STRING
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800
# Panel admin seed
PANEL_ADMIN_USER=admin
PANEL_ADMIN_PASS=REPLACE_ME
# Postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=panel_db
POSTGRES_USER=panel
POSTGRES_PASSWORD=REPLACE_WITH_DB_PASSWORD
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
# Docker (socket-proxy)
DOCKER_HOST=tcp://localhost:2375
MT2_PROJECT=metin2-svfiles
# Logging
LOG_LEVEL=info
```

- [ ] **Step 4: `.env` oluştur (kopya + gerçek değerler)**

Run: `cp .env.example .env` ardından `JWT_SECRET`, `PANEL_ADMIN_PASS`, `POSTGRES_PASSWORD` doldur.
Expected: `.env` var, `.gitignore`'da listeli.

- [ ] **Step 5: Commit** *(kullanıcı yapar — sen çalıştırma)*

```bash
git add package.json .gitignore .env.example
git commit -m "chore: monorepo skeleton + env template"
```

---

## Task 2: Dev altyapı compose (postgres + redis + socket-proxy)

**Files:**
- Create: `infra/docker-compose.dev.yml`

**Interfaces:**
- Produces: `localhost:5432` (postgres), `localhost:6379` (redis), `localhost:2375` (socket-proxy → Docker API).

- [ ] **Step 1: Compose dosyasını yaz**

```yaml
# infra/docker-compose.dev.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports: ["5432:5432"]
    volumes: ["panel-pg:/var/lib/postgresql/data"]
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: ["panel-redis:/data"]
    restart: unless-stopped

  socket-proxy:
    image: tecnativa/docker-socket-proxy:latest
    environment:
      CONTAINERS: 1
      IMAGES: 1
      INFO: 1
      NETWORKS: 1
      SERVICES: 1
      TASKS: 1
      VOLUMES: 1
      POST: 1
      EXEC: 0
      BUILD: 0
      SWARM: 0
      AUTH: 0
      SECRETS: 0
    ports: ["2375:2375"]
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped

volumes:
  panel-pg:
  panel-redis:
```

- [ ] **Step 2: Ayağa kaldır ve doğrula**

Run: `npm run infra:up` sonra `docker compose -f infra/docker-compose.dev.yml ps`
Expected: 3 servis `running`.

- [ ] **Step 3: socket-proxy'nin gerçek container'ları gördüğünü doğrula**

Run: `curl http://localhost:2375/v1.41/containers/json?all=true` (PowerShell: `curl.exe ...`)
Expected: JSON, içinde `metin2-svfiles-metin2_auth-1` vb. isimler var.

- [ ] **Step 4: Commit** *(kullanıcı yapar)*

```bash
git add infra/docker-compose.dev.yml
git commit -m "chore: dev infra (postgres, redis, socket-proxy)"
```

---

## Task 3: NestJS backend iskeleti + config

**Files:**
- Create: `apps/backend/package.json`, `tsconfig.json`, `nest-cli.json`, `src/main.ts`, `src/app.module.ts`, `src/config/config.ts`

**Interfaces:**
- Produces: `loadConfig()` → typed config nesnesi; `GET /health` → `{status:'ok'}`.

- [ ] **Step 1: Backend'i scaffold et**

Run (kök dizinde):
```bash
npm i -D -w apps/backend @nestjs/cli
npx -w apps/backend nest new apps/backend --skip-git --package-manager npm --strict
```
Alternatif (CLI sorun çıkarırsa) elle: `apps/backend/package.json`:
```json
{
  "name": "backend",
  "scripts": {
    "start:dev": "nest start --watch",
    "build": "nest build",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "typeorm": "typeorm-ts-node-commonjs -d src/database/data-source.ts",
    "seed": "ts-node src/database/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10", "@nestjs/core": "^10", "@nestjs/platform-express": "^10",
    "@nestjs/config": "^3", "@nestjs/jwt": "^10", "@nestjs/passport": "^10",
    "@nestjs/typeorm": "^10", "typeorm": "^0.3", "pg": "^8",
    "passport": "^0.7", "passport-jwt": "^4", "bcrypt": "^5", "ioredis": "^5",
    "dockerode": "^4", "class-validator": "^0.14", "class-transformer": "^0.5",
    "reflect-metadata": "^0.2", "rxjs": "^7"
  },
  "devDependencies": {
    "@nestjs/cli": "^10", "@nestjs/testing": "^10", "@nestjs/schematics": "^10",
    "@types/bcrypt": "^5", "@types/dockerode": "^3", "@types/passport-jwt": "^4",
    "@types/node": "^20", "@types/jest": "^29", "@types/supertest": "^6",
    "jest": "^29", "ts-jest": "^29", "ts-node": "^10", "supertest": "^6",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: `config/config.ts` yaz**

```typescript
// apps/backend/src/config/config.ts
export interface AppConfig {
  backendPort: number;
  jwt: { secret: string; accessTtl: number; refreshTtl: number };
  adminSeed: { user: string; pass: string };
  postgres: { host: string; port: number; db: string; user: string; password: string };
  redis: { host: string; port: number; password?: string };
  dockerHost: string;
  mt2Project: string;
}

export function loadConfig(): AppConfig {
  const req = (k: string): string => {
    const v = process.env[k];
    if (!v) throw new Error(`Missing env: ${k}`);
    return v;
  };
  return {
    backendPort: Number(process.env.BACKEND_PORT ?? 3001),
    jwt: {
      secret: req('JWT_SECRET'),
      accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
      refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 604800),
    },
    adminSeed: { user: req('PANEL_ADMIN_USER'), pass: req('PANEL_ADMIN_PASS') },
    postgres: {
      host: req('POSTGRES_HOST'), port: Number(process.env.POSTGRES_PORT ?? 5432),
      db: req('POSTGRES_DB'), user: req('POSTGRES_USER'), password: req('POSTGRES_PASSWORD'),
    },
    redis: { host: req('REDIS_HOST'), port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined },
    dockerHost: req('DOCKER_HOST'),
    mt2Project: req('MT2_PROJECT'),
  };
}
```

- [ ] **Step 3: `app.module.ts` ve `main.ts` (env kök .env'den, CORS, validation)**

```typescript
// apps/backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' })],
})
export class AppModule {}
```
```typescript
// apps/backend/src/main.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { loadConfig } from './config/config';

async function bootstrap() {
  const cfg = loadConfig();
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: ['http://localhost:5173'], credentials: true });
  await app.listen(cfg.backendPort);
}
bootstrap();
```

- [ ] **Step 4: `GET /health` testi yaz (e2e)**

```typescript
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
```

Gerçek `HealthController`'ı `src/app.module.ts`'e ekle (yukarıdaki controller'ı `src/health.controller.ts` olarak çıkar ve `controllers: [HealthController]`).

- [ ] **Step 5: Testi çalıştır**

Run: `npm test --workspace apps/backend -- health`
Expected: PASS.

- [ ] **Step 6: Commit** *(kullanıcı yapar)*

```bash
git add apps/backend
git commit -m "feat(be): nest skeleton + config + health"
```

---

## Task 4: TypeORM + panel_users entity + migration + admin seed

**Files:**
- Create: `src/database/entities/panel-user.entity.ts`, `src/database/data-source.ts`, `src/database/seed.ts`
- Modify: `src/app.module.ts` (TypeOrmModule)

**Interfaces:**
- Produces: `PanelUser` entity (`id, username, passwordHash, role, totpSecret, totpEnabled, createdAt, lastLogin`); `PanelRole = 'admin'|'operator'|'viewer'`.

- [ ] **Step 1: Entity yaz**

```typescript
// apps/backend/src/database/entities/panel-user.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
export type PanelRole = 'admin' | 'operator' | 'viewer';

@Entity('panel_users')
export class PanelUser {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) username!: string;
  @Column({ name: 'password_hash' }) passwordHash!: string;
  @Column({ type: 'varchar', default: 'viewer' }) role!: PanelRole;
  @Column({ name: 'totp_secret', type: 'varchar', nullable: true }) totpSecret!: string | null;
  @Column({ name: 'totp_enabled', default: false }) totpEnabled!: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @Column({ name: 'last_login', type: 'timestamptz', nullable: true }) lastLogin!: Date | null;
}
```

- [ ] **Step 2: `data-source.ts` (CLI + app ortak)**

```typescript
// apps/backend/src/database/data-source.ts
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { PanelUser } from './entities/panel-user.entity';
dotenv.config({ path: '../../.env' });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [PanelUser],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
```

- [ ] **Step 3: `app.module.ts`'e TypeOrmModule ekle**

```typescript
// app.module.ts imports'a ekle:
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [PanelUser],
  synchronize: false,
}),
```

- [ ] **Step 4: Migration üret ve çalıştır**

Run:
```bash
npm run typeorm --workspace apps/backend -- migration:generate src/database/migrations/Init
npm run typeorm --workspace apps/backend -- migration:run
```
Expected: `panel_users` tablosu oluştu (`docker exec ... psql -c '\dt'` ile doğrula).

- [ ] **Step 5: `seed.ts` yaz (admin yoksa oluştur)**

```typescript
// apps/backend/src/database/seed.ts
import { AppDataSource } from './data-source';
import { PanelUser } from './entities/panel-user.entity';
import * as bcrypt from 'bcrypt';

async function run() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(PanelUser);
  const user = process.env.PANEL_ADMIN_USER!;
  const exists = await repo.findOne({ where: { username: user } });
  if (!exists) {
    await repo.save(repo.create({
      username: user,
      passwordHash: await bcrypt.hash(process.env.PANEL_ADMIN_PASS!, 10),
      role: 'admin',
    }));
    console.log(`Seeded admin: ${user}`);
  } else { console.log('Admin already exists'); }
  await AppDataSource.destroy();
}
run();
```

- [ ] **Step 6: Seed çalıştır ve doğrula**

Run: `npm run seed --workspace apps/backend`
Expected: "Seeded admin: admin"; tekrar çalıştırınca "Admin already exists".

- [ ] **Step 7: Commit** *(kullanıcı yapar)*

```bash
git add apps/backend/src/database
git commit -m "feat(be): panel_users entity, migration, admin seed"
```

---

## Task 5: HashService (bcrypt) — TDD

**Files:**
- Create: `src/auth/hash.service.ts`, `src/auth/hash.service.spec.ts`

**Interfaces:**
- Produces: `HashService.hash(plain): Promise<string>`, `HashService.verify(plain, hash): Promise<boolean>`.

- [ ] **Step 1: Failing test yaz**

```typescript
// apps/backend/src/auth/hash.service.spec.ts
import { HashService } from './hash.service';
describe('HashService', () => {
  const svc = new HashService();
  it('hash + verify doğru şifreyi kabul eder', async () => {
    const h = await svc.hash('Secret123!');
    expect(h).not.toEqual('Secret123!');
    expect(await svc.verify('Secret123!', h)).toBe(true);
  });
  it('yanlış şifreyi reddeder', async () => {
    const h = await svc.hash('Secret123!');
    expect(await svc.verify('wrong', h)).toBe(false);
  });
});
```

- [ ] **Step 2: Testi çalıştır → FAIL**

Run: `npm test --workspace apps/backend -- hash`
Expected: FAIL ("Cannot find module './hash.service'").

- [ ] **Step 3: Implementasyon**

```typescript
// apps/backend/src/auth/hash.service.ts
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
@Injectable()
export class HashService {
  hash(plain: string): Promise<string> { return bcrypt.hash(plain, 10); }
  verify(plain: string, hash: string): Promise<boolean> { return bcrypt.compare(plain, hash); }
}
```

- [ ] **Step 4: Testi çalıştır → PASS**

Run: `npm test --workspace apps/backend -- hash`
Expected: PASS.

- [ ] **Step 5: Commit** *(kullanıcı yapar)*

```bash
git add apps/backend/src/auth/hash.service.ts apps/backend/src/auth/hash.service.spec.ts
git commit -m "feat(be): bcrypt hash service"
```

---

## Task 6: Redis modülü + TokenBlacklistService

**Files:**
- Create: `src/redis/redis.module.ts`, `src/auth/token-blacklist.service.ts`, `src/auth/token-blacklist.service.spec.ts`

**Interfaces:**
- Consumes: ioredis client (provider token `REDIS`).
- Produces: `TokenBlacklistService.blacklist(jti, ttlSec)`, `.isBlacklisted(jti): Promise<boolean>`; `RefreshStore.save(jti, userId, ttl)`, `.get(jti)`, `.revoke(jti)`.

- [ ] **Step 1: Redis provider**

```typescript
// apps/backend/src/redis/redis.module.ts
import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
export const REDIS = 'REDIS';
@Global()
@Module({
  providers: [{
    provide: REDIS,
    useFactory: () => new Redis({
      host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
    }),
  }],
  exports: [REDIS],
})
export class RedisModule {}
```

- [ ] **Step 2: Failing test (ioredis-mock ile)**

Run: `npm i -D -w apps/backend ioredis-mock @types/ioredis-mock`
```typescript
// apps/backend/src/auth/token-blacklist.service.spec.ts
import RedisMock from 'ioredis-mock';
import { TokenBlacklistService } from './token-blacklist.service';
describe('TokenBlacklistService', () => {
  it('blacklist edilen jti isBlacklisted=true döner', async () => {
    const svc = new TokenBlacklistService(new RedisMock() as any);
    await svc.blacklist('jti-1', 60);
    expect(await svc.isBlacklisted('jti-1')).toBe(true);
    expect(await svc.isBlacklisted('jti-2')).toBe(false);
  });
});
```

- [ ] **Step 3: Çalıştır → FAIL** — Run: `npm test --workspace apps/backend -- token-blacklist` → FAIL.

- [ ] **Step 4: Implementasyon**

```typescript
// apps/backend/src/auth/token-blacklist.service.ts
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS } from '../redis/redis.module';
@Injectable()
export class TokenBlacklistService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}
  async blacklist(jti: string, ttlSec: number) { await this.redis.set(`bl:${jti}`, '1', 'EX', ttlSec); }
  async isBlacklisted(jti: string) { return (await this.redis.exists(`bl:${jti}`)) === 1; }
  async saveRefresh(jti: string, userId: string, ttlSec: number) { await this.redis.set(`rt:${jti}`, userId, 'EX', ttlSec); }
  async getRefresh(jti: string) { return this.redis.get(`rt:${jti}`); }
  async revokeRefresh(jti: string) { await this.redis.del(`rt:${jti}`); }
}
```

- [ ] **Step 5: Çalıştır → PASS** — Run: `npm test --workspace apps/backend -- token-blacklist` → PASS.

- [ ] **Step 6: Commit** *(kullanıcı yapar)* — `git commit -m "feat(be): redis module + token blacklist/refresh store"`

---

## Task 7: Auth modülü — login/refresh/logout + JWT strategy + DTO

**Files:**
- Create: `src/auth/dto/login.dto.ts`, `src/auth/jwt.strategy.ts`, `src/auth/auth.service.ts`, `src/auth/auth.controller.ts`, `src/auth/auth.module.ts`, `src/auth/auth.service.spec.ts`
- Modify: `src/app.module.ts` (AuthModule, RedisModule import)

**Interfaces:**
- Consumes: `HashService`, `TokenBlacklistService`, `PanelUser` repo, `JwtService`.
- Produces:
  - `POST /auth/login {username,password}` → `{accessToken, refreshToken, user:{id,username,role}}`
  - `POST /auth/refresh {refreshToken}` → `{accessToken}`
  - `POST /auth/logout` (Bearer) → `204`
  - `GET /auth/me` (Bearer) → `{id,username,role}`
  - JWT payload: `{sub, username, role, jti}`.

- [ ] **Step 1: DTO**

```typescript
// apps/backend/src/auth/dto/login.dto.ts
import { IsString, MinLength } from 'class-validator';
export class LoginDto {
  @IsString() @MinLength(1) username!: string;
  @IsString() @MinLength(1) password!: string;
}
```

- [ ] **Step 2: AuthService failing test (repo + deps mock)**

```typescript
// apps/backend/src/auth/auth.service.spec.ts
import { AuthService } from './auth.service';
import { HashService } from './hash.service';
import { UnauthorizedException } from '@nestjs/common';

const user = { id: 'u1', username: 'admin', role: 'admin', passwordHash: '' };
const repo = () => ({ findOne: jest.fn(), update: jest.fn() }) as any;
const jwt = () => ({ signAsync: jest.fn().mockResolvedValue('tok'), verifyAsync: jest.fn() }) as any;
const bl = () => ({ saveRefresh: jest.fn(), blacklist: jest.fn(), isBlacklisted: jest.fn() }) as any;

describe('AuthService.login', () => {
  it('doğru şifrede token döner', async () => {
    const hash = new HashService(); user.passwordHash = await hash.hash('pw');
    const r = repo(); r.findOne.mockResolvedValue({ ...user });
    const svc = new AuthService(r, hash, jwt(), bl(), { secret: 's', accessTtl: 900, refreshTtl: 604800 } as any);
    const res = await svc.login({ username: 'admin', password: 'pw' });
    expect(res.accessToken).toBe('tok');
    expect(res.user.username).toBe('admin');
  });
  it('yanlış şifrede UnauthorizedException', async () => {
    const hash = new HashService(); const r = repo();
    r.findOne.mockResolvedValue({ ...user, passwordHash: await hash.hash('other') });
    const svc = new AuthService(r, hash, jwt(), bl(), { secret: 's', accessTtl: 900, refreshTtl: 604800 } as any);
    await expect(svc.login({ username: 'admin', password: 'pw' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('kullanıcı yoksa UnauthorizedException', async () => {
    const r = repo(); r.findOne.mockResolvedValue(null);
    const svc = new AuthService(r, new HashService(), jwt(), bl(), { secret: 's', accessTtl: 900, refreshTtl: 604800 } as any);
    await expect(svc.login({ username: 'x', password: 'y' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
```

- [ ] **Step 3: Çalıştır → FAIL** — Run: `npm test --workspace apps/backend -- auth.service` → FAIL.

- [ ] **Step 4: AuthService implementasyonu**

```typescript
// apps/backend/src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { PanelUser } from '../database/entities/panel-user.entity';
import { HashService } from './hash.service';
import { TokenBlacklistService } from './token-blacklist.service';

interface JwtCfg { secret: string; accessTtl: number; refreshTtl: number; }

@Injectable()
export class AuthService {
  constructor(
    private readonly users: Repository<PanelUser>,
    private readonly hash: HashService,
    private readonly jwt: JwtService,
    private readonly bl: TokenBlacklistService,
    private readonly cfg: JwtCfg,
  ) {}

  async login(dto: { username: string; password: string }) {
    const u = await this.users.findOne({ where: { username: dto.username } });
    if (!u || !(await this.hash.verify(dto.password, u.passwordHash))) {
      throw new UnauthorizedException('Kullanıcı adı veya şifre hatalı');
    }
    await this.users.update(u.id, { lastLogin: new Date() });
    return this.issueTokens(u);
  }

  private async issueTokens(u: PanelUser) {
    const accessJti = randomUUID(), refreshJti = randomUUID();
    const base = { sub: u.id, username: u.username, role: u.role };
    const accessToken = await this.jwt.signAsync({ ...base, jti: accessJti },
      { secret: this.cfg.secret, expiresIn: this.cfg.accessTtl });
    const refreshToken = await this.jwt.signAsync({ ...base, jti: refreshJti, typ: 'refresh' },
      { secret: this.cfg.secret, expiresIn: this.cfg.refreshTtl });
    await this.bl.saveRefresh(refreshJti, u.id, this.cfg.refreshTtl);
    return { accessToken, refreshToken, user: { id: u.id, username: u.username, role: u.role } };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try { payload = await this.jwt.verifyAsync(refreshToken, { secret: this.cfg.secret }); }
    catch { throw new UnauthorizedException('Geçersiz refresh token'); }
    if (payload.typ !== 'refresh' || !(await this.bl.getRefresh(payload.jti)))
      throw new UnauthorizedException('Refresh token geçersiz');
    const accessToken = await this.jwt.signAsync(
      { sub: payload.sub, username: payload.username, role: payload.role, jti: randomUUID() },
      { secret: this.cfg.secret, expiresIn: this.cfg.accessTtl });
    return { accessToken };
  }

  async logout(jti: string) { await this.bl.blacklist(jti, this.cfg.accessTtl); }
}
```

- [ ] **Step 5: Çalıştır → PASS** — Run: `npm test --workspace apps/backend -- auth.service` → PASS.

- [ ] **Step 6: JWT strategy (blacklist kontrolü dahil)**

```typescript
// apps/backend/src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenBlacklistService } from './token-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly bl: TokenBlacklistService) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, secretOrKey: process.env.JWT_SECRET! });
  }
  async validate(payload: any) {
    if (await this.bl.isBlacklisted(payload.jti)) throw new UnauthorizedException('Token iptal edilmiş');
    return { id: payload.sub, username: payload.username, role: payload.role, jti: payload.jti };
  }
}
```

- [ ] **Step 7: Controller + Module**

```typescript
// apps/backend/src/auth/auth.controller.ts
import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto); }
  @Post('refresh') refresh(@Body('refreshToken') rt: string) { return this.auth.refresh(rt); }
  @UseGuards(JwtAuthGuard) @Post('logout') @HttpCode(204)
  async logout(@Req() req: any) { await this.auth.logout(req.user.jti); }
  @UseGuards(JwtAuthGuard) @Get('me') me(@Req() req: any) {
    return { id: req.user.id, username: req.user.username, role: req.user.role };
  }
}
```
```typescript
// apps/backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PanelUser } from '../database/entities/panel-user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HashService } from './hash.service';
import { JwtStrategy } from './jwt.strategy';
import { TokenBlacklistService } from './token-blacklist.service';
import { loadConfig } from '../config/config';

@Module({
  imports: [TypeOrmModule.forFeature([PanelUser]), JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    HashService, TokenBlacklistService, JwtStrategy,
    {
      provide: AuthService,
      inject: [getRepoToken(), HashService, JwtService, TokenBlacklistService],
      useFactory: (repo: Repository<PanelUser>, h: HashService, j: JwtService, b: TokenBlacklistService) =>
        new AuthService(repo, h, j, b, loadConfig().jwt),
    },
  ],
  exports: [TokenBlacklistService],
})
export class AuthModule {}
function getRepoToken() { return `PanelUserRepository`; } // bkz. not
```
> **Not (DI):** En temiz yol — `AuthService`'i normal `@Injectable` yapıp `@InjectRepository(PanelUser)` ve config'i `@Inject` ile almak. Yukarıdaki factory yerine: `AuthService` constructor'ında `@InjectRepository(PanelUser) repo` kullan, `cfg` için `{ provide:'JWT_CFG', useValue: loadConfig().jwt }` provider'ı ekle ve `@Inject('JWT_CFG')`. Test'te düz `new AuthService(...)` çalışmaya devam eder (test zaten parametreleri elle veriyor). Factory karmaşıksa bu yolu seç.

- [ ] **Step 8: e2e login testi**

```typescript
// apps/backend/test/auth.e2e-spec.ts  (özet — gerçek DB+redis ister; infra:up gerekli)
// POST /auth/login admin/şifre → 200 + accessToken; yanlış → 401; /auth/me Bearer ile 200.
```
Run: `npm run infra:up && npm run seed --workspace apps/backend && npm run test:e2e --workspace apps/backend -- auth`
Expected: PASS (login 200/401, me 200/401).

- [ ] **Step 9: Commit** *(kullanıcı yapar)* — `git commit -m "feat(be): auth (login/refresh/logout/me) + jwt strategy"`

---

## Task 8: Guards — JwtAuthGuard + RolesGuard + @Roles — TDD

**Files:**
- Create: `src/auth/guards/jwt-auth.guard.ts`, `src/auth/guards/roles.guard.ts`, `src/auth/decorators/roles.decorator.ts`, `src/auth/guards/roles.guard.spec.ts`

**Interfaces:**
- Produces: `@Roles(...roles)`, `RolesGuard`, `JwtAuthGuard extends AuthGuard('jwt')`.

- [ ] **Step 1: RolesGuard failing test**

```typescript
// apps/backend/src/auth/guards/roles.guard.spec.ts
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

const ctx = (role: string) => ({
  switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  getHandler: () => ({}), getClass: () => ({}),
}) as any;

describe('RolesGuard', () => {
  it('rol gerektirmeyen route serbest', () => {
    const r = new Reflector(); jest.spyOn(r, 'getAllAndOverride').mockReturnValue(undefined);
    expect(new RolesGuard(r).canActivate(ctx('viewer'))).toBe(true);
  });
  it('admin gerekiyorsa viewer reddedilir', () => {
    const r = new Reflector(); jest.spyOn(r, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(new RolesGuard(r).canActivate(ctx('viewer'))).toBe(false);
  });
  it('operator, operator+admin route\'a girer', () => {
    const r = new Reflector(); jest.spyOn(r, 'getAllAndOverride').mockReturnValue(['admin','operator']);
    expect(new RolesGuard(r).canActivate(ctx('operator'))).toBe(true);
  });
});
```

- [ ] **Step 2: Çalıştır → FAIL** — Run: `npm test --workspace apps/backend -- roles.guard` → FAIL.

- [ ] **Step 3: Implementasyon**

```typescript
// apps/backend/src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { PanelRole } from '../../database/entities/panel-user.entity';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: PanelRole[]) => SetMetadata(ROLES_KEY, roles);
```
```typescript
// apps/backend/src/auth/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```
```typescript
// apps/backend/src/auth/guards/roles.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PanelRole } from '../../database/entities/panel-user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PanelRole[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!required || required.length === 0) return true;
    const { user } = ctx.switchToHttp().getRequest();
    return !!user && required.includes(user.role);
  }
}
```

- [ ] **Step 4: Çalıştır → PASS** — Run: `npm test --workspace apps/backend -- roles.guard` → PASS.

- [ ] **Step 5: Commit** *(kullanıcı yapar)* — `git commit -m "feat(be): jwt + roles guards"`

---

## Task 9: Log sanitize interceptor — TDD

**Files:**
- Create: `src/common/interceptors/log-sanitize.interceptor.ts`, `...spec.ts`

**Interfaces:**
- Produces: `sanitize(obj)` → hassas alanlar (`password,token,secret,authorization`) `***`.

- [ ] **Step 1: Failing test**

```typescript
// apps/backend/src/common/interceptors/log-sanitize.interceptor.spec.ts
import { sanitize } from './log-sanitize.interceptor';
describe('sanitize', () => {
  it('hassas alanları maskeler', () => {
    expect(sanitize({ username: 'a', password: 'p', token: 't', x: 1 }))
      .toEqual({ username: 'a', password: '***', token: '***', x: 1 });
  });
});
```

- [ ] **Step 2: Çalıştır → FAIL** — Run: `npm test --workspace apps/backend -- log-sanitize` → FAIL.

- [ ] **Step 3: Implementasyon**

```typescript
// apps/backend/src/common/interceptors/log-sanitize.interceptor.ts
const SENSITIVE = ['password', 'token', 'secret', 'authorization'];
export function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) =>
    [k, SENSITIVE.includes(k.toLowerCase()) ? '***' : v]));
}
```

- [ ] **Step 4: Çalıştır → PASS** — Run: `npm test --workspace apps/backend -- log-sanitize` → PASS.

- [ ] **Step 5: Commit** *(kullanıcı yapar)* — `git commit -m "feat(be): log sanitize helper"`

---

## Task 10: Docker provider + resolveRole (pure) — TDD

**Files:**
- Create: `src/containers/types.ts`, `src/containers/service-role.ts`, `src/containers/service-role.spec.ts`, `src/containers/docker.provider.ts`

**Interfaces:**
- Produces:
  - `ServiceRole = 'database'|'db-process'|'auth'|'channel'|'proxy'|'quest-compiler'`
  - `resolveRole(serviceName: string, mt2Role?: string): ServiceRole`
  - `ServiceCard` tipi (spec §4.3)
  - `DOCKER` provider → Dockerode instance (DOCKER_HOST'tan).

- [ ] **Step 1: types.ts**

```typescript
// apps/backend/src/containers/types.ts
export type ServiceRole = 'database' | 'db-process' | 'auth' | 'channel' | 'proxy' | 'quest-compiler';
export type ServiceStatus = 'running' | 'stopped' | 'restarting' | 'exited';
export type ServiceHealth = 'healthy' | 'unhealthy' | 'starting' | 'none';

export interface ServiceStats {
  cpuPercent: number; memUsedMb: number; memLimitMb: number;
  networkRxMb: number; networkTxMb: number;
}
export interface ServiceCard {
  name: string; role: ServiceRole; channel?: number;
  status: ServiceStatus; health: ServiceHealth; uptime: string;
  image: { name: string; tag: string }; ports: string[];
  stats?: ServiceStats;
  exitCode?: number; finishedAt?: string; questLogAvailable?: boolean;
}
```

- [ ] **Step 2: resolveRole failing test**

```typescript
// apps/backend/src/containers/service-role.spec.ts
import { resolveRole } from './service-role';
describe('resolveRole', () => {
  it('isim bazlı: database/haproxy/quest-compiler', () => {
    expect(resolveRole('metin2_database', undefined)).toBe('database');
    expect(resolveRole('haproxy', undefined)).toBe('proxy');
    expect(resolveRole('quest-compiler', 'core')).toBe('quest-compiler'); // isim önceliklidir
  });
  it('MT2_ROLE bazlı: db/auth/core', () => {
    expect(resolveRole('metin2_db', 'db')).toBe('db-process');
    expect(resolveRole('metin2_auth', 'auth')).toBe('auth');
    expect(resolveRole('metin2_ch1', 'core')).toBe('channel');
    expect(resolveRole('metin2_ch99', 'core')).toBe('channel');
  });
  it('bilinmeyen → channel fallback', () => {
    expect(resolveRole('metin2_weird', undefined)).toBe('channel');
  });
});
```

- [ ] **Step 3: Çalıştır → FAIL** — Run: `npm test --workspace apps/backend -- service-role` → FAIL.

- [ ] **Step 4: resolveRole implementasyonu**

```typescript
// apps/backend/src/containers/service-role.ts
import { ServiceRole } from './types';
export function resolveRole(serviceName: string, mt2Role?: string): ServiceRole {
  const n = serviceName.toLowerCase();
  if (n.includes('database')) return 'database';
  if (n.includes('quest-compiler')) return 'quest-compiler';
  if (n.includes('haproxy')) return 'proxy';
  if (mt2Role === 'db') return 'db-process';
  if (mt2Role === 'auth') return 'auth';
  if (mt2Role === 'core') return 'channel';
  return 'channel';
}
```

- [ ] **Step 5: Çalıştır → PASS** — Run: `npm test --workspace apps/backend -- service-role` → PASS.

- [ ] **Step 6: Docker provider**

```typescript
// apps/backend/src/containers/docker.provider.ts
import Docker from 'dockerode';
export const DOCKER = 'DOCKER';
export const dockerProvider = {
  provide: DOCKER,
  useFactory: (): Docker => {
    const host = process.env.DOCKER_HOST ?? 'tcp://localhost:2375';
    const url = new URL(host);
    return new Docker({ host: url.hostname, port: Number(url.port) });
  },
};
```

- [ ] **Step 7: Commit** *(kullanıcı yapar)* — `git commit -m "feat(be): docker provider + resolveRole + types"`

---

## Task 11: ContainersService — discovery / health / stats / actions — TDD

**Files:**
- Create: `src/containers/containers.service.ts`, `src/containers/containers.service.spec.ts`

**Interfaces:**
- Consumes: `DOCKER` (Dockerode), `MT2_PROJECT`, `resolveRole`.
- Produces:
  - `discoverServices(): Promise<ServiceCard[]>` — proje filtreli, inspect ile env okur, 5sn cache.
  - `getStats(name): Promise<ServiceStats>`
  - `getHealth(name): Promise<{status,failingStreak,log,exitCode,finishedAt}>`
  - `restart(name): Promise<void>`, `stop(name): Promise<void>` (graceful t=30)
  - Yardımcı: `findContainerByService(name)` → compose-service label eşleştirme.

- [ ] **Step 1: discovery failing test (Dockerode mock)**

```typescript
// apps/backend/src/containers/containers.service.spec.ts
import { ContainersService } from './containers.service';

function fakeDocker() {
  const list = [
    { Id: 'a', Names: ['/metin2-svfiles-metin2_auth-1'], Image: 'img', State: 'running', Status: 'Up 7 hours (healthy)',
      Ports: [{ PrivatePort: 30001, Type: 'tcp' }],
      Labels: { 'com.docker.compose.project': 'metin2-svfiles', 'com.docker.compose.service': 'metin2_auth' } },
    { Id: 'b', Names: ['/other-app-1'], Image: 'x', State: 'running', Status: 'Up', Ports: [],
      Labels: { 'com.docker.compose.project': 'other-app', 'com.docker.compose.service': 'x' } },
  ];
  const inspectFor: Record<string, any> = {
    a: { Config: { Env: ['MT2_ROLE=auth', 'CHANNEL=1'], Image: 'metin2-game:latest' },
         State: { Health: { Status: 'healthy', FailingStreak: 0, Log: [] }, ExitCode: 0, StartedAt: '', FinishedAt: '' } },
  };
  return {
    listContainers: jest.fn().mockResolvedValue(list),
    getContainer: (id: string) => ({ inspect: jest.fn().mockResolvedValue(inspectFor[id]) }),
  } as any;
}

describe('ContainersService.discoverServices', () => {
  it('sadece MT2_PROJECT container\'larını döner, rol/kanal çözer', async () => {
    const svc = new ContainersService(fakeDocker(), 'metin2-svfiles');
    const cards = await svc.discoverServices();
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe('metin2_auth');
    expect(cards[0].role).toBe('auth');
    expect(cards[0].channel).toBeUndefined();
    expect(cards[0].health).toBe('healthy');
  });
});
```

- [ ] **Step 2: Çalıştır → FAIL** — Run: `npm test --workspace apps/backend -- containers.service` → FAIL.

- [ ] **Step 3: ContainersService implementasyonu**

```typescript
// apps/backend/src/containers/containers.service.ts
import Docker from 'dockerode';
import { resolveRole } from './service-role';
import { ServiceCard, ServiceHealth, ServiceStats, ServiceStatus } from './types';

export class ContainersService {
  private cache?: { at: number; data: ServiceCard[] };
  private static TTL = 5000;
  constructor(private readonly docker: Docker, private readonly project: string) {}

  private parseEnv(env: string[] = []): Record<string, string> {
    return Object.fromEntries(env.map((e) => { const i = e.indexOf('='); return [e.slice(0, i), e.slice(i + 1)]; }));
  }
  private mapHealth(h?: string): ServiceHealth {
    if (h === 'healthy') return 'healthy';
    if (h === 'unhealthy') return 'unhealthy';
    if (h === 'starting') return 'starting';
    return 'none';
  }
  private mapStatus(s: string): ServiceStatus {
    if (s === 'running') return 'running';
    if (s === 'restarting') return 'restarting';
    if (s === 'exited') return 'exited';
    return 'stopped';
  }

  async findContainerByService(name: string) {
    const list = await this.docker.listContainers({ all: true,
      filters: { label: [`com.docker.compose.project=${this.project}`, `com.docker.compose.service=${name}`] } });
    if (!list[0]) throw new Error(`Servis bulunamadı: ${name}`);
    return this.docker.getContainer(list[0].Id);
  }

  async discoverServices(): Promise<ServiceCard[]> {
    if (this.cache && Date.now() - this.cache.at < ContainersService.TTL) return this.cache.data;
    const list = await this.docker.listContainers({ all: true });
    const mine = list.filter((c) => c.Labels?.['com.docker.compose.project'] === this.project);
    const cards = await Promise.all(mine.map(async (c) => {
      const service = c.Labels['com.docker.compose.service'] ?? c.Names[0].replace('/', '');
      const insp: any = await this.docker.getContainer(c.Id).inspect();
      const env = this.parseEnv(insp.Config?.Env);
      const role = resolveRole(service, env['MT2_ROLE']);
      const [imgName, imgTag] = (insp.Config?.Image ?? c.Image).split(':');
      const card: ServiceCard = {
        name: service, role,
        channel: role === 'channel' ? Number(env['CHANNEL'] ?? 0) : undefined,
        status: this.mapStatus(c.State), health: this.mapHealth(insp.State?.Health?.Status),
        uptime: c.Status,
        image: { name: imgName, tag: imgTag ?? 'latest' },
        ports: (c.Ports ?? []).map((p) => `${p.PrivatePort}/${p.Type}`),
      };
      if (role === 'quest-compiler') {
        card.exitCode = insp.State?.ExitCode; card.finishedAt = insp.State?.FinishedAt; card.questLogAvailable = true;
      }
      return card;
    }));
    this.cache = { at: Date.now(), data: cards };
    return cards;
  }

  async getStats(name: string): Promise<ServiceStats> {
    const c = await this.findContainerByService(name);
    const s: any = await c.stats({ stream: false });
    const cpuDelta = s.cpu_stats.cpu_usage.total_usage - s.precpu_stats.cpu_usage.total_usage;
    const sysDelta = s.cpu_stats.system_cpu_usage - s.precpu_stats.system_cpu_usage;
    const cpus = s.cpu_stats.online_cpus ?? 1;
    const cpuPercent = sysDelta > 0 ? (cpuDelta / sysDelta) * cpus * 100 : 0;
    const net = Object.values(s.networks ?? {}) as any[];
    return {
      cpuPercent: Number(cpuPercent.toFixed(2)),
      memUsedMb: Math.round((s.memory_stats.usage ?? 0) / 1048576),
      memLimitMb: Math.round((s.memory_stats.limit ?? 0) / 1048576),
      networkRxMb: Number((net.reduce((a, n) => a + (n.rx_bytes ?? 0), 0) / 1048576).toFixed(2)),
      networkTxMb: Number((net.reduce((a, n) => a + (n.tx_bytes ?? 0), 0) / 1048576).toFixed(2)),
    };
  }

  async getHealth(name: string) {
    const insp: any = await (await this.findContainerByService(name)).inspect();
    return {
      status: insp.State?.Health?.Status ?? 'none',
      failingStreak: insp.State?.Health?.FailingStreak ?? 0,
      log: (insp.State?.Health?.Log ?? []).slice(-3),
      exitCode: insp.State?.ExitCode, finishedAt: insp.State?.FinishedAt,
    };
  }

  async restart(name: string) { await (await this.findContainerByService(name)).restart({ t: 30 }); }
  async stop(name: string) { await (await this.findContainerByService(name)).stop({ t: 30 }); }
}
```

- [ ] **Step 4: Çalıştır → PASS** — Run: `npm test --workspace apps/backend -- containers.service` → PASS.

- [ ] **Step 5: Commit** *(kullanıcı yapar)* — `git commit -m "feat(be): containers service (discovery/stats/health/actions)"`

---

## Task 12: Containers controller + module + global wiring

**Files:**
- Create: `src/containers/containers.controller.ts`, `src/containers/containers.module.ts`
- Modify: `src/app.module.ts` (TypeOrmModule, RedisModule, AuthModule, ContainersModule)

**Interfaces:**
- Produces: korumalı endpoint'ler:
  - `GET /services` (auth) · `GET /services/:name` · `/stats` · `/healthcheck`
  - `POST /services/:name/restart` · `/stop` (`@Roles('admin','operator')`)

- [ ] **Step 1: Controller**

```typescript
// apps/backend/src/containers/containers.controller.ts
import { Controller, Get, HttpCode, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ContainersService } from './containers.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('services')
export class ContainersController {
  constructor(private readonly svc: ContainersService) {}
  @Get() list() { return this.svc.discoverServices(); }
  @Get(':name') async one(@Param('name') name: string) {
    const all = await this.svc.discoverServices();
    const card = all.find((c) => c.name === name);
    if (!card) throw new NotFoundException();
    return card;
  }
  @Get(':name/stats') stats(@Param('name') name: string) { return this.svc.getStats(name); }
  @Get(':name/healthcheck') health(@Param('name') name: string) { return this.svc.getHealth(name); }
  @Roles('admin', 'operator') @Post(':name/restart') @HttpCode(202)
  async restart(@Param('name') name: string) { await this.svc.restart(name); return { queued: false, done: true }; }
  @Roles('admin', 'operator') @Post(':name/stop') @HttpCode(202)
  async stop(@Param('name') name: string) { await this.svc.stop(name); return { queued: false, done: true }; }
}
```

- [ ] **Step 2: Module (Dockerode + project inject)**

```typescript
// apps/backend/src/containers/containers.module.ts
import { Module } from '@nestjs/common';
import Docker from 'dockerode';
import { AuthModule } from '../auth/auth.module';
import { ContainersController } from './containers.controller';
import { ContainersService } from './containers.service';
import { DOCKER, dockerProvider } from './docker.provider';
import { loadConfig } from '../config/config';

@Module({
  imports: [AuthModule],
  controllers: [ContainersController],
  providers: [dockerProvider, {
    provide: ContainersService,
    inject: [DOCKER],
    useFactory: (docker: Docker) => new ContainersService(docker, loadConfig().mt2Project),
  }],
})
export class ContainersModule {}
```

- [ ] **Step 3: app.module.ts'i tam bağla**

```typescript
// apps/backend/src/app.module.ts (tam)
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PanelUser } from './database/entities/panel-user.entity';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { ContainersModule } from './containers/containers.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    TypeOrmModule.forRoot({
      type: 'postgres', host: process.env.POSTGRES_HOST, port: Number(process.env.POSTGRES_PORT ?? 5432),
      username: process.env.POSTGRES_USER, password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB, entities: [PanelUser], synchronize: false,
    }),
    RedisModule, AuthModule, ContainersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 4: Uçtan uca elle doğrulama**

Run: `npm run infra:up && npm run seed --workspace apps/backend && npm run dev:be`
Sonra:
```bash
TOKEN=$(curl -s -X POST localhost:3001/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"<PASS>"}' | jq -r .accessToken)
curl -s localhost:3001/services -H "Authorization: Bearer $TOKEN" | jq '.[].name'
```
Expected: 7 gerçek servis adı (`metin2_auth`, `metin2_ch1`, `metin2_ch99`, `metin2_db`, `metin2_database`, `haproxy`, `quest-compiler`). Token'sız → 401.

- [ ] **Step 5: Commit** *(kullanıcı yapar)* — `git commit -m "feat(be): services endpoints + app wiring"`

---

## Task 13: Frontend iskeleti — Vite + Tailwind + shadcn + router + auth store + api client

**Files:**
- Create: `apps/frontend/*` (vite scaffold), `src/lib/api.ts`, `src/lib/queryClient.ts`, `src/store/auth.ts`, `src/types/service.ts`, `src/App.tsx`, `src/main.tsx`, `src/components/ProtectedRoute.tsx`

**Interfaces:**
- Produces: `useAuthStore` (accessToken, refreshToken, user, setAuth, clear); `apiClient` (axios, Bearer interceptor, 401→clear); `ServiceCard` tipi (FE kopyası); `<ProtectedRoute>`.

- [ ] **Step 1: Vite React-TS scaffold + bağımlılıklar**

Run (kök):
```bash
npm create vite@latest apps/frontend -- --template react-ts
npm i -w apps/frontend axios zustand @tanstack/react-query react-router-dom recharts
npm i -D -w apps/frontend tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom jsdom
npx -w apps/frontend tailwindcss init -p
```
shadcn: `npx -w apps/frontend shadcn@latest init` (varsayılanlar), gerekirse manuel `components/ui` kullan.

- [ ] **Step 2: vite.config.ts — proxy + vitest**

```typescript
// apps/frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') } } },
  test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.ts' },
});
```
`src/setupTests.ts`: `import '@testing-library/jest-dom';`
Tailwind `index.css`: `@tailwind base; @tailwind components; @tailwind utilities;`

- [ ] **Step 3: auth store (in-memory, localStorage YOK)**

```typescript
// apps/frontend/src/store/auth.ts
import { create } from 'zustand';
interface User { id: string; username: string; role: 'admin' | 'operator' | 'viewer'; }
interface AuthState {
  accessToken: string | null; refreshToken: string | null; user: User | null;
  setAuth: (a: { accessToken: string; refreshToken: string; user: User }) => void;
  setAccess: (t: string) => void; clear: () => void;
}
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null, refreshToken: null, user: null,
  setAuth: ({ accessToken, refreshToken, user }) => set({ accessToken, refreshToken, user }),
  setAccess: (accessToken) => set({ accessToken }),
  clear: () => set({ accessToken: null, refreshToken: null, user: null }),
}));
```

- [ ] **Step 4: api client (Bearer + refresh + 401)**

```typescript
// apps/frontend/src/lib/api.ts
import axios from 'axios';
import { useAuthStore } from '../store/auth';
export const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' });
apiClient.interceptors.request.use((cfg) => {
  const t = useAuthStore.getState().accessToken;
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
apiClient.interceptors.response.use((r) => r, async (err) => {
  const { refreshToken, setAccess, clear } = useAuthStore.getState();
  if (err.response?.status === 401 && refreshToken && !err.config._retry) {
    err.config._retry = true;
    try {
      const { data } = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, { refreshToken });
      setAccess(data.accessToken); err.config.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(err.config);
    } catch { clear(); window.location.href = '/login'; }
  }
  if (err.response?.status === 401) { clear(); window.location.href = '/login'; }
  return Promise.reject(err);
});
```

- [ ] **Step 5: ProtectedRoute + App router + main**

```tsx
// apps/frontend/src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
export function ProtectedRoute({ children }: { children: JSX.Element }) {
  return useAuthStore.getState().accessToken ? children : <Navigate to="/login" replace />;
}
```
```tsx
// apps/frontend/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
        <Route path="/services/:name" element={<ProtectedRoute><ServiceDetail /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```
```tsx
// apps/frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import App from './App';
import './index.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><QueryClientProvider client={queryClient}><App /></QueryClientProvider></React.StrictMode>);
```
```typescript
// apps/frontend/src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
```
```typescript
// apps/frontend/src/types/service.ts  (backend types.ts'in FE kopyası)
export type ServiceRole = 'database'|'db-process'|'auth'|'channel'|'proxy'|'quest-compiler';
export interface ServiceCard {
  name: string; role: ServiceRole; channel?: number;
  status: 'running'|'stopped'|'restarting'|'exited';
  health: 'healthy'|'unhealthy'|'starting'|'none'; uptime: string;
  image: { name: string; tag: string }; ports: string[];
  stats?: { cpuPercent: number; memUsedMb: number; memLimitMb: number; networkRxMb: number; networkTxMb: number };
  exitCode?: number; finishedAt?: string; questLogAvailable?: boolean;
}
```

- [ ] **Step 6: Build doğrula** — Run: `npm run build --workspace apps/frontend` → başarılı derleme.

- [ ] **Step 7: Commit** *(kullanıcı yapar)* — `git commit -m "feat(fe): vite skeleton, auth store, api client, router"`

---

## Task 14: Login sayfası + auth akışı — TDD

**Files:**
- Create: `src/pages/Login.tsx`, `src/pages/Login.test.tsx`

**Interfaces:**
- Consumes: `apiClient`, `useAuthStore`.
- Produces: `/login` formu; başarıda `setAuth` + `/dashboard` yönlendirme; hatada mesaj.

- [ ] **Step 1: Failing test (form render + validation)**

```tsx
// apps/frontend/src/pages/Login.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
it('login formu kullanıcı adı + şifre alanı gösterir', () => {
  render(<MemoryRouter><Login /></MemoryRouter>);
  expect(screen.getByLabelText(/kullanıcı adı/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/şifre/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /giriş/i })).toBeInTheDocument();
});
it('boş submit hata gösterir', async () => {
  render(<MemoryRouter><Login /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /giriş/i }));
  expect(await screen.findByText(/zorunlu/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Çalıştır → FAIL** — Run: `npm test --workspace apps/frontend -- Login` → FAIL.

- [ ] **Step 3: Login.tsx implementasyonu**

```tsx
// apps/frontend/src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth';
export default function Login() {
  const [username, setU] = useState(''); const [password, setP] = useState('');
  const [err, setErr] = useState(''); const nav = useNavigate(); const setAuth = useAuthStore((s) => s.setAuth);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setErr('Kullanıcı adı ve şifre zorunlu'); return; }
    try {
      const { data } = await apiClient.post('/auth/login', { username, password });
      setAuth(data); nav('/dashboard');
    } catch { setErr('Kullanıcı adı veya şifre hatalı'); }
  };
  return (
    <form onSubmit={submit} className="max-w-sm mx-auto mt-24 space-y-4 p-6 border rounded-lg">
      <h1 className="text-xl font-bold">MT2 Panel</h1>
      <label className="block">Kullanıcı Adı
        <input className="w-full border p-2 rounded" value={username} onChange={(e) => setU(e.target.value)} /></label>
      <label className="block">Şifre
        <input type="password" className="w-full border p-2 rounded" value={password} onChange={(e) => setP(e.target.value)} /></label>
      {err && <p className="text-red-500 text-sm">{err}</p>}
      <button className="w-full bg-blue-600 text-white p-2 rounded" type="submit">Giriş</button>
    </form>
  );
}
```
> Not: `getByLabelText` için `<label>` içine input sarmalandı; erişilebilirlik yeterli.

- [ ] **Step 4: Çalıştır → PASS** — Run: `npm test --workspace apps/frontend -- Login` → PASS.

- [ ] **Step 5: Elle doğrula** — `npm run dev:be` + `npm run dev:fe`, `localhost:5173/login`'den admin ile giriş → `/dashboard`.

- [ ] **Step 6: Commit** *(kullanıcı yapar)* — `git commit -m "feat(fe): login page + auth flow"`

---

## Task 15: Services sayfası + ServiceCard + useServices — TDD

**Files:**
- Create: `src/hooks/useServices.ts`, `src/components/ServiceCard.tsx`, `src/components/ServiceCard.test.tsx`, `src/pages/Services.tsx`

**Interfaces:**
- Consumes: `apiClient`, `ServiceCard` tipi.
- Produces: `useServices()` (5sn poll); `<ServiceCard service=...>` rol ikonu + health rozeti; `/services` grid.

- [ ] **Step 1: ServiceCard failing test**

```tsx
// apps/frontend/src/components/ServiceCard.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ServiceCard } from './ServiceCard';
const base = { name: 'metin2_auth', role: 'auth' as const, status: 'running' as const,
  health: 'healthy' as const, uptime: 'Up 7h', image: { name: 'metin2-game', tag: 'latest' }, ports: ['30001/tcp'] };
it('servis adı, rol ve health gösterir', () => {
  render(<MemoryRouter><ServiceCard service={base} /></MemoryRouter>);
  expect(screen.getByText('metin2_auth')).toBeInTheDocument();
  expect(screen.getByText(/healthy/i)).toBeInTheDocument();
});
it('channel rolünde kanal numarası gösterir', () => {
  render(<MemoryRouter><ServiceCard service={{ ...base, name: 'metin2_ch1', role: 'channel', channel: 1 }} /></MemoryRouter>);
  expect(screen.getByText(/ch.*1/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Çalıştır → FAIL** — Run: `npm test --workspace apps/frontend -- ServiceCard` → FAIL.

- [ ] **Step 3: useServices + ServiceCard + Services**

```typescript
// apps/frontend/src/hooks/useServices.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { ServiceCard } from '../types/service';
export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => (await apiClient.get<ServiceCard[]>('/services')).data,
    refetchInterval: 5000, staleTime: 3000,
  });
}
```
```tsx
// apps/frontend/src/components/ServiceCard.tsx
import { Link } from 'react-router-dom';
import { ServiceCard as TCard } from '../types/service';
const ROLE_ICON: Record<string, string> = {
  database: '🗄️', 'db-process': '🧩', auth: '🔑', channel: '🎮', proxy: '🚪', 'quest-compiler': '🛠️',
};
const HEALTH_COLOR: Record<string, string> = {
  healthy: 'text-green-600', unhealthy: 'text-red-600', starting: 'text-yellow-600', none: 'text-gray-400',
};
export function ServiceCard({ service: s }: { service: TCard }) {
  return (
    <Link to={`/services/${s.name}`} className="block border rounded-lg p-4 hover:shadow">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{ROLE_ICON[s.role]} {s.name}</span>
        <span className={HEALTH_COLOR[s.health]}>{s.health}</span>
      </div>
      <div className="text-sm text-gray-500">{s.role}{s.channel ? ` · ch${s.channel}` : ''}</div>
      <div className="text-xs text-gray-400">{s.image.name}:{s.image.tag} · {s.uptime}</div>
      {s.role === 'quest-compiler' && s.exitCode !== undefined && (
        <div className={s.exitCode === 0 ? 'text-green-600 text-xs' : 'text-red-600 text-xs font-bold'}>
          exit {s.exitCode}</div>)}
    </Link>
  );
}
```
```tsx
// apps/frontend/src/pages/Services.tsx
import { useServices } from '../hooks/useServices';
import { ServiceCard } from '../components/ServiceCard';
export default function Services() {
  const { data, isLoading, isError } = useServices();
  if (isLoading) return <p className="p-6">Yükleniyor…</p>;
  if (isError) return <p className="p-6 text-red-500">Servisler alınamadı</p>;
  return (
    <div className="p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data!.map((s) => <ServiceCard key={s.name} service={s} />)}
    </div>
  );
}
```

- [ ] **Step 4: Çalıştır → PASS** — Run: `npm test --workspace apps/frontend -- ServiceCard` → PASS.

- [ ] **Step 5: Elle doğrula** — Giriş sonrası `/services`'te 7 gerçek container görünür; yeni `metin2_ch*` eklenince 5sn içinde listeye düşer.

- [ ] **Step 6: Commit** *(kullanıcı yapar)* — `git commit -m "feat(fe): services page + dynamic cards"`

---

## Task 16: Service detay (stats/Recharts + health + restart/stop modal)

**Files:**
- Create: `src/hooks/useServiceStats.ts`, `src/components/ConfirmModal.tsx`, `src/pages/ServiceDetail.tsx`

**Interfaces:**
- Consumes: `apiClient`, `useServices`.
- Produces: `/services/:name` — stats (2sn poll, Recharts), health log, env/port, restart/stop (onay modalı, role guard FE-side gizleme).

- [ ] **Step 1: useServiceStats**

```typescript
// apps/frontend/src/hooks/useServiceStats.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
export function useServiceStats(name: string) {
  return useQuery({
    queryKey: ['service-stats', name],
    queryFn: async () => (await apiClient.get(`/services/${name}/stats`)).data,
    refetchInterval: 2000, enabled: !!name,
  });
}
```

- [ ] **Step 2: ConfirmModal**

```tsx
// apps/frontend/src/components/ConfirmModal.tsx
export function ConfirmModal({ open, title, onConfirm, onCancel }:
  { open: boolean; title: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 space-y-4 max-w-sm">
        <p>{title}</p>
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 border rounded" onClick={onCancel}>İptal</button>
          <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={onConfirm}>Onayla</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: ServiceDetail**

```tsx
// apps/frontend/src/pages/ServiceDetail.tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { apiClient } from '../lib/api';
import { useServices } from '../hooks/useServices';
import { useServiceStats } from '../hooks/useServiceStats';
import { useAuthStore } from '../store/auth';
import { ConfirmModal } from '../components/ConfirmModal';

export default function ServiceDetail() {
  const { name = '' } = useParams();
  const { data: services } = useServices();
  const { data: stats } = useServiceStats(name);
  const [history, setHistory] = useState<{ t: string; cpu: number; mem: number }[]>([]);
  const [modal, setModal] = useState<null | 'restart' | 'stop'>(null);
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === 'admin' || role === 'operator';
  const card = services?.find((s) => s.name === name);

  if (stats && (history.length === 0 || history[history.length - 1].cpu !== stats.cpuPercent)) {
    const next = [...history, { t: new Date().toLocaleTimeString(), cpu: stats.cpuPercent, mem: stats.memUsedMb }].slice(-30);
    if (next.length !== history.length) setHistory(next);
  }
  const act = async (a: 'restart' | 'stop') => { await apiClient.post(`/services/${name}/${a}`); setModal(null); };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">{name}</h1>
      {card && <div className="text-sm text-gray-500">{card.role} · {card.image.name}:{card.image.tag} · {card.health}</div>}
      <div className="h-64 border rounded p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history}>
            <XAxis dataKey="t" hide /><YAxis /><Tooltip />
            <Line dataKey="cpu" name="CPU %" stroke="#2563eb" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {stats && <div className="text-sm">CPU {stats.cpuPercent}% · RAM {stats.memUsedMb}/{stats.memLimitMb} MB · net ↓{stats.networkRxMb} ↑{stats.networkTxMb} MB</div>}
      <div className="text-sm">Portlar: {card?.ports.join(', ') || '—'}</div>
      {canWrite && (
        <div className="flex gap-2">
          <button className="px-3 py-1 border rounded" onClick={() => setModal('restart')}>Restart</button>
          <button className="px-3 py-1 border rounded" onClick={() => setModal('stop')}>Stop</button>
        </div>
      )}
      <ConfirmModal open={modal !== null} title={`${name} ${modal} edilsin mi?`}
        onConfirm={() => act(modal!)} onCancel={() => setModal(null)} />
    </div>
  );
}
```

- [ ] **Step 4: Elle doğrula** — Detay sayfasında CPU grafiği güncellenir; viewer rolünde restart/stop görünmez; admin restart → container yeniden başlar.

- [ ] **Step 5: Commit** *(kullanıcı yapar)* — `git commit -m "feat(fe): service detail (stats chart + actions)"`

---

## Task 17: Dashboard — healthcheck zinciri + quest-compiler banner

**Files:**
- Create: `src/components/HealthChain.tsx`, `src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `useServices`.
- Produces: `/dashboard` — zincir (database→db→auth→channel'lar→haproxy), quest-compiler exitCode banner.

- [ ] **Step 1: HealthChain + Dashboard**

```tsx
// apps/frontend/src/components/HealthChain.tsx
import { ServiceCard } from '../types/service';
const ORDER: ServiceCard['role'][] = ['database', 'db-process', 'auth', 'channel', 'proxy'];
export function HealthChain({ services }: { services: ServiceCard[] }) {
  const nodes = ORDER.flatMap((role) => services.filter((s) => s.role === role));
  return (
    <div className="flex flex-wrap items-center gap-2">
      {nodes.map((s, i) => (
        <span key={s.name} className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs ${s.health === 'healthy' || s.status === 'running' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {s.name}</span>
          {i < nodes.length - 1 && <span>→</span>}
        </span>
      ))}
    </div>
  );
}
```
```tsx
// apps/frontend/src/pages/Dashboard.tsx
import { Link } from 'react-router-dom';
import { useServices } from '../hooks/useServices';
import { HealthChain } from '../components/HealthChain';
export default function Dashboard() {
  const { data, isLoading } = useServices();
  if (isLoading || !data) return <p className="p-6">Yükleniyor…</p>;
  const qc = data.find((s) => s.role === 'quest-compiler');
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Genel Durum</h1>
      {qc && qc.exitCode !== undefined && qc.exitCode !== 0 && (
        <div className="bg-red-600 text-white p-3 rounded">⚠ quest-compiler hata ile bitti (exit {qc.exitCode}). Kanallar başlamamış olabilir.</div>)}
      <section><h2 className="font-semibold mb-2">Healthcheck Zinciri</h2><HealthChain services={data} /></section>
      <Link to="/services" className="text-blue-600 underline">Tüm servisler →</Link>
    </div>
  );
}
```

- [ ] **Step 2: Elle doğrula** — `/dashboard` zinciri yeşil/kırmızı gösterir; quest-compiler exit≠0 ise kırmızı banner.

- [ ] **Step 3: Commit** *(kullanıcı yapar)* — `git commit -m "feat(fe): dashboard health chain + quest banner"`

---

## Self-Review Notları (yazar tarafından)

- **Spec kapsamı:** §2 monorepo→T1; §3 auth→T4-T9; §4 keşif→T10-T12; §5 frontend→T13-T17; §6 infra→T2; §7 test→her task TDD. ✓
- **Tip tutarlılığı:** `ServiceCard`/`ServiceRole` backend `types.ts` (T10) ve frontend `types/service.ts` (T13) eşit; `resolveRole` imzası T10↔T11 aynı; `AuthService` constructor sırası T7 test↔impl aynı.
- **Bilinen risk (DI):** T7 AuthModule factory karmaşık — not'taki `@InjectRepository` + `JWT_CFG` provider yolu tercih edilebilir; her iki yolda da unit test değişmez.
- **Kapsam dışı:** log streaming, build, deploy/rollback, audit, 2FA tam akışı → sonraki spec'ler.
