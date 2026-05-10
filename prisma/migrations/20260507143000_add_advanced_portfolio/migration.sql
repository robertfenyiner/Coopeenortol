-- CreateTable
CREATE TABLE "portfolio_provisions" (
    "id" UUID NOT NULL,
    "credit_id" UUID NOT NULL,
    "calculation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "days_overdue" INTEGER NOT NULL DEFAULT 0,
    "risk_category" VARCHAR(20) NOT NULL,
    "outstanding_balance" DECIMAL(15,2) NOT NULL,
    "overdue_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "provision_rate" DECIMAL(7,4) NOT NULL,
    "provision_amount" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'VIGENTE',
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "portfolio_provisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_agreements" (
    "id" UUID NOT NULL,
    "agreement_number" VARCHAR(30) NOT NULL,
    "credit_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    "agreed_amount" DECIMAL(15,2) NOT NULL,
    "initial_payment" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "installment_amount" DECIMAL(15,2) NOT NULL,
    "installments" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "next_review_date" TIMESTAMP(3),
    "reason" VARCHAR(500) NOT NULL,
    "observations" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "payment_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_agreement_installments" (
    "id" UUID NOT NULL,
    "agreement_id" UUID NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "paid_at" TIMESTAMP(3),
    "paid_amount" DECIMAL(15,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_agreement_installments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portfolio_provisions_credit_id_idx" ON "portfolio_provisions"("credit_id");

-- CreateIndex
CREATE INDEX "portfolio_provisions_calculation_date_idx" ON "portfolio_provisions"("calculation_date");

-- CreateIndex
CREATE INDEX "portfolio_provisions_risk_category_idx" ON "portfolio_provisions"("risk_category");

-- CreateIndex
CREATE INDEX "portfolio_provisions_status_idx" ON "portfolio_provisions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_agreements_agreement_number_key" ON "payment_agreements"("agreement_number");

-- CreateIndex
CREATE INDEX "payment_agreements_credit_id_idx" ON "payment_agreements"("credit_id");

-- CreateIndex
CREATE INDEX "payment_agreements_status_idx" ON "payment_agreements"("status");

-- CreateIndex
CREATE INDEX "payment_agreements_start_date_idx" ON "payment_agreements"("start_date");

-- CreateIndex
CREATE UNIQUE INDEX "payment_agreement_installments_agreement_id_installment_number_key" ON "payment_agreement_installments"("agreement_id", "installment_number");

-- CreateIndex
CREATE INDEX "payment_agreement_installments_agreement_id_idx" ON "payment_agreement_installments"("agreement_id");

-- CreateIndex
CREATE INDEX "payment_agreement_installments_due_date_idx" ON "payment_agreement_installments"("due_date");

-- CreateIndex
CREATE INDEX "payment_agreement_installments_status_idx" ON "payment_agreement_installments"("status");

-- AddForeignKey
ALTER TABLE "portfolio_provisions" ADD CONSTRAINT "portfolio_provisions_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_agreements" ADD CONSTRAINT "payment_agreements_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_agreement_installments" ADD CONSTRAINT "payment_agreement_installments_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "payment_agreements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
