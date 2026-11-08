-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "leave_type" AS ENUM ('ANNUAL', 'HALF_AM', 'HALF_PM', 'SPECIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "leave_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "emp_id" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL,
    "approval_required" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "department_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "work_date" DATE NOT NULL,
    "clock_in" TIMESTAMPTZ NOT NULL,
    "clock_out" TIMESTAMPTZ,
    "modified_by" UUID,
    "modified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_grants" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "year" SMALLINT NOT NULL,
    "granted_days" DECIMAL(4,1) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaves" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "approver_id" UUID,
    "leave_type" "leave_type" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "days" DECIMAL(4,1) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" "leave_status" NOT NULL,
    "processed_by" UUID,
    "processed_at" TIMESTAMPTZ,
    "reject_reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_emp_id_key" ON "users"("emp_id");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "attendance_work_date_idx" ON "attendance"("work_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_user_id_work_date_key" ON "attendance"("user_id", "work_date");

-- CreateIndex
CREATE UNIQUE INDEX "leave_grants_user_id_year_key" ON "leave_grants"("user_id", "year");

-- CreateIndex
CREATE INDEX "leaves_user_id_status_idx" ON "leaves"("user_id", "status");

-- CreateIndex
CREATE INDEX "leaves_approver_id_status_idx" ON "leaves"("approver_id", "status");

-- CreateIndex
CREATE INDEX "leaves_start_date_end_date_idx" ON "leaves"("start_date", "end_date");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_grants" ADD CONSTRAINT "leave_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK 制約(Prisma スキーマでは表現できないため手で追加する。正本: docs/05_DATABASE_DESIGN.md §4〜§6)

-- attendance: 退勤時刻は出勤時刻より後
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_clock_out_after_in_check"
  CHECK ("clock_out" IS NULL OR "clock_out" > "clock_in");

-- attendance: 退勤時刻は出勤時刻から 24 時間以内
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_clock_out_within_24h_check"
  CHECK ("clock_out" IS NULL OR "clock_out" <= "clock_in" + INTERVAL '24 hours');

-- attendance: 勤務日は出勤時刻の東京日付と一致
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_work_date_matches_clock_in_check"
  CHECK (("clock_in" AT TIME ZONE 'Asia/Tokyo')::date = "work_date");

-- attendance: 管理者修正者と修正時刻は両方 NULL か両方 NOT NULL
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_modified_pair_check"
  CHECK (("modified_by" IS NULL) = ("modified_at" IS NULL));

-- leave_grants: 付与日数は 0 以上の 0.5 単位
ALTER TABLE "leave_grants" ADD CONSTRAINT "leave_grants_granted_days_check"
  CHECK ("granted_days" >= 0 AND "granted_days" * 2 = FLOOR("granted_days" * 2));

-- leaves: 開始日は終了日以前
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_date_order_check"
  CHECK ("start_date" <= "end_date");

-- leaves: 年をまたぐ申請は不可
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_same_year_check"
  CHECK (EXTRACT(YEAR FROM "start_date") = EXTRACT(YEAR FROM "end_date"));

-- leaves: 半休は 1 日のみ
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_half_day_single_date_check"
  CHECK ("leave_type" NOT IN ('HALF_AM', 'HALF_PM') OR "start_date" = "end_date");

-- leaves: 半休は 0.5 日、それ以外は 1 以上の整数日
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_days_check"
  CHECK (
    ("leave_type" IN ('HALF_AM', 'HALF_PM') AND "days" = 0.5)
    OR ("leave_type" NOT IN ('HALF_AM', 'HALF_PM') AND "days" >= 1 AND "days" = FLOOR("days"))
  );

-- leaves: 承認者は申請者本人以外
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_approver_not_self_check"
  CHECK ("approver_id" IS NULL OR "approver_id" <> "user_id");

-- leaves: PENDING は承認者あり、処理者・処理時刻なし
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_pending_state_check"
  CHECK (
    "status" <> 'PENDING'
    OR ("approver_id" IS NOT NULL AND "processed_by" IS NULL AND "processed_at" IS NULL)
  );

-- leaves: APPROVED / REJECTED / CANCELLED は処理者・処理時刻あり
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_processed_state_check"
  CHECK (
    "status" NOT IN ('APPROVED', 'REJECTED', 'CANCELLED')
    OR ("processed_by" IS NOT NULL AND "processed_at" IS NOT NULL)
  );

-- leaves: REJECTED は却下理由と承認者が必須
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_rejected_state_check"
  CHECK (
    "status" <> 'REJECTED'
    OR ("reject_reason" IS NOT NULL AND "approver_id" IS NOT NULL)
  );
