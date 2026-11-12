SECURITY: PASS

## 確認結果(問題なし)
- 認可: AdminDepartmentsController は @AdminOnly() をクラスに付与。JwtAuthGuard(APP_GUARD) が Bearer 検証後に AdminGuard を呼び、未認証 401 / 非ADMIN 403 (fail-closed)。summary, :id/members, manager-candidates を含む全ルートが対象。権限はサーバー側で判定。
- 正規 SQL: memberCount 並び替えの raw SQL は Prisma.sql のタグ付きテンプレート。sort は z.enum 白名単、方向は固定断片の切り替え、ILIKE 値・LIMIT/OFFSET はバインド。update/delete/lockActiveUser の $queryRaw も ${id}::uuid でバインド、:id は ParseUUIDPipe、managerId は z.uuid。
- 入力検証: code(英数字とハイフン 1-20)、name(1-100)、description(最大500)、keyword(最大100)、managerId(UUID)。
- 個人情報最小化: members は id/empId/name のみ、manager-candidates は id/name/empId/部署名のみ(メール・権限・給与等なし)。ADMIN 専用、候補は最大100件。
- 競合: 部署行 FOR UPDATE → 社員行 FOR NO KEY UPDATE の順でロックし、無効化との競合・新規所属との競合を直列化。削除時の P2003 も rollback して hasMembers に変換。
- 未所属保護: update/delete ともに FOR UPDATE ロック後に code 比較で protected。create で SYSTEM_DEPARTMENT_CODE を作ろうとしても UNIQUE で重複扱い。
- XSS: description は React のテキストノード/属性として描画。dangerouslySetInnerHTML / innerHTML の使用なし。whitespace-pre-line は CSS のみ。

## 指摘
[低] [担当: backend] backend/src/modules/departments/departments.service.ts:18-20,52-53 と departments.repository.ts:96-97 — 一覧の code/name を escapeLikePattern で事前エスケープした後、Prisma の contains(内部で自動エスケープ)に渡している。memberCount 以外の並び替えでは二重エスケープとなり、"%" "_" "\" を含む検索語の一致結果が並び替えキーで食い違う可能性がある。インジェクションにはならず機能上の不整合のみ / 悪用経路なし / 修正方向: Prisma 経路には生の値を渡し、エスケープは raw SQL 経路(ILIKE)だけに適用する(ESCAPE 句の明示も検討)。
[低] [担当: backend] departments.repository.ts:205-221 — 責任者候補が keyword なしで全社員の empId/氏名/部署名を上限100件返す。ADMIN 限定のため許容範囲だが、将来 ADMIN 以外に開放する場合は再評価が必要 / 修正方向: 現状維持(コメントで ADMIN 限定前提を明記すると良い)。

## 件数
치명 0 / 높음 0 / 중간 0 / 낮음 2
