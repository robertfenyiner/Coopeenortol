-- CreateTable
CREATE TABLE "credit_co_debtors" (
    "id" UUID NOT NULL,
    "credit_id" UUID NOT NULL,
    "associate_id" UUID NOT NULL,
    "relationship" VARCHAR(50),
    "monthly_income" DECIMAL(15,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    "observations" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "credit_co_debtors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_score_snapshots" (
    "id" UUID NOT NULL,
    "credit_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "risk_level" VARCHAR(20) NOT NULL,
    "recommendation" VARCHAR(30) NOT NULL,
    "debt_ratio" DECIMAL(7,4) NOT NULL,
    "savings_coverage_pct" DECIMAL(7,4) NOT NULL,
    "active_credits_count" INTEGER NOT NULL,
    "overdue_installments_count" INTEGER NOT NULL,
    "monthly_income" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "requested_amount" DECIMAL(15,2) NOT NULL,
    "details" JSONB,
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "credit_score_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_refinancings" (
    "id" UUID NOT NULL,
    "original_credit_id" UUID NOT NULL,
    "new_credit_id" UUID NOT NULL,
    "previous_balance" DECIMAL(15,2) NOT NULL,
    "new_amount" DECIMAL(15,2) NOT NULL,
    "previous_rate" DECIMAL(5,2) NOT NULL,
    "new_rate" DECIMAL(5,2) NOT NULL,
    "previous_term_months" INTEGER NOT NULL,
    "new_term_months" INTEGER NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'APLICADA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "credit_refinancings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_co_debtors_credit_id_associate_id_key" ON "credit_co_debtors"("credit_id", "associate_id");

-- CreateIndex
CREATE INDEX "credit_co_debtors_credit_id_idx" ON "credit_co_debtors"("credit_id");

-- CreateIndex
CREATE INDEX "credit_co_debtors_associate_id_idx" ON "credit_co_debtors"("associate_id");

-- CreateIndex
CREATE INDEX "credit_co_debtors_status_idx" ON "credit_co_debtors"("status");

-- CreateIndex
CREATE INDEX "credit_score_snapshots_credit_id_idx" ON "credit_score_snapshots"("credit_id");

-- CreateIndex
CREATE INDEX "credit_score_snapshots_risk_level_idx" ON "credit_score_snapshots"("risk_level");

-- CreateIndex
CREATE INDEX "credit_score_snapshots_evaluated_at_idx" ON "credit_score_snapshots"("evaluated_at");

-- CreateIndex
CREATE UNIQUE INDEX "credit_refinancings_new_credit_id_key" ON "credit_refinancings"("new_credit_id");

-- CreateIndex
CREATE INDEX "credit_refinancings_original_credit_id_idx" ON "credit_refinancings"("original_credit_id");

-- CreateIndex
CREATE INDEX "credit_refinancings_new_credit_id_idx" ON "credit_refinancings"("new_credit_id");

-- CreateIndex
CREATE INDEX "credit_refinancings_created_at_idx" ON "credit_refinancings"("created_at");

-- AddForeignKey
ALTER TABLE "credit_co_debtors" ADD CONSTRAINT "credit_co_debtors_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_co_debtors" ADD CONSTRAINT "credit_co_debtors_associate_id_fkey" FOREIGN KEY ("associate_id") REFERENCES "associates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_score_snapshots" ADD CONSTRAINT "credit_score_snapshots_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_refinancings" ADD CONSTRAINT "credit_refinancings_original_credit_id_fkey" FOREIGN KEY ("original_credit_id") REFERENCES "credits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_refinancings" ADD CONSTRAINT "credit_refinancings_new_credit_id_fkey" FOREIGN KEY ("new_credit_id") REFERENCES "credits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
