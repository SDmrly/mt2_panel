import { MigrationInterface, QueryRunner } from "typeorm";

export class DeploymentsKind1782900000000 implements MigrationInterface {
    name = 'DeploymentsKind1782900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "deployments" ADD "kind" character varying NOT NULL DEFAULT 'game'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "deployments" DROP COLUMN "kind"`);
    }

}
