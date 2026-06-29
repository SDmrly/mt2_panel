import { MigrationInterface, QueryRunner } from "typeorm";

export class Deployments1782753868207 implements MigrationInterface {
    name = 'Deployments1782753868207'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "deployments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "service_scope" character varying NOT NULL DEFAULT 'all-game', "from_tag" character varying, "to_tag" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'running', "step" character varying, "error" text, "user_id" uuid NOT NULL, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "finished_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_1e5627acb3c950deb83fe98fc48" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "deployments"`);
    }

}
