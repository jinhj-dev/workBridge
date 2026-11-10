SECURITY: PASS

# 休暇カレンダー セキュリティ点検

件数: 치명 0 / 높음 0 / 중간 0 / 낮음 3

## 確認結果 (問題なし)
- 応答フィールド: day API は userId・name・departmentName・halfDay のみ (dashboard.service.ts:56-61)。repository の select は id・name・department.name・leaves.leaveType のみで、事由・状態・社員番号・メール等は読み出していない (dashboard.repository.ts:82-91)。社員番号は orderBy のみ。
- 状態の漏洩なし: 集計 (raw SQL) / 詳細 / halfDay 判定のすべてが status='APPROVED' に限定。halfDay 用の leaves も同じ approvedOnDate 条件で絞り込み済み。PENDING・REJECTED・CANCELLED は到達しない。
- 非活性社員の除外: raw SQL は u.is_active、詳細は where isActive:true。
- 認可: JwtAuthGuard が APP_GUARD で全 API に適用 (@Public なし) → トークンなしは 401、PasswordChangeGuard により要パスワード変更は 403。DashboardController は管理者専用ではなく設計どおり全認証ユーザー向け。admin/dashboard は別コントローラーで分離。
- raw SQL: Prisma タグ付きテンプレートで start/end は全てバインド変数 (文字列連結なし)。さらに zod で厳密な形式検証後に渡される。
- 入力検証: month は ^\d{4}-(0[1-9]|1[0-2])$、date は実在日検証、年 2000-2100。範囲は 1 か月 (最大 31 日) に固定され generate_series の過大展開は不可。不正入力は検証で 400。
- フロント: dangerouslySetInnerHTML・innerHTML・localStorage の使用なし。氏名などは React のエスケープ経由。クエリ文字列は内部生成の month/date のみ。

## 指摘
[낮음] [담당: backend] backend/src/modules/dashboard/dashboard.controller.ts:25 — /day は 1 日の全員分 (件数上限・ページングなし) を返す。悪用シナリオ: 認証済みユーザーが連日呼び出して全社員の休暇予定を収集可能だが、機能自体が全員公開の仕様であり追加の情報露出はない。修正方向: 仕様として許容。必要なら全体の rate limit (現状プロジェクトに Throttler なし) を別タスクで検討。
[낮음] [담당: backend] backend/src/modules/dashboard/dto/leave-calendar-query.dto.ts:16 — 年 2000-2100 の範囲内なら過去・未来の任意月を無制限に参照できる。悪用シナリオ: 過去履歴の走査による休暇傾向の把握。修正方向: 業務上問題なければ現状維持。必要なら参照可能期間を狭める。
[낮음] [담당: frontend] frontend/src/app/(app)/dashboard/LeaveCalendarDayModal.tsx:32 — userId (UUID) は React の key にしか使われていない。UUID 自体は推測不能で他 API の認可に影響しないが、公開の必然性は薄い。修正方向: 設計上 (API-DASH-003) の項目なら維持。不要なら応答から削除し、name+index 等を key にする。

## 備考
- Card.tsx (共通コンポーネント) の変更はセキュリティ上の入力・出力経路に関わる変更を含まないことを grep で確認 (危険 API 使用なし)。
- 新規依存パッケージは確認した範囲で追加なし (zod は既存利用)。
- worktree workBridge-sample-pw は対象外。
