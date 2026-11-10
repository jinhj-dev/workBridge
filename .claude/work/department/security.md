SECURITY: PASS

対象: feature/department の管理者用部署 API、ガード、入力検証、削除トランザクション、マイグレーション、SCR-010。

## 問題
[低] [担当: backend] backend/src/modules/departments/departments.service.ts:44 — 一覧クエリの `code` と `name` を LIKE の `contains` に渡している。Prisma はワイルドカード `%` と `_` をエスケープしないので、管理者が全件に一致するパターンを作れる。管理者専用 API なので悪用経路は事実上ない。必要ならエスケープする。
[低] [担当: backend] backend/src/modules/departments/departments.repository.ts:173 — 未所属部署が無いと、素の `Error` が 500 になる。内部メッセージはグローバル例外フィルタ経由で返るので、本番で詳細が漏れないか確認すること。マイグレーションが未所属部署を保証しているので、通常は発生しない。
[低] [担当: backend] backend/src/modules/departments/admin-departments.controller.ts:25 — `:id` の UUID 検証が Service 側にあり、Controller には ParseUUIDPipe がない。不正な ID は 404 になるので実害はない。

## 確認結果(問題なし)
- 認可: `@AdminOnly()` をクラスに付与。グローバルの JwtAuthGuard が AdminGuard を呼ぶので、ADMIN 以外は 403、未認証は 401 になる。全メソッドが対象。
- SQL インジェクション: 生 SQL は `FOR UPDATE` の 1 か所だけ。タグ付きテンプレートでバインドし、`::uuid` キャスト前に UUID 検証済み。他は Prisma の通常 API。
- 入力検証: zod で code は `^[A-Za-z0-9-]{1,20}$`、name は 100 文字以内、クエリ文字列にも長さ上限がある。ページネーションは `paginationQuerySchema` による。
- 保護された部署: 未所属部署(`UNASSIGNED`)の更新と削除は、更新時は事前確認、削除時はロック下の確認で拒否している。
- 削除の競合: 行を `FOR UPDATE` でロックし、有効社員の有無を確認してから削除する。P2003 が出たらトランザクションごと取り消す。TOCTOU は塞がれている。
- ユーザー列挙や情報露出: 重複エラーは code と name の汎用メッセージだけ。DB 内部情報は返さない。
- マイグレーション: 文字列は固定リテラルで、インジェクション経路はない。NOT NULL 化の前にデータを補完している。ロールバック手順はコメントで残してある。
- フロント: `dangerouslySetInnerHTML` と `localStorage` の使用なし。React のエスケープに任せている。サーバー側の認可が正で、フロントの表示制御は補助。
- 新規依存パッケージの追加は確認できなかった。

## 件数
治命: 0 / 高: 0 / 中: 0 / 低: 3

---

## Round 2

SECURITY: PASS

対象: Round 1 の低 3 件の修正(backend.md "Fix 2")と frontend/e2e/attendance.spec.ts の afterAll 追加のみ。

### Round 1 指摘の解消確認
- [解消] 検索語の LIKE エスケープ: departments.service.ts:14-16,48-49 の `escapeLikePattern` が `\`, `%`, `_` を `\` でエスケープしてから repository の `contains` に渡す。PostgreSQL の LIKE 既定エスケープ文字は `\` なので文字そのものとして一致する。順序も正しい(1 回の正規表現置換で二重エスケープなし)。
- [解消] 未所属部署の欠落: departments.repository.ts:175-185 が詳細をログにだけ残し、`AppException('INTERNAL_SERVER_ERROR', 500, 'サーバーでエラーが発生しました。')` を投げる。応答に内部情報は出ない。トランザクション内の throw なので無効社員の移動も取り消される。
- [解消] `:id` の UUID 検証: admin-departments.controller.ts:27-32,47,60,68 の `ParseUUIDPipe` が GET/PATCH/DELETE すべてで 400 VALIDATION_ERROR を返す。Service 側の `assertUuid` は残っていない。生 SQL の `${id}::uuid` に到達する経路は Controller のみで、他の呼び出し元がないことを grep で確認した。
- [問題なし] afterAll: PLAYWRIGHT_BASE_URL 指定時は `db:e2e-accounts` を実行しない。外部環境の DB を触らない側への変更で、悪化なし。

### 新規の問題
なし。

### 件数
治命: 0 / 高: 0 / 中: 0 / 低: 0(Round 1 の低 3 件は解消)
