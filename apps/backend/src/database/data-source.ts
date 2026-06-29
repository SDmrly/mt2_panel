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
  migrations: ['src/database/migrations/*.ts', 'dist/database/migrations/*.js'],
  synchronize: false,
});
