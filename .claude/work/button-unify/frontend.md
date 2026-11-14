# frontend.md — button-unify (MODE: FULL, PARALLEL)
## 변경 파일
신규 `components/ActionButtons.tsx`(DetailButton·EditButton). 수정: `components/leave/leaveIcons.tsx`(+EyeIcon), `admin/users/icons.tsx`(−EyeIcon), `messages/ja.ts`(common.detail/edit 추가, 미사용 7키 삭제, adminAttendance.editLabel 「編集」), `admin/users/{UsersView,UserDetailModal,JobTitlesModal}`, `admin/departments/{DepartmentsView,DepartmentDetailModal}`, `admin/attendance/AdminAttendanceView`(로컬 EditButton 삭제, sr-only 열 제목 `common.edit`), `leaves/LeaveHistoryList`, `leaves/approvals/ApprovalsView`, `frontend/eslint.config.mjs`(selector를 Button|DetailButton|EditButton으로). 산출물 `candidates-report.md`.
## 구현 (D1~D5, E1~E6, decisions.md Q1 유지/Q2 A/Q3 B/Q4 A)
사용 시스템 컴포넌트: Button(프리셋 경유), DetailButton, EditButton, Modal footer. 새 클래스·토큰 없음. 정적 확인: PencilIcon/EyeIcon은 UserEditModal 제목 아이콘만 남음, 「修正」은 대상 외 문구만 남음.
## 검증
- `npx eslint src eslint.config.mjs`: 오류 0. `npx tsc --noEmit`: src 오류 0 (e2e 6개 spec이 삭제된 키 `adminAttendance.edit`·`departments.detail/edit`·`leaves.history.detail` 참조로 실패 — tester 소유, 수정 필요).
- `npx vitest run`: 1회차 901/902 통과(tester 작성 중 UsersView.test 1건 실패), admin 폴더 재실행은 실패 없음.
## 화면 확인 (screenshots/, 360/768/1024/1440, SCR-004/005/006/008/010 + 社員詳細·役職確認·部署詳細 모달)
- 문서 가로 overflow 모든 폭 0. 1440: SCR-010 [詳細][編集][削除]·SCR-004 [詳細]·役職確認 아이콘 전용 파란 편집+빨간 삭제 정상. Focus: 編集 버튼 2px solid primary-100 outline, Enter로 모달 열림 확인.
- **발견(미수정, 레이아웃 변경 금지 지시)**: ① 360px 部署詳細 footer의 [この部署を編集]가 2줄로 줄바꿈(md 버튼은 nowrap 없음, 고정 높이 40 안에서 글자가 겹침 위험) — Q4로 아이콘(+28px) 추가된 결과. 대응안: 좁은 폭에서 문구 단축 또는 footer 세로 배치 또는 md에 nowrap+폭 확보(결정 필요). ② 768px SCR-010 표에서 操作 열이 화면 밖(표 스크롤 컨테이너로 잘림)이며 기준선 대비 악화 여부는 미측정. ③ SCR-005는 관리자 계정에 대기 건이 0이라 [詳細][承認][却下] 행/카드 실물 캡처 불가(승인 데이터 필요, 미확인). SCR-008 편집 버튼 모달·SCR-004 360 카드 개별 확인은 미실시.
## 문서 갱신 예정
09 §5-11·§6 ActionButtons 행·leaveIcons EyeIcon, UI_BUTTON_PATTERNS §2.1/§9/§11(B18·B19·Q1~Q4)/§12 v4, 04 SCR-004·005·006·008(§5 編集·접근 이름)·010, context.md 공용 모듈, 10 로드맵(design-frontend §10 그대로).
## impeccable 점검
기존 Button 변형만 사용, 신규 스타일 없음. 점검 결과 위 ① 이외 이슈 없음.

## Fix 1 (Q5: 部署詳細 footer 文言を「編集」に)
- `admin/departments/DepartmentDetailModal.tsx`: `<EditButton size="md" onClick=... />`(children 指定なし、既定文言「編集」。aria-label なし=可視文言が名前で WCAG 2.5.3 OK)。`ja.ts` の `departments.editSelected` を削除。
- 再撮影 `screenshots/scr010-detail-360-r2.png`・`scr010-detail-1440-r2.png`: 360px で 1 行に収まり折り返し解消、ボタン高さ 40。(Fix 1 前の「発見 ①」は解決)
- `npx eslint src`: 0 件。`npx tsc --noEmit`: src の非テスト 0 件。
- **テスト側の修正が必要(tester、触っていない)**: `editSelected` 参照 5 件で tsc 失敗 — `src/app/(app)/admin/departments/DepartmentsView.test.tsx`(343, 361, 394 行), `e2e/button-unify.spec.ts`(311), `e2e/departments-list-modal.spec.ts`(191)。名前は `messages.common.edit`(「編集」)に。モーダル内では行ボタンと区別するため `within(modal)` を使うこと。
- 文書更新予定の「SCR-010 部署詳細 footer」文言を「編集」に更新。

## Fix 2 (Q6: SCR-010 部署一覧の表/カード切替を md → xl)
- `admin/departments/DepartmentsView.tsx` 4 箇所のみ(`md:justify-end`:110, 表ラッパー `md:block`:338, カード ul `md:hidden`:405, 並べ替え select `md:hidden`:489)を `xl:` に。表・カードの見た目は不変。
- lg(1024)案は不可: 1024px で表がラッパー内 138px 横スクロール。xl(1280)で 0。
- 測定(操作列=可視な [詳細] ボタン, 文書 overflow / 表ラッパー overflow): 360・768・1024・1279 はカード表示で両方 0 / 表なし(詳細ボタン右端 124/136/402/402)。1280・1440 は表表示で両方 0、詳細ボタン右端 1125/1203(画面内)。
- 再撮影 `screenshots/scr010-{360,768,1024,1279,1280,1440}-r2.png`。
- `npx eslint src`: 0 件。`npx tsc --noEmit`: src 0 件(e2e/テストの Fix 1 由来エラーは別)。
- テスト依存: 768〜1279px で SCR-010 の表を前提にする viewport 指定の spec/テストがあれば、カード表示に変わる(grep 上、departments を触る e2e に該当する幅指定は検出されず。`departments-responsive.spec.ts` の幅はtesterが確認のこと)。

## Fix 3 (review [frontend])
- `AdminAttendanceView.tsx` を prettier で整形(182-185・224-227 のインデント)、`DepartmentsView.tsx` 336・404 のコメントを「xl 以上/未満」に。ActionButtons の children 置換は維持。
- `prettier --check`(自分の変更 12 ファイル): JobTitlesModal を整形し全て通過。`eslint src`: 0 件。`tsc --noEmit`: src 0 件。
- 文書更新予定(追加):
  - **Q6**: SCR-010 部署一覧の表/カード切替を md→xl(1280px)に変更。理由: 768/1024px で表の操作列が横スクロールの先になるため(1024 でも 138px 溢れる)。対象: `docs/04 SCR-010` §3(34・41・56・57 行。「SCR-008 と同じ」記述も修正)、`docs/08_TEST_PLAN.md`、`docs/10_DEVELOPMENT_ROADMAP.md`。
  - `ActionButtons` の `children` による文言置換は例外的にのみ使用する(既定文言「詳細」「編集」を優先)と 09 §6・UI_BUTTON_PATTERNS に記載。

## Fix 4 (Q7: SCR-005 承認表/カード切替を md → xl)
- `leaves/approvals/ApprovalsView.tsx` 173-174・241-242 のみ(表 `hidden xl:table`、カード ul `xl:hidden`、コメント「xl 以上/未満」)。連動する md: 切替要素なし(289・326 行の md:gap/p は余白で別物)。
- lg 案は不可: 1024px で表ラッパー 87px 溢れ・文書 46px 溢れ。xl で 0。
- 測定(文書 overflow / 表ラッパー overflow / 操作ボタン右端): 360・768・1024・1279 はカード(0 / なし / 124・136・402・402)。1280・1440 は表(0 / 0 / 1207・1367)。管理者に承認待ちが無く [承認][却下] が実在しないため、[詳細] を 2 つ複製して 承認・却下 に見立てた状態(ボタン 3 個)でも 1280 で右端 1207 ≤ 1280・overflow 0 を確認(近似)。
- 再撮影 `screenshots/scr005-{360,768,1024,1279,1280,1440}-r2.png`(実データ状態、複製なし)。
- `eslint src`: 0 件。`tsc --noEmit`: src 0 件。`prettier --check ApprovalsView.tsx`: 通過。
- テスト依存: 768〜1279px で SCR-005 の表を前提にする spec があればカード表示になる(`approvals.spec.ts` ほか viewport 幅指定は tester が確認)。
- 文書更新予定: `docs/04 SCR-005` の表/カード切替を md→xl、`docs/08_TEST_PLAN.md`、`docs/10_DEVELOPMENT_ROADMAP.md`(SCR-010 の Q6 と同様)。
