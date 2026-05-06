-- CreateTable
CREATE TABLE "paying_entities" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "nit" VARCHAR(30),
    "entity_type" VARCHAR(30) NOT NULL,
    "contact_name" VARCHAR(150),
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(30),
    "file_format" VARCHAR(30) NOT NULL DEFAULT 'CSV',
    "separator" VARCHAR(5) NOT NULL DEFAULT ';',
    "encoding" VARCHAR(20) NOT NULL DEFAULT 'UTF-8',
    "payment_cycle" VARCHAR(20) NOT NULL DEFAULT 'MENSUAL',
    "cutoff_day" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "paying_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_deduction_batches" (
    "id" UUID NOT NULL,
    "batch_number" VARCHAR(30) NOT NULL,
    "paying_entity_id" UUID NOT NULL,
    "period_year" INTEGER NOT NULL,
    "period_month" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'BORRADOR',
    "include_contributions" BOOLEAN NOT NULL DEFAULT true,
    "include_credits" BOOLEAN NOT NULL DEFAULT true,
    "total_records" INTEGER NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "applied_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "rejected_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "generated_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "conciliated_at" TIMESTAMP(3),
    "file_name" VARCHAR(255),
    "file_hash" VARCHAR(128),
    "generation_metadata" JSONB,
    "conciliation_metadata" JSONB,
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "payroll_deduction_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_deduction_details" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "associate_id" UUID NOT NULL,
    "credit_id" UUID,
    "amortization_entry_id" UUID,
    "contribution_id" UUID,
    "credit_payment_id" UUID,
    "line_number" INTEGER NOT NULL,
    "document_type" VARCHAR(20) NOT NULL,
    "document_number" VARCHAR(30) NOT NULL,
    "associate_number" VARCHAR(20) NOT NULL,
    "full_name" VARCHAR(250) NOT NULL,
    "payroll_code" VARCHAR(50),
    "concept_code" VARCHAR(50) NOT NULL,
    "concept_type" VARCHAR(30) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "applied_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "rejected_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    "rejection_reason" VARCHAR(500),
    "source_payload" JSONB,
    "conciliation_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "payroll_deduction_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paying_entities_code_key" ON "paying_entities"("code");

-- CreateIndex
CREATE INDEX "paying_entities_entity_type_idx" ON "paying_entities"("entity_type");

-- CreateIndex
CREATE INDEX "paying_entities_is_active_idx" ON "paying_entities"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_deduction_batches_batch_number_key" ON "payroll_deduction_batches"("batch_number");

-- CreateIndex
CREATE INDEX "payroll_deduction_batches_status_idx" ON "payroll_deduction_batches"("status");

-- CreateIndex
CREATE INDEX "payroll_deduction_batches_period_year_period_month_idx" ON "payroll_deduction_batches"("period_year", "period_month");

-- CreateIndex
CREATE INDEX "payroll_deduction_batches_paying_entity_id_idx" ON "payroll_deduction_batches"("paying_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_deduction_batches_paying_entity_id_period_year_peri_key" ON "payroll_deduction_batches"("paying_entity_id", "period_year", "period_month");

-- CreateIndex
CREATE INDEX "payroll_deduction_details_batch_id_idx" ON "payroll_deduction_details"("batch_id");

-- CreateIndex
CREATE INDEX "payroll_deduction_details_associate_id_idx" ON "payroll_deduction_details"("associate_id");

-- CreateIndex
CREATE INDEX "payroll_deduction_details_document_number_idx" ON "payroll_deduction_details"("document_number");

-- CreateIndex
CREATE INDEX "payroll_deduction_details_status_idx" ON "payroll_deduction_details"("status");

-- CreateIndex
CREATE INDEX "payroll_deduction_details_concept_type_idx" ON "payroll_deduction_details"("concept_type");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_deduction_details_batch_id_line_number_key" ON "payroll_deduction_details"("batch_id", "line_number");

-- AddForeignKey
ALTER TABLE "payroll_deduction_batches" ADD CONSTRAINT "payroll_deduction_batches_paying_entity_id_fkey" FOREIGN KEY ("paying_entity_id") REFERENCES "paying_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_details" ADD CONSTRAINT "payroll_deduction_details_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "payroll_deduction_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_details" ADD CONSTRAINT "payroll_deduction_details_associate_id_fkey" FOREIGN KEY ("associate_id") REFERENCES "associates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_details" ADD CONSTRAINT "payroll_deduction_details_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "credits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_details" ADD CONSTRAINT "payroll_deduction_details_amortization_entry_id_fkey" FOREIGN KEY ("amortization_entry_id") REFERENCES "amortization_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_details" ADD CONSTRAINT "payroll_deduction_details_contribution_id_fkey" FOREIGN KEY ("contribution_id") REFERENCES "contributions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_details" ADD CONSTRAINT "payroll_deduction_details_credit_payment_id_fkey" FOREIGN KEY ("credit_payment_id") REFERENCES "credit_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
