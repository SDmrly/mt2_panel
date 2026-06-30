import { MigrationInterface, QueryRunner } from "typeorm";

export class AuditLog1782796372045 implements MigrationInterface {
    name = 'AuditLog1782796372045'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "audit_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "action" character varying NOT NULL, "user_id" uuid, "username" character varying, "target" character varying, "result" character varying NOT NULL, "ip" character varying, "detail" jsonb, CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "audit_log"`);
    }

}
