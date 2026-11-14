SECURITY: PASS

# セキュリティ点検結果(employee-management)

## Round 1
重大度別: 치명 0 / 높음 0 / 중간 0 / 낮음 3

### 確認済み(問題なし)
- ADMIN 限定: AdminUsersController・AdminJobTitlesController とも クラスに @AdminOnly()。JwtAuthGuard(APP_GUARD)が毎回 DB で isActive と role を再取得し、AdminGuard が 403。パス文字列判定ではなくメタデータ判定。役職(jobTitle)は Role に無関係で、ログインの role は users.role のみ。
- 初期パスワード: createUserSchema で checkPasswordPolicy(8文字以上・英数・72バイト以下)をサーバ側検証。bcrypt(BCRYPT_COST)でハッシュ化し、mustChangePassword: true で保存。UserRow/UserDetail に passwordHash は含まれず、応答に平文・ハッシュとも出ない。検証エラーの details は固定メッセージのみで入力値を含まない。initialPassword をログ出力する箇所なし(Logger は例外スタックのみ)。
- strict DTO: create/update/job-title とも z.strictObject。update にパスワード・mustChangePassword 項目なし。:id は ParseUUIDPipe、クエリの UUID/enum も検証。
- LIKE エスケープ: keyword/name/empId を escapeLikePattern(\ % _)後に Prisma の contains(パラメータ化)で検索。生 SQL は固定文字列かバインド変数のみ(SQL インジェクション経路なし)。
- LAST_ADMIN: 有効 ADMIN 全員を id 昇順で FOR NO KEY UPDATE ロックし、同一トランザクション内で件数確認。無効化(有効→無効)時は休暇取消・部署責任者解除・Refresh Token 失効(revokedAt)を同一トランザクションで実施。
- 社員名: \p{Cc}\p{Zl}\p{Zp} を拒否、100 文字上限。
- 個人情報: contactEmail は ADMIN 専用 API の応答のみ。passwordHash・Refresh Token は未返却。
- cleanup スクリプト: DATABASE_URL 必須、assertLocalDatabaseUrl(localhost/127.0.0.1/::1 のみ)、NODE_ENV=production で拒否。名前接頭辞 + E2E 専用メール形式 + 固定アカウント/サンプル社員番号の除外の三重条件。削除はトランザクション。

### 権告事項(낮음)
- [낮음] [担当: backend] job-title.dto.ts — 役職名に制御文字拒否がない。
- [낮음] [担当: backend] e2e-users-cleanup.ts — 役職削除が名前接頭辞のみで判定。
- [낮음] [担当: backend] users.repository.ts — 想定外 Prisma エラーのスタックにクエリ引数(passwordHash)が含まれうる。

## Round 2(修正ファイルのみ再点検)
重大度別: 치명 0 / 높음 0 / 중간 0 / 낮음 0

### Round 1 の指摘の解消
- 낮음1 解消: backend/src/modules/job-titles/dto/job-title.dto.ts:14-22 — 社員名と同じ /[\p{Cc}\p{Zl}\p{Zp}]/u を役職名に適用(create/update 共通スキーマ)。
- 낮음3 解消: backend/src/modules/users/users.repository.ts:109-132, 281, 373 — 想定外エラーは failUnexpectedly でエラー名とコードのみをログに残し、固定文言の 500 を返す。Prisma のメッセージ・スタック(クエリ引数)はログにも応答にも出ない。create/update 両方の catch で適用済み。
- 낮음2 解消: backend/prisma/e2e-users-cleanup.ts:94-101 — 使用中(users: some)の E2E役職は削除せず、未使用のみ削除。

### 修正箇所の点検結果(問題なし)
- e2e-users-cleanup.ts: 他社員の休暇・勤怠が E2E 社員を承認者・処理者・修正者として参照している場合は、トランザクション内で何も削除せず例外で中止(exit 1)。以前は E2E 社員以外の休暇(userId が非 E2E)まで承認者参照で削除していたが、削除は userId が E2E 社員のものだけに限定され、誤削除の範囲が狭まった。ローカルホスト限定・production 拒否・三重条件は維持。
- frontend userFormRules.ts: クライアント側検証はサーバ検証と同じ規則の補助で、権限判定ではない(サーバが最終判断)。サーバエラー details は固定メッセージを項目に結ぶだけ。入力値のログ・localStorage・innerHTML・dangerouslySetInnerHTML の使用なし(admin/users と components を grep で確認)。パスワードは userFormRules に出力・保存されない。
- RadioCardGroup / ConfirmDialog / Select 等のフロント UI 部品に innerHTML 系の使用なし。
