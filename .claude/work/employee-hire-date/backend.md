# backend.md (employee-hire-date)

進め方: ユーザーが1ファイルずつ修正前に承認する方式(全8ファイル)。

## ファイル1/8: backend/prisma/schema.prisma

### 変更内容
- User モデルの departmentId の次の行に `hireDate DateTime @map("hire_date") @db.Date` を追加。
- NOT NULL、既定値なし、インデックスなし。他の行は変更なし(差分は +1 行のみ)。

### 検証結果
- `npx prisma format`: 成功(差分は追加行のみ)
- `npx prisma validate`: 成功(schema is valid)
- マイグレーション作成・適用、db push は未実行(ファイル2で別途承認)。

## 設計からの変更(ユーザー決定)
- seed の初期 ADMIN の入社日は、設計の「seed 実行日(東京)」ではなく固定 2026-01-01 とした。ファイル3(initial-data.ts)で実装済み(`INITIAL_ADMIN_HIRE_DATE`、既存ユーザーの移行値・E2E アカウントと同じ固定日)。

## API 文書との相違点
- なし。今回は DB 列と seed・E2E データの対応のみで、API の実装はない(機能 8)。

## 文書更新予定
architect が review 通過後に反映する。内容は plan.md・design-backend.md の確定事項。
- `docs/05_DATABASE_DESIGN.md` §2 users: hire_date 行を追加。DATE・NOT NULL・既定値なし(入社日、東京基準の日付)。既存行・初期 ADMIN・E2E アカウントの値は固定 2026-01-01(マイグレーションで既存行を埋めた旨をメモ)。
- `docs/06_API_SPECIFICATION.md` §5:
  - API-USER-001: 応答の各項目に hireDate を追加。検索条件に hireDateFrom / hireDateTo(YYYY-MM-DD、両端を含む、片方だけの指定も可、from > to は 400 VALIDATION_ERROR)を追加。並び順は入社日の昇順、同じ日なら社員番号の昇順。
  - API-USER-002: Request に hireDate を必須で追加(実在する日付、未来の日付も可、既定値なし)。欠落・形式不正は 400 VALIDATION_ERROR。
  - API-USER-003: 応答に hireDate を含める(表示)。
  - API-USER-004: 更新可能項目に hireDate を追加(指定時は必須ルールと同じ、null は不可)。
- `docs/02_REQUIREMENTS.md` FR-USER-001(登録で入社日が必須、検索条件に入社日の期間を追加)、FR-USER-002(更新可能項目に入社日を追加)。
- `docs/04_SCREEN_SPECIFICATIONS/SCR-006_USER_LIST.md`: 入社日の「既定: 必要」は誤記のため「既定値なし(直接選択)」に修正。検索条件は既存の6項目に入社日の期間を加える。並び順は入社日の昇順、社員番号の昇順。未来の日付も可。
- `docs/04_SCREEN_SPECIFICATIONS/SCR-007` §3.1・§6: 入社日を表示し、編集できる(必須)。
- `docs/08_TEST_PLAN.md`: SCR-006 の入社日必須の検証、および入社日のマイグレーション・DB 検証(MIG-01〜03 など)を追加。
- `docs/10_DEVELOPMENT_ROADMAP.md`: 変更履歴に今回の入社日追加(DB 列とマイグレーション、文書の契約。API・画面の実装は機能 8)を記録。

## フロントエンドが知るべきこと
- 今回の変更はフロントに影響しない(API・画面の変更なし)。環境変数・CORS・認証の変更もなし。
- 機能 8 では、API の hireDate を 'YYYY-MM-DD' 文字列で受け渡す(DB 側は toDbDate / fromDbDate で変換)。

## context.md 訂正
- なし。

## ファイル2/8: backend/prisma/migrations/20261110144731_add_users_hire_date/migration.sql

### 作成内容
- 新規ファイル1つのみ。承認済みの3段階 SQL(NULL可で列追加 → 既存ユーザーを 2026-01-01 で埋める → NOT NULL 化、既定値なし)。コメントは日本語。
- タイムスタンプは現在時刻(20261110144731)。既存形式(14桁)と同じ。

### 検証結果
- DB への適用は未実施(migrate dev / deploy / db push 不使用)。適用は再承認後。
- 指定の `migrate diff --from-migrations ... --to-schema-datamodel` は未実施。理由: `--to-schema-datamodel` は現行 Prisma で廃止されており、`--from-migrations` は shadow DB(DBサーバー上での一時DB作成)を要するため。
- 代替確認(DB不使用): git HEAD の schema と現 schema の `migrate diff --from-schema --to-schema --script` の結果は `ALTER TABLE "users" ADD COLUMN "hire_date" DATE NOT NULL;`。本マイグレーション最終状態(DATE, NOT NULL, 既定値なし)と一致。
- migrations 全体と schema の完全一致(drift なし)は未確認。適用時の `migrate dev` で確認する。

## ファイル3/8: backend/prisma/initial-data.ts

### 変更内容
- import に `toDbDate`(../src/common/time/tokyo-date.js)を追加。既存の相対 import の並び(security の次、generated の前)に合わせた。
- 定数 `INITIAL_ADMIN_HIRE_DATE = '2026-01-01'` を日本語コメント付きで追加(既存ユーザーの移行値と同じ固定日)。
- 初期 ADMIN の `prisma.user.create` の data に `hireDate: toDbDate(INITIAL_ADMIN_HIRE_DATE)` を追加。(差分 +4 行)

### 検証結果
- `npx prisma generate`: 成功(Client 再生成のみ、DB 未接続・未変更)。
- `npx tsc --noEmit`: initial-data.ts にエラーなし。残るエラーは他ファイルのみ(prisma/e2e-account-data.ts と test/db/db-helpers.ts が hireDate 未指定)。ファイル4以降・テスト側で対応予定。

## ファイル4/8: backend/prisma/e2e-account-data.ts

### 変更内容
- E2E_ACCOUNTS 定義の直後に、日本語コメント付きで `export const E2E_HIRE_DATE = '2026-01-01'` を追加。
- resetE2eAccounts の upsert 用 data の `departmentId: null,` の次に `hireDate: toDbDate(E2E_HIRE_DATE),` を追加(create と update の両方に入る)。import 追加なし。(差分 +4 行)

### 検証結果
- `npx tsc --noEmit`: e2e-account-data.ts にエラーなし。残りは test/db/db-helpers.ts(87) のみ(ファイル5で対応)。
- DB を変更するコマンドは未実行。

## 開発 DB への適用
- 接続先: localhost:5432 の workbridge(NODE_ENV=development、_test ではない)。確認済み。
- 適用前: users 3 件、hire_date 列なし。migrate status で未適用は 20261110144731_add_users_hire_date のみ。
- 実行: `npx prisma migrate deploy`(成功、リセット要求なし)。migrate dev は未使用。
- 適用後(MIG-01〜03): users 3 件(増減なし)/ hire_date は DATE, NOT NULL / NULL 行 0 件 / 2026-01-01 以外 0 件。
- migrate status: Database schema is up to date。`migrate diff --from-config-datasource --to-schema` は空(差分なし)。
- 確認用の一時スクリプトは削除済み。実装コードは未変更。
