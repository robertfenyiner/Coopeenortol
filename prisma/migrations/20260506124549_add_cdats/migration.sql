-- CreateTable
CREATE TABLE "cdat_products" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(500),
    "min_amount" DECIMAL(15,2) NOT NULL,
    "max_amount" DECIMAL(15,2),
    "min_term_days" INTEGER NOT NULL,
    "max_term_days" INTEGER,
    "annual_rate" DECIMAL(7,4) NOT NULL,
    "interest_mode" VARCHAR(20) NOT NULL DEFAULT 'SIMPLE',
    "payment_frequency" VARCHAR(30) NOT NULL DEFAULT 'VENCIMIENTO',
    "withholding_rate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "cdat_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cdat_investments" (
    "id" UUID NOT NULL,
    "certificate_number" VARCHAR(30) NOT NULL,
    "associate_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "principal_amount" DECIMAL(15,2) NOT NULL,
    "annual_rate" DECIMAL(7,4) NOT NULL,
    "term_days" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "maturity_date" TIMESTAMP(3) NOT NULL,
    "expected_interest" DECIMAL(15,2) NOT NULL,
    "withholding_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_interest" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVO',
    "renewal_policy" VARCHAR(30) NOT NULL DEFAULT 'NO_RENUEVA',
    "redeemed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "cdat_investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cdat_movements" (
    "id" UUID NOT NULL,
    "investment_id" UUID NOT NULL,
    "movement_type" VARCHAR(30) NOT NULL,
    "principal_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "interest_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "withholding_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "reference" VARCHAR(100),
    "observations" VARCHAR(500),
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performed_by" UUID,

    CONSTRAINT "cdat_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cdat_products_code_key" ON "cdat_products"("code");

-- CreateIndex
CREATE INDEX "cdat_products_is_active_idx" ON "cdat_products"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "cdat_investments_certificate_number_key" ON "cdat_investments"("certificate_number");

-- CreateIndex
CREATE INDEX "cdat_investments_associate_id_idx" ON "cdat_investments"("associate_id");

-- CreateIndex
CREATE INDEX "cdat_investments_product_id_idx" ON "cdat_investments"("product_id");

-- CreateIndex
CREATE INDEX "cdat_investments_status_idx" ON "cdat_investments"("status");

-- CreateIndex
CREATE INDEX "cdat_investments_maturity_date_idx" ON "cdat_investments"("maturity_date");

-- CreateIndex
CREATE INDEX "cdat_movements_investment_id_idx" ON "cdat_movements"("investment_id");

-- CreateIndex
CREATE INDEX "cdat_movements_movement_type_idx" ON "cdat_movements"("movement_type");

-- CreateIndex
CREATE INDEX "cdat_movements_performed_at_idx" ON "cdat_movements"("performed_at");

-- AddForeignKey
ALTER TABLE "cdat_investments" ADD CONSTRAINT "cdat_investments_associate_id_fkey" FOREIGN KEY ("associate_id") REFERENCES "associates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cdat_investments" ADD CONSTRAINT "cdat_investments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "cdat_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cdat_movements" ADD CONSTRAINT "cdat_movements_investment_id_fkey" FOREIGN KEY ("investment_id") REFERENCES "cdat_investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
