-- AlterTable
ALTER TABLE "associate_documents" ADD COLUMN     "checksum" VARCHAR(128),
ADD COLUMN     "storage_bucket" VARCHAR(120),
ADD COLUMN     "storage_provider" VARCHAR(30) NOT NULL DEFAULT 'local';

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "channel" VARCHAR(30) NOT NULL,
    "subject" VARCHAR(200),
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "template_id" UUID,
    "channel" VARCHAR(30) NOT NULL,
    "recipient" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(200),
    "body" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    "provider" VARCHAR(50),
    "provider_message_id" VARCHAR(120),
    "error_message" VARCHAR(1000),
    "metadata" JSONB,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_code_key" ON "notification_templates"("code");

-- CreateIndex
CREATE INDEX "notification_templates_channel_idx" ON "notification_templates"("channel");

-- CreateIndex
CREATE INDEX "notification_templates_is_active_idx" ON "notification_templates"("is_active");

-- CreateIndex
CREATE INDEX "notification_logs_channel_idx" ON "notification_logs"("channel");

-- CreateIndex
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");

-- CreateIndex
CREATE INDEX "notification_logs_recipient_idx" ON "notification_logs"("recipient");

-- CreateIndex
CREATE INDEX "notification_logs_created_at_idx" ON "notification_logs"("created_at");

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
