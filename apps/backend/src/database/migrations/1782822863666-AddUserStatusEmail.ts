import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserStatusEmail1782822863666 implements MigrationInterface {
    name = 'AddUserStatusEmail1782822863666'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "panel_users" ADD "email" character varying`);
        await queryRunner.query(`ALTER TABLE "panel_users" ADD CONSTRAINT "UQ_29bbf136855c1d44fc75ecbac38" UNIQUE ("email")`);
        await queryRunner.query(`ALTER TABLE "panel_users" ADD "status" character varying NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`UPDATE panel_users SET status='active' WHERE role='admin'`);
        await queryRunner.query(`UPDATE panel_users SET email = username || '@local' WHERE email IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "panel_users" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "panel_users" DROP CONSTRAINT "UQ_29bbf136855c1d44fc75ecbac38"`);
        await queryRunner.query(`ALTER TABLE "panel_users" DROP COLUMN "email"`);
    }

}
