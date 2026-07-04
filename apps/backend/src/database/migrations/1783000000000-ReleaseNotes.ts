import { MigrationInterface, QueryRunner } from "typeorm";

export class ReleaseNotes1783000000000 implements MigrationInterface {
    name = 'ReleaseNotes1783000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "release_notes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "kind" character varying NOT NULL, "tag" character varying NOT NULL, "note" text NOT NULL DEFAULT '', "updated_by" uuid, "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "UQ_release_notes_kind_tag" UNIQUE ("kind", "tag"), CONSTRAINT "PK_release_notes" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "release_notes"`);
    }

}
