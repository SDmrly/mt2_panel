// apps/backend/src/database/data-source.ts
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { PanelUser } from './entities/panel-user.entity';
import { Deployment } from '../deploy/deployment.entity';
dotenv.config({ path: '../../.env' });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [PanelUser, Deployment],
  // NOTE: only the src/*.ts glob — the dist/*.js glob was removed to avoid duplicate-migration
  // errors under ts-node. If a compiled (dist/) prod migration run is ever needed, add it back behind an env check.
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
