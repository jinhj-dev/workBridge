-- CreateEnum
CREATE TYPE "job_title_tone" AS ENUM ('GRAY', 'BLUE', 'VIOLET', 'PINK');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "contact_email" VARCHAR(254),
ADD COLUMN     "job_title_id" UUID;

-- CreateTable
CREATE TABLE "job_titles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "tone" "job_title_tone" NOT NULL DEFAULT 'GRAY',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_titles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_titles_name_key" ON "job_titles"("name");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_job_title_id_fkey" FOREIGN KEY ("job_title_id") REFERENCES "job_titles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
