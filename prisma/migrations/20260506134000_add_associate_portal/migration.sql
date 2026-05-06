-- AlterTable
ALTER TABLE "users" ADD COLUMN "associate_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "users_associate_id_key" ON "users"("associate_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_associate_id_fkey" FOREIGN KEY ("associate_id") REFERENCES "associates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
