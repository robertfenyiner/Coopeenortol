-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "avatar_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" VARCHAR(45),
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "entity" VARCHAR(50),
    "entity_id" VARCHAR(50),
    "data_before" JSONB,
    "data_after" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "details" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogs" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_items" (
    "id" UUID NOT NULL,
    "catalog_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'string',
    "module" VARCHAR(50) NOT NULL,
    "description" VARCHAR(500),
    "is_editable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" UUID NOT NULL,
    "document_type" VARCHAR(20) NOT NULL,
    "document_number" VARCHAR(30) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "second_last_name" VARCHAR(100),
    "gender" VARCHAR(20),
    "birth_date" TIMESTAMP(3),
    "marital_status" VARCHAR(20),
    "email" VARCHAR(255),
    "phone" VARCHAR(30),
    "mobile_phone" VARCHAR(30),
    "address" VARCHAR(500),
    "city" VARCHAR(100),
    "department" VARCHAR(100),
    "housing_type" VARCHAR(20),
    "occupation" VARCHAR(100),
    "employer" VARCHAR(200),
    "job_title" VARCHAR(100),
    "monthly_income" DECIMAL(15,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "associates" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "associate_number" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "admission_date" TIMESTAMP(3),
    "withdrawal_date" TIMESTAMP(3),
    "withdrawal_reason" VARCHAR(500),
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "associates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiaries" (
    "id" UUID NOT NULL,
    "associate_id" UUID NOT NULL,
    "person_id" UUID,
    "full_name" VARCHAR(200) NOT NULL,
    "relationship" VARCHAR(50) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "phone" VARCHAR(30),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "associate_documents" (
    "id" UUID NOT NULL,
    "associate_id" UUID NOT NULL,
    "document_type" VARCHAR(50) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" INTEGER,
    "mime_type" VARCHAR(100),
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" UUID,

    CONSTRAINT "associate_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "associate_history" (
    "id" UUID NOT NULL,
    "associate_id" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "previous_status" VARCHAR(20),
    "new_status" VARCHAR(20),
    "details" VARCHAR(1000),
    "performed_by" UUID,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "associate_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_accounts" (
    "id" UUID NOT NULL,
    "associate_id" UUID NOT NULL,
    "account_type" VARCHAR(30) NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributions" (
    "id" UUID NOT NULL,
    "associate_id" UUID NOT NULL,
    "savings_account_id" UUID NOT NULL,
    "receipt_id" UUID,
    "type" VARCHAR(30) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "period_year" INTEGER,
    "period_month" INTEGER,
    "payment_method" VARCHAR(30),
    "reference" VARCHAR(100),
    "observations" VARCHAR(500),
    "status" VARCHAR(20) NOT NULL DEFAULT 'APLICADO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_receipts" (
    "id" UUID NOT NULL,
    "receipt_number" VARCHAR(20) NOT NULL,
    "associate_id" UUID NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "payment_method" VARCHAR(30) NOT NULL,
    "reference" VARCHAR(100),
    "observations" VARCHAR(500),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "payment_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credits" (
    "id" UUID NOT NULL,
    "associate_id" UUID NOT NULL,
    "credit_number" VARCHAR(20) NOT NULL,
    "credit_line" VARCHAR(30) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'SOLICITUD',
    "requested_amount" DECIMAL(15,2) NOT NULL,
    "approved_amount" DECIMAL(15,2),
    "disbursed_amount" DECIMAL(15,2),
    "interest_rate" DECIMAL(5,2) NOT NULL,
    "term_months" INTEGER NOT NULL,
    "payment_frequency" VARCHAR(20) NOT NULL,
    "purpose" VARCHAR(500),
    "guarantee_type" VARCHAR(50),
    "guarantee_description" VARCHAR(500),
    "request_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_date" TIMESTAMP(3),
    "approved_by" UUID,
    "rejected_date" TIMESTAMP(3),
    "rejection_reason" VARCHAR(500),
    "disbursement_date" TIMESTAMP(3),
    "first_payment_date" TIMESTAMP(3),
    "last_payment_date" TIMESTAMP(3),
    "outstanding_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_interest_paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amortization_entries" (
    "id" UUID NOT NULL,
    "credit_id" UUID NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "principal_amount" DECIMAL(15,2) NOT NULL,
    "interest_amount" DECIMAL(15,2) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "remaining_balance" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "paid_date" TIMESTAMP(3),
    "paid_amount" DECIMAL(15,2),

    CONSTRAINT "amortization_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_payments" (
    "id" UUID NOT NULL,
    "credit_id" UUID NOT NULL,
    "payment_number" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "principal_paid" DECIMAL(15,2) NOT NULL,
    "interest_paid" DECIMAL(15,2) NOT NULL,
    "late_fee" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "payment_method" VARCHAR(30) NOT NULL,
    "reference" VARCHAR(100),
    "observations" VARCHAR(500),
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "credit_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_module_idx" ON "audit_logs"("module");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "catalogs_code_key" ON "catalogs"("code");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_items_catalog_id_code_key" ON "catalog_items"("catalog_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- CreateIndex
CREATE UNIQUE INDEX "persons_document_number_key" ON "persons"("document_number");

-- CreateIndex
CREATE INDEX "persons_document_type_document_number_idx" ON "persons"("document_type", "document_number");

-- CreateIndex
CREATE UNIQUE INDEX "associates_person_id_key" ON "associates"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX "associates_associate_number_key" ON "associates"("associate_number");

-- CreateIndex
CREATE INDEX "associates_status_idx" ON "associates"("status");

-- CreateIndex
CREATE INDEX "associates_associate_number_idx" ON "associates"("associate_number");

-- CreateIndex
CREATE INDEX "associate_history_associate_id_idx" ON "associate_history"("associate_id");

-- CreateIndex
CREATE INDEX "associate_history_performed_at_idx" ON "associate_history"("performed_at");

-- CreateIndex
CREATE INDEX "savings_accounts_associate_id_idx" ON "savings_accounts"("associate_id");

-- CreateIndex
CREATE UNIQUE INDEX "savings_accounts_associate_id_account_type_key" ON "savings_accounts"("associate_id", "account_type");

-- CreateIndex
CREATE INDEX "contributions_associate_id_idx" ON "contributions"("associate_id");

-- CreateIndex
CREATE INDEX "contributions_savings_account_id_idx" ON "contributions"("savings_account_id");

-- CreateIndex
CREATE INDEX "contributions_type_idx" ON "contributions"("type");

-- CreateIndex
CREATE INDEX "contributions_created_at_idx" ON "contributions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_receipts_receipt_number_key" ON "payment_receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "payment_receipts_associate_id_idx" ON "payment_receipts"("associate_id");

-- CreateIndex
CREATE INDEX "payment_receipts_created_at_idx" ON "payment_receipts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "credits_credit_number_key" ON "credits"("credit_number");

-- CreateIndex
CREATE INDEX "credits_associate_id_idx" ON "credits"("associate_id");

-- CreateIndex
CREATE INDEX "credits_status_idx" ON "credits"("status");

-- CreateIndex
CREATE INDEX "credits_credit_number_idx" ON "credits"("credit_number");

-- CreateIndex
CREATE INDEX "amortization_entries_credit_id_idx" ON "amortization_entries"("credit_id");

-- CreateIndex
CREATE INDEX "amortization_entries_due_date_idx" ON "amortization_entries"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "amortization_entries_credit_id_installment_number_key" ON "amortization_entries"("credit_id", "installment_number");

-- CreateIndex
CREATE INDEX "credit_payments_credit_id_idx" ON "credit_payments"("credit_id");

-- CreateIndex
CREATE INDEX "credit_payments_payment_date_idx" ON "credit_payments"("payment_date");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "catalogs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associates" ADD CONSTRAINT "associates_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_associate_id_fkey" FOREIGN KEY ("associate_id") REFERENCES "associates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associate_documents" ADD CONSTRAINT "associate_documents_associate_id_fkey" FOREIGN KEY ("associate_id") REFERENCES "associates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "associate_history" ADD CONSTRAINT "associate_history_associate_id_fkey" FOREIGN KEY ("associate_id") REFERENCES "associates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_accounts" ADD CONSTRAINT "savings_accounts_associate_id_fkey" FOREIGN KEY ("associate_id") REFERENCES "associates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_associate_id_fkey" FOREIGN KEY ("associate_id") REFERENCES "associates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_savings_account_id_fkey" FOREIGN KEY ("savings_account_id") REFERENCES "savings_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "payment_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credits" ADD CONSTRAINT "credits_associate_id_fkey" FOREIGN KEY ("associate_id") REFERENCES "associates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amortization_entries" ADD CONSTRAINT "amortization_entries_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_payments" ADD CONSTRAINT "credit_payments_credit_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
