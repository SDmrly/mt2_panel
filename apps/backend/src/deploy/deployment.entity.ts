// apps/backend/src/deploy/deployment.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DeployStatus } from './types';

@Entity('deployments')
export class Deployment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'service_scope', default: 'all-game' }) serviceScope!: string;
  @Column({ name: 'from_tag', type: 'varchar', nullable: true }) fromTag!: string | null;
  @Column({ name: 'to_tag' }) toTag!: string;
  @Column({ type: 'varchar', default: 'running' }) status!: DeployStatus;
  @Column({ type: 'varchar', nullable: true }) step!: string | null;
  @Column({ type: 'text', nullable: true }) error!: string | null;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @CreateDateColumn({ name: 'started_at', type: 'timestamptz' }) startedAt!: Date;
  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true }) finishedAt!: Date | null;
}
