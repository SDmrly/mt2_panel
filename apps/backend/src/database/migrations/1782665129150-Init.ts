import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1782665129150 implements MigrationInterface {
    name = 'Init1782665129150'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "panel_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying NOT NULL, "password_hash" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'viewer', "totp_secret" character varying, "totp_enabled" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "last_login" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_f52c48997a7d2935c4d7e747b61" UNIQUE ("username"), CONSTRAINT "PK_780b42b83286dd56c7cd2ee433c" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "panel_users"`);
    }

}
