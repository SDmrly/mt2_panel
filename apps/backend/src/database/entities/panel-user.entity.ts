// apps/backend/src/database/entities/panel-user.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
export type PanelRole = 'admin' | 'operator' | 'viewer';
export type PanelStatus = 'pending' | 'active' | 'disabled';

@Entity('panel_users')
export class PanelUser {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) username!: string;
  @Column({ name: 'password_hash' }) passwordHash!: string;
  @Column({ type: 'varchar', default: 'viewer' }) role!: PanelRole;
  @Column({ name: 'totp_secret', type: 'varchar', nullable: true }) totpSecret!: string | null;
  @Column({ name: 'totp_enabled', default: false }) totpEnabled!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @Column({ name: 'last_login', type: 'timestamptz', nullable: true }) lastLogin!: Date | null;
  @Column({ type: 'varchar', unique: true, nullable: true }) email!: string | null;
  @Column({ type: 'varchar', default: 'pending' }) status!: PanelStatus;
}
