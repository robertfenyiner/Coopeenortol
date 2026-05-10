CREATE TABLE "assemblies" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "assembly_type" VARCHAR(30) NOT NULL DEFAULT 'ORDINARIA',
    "status" VARCHAR(30) NOT NULL DEFAULT 'PROGRAMADA',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "location" VARCHAR(200),
    "quorum_required" DECIMAL(7,4) NOT NULL DEFAULT 50,
    "description" VARCHAR(1000),
    "opened_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "assemblies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assembly_agenda_items" (
    "id" UUID NOT NULL,
    "assembly_id" UUID NOT NULL,
    "item_number" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "requires_vote" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    CONSTRAINT "assembly_agenda_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assembly_attendances" (
    "id" UUID NOT NULL,
    "assembly_id" UUID NOT NULL,
    "associate_id" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'HABILITADO',
    "checked_in_at" TIMESTAMP(3),
    "voting_weight" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "assembly_attendances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assembly_votes" (
    "id" UUID NOT NULL,
    "assembly_id" UUID NOT NULL,
    "agenda_item_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "vote_type" VARCHAR(40) NOT NULL DEFAULT 'MAYORIA_SIMPLE',
    "status" VARCHAR(30) NOT NULL DEFAULT 'BORRADOR',
    "is_secret" BOOLEAN NOT NULL DEFAULT false,
    "opened_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,
    CONSTRAINT "assembly_votes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assembly_vote_options" (
    "id" UUID NOT NULL,
    "vote_id" UUID NOT NULL,
    "label" VARCHAR(150) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assembly_vote_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assembly_ballots" (
    "id" UUID NOT NULL,
    "vote_id" UUID NOT NULL,
    "option_id" UUID NOT NULL,
    "associate_id" UUID NOT NULL,
    "weight" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "cast_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cast_by" UUID,
    CONSTRAINT "assembly_ballots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assemblies_code_key" ON "assemblies"("code");
CREATE INDEX "assemblies_status_idx" ON "assemblies"("status");
CREATE INDEX "assemblies_scheduled_at_idx" ON "assemblies"("scheduled_at");
CREATE UNIQUE INDEX "assembly_agenda_items_assembly_id_item_number_key" ON "assembly_agenda_items"("assembly_id", "item_number");
CREATE INDEX "assembly_agenda_items_assembly_id_idx" ON "assembly_agenda_items"("assembly_id");
CREATE UNIQUE INDEX "assembly_attendances_assembly_id_associate_id_key" ON "assembly_attendances"("assembly_id", "associate_id");
CREATE INDEX "assembly_attendances_assembly_id_idx" ON "assembly_attendances"("assembly_id");
CREATE INDEX "assembly_attendances_associate_id_idx" ON "assembly_attendances"("associate_id");
CREATE INDEX "assembly_attendances_status_idx" ON "assembly_attendances"("status");
CREATE INDEX "assembly_votes_assembly_id_idx" ON "assembly_votes"("assembly_id");
CREATE INDEX "assembly_votes_agenda_item_id_idx" ON "assembly_votes"("agenda_item_id");
CREATE INDEX "assembly_votes_status_idx" ON "assembly_votes"("status");
CREATE INDEX "assembly_vote_options_vote_id_idx" ON "assembly_vote_options"("vote_id");
CREATE UNIQUE INDEX "assembly_ballots_vote_id_associate_id_key" ON "assembly_ballots"("vote_id", "associate_id");
CREATE INDEX "assembly_ballots_vote_id_idx" ON "assembly_ballots"("vote_id");
CREATE INDEX "assembly_ballots_option_id_idx" ON "assembly_ballots"("option_id");
CREATE INDEX "assembly_ballots_associate_id_idx" ON "assembly_ballots"("associate_id");

ALTER TABLE "assembly_agenda_items" ADD CONSTRAINT "assembly_agenda_items_assembly_id_fkey" FOREIGN KEY ("assembly_id") REFERENCES "assemblies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assembly_attendances" ADD CONSTRAINT "assembly_attendances_assembly_id_fkey" FOREIGN KEY ("assembly_id") REFERENCES "assemblies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assembly_attendances" ADD CONSTRAINT "assembly_attendances_associate_id_fkey" FOREIGN KEY ("associate_id") REFERENCES "associates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assembly_votes" ADD CONSTRAINT "assembly_votes_assembly_id_fkey" FOREIGN KEY ("assembly_id") REFERENCES "assemblies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assembly_votes" ADD CONSTRAINT "assembly_votes_agenda_item_id_fkey" FOREIGN KEY ("agenda_item_id") REFERENCES "assembly_agenda_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assembly_vote_options" ADD CONSTRAINT "assembly_vote_options_vote_id_fkey" FOREIGN KEY ("vote_id") REFERENCES "assembly_votes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assembly_ballots" ADD CONSTRAINT "assembly_ballots_vote_id_fkey" FOREIGN KEY ("vote_id") REFERENCES "assembly_votes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assembly_ballots" ADD CONSTRAINT "assembly_ballots_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "assembly_vote_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assembly_ballots" ADD CONSTRAINT "assembly_ballots_associate_id_fkey" FOREIGN KEY ("associate_id") REFERENCES "associates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
