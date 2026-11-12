SECURITY: PASS

# セキュリティ点検 (leave-management)

公開範囲は plan.md 確定事項(APPROVED・有効な社員のみ、{name, empId, departmentName, startDate, endDate, category, halfDay})を基準に判定した。

## 確認結果(問題なし)
- GET /leaves/calendar: グローバル JwtAuthGuard 配下(未認証は拒否)。repository の CALENDAR_LEAVE_SELECT で id・事由・日数・承認者・状態を SELECT せず、service でも許可項目のみ組み立て。status=APPROVED と user.isActive=true を where で固定。OTHER は category=OTHER としてのみ返す(詳細種別は漏れない)。SPECIAL は plan 確定の公開項目。
- 検索パラメータ(month, departmentId, name, empId): zod で形式・長さ(name 100, empId 50, month 正規表現+年範囲, departmentId は uuid)を検証し、Prisma のパラメータ化クエリ(contains)のみ使用。生 SQL なし。
- pending-approval: scope=all は service で ADMIN 以外 403。scope=mine は approverId=user.id 固定。status は PENDING/APPROVED/REJECTED の列挙のみ(CANCELLED は不可、未知値・空要素は検証エラー)。status 拡張で割り当て範囲は広がらない。
- 承認/却下/詳細: canProcessLeave / canViewLeave をサーバーで判定(本人は承認不可、担当者か ADMIN のみ)。PENDING のみ条件付き UPDATE。
- 承認タブ表示判定(フロント)は「自分への依頼の有無(ADMIN は常時)」で、サーバーの scope=mine の割当範囲と一致。表示は UX のみで、権限は全てサーバー側で強制。直接 URL アクセス時もデータは API の認可に依存。
- 申請日範囲(appliedFrom/appliedTo): dateSchema で検証、from<=to を refine、本人(userId)条件固定のため他者データ参照不可。
- フロント: dangerouslySetInnerHTML / localStorage 使用なし(React のエスケープに依存)。Access Token はメモリ保持。

## 指摘
[低] [担当: backend] backend/src/modules/leaves/leaves.repository.ts:250-251 — name/empId の contains にワイルドカード(% _)がそのまま渡る可能性。悪用は部分一致の幅が広がるだけで、認証済み全社員に公開される項目内に限られ、情報露出は増えない。/ 修正方向: 必要なら % _ をエスケープ(任意)。
[低] [担当: backend] backend/src/modules/leaves/leaves.service.ts:221-248 — calendar は件数上限なし。月単位で範囲が限定されるため実害は小さい。/ 修正方向: 運用上問題が出た場合に上限を検討(任意)。

## 件数
- 치명: 0
- 높음: 0
- 중간: 0
- 낮음: 2
