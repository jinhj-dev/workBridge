-- 部署コードの追加と、社員の部署を必須にする変更(docs/05 §1・§2)。
-- 既存データを未所属部署(UNASSIGNED)へ寄せてから NOT NULL にする。
-- ロールバック(参考): ALTER TABLE "users" ALTER COLUMN "department_id" DROP NOT NULL;
--   DROP INDEX "departments_code_key"; ALTER TABLE "departments" DROP COLUMN "code";

-- 1. code を NULL 許可で追加
ALTER TABLE "departments" ADD COLUMN "code" VARCHAR(20);

-- 2. seed 済み部署のコード
UPDATE "departments" SET "code" = 'GA' WHERE "name" = '総務部';
UPDATE "departments" SET "code" = 'DEV' WHERE "name" = '開発部';
UPDATE "departments" SET "code" = 'SALES' WHERE "name" = '営業部';
UPDATE "departments" SET "code" = 'HR' WHERE "name" = '人事部';

-- 3. 残りの部署には連番のコードを付ける
UPDATE "departments" d
SET "code" = 'D' || lpad(n.rn::text, 4, '0')
FROM (
  SELECT "id", row_number() OVER (ORDER BY "created_at", "id") AS rn
  FROM "departments"
  WHERE "code" IS NULL
) n
WHERE d."id" = n."id";

-- 4. 未所属部署を必ず用意する(同名の部署があればそのコードを UNASSIGNED にする)
UPDATE "departments" SET "code" = 'UNASSIGNED' WHERE "name" = '未所属';
INSERT INTO "departments" ("id", "code", "name", "created_at", "updated_at")
SELECT gen_random_uuid(), 'UNASSIGNED', '未所属', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "departments" WHERE "code" = 'UNASSIGNED');

-- 5. 部署のない社員を未所属へ
UPDATE "users"
SET "department_id" = (SELECT "id" FROM "departments" WHERE "code" = 'UNASSIGNED'),
    "updated_at" = now()
WHERE "department_id" IS NULL;

-- 6. code を必須・一意にする
ALTER TABLE "departments" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- 7. 社員の部署を必須にする
ALTER TABLE "users" ALTER COLUMN "department_id" SET NOT NULL;
