-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "description" VARCHAR(500),
ADD COLUMN     "manager_id" UUID;

-- CreateIndex
CREATE INDEX "departments_manager_id_idx" ON "departments"("manager_id");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
