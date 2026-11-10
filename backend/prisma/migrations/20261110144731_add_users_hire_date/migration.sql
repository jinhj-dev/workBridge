-- 1. 入社日列をNULL可で追加
ALTER TABLE "users" ADD COLUMN "hire_date" DATE;

-- 2. 既存ユーザーを固定日で埋める
UPDATE "users" SET "hire_date" = DATE '2026-01-01';

-- 3. NOT NULL にする(既定値なし)
ALTER TABLE "users" ALTER COLUMN "hire_date" SET NOT NULL;
