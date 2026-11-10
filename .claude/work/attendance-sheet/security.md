SECURITY: PASS

# セキュリティ点検結果 (attendance-sheet / Round 1)

対象: GET /attendance/monthly (API-ATT-007)、@holiday-jp/holiday_jp 追加、e2e fixture 削除

## 点検結果サマリ

| 項目 | 結果 |
|---|---|
| 認証 | OK。JwtAuthGuard が APP_GUARD でグローバル適用され、/attendance/monthly に @Public() は付いていない。未認証 401 は e2e でも検証済み |
| IDOR・本人限定 | OK。userId は @CurrentUser() のトークン由来のみ。query は month だけで userId を受け取らない。勤怠・休暇・入社日の 3 クエリすべてが where に userId を含む。他人の勤怠が混ざらないことを e2e で検証済み |
| month 検証 | OK。zod の正規表現 ^\d{4}-(0[1-9]|1[0-2])$ と年 2000〜2100 の範囲。不正値は 400。日付ループの上限は最大 31 日で、DoS やインジェクションの経路なし |
| SQL インジェクション | OK。Prisma のパラメータ化クエリのみ |
| 応答の個人情報 | OK。自分の勤怠・休暇の最小列のみ。user 情報(氏名など)は含まず、ATTENDANCE_SELECT の user 結合も使わない。休暇は id・種別・状態のみで、理由や承認者は返さない。modifiedAt の返却は本人分のみで問題なし |
| XSS | OK。frontend の dangerouslySetInnerHTML と innerHTML の使用なし。Access Token はメモリ保持で localStorage 不使用 |
| 依存パッケージ | OK(下記) |
| e2e fixture 削除 | 残存リスクなし(下記) |

## 依存パッケージ @holiday-jp/holiday_jp 2.5.2

- ライセンスは MIT (package-lock の記載)。
- lock は registry.npmjs.org の resolved URL と sha512 integrity を保持している。
- package-lock 上に推移的依存はなく、依存ゼロの単体データパッケージ。
- 実行時はデータ表の参照のみで、ネットワークやファイル I/O をしない。
- caret 指定 (^2.5.2) でも lock で固定される。CI では npm ci を使うこと。
- 未実施: npm audit は実行できなかった(この環境はファイル読み取りと検索のみ)。既知の脆弱性の確認は、マージ前に `npm audit --omit=dev` を実行して補完してほしい。

## 削除した e2e fixture

- e2e-attendance-fixture.ts を参照するコードは .claude 配下を除いて残っていない(grep 確認済み)。
- 代替の resetE2eAdminAttendance は E2E 管理者(900001)本人の勤怠だけを deleteMany する。
  - 存在と氏名を検証し、不一致なら例外にする。
  - 呼び出し側の e2e-attendance-reset.ts は assertLocalDatabaseUrl で実行先をローカル DB に限定している。
- e2e のパスワードは環境変数 (E2E_ADMIN_PASSWORD、E2E_INITIAL_PASSWORD) から取り、assertValidPassword で検証し、bcrypt でハッシュ化している。ハードコードなし。

## 指摘事項

[低] [担当: backend] backend/src/modules/attendance/attendance.repository.ts:131-137 — findHireDate が findUniqueOrThrow を使っている。トークンが有効なまま対象ユーザーが削除済みの場合は 500 になる。ただし JwtAuthGuard 側でユーザー存在を確認しているなら発生しない。内部情報は漏れず、悪用経路もない。修正方向: 無効ユーザーは 401/404 に写像するか、ガードの前提を確認する。

[低] [担当: backend] backend/src/modules/attendance/attendance.controller.ts:32 — /attendance/monthly に rate limit がない。ただし本人データの読み取りのみで、1 リクエストあたりの計算量は最大 31 日分と小さい。既存 API と同水準。修正方向: 全体の rate limit 方針があれば、それに合わせる。

[低] [担当: backend] backend/src/common/time/japanese-holiday.ts:15 — 祝日データの更新がライブラリのバージョンアップ依存。2050 年を超えた範囲は祝日なしとして扱う。セキュリティ影響はなく、メンテ上の注意のみ。修正方向: Dependabot などで定期更新する。

## 件数

- 治命: 0
- 高い: 0
- 中間: 0
- 低い: 3
