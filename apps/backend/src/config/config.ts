// apps/backend/src/config/config.ts
export interface AppConfig {
  backendPort: number;
  jwt: { secret: string; accessTtl: number; refreshTtl: number };
  adminSeed: { user: string; pass: string };
  postgres: { host: string; port: number; db: string; user: string; password: string };
  redis: { host: string; port: number; password?: string };
  dockerHost: string;
  mt2Project: string;
  deploy: { gameRepo: string; dbRepo: string };
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
    deploy: { gameRepo: req('DEPLOY_GAME_REPO'), dbRepo: req('DEPLOY_DB_REPO') },
  };
}
