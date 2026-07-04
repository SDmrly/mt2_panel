// apps/backend/src/deploy/release-note.entity.ts
import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity('release_notes')
@Unique(['kind', 'tag'])
export class ReleaseNote {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar' }) kind!: string;
  @Column({ type: 'varchar' }) tag!: string;
  @Column({ type: 'text', default: '' }) note!: string;
  @Column({ name: 'updated_by', type: 'uuid', nullable: true }) updatedBy!: string | null;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
