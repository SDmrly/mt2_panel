// apps/backend/src/audit/audit-log.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditAction, AuditResult } from './types';

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @Column({ type: 'varchar' }) action!: AuditAction;
  @Column({ name: 'user_id', type: 'uuid', nullable: true }) userId!: string | null;
  @Column({ type: 'varchar', nullable: true }) username!: string | null;
  @Column({ type: 'varchar', nullable: true }) target!: string | null;
  @Column({ type: 'varchar' }) result!: AuditResult;
  @Column({ type: 'varchar', nullable: true }) ip!: string | null;
  @Column({ type: 'jsonb', nullable: true }) detail!: Record<string, unknown> | null;
}
