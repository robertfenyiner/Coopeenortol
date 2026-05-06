-- CreateTable
CREATE TABLE "chart_accounts" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "description" VARCHAR(500),
    "account_type" VARCHAR(30) NOT NULL,
    "nature" VARCHAR(10) NOT NULL,
    "parent_id" UUID,
    "level" INTEGER NOT NULL DEFAULT 1,
    "is_movement" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "chart_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_rules" (
    "id" UUID NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "event" VARCHAR(80) NOT NULL,
    "debit_account_id" UUID NOT NULL,
    "credit_account_id" UUID NOT NULL,
    "description" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "accounting_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_journal_entries" (
    "id" UUID NOT NULL,
    "entry_number" VARCHAR(30) NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" VARCHAR(500) NOT NULL,
    "source_module" VARCHAR(50),
    "source_event" VARCHAR(80),
    "source_entity" VARCHAR(80),
    "source_entity_id" VARCHAR(80),
    "status" VARCHAR(30) NOT NULL DEFAULT 'CONTABILIZADO',
    "total_debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "posted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "posted_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "accounting_journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting_journal_lines" (
    "id" UUID NOT NULL,
    "entry_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "associate_id" UUID,
    "line_number" INTEGER NOT NULL,
    "description" VARCHAR(500),
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "third_party_name" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounting_journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chart_accounts_code_key" ON "chart_accounts"("code");

-- CreateIndex
CREATE INDEX "chart_accounts_account_type_idx" ON "chart_accounts"("account_type");

-- CreateIndex
CREATE INDEX "chart_accounts_parent_id_idx" ON "chart_accounts"("parent_id");

-- CreateIndex
CREATE INDEX "chart_accounts_is_active_idx" ON "chart_accounts"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_rules_code_key" ON "accounting_rules"("code");

-- CreateIndex
CREATE INDEX "accounting_rules_module_idx" ON "accounting_rules"("module");

-- CreateIndex
CREATE INDEX "accounting_rules_event_idx" ON "accounting_rules"("event");

-- CreateIndex
CREATE INDEX "accounting_rules_is_active_idx" ON "accounting_rules"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_rules_module_event_key" ON "accounting_rules"("module", "event");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_journal_entries_entry_number_key" ON "accounting_journal_entries"("entry_number");

-- CreateIndex
CREATE INDEX "accounting_journal_entries_entry_date_idx" ON "accounting_journal_entries"("entry_date");

-- CreateIndex
CREATE INDEX "accounting_journal_entries_source_module_source_event_idx" ON "accounting_journal_entries"("source_module", "source_event");

-- CreateIndex
CREATE INDEX "accounting_journal_entries_source_entity_source_entity_id_idx" ON "accounting_journal_entries"("source_entity", "source_entity_id");

-- CreateIndex
CREATE INDEX "accounting_journal_entries_status_idx" ON "accounting_journal_entries"("status");

-- CreateIndex
CREATE INDEX "accounting_journal_lines_entry_id_idx" ON "accounting_journal_lines"("entry_id");

-- CreateIndex
CREATE INDEX "accounting_journal_lines_account_id_idx" ON "accounting_journal_lines"("account_id");

-- CreateIndex
CREATE INDEX "accounting_journal_lines_associate_id_idx" ON "accounting_journal_lines"("associate_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounting_journal_lines_entry_id_line_number_key" ON "accounting_journal_lines"("entry_id", "line_number");

-- AddForeignKey
ALTER TABLE "chart_accounts" ADD CONSTRAINT "chart_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_rules" ADD CONSTRAINT "accounting_rules_debit_account_id_fkey" FOREIGN KEY ("debit_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_rules" ADD CONSTRAINT "accounting_rules_credit_account_id_fkey" FOREIGN KEY ("credit_account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_journal_lines" ADD CONSTRAINT "accounting_journal_lines_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "accounting_journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_journal_lines" ADD CONSTRAINT "accounting_journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_journal_lines" ADD CONSTRAINT "accounting_journal_lines_associate_id_fkey" FOREIGN KEY ("associate_id") REFERENCES "associates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
