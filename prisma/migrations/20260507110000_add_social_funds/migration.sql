-- CreateTable
CREATE TABLE "social_funds" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(500),
    "fund_type" VARCHAR(30) NOT NULL,
    "surplus_distribution_pct" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "current_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "social_funds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_funds_code_key" ON "social_funds"("code");

-- CreateIndex
CREATE INDEX "social_funds_fund_type_idx" ON "social_funds"("fund_type");

-- CreateIndex
CREATE INDEX "social_funds_is_active_idx" ON "social_funds"("is_active");
