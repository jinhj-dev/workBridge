# backend.md

## Fix 1: db:e2e-leaves-reset スクリプト追加

frontend/e2e/leaves.spec.ts の beforeAll が呼ぶ npm run db:e2e-leaves-reset が存在しなかった既存欠陥の解消(ユーザー承認済み)。

### 生成・修正ファイル
- 新規: backend/prisma/e2e-leaves-reset.ts (e2e-attendance-reset.ts と同パターン。dotenv/config、DATABASE_URL 必須、assertLocalDatabaseUrl、本番拒否、削除件数を出力)
- 修正: backend/prisma/e2e-account-data.ts (resetE2eAdminLeaves を追加。900001 の存在と氏名を確認後、leaves を user_id 基準で deleteMany)
- 修正: backend/prisma/e2e-account-data.spec.ts (resetE2eAdminLeaves の単体テスト 3 件。prisma モックで DB 非接続)
- 修正: backend/package.json ("db:e2e-leaves-reset": "tsx prisma/e2e-leaves-reset.ts")

### API 要約
HTTP エンドポイントの変更なし。スキーマ・他テーブル(leave_grants 等)・他ユーザー行は未変更。
900001 が未作成なら「先に npm run db:e2e-accounts」の例外で終了(終了コード 1)。

### 検証
- backend tsc --noEmit: エラーなし
- eslint (変更 3 ファイル): エラーなし
- vitest prisma/e2e-account-data.spec.ts: 26 件成功
- スクリプト本体は未実行(tester が実行)

### API 文書と異なる点 / 文書更新予定
なし(開発用スクリプトのみ)。

### フロントエンドへ
環境変数の追加なし。DATABASE_URL(ローカル DB)のみ必要。

### context.md 訂正
なし。
