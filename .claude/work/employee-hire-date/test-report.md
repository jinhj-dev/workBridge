RESULT: PASS

# テストレポート: employee-hire-date

テスト実行はテスト DB(workbridge_test)へのマイグレーション適用の承認後に実施し、結果は末尾の「テスト実行」節に記録した。

## ファイル5: backend/test/db/db-helpers.ts

### 適用した変更(案A・承認済み)
- import は追加しない。既存のローカル関数 `toDbDate` を使う。
- `TestDataTracker.createUser` の data に `hireDate: toDbDate('2026-01-01'),` を 1 行追加(`role: 'EMPLOYEE',` の次、`...overrides` の前)。

差分:
```diff
         role: 'EMPLOYEE',
+        hireDate: toDbDate('2026-01-01'),
         ...overrides,
```

### 経緯
- 最初に承認された import `toDbDate`(tokyo-date.js)を追加すると、同ファイルのローカル定義と衝突して TS2440 になった。そのため一度差し戻した。
- 上記の案Aで再適用した。

### 検証結果
- `npx tsc --noEmit`: エラー 0 件 (PASS)
- `npx eslint test/db/db-helpers.ts`: 0 件 (PASS)
- テスト実行: 未実施(DB 変更を伴うため禁止。テスト DB へのマイグレーション適用は承認待ち)

### 未検証項目
- 実 DB に対する `createUser` の動作(hireDate の保存)は未確認。テスト実行時に確認が必要。

## ファイル6: backend/test/db/schema.e2e-spec.ts

### 追加した変更
- 末尾に `describe('users.hire_date')` を追加(既存のテストは変更していない)。
- 追加したテスト(test-plan の DB-HD-01〜04):
  1. `DATE 型・NOT NULL・既定値なしで定義されている`(DB-HD-01): information_schema.columns で data_type = date、is_nullable = NO、column_default = NULL を確認
  2. `入社日を保存し、YYYY-MM-DD のまま読み出せる`(DB-HD-02): `createUser({ hireDate: toDbDate('2026-04-01') })` 後に DB から再取得し、`fromDbDate` が `2026-04-01`
  3. `入社日なしの INSERT を拒否する`(DB-HD-03): raw SQL で hire_date を省いて INSERT。SQLSTATE 23502 を確認(`$executeRaw` 経由のため P2010)
  4. `閏年・月末・未来の日付がずれずに往復する`(DB-HD-04): 2028-02-29 / 2026-12-31 / 2030-04-01 について、Prisma の値と DB の `::text` の両方を確認
- 作成した行は既存の `TestDataTracker` 経由のため、既存と同じく afterAll の cleanup で削除される。raw INSERT は失敗する想定のため行は残らない。

### 検証結果
- `npx tsc --noEmit`: エラー 0 件 (PASS)
- `npx eslint test/db/schema.e2e-spec.ts`: 0 件 (PASS)
- `npx prettier --check test/db/schema.e2e-spec.ts`: 整形済み (PASS)
- テスト実行: 未実施。テスト DB へのマイグレーション適用の承認後、ファイル7・8 の作成後にまとめて実行する。

### 未検証項目
- 実 DB での 4 テストの結果(特に information_schema の値の取得形式と、raw INSERT が P2010 / 23502 になること)は未確認。

## ファイル7: backend/test/db/seed.e2e-spec.ts

### 追加した変更
- 既存テスト「初回は部署と初期 ADMIN を登録し、…」の admin の `toMatchObject` の直後に追加:
  ```ts
  // 初期 ADMIN の入社日は固定日
  expect(fromDbDate(admin.hireDate)).toBe('2026-01-01');
  ```
- import: `fromDbDate` を既存の `./db-helpers.js` の import に追加。`db-helpers.ts` が export しているため、tokyo-date からの別 import は追加していない(ローカル定義との衝突は発生しない)。
- 既存のテストケースは変更していない。

### SEED-HD-01 の期待値の変更
- test-plan の SEED-HD-01 は「実行前後の東京の今日のいずれか」だったが、ユーザーの決定により初期 ADMIN の入社日は固定 `2026-01-01` になった。
- そのため期待値を `'2026-01-01'` に変更した。実装側は `prisma/initial-data.ts` の `INITIAL_ADMIN_HIRE_DATE = '2026-01-01'` で、値が一致することを確認済み。

### 検証結果
- `npx tsc --noEmit`: エラー 0 件 (PASS)
- `npx eslint test/db/seed.e2e-spec.ts`: 0 件 (PASS)
- `npx prettier --check test/db/seed.e2e-spec.ts`: 整形済み (PASS)
- テスト実行: 未実施(承認待ち。ファイル8 作成後にまとめて実行する)

### 未検証項目
- 実 DB での seed テストの結果は未確認。

## ファイル8: backend/test/db/e2e-accounts.e2e-spec.ts

### 追加した変更
- import: `E2E_HIRE_DATE` を `prisma/e2e-account-data.js` の import に追加。`fromDbDate` / `toDbDate` は `db-helpers.js` から import(同じ import 文に統合。ローカル定義との衝突なし)。
- `shouldCreateBothAccountsWithExpectedStateOnFirstRun`:
  - admin の `toMatchObject` 直後に `expect(fromDbDate(admin.hireDate)).toBe(E2E_HIRE_DATE);`
  - initial の `toMatchObject` 直後に `expect(fromDbDate(initial.hireDate)).toBe(E2E_HIRE_DATE);`
- `shouldRestoreExpectedStateWhenAccountsWereChanged`:
  - initial の `prisma.user.update` の data に `// 別の日付に変更` と `hireDate: toDbDate('2025-04-01'),` を追加
  - `resetAndTrack` 後の initial の確認に `expect(fromDbDate(initial.hireDate)).toBe(E2E_HIRE_DATE);` を追加
- 既存テストの他の部分は変更していない。

### 検証結果
- `npx prettier --check test/db/e2e-accounts.e2e-spec.ts`: 整形済み (PASS)
- `npx tsc --noEmit`(backend 全体): エラー 0 件 (PASS)
- `npx eslint test/db/e2e-accounts.e2e-spec.ts`: 0 件 (PASS)
- テスト実行: 未実施(承認待ち)

### 未検証項目
- 実 DB での e2e-accounts テストの結果は未確認。

## 全体の静的検証(ファイル5〜8 適用後)
- `npx tsc --noEmit`(backend): エラー 0 件 (PASS)
- `npm run lint`(backend): エラー 0 件 (PASS)
- テスト実行(vitest / e2e): 未実施(当時)。結果は下記「テスト実行」節に記録し、先頭行を RESULT: PASS に更新済み。

## テスト実行(テスト DB: workbridge_test、Run 1)

### マイグレーション適用
- `npm run db:migrate:test`(接続先はローカル `*_test` DB のみ。ガードあり): 適用成功
- 適用されたマイグレーション: `20261110144731_add_users_hire_date`
- 開発 DB には接続していない。`migrate dev` / `deploy`(開発 DB 向け)は実行していない。

### MIG 項目(テスト DB では users が 0 件のため、件数・埋め戻しの検証は不可)
- テスト DB の users は 0 件。hire_date の NULL 0 件・2026-01-01 以外 0 件は成立するが、既存行の埋め戻しの検証にはなっていない。

### MIG 項目の確認(開発 DB、backend 担当。backend.md「開発 DB への適用」参照)
- MIG-01: users 3 件が適用前後で同数、hire_date NULL 0 件 → 確認済み
- MIG-02: 2026-01-01 以外の行 0 件 → 確認済み
- MIG-03: `migrate status` は最新、`migrate diff` は差分なし → 確認済み

### テスト結果
- 単体テスト(`npm test`): 14 ファイル / 185 件 すべて PASS
- e2e テスト(`npm run test:e2e`): 10 ファイル / 238 件 すべて PASS
- 新規・関連テスト(verbose で個別確認): 12 件 PASS
  - schema.e2e-spec.ts > users.hire_date: 4 件(DB-HD-01〜04)
  - seed.e2e-spec.ts: 2 件(SEED-HD-01 の期待値 2026-01-01 を含む)
  - e2e-accounts.e2e-spec.ts: 6 件(E2E-HD-01〜02 の確認を含む)
- 失敗: 0 件

### 静的検証
- `npx tsc --noEmit`: エラー 0 件
- `npm run lint`: エラー 0 件
- 変更したテストファイルに `.skip` / `.only` / `.todo` / TODO の残りなし

### 未検証項目
- 本当に未確認の項目はなし(機能 8 の API・画面は対象外。本 Run の範囲外)

### 補足
- SEED-HD-01 の「東京の今日」は、ユーザー決定により固定値 2026-01-01 の確認に変更済み
- 実装コード(prisma/ 配下と src/)は変更していない。テストの不備は見つからなかったため、テストコードの修正は行っていない。
