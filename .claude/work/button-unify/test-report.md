RESULT: PASS

## PREPARE 작성 내역 (미실행: 구현 진행 중)
결정 반영: Q1 [修正する] 유지, Q2 役職確認 아이콘 전용 編集(primaryOutline), Q3 SCR-008 sr-only 열 제목 「編集」, Q4 部署詳細 [この部署を編集] primaryOutline+Pencil.

### 신규
- `frontend/src/components/ActionButtons.test.tsx`: U1~U10 (DetailButton·EditButton 기본 외형, 아이콘 aria-hidden, size, children 대체, iconOnly, onClick 클릭/Enter/Space, disabled, className, form 내 type=button)
- `frontend/e2e/button-unify.spec.ts`: P1~P10 (읽기 전용, GET 고정 응답 주입, 쓰기 차단)

### 수정
- `admin/users/UsersView.test.tsx`: S1·S2 (編集 primary-100 외형, 詳細 Eye+general-50)
- `admin/users/JobTitlesModal.test.tsx`: S6 (아이콘 전용 編集 primary-100, editing 중 disabled)
- `admin/users/UserDetailModal.test.tsx`: S7 (footer 編集 조회 전 disabled, 조회 후 onEdit)
- `admin/departments/DepartmentsView.test.tsx`: S3 (詳細 Eye aria-hidden), S4 (部署詳細 footer primary-100·Pencil·클릭 시 편집 모달)
- `admin/attendance/AdminAttendanceView.test.tsx`: S5 (編集 외형·문구, 「修正」 텍스트 버튼 0개, sr-only 열 「編集」)
- `leaves/LeavesView.test.tsx`: S8 (신청 이력 詳細 Eye·클릭 시 休暇詳細 dialog)
- `leaves/approvals/ApprovalsView.test.tsx`: S9 (詳細 Eye, 承認 primary·却下 secondary 불변)
- e2e 문구·키 교체(기대값 불변): `attendance.spec.ts`(修正→編集), `button-c8.spec.ts`·`button-visual.spec.ts`(adminAttendance.edit→common.edit), `departments.spec.ts`·`departments-list-modal.spec.ts`(t.edit/t.detail→messages.common.*), `leaves.spec.ts`(t.history.detail→messages.common.detail)
- `e2e/button-helpers.ts`: `focusRingClipping` 이동(export). `e2e/button-c8.spec.ts`는 import로 변경(동작 불변)

## 미실행 (RUN 단계에서 실행)
- 전체 Vitest, `npx tsc --noEmit`, `npm run lint`, Playwright(button-unify 및 수정 spec)
- 의존 구현 대기: `components/ActionButtons.tsx`, `messages.common.detail/edit`, `leaveIcons` EyeIcon. 구현 전에는 위 테스트가 import 오류로 실패한다(정상).
- 실행 전 확인: `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD` export, dev 서버 3000/6000. 주입 응답은 SCR-005 `scope=all`을 강제하지 않는다(기본 scope에서 주입 행 검사).

---
## Run 1 (PHASE: RUN, MODE: FULL)

### 실행 명령 / 결과
- 타입체크: `frontend/` `npx tsc --noEmit` → 오류 0
- lint: `frontend/` `npm run lint` → 오류 0
- Unit: `npx vitest run` → 65 파일 / 909 테스트 전부 통과 (1회차 901/902에서 DepartmentsView.test 1건은 아래 수정으로 해소)
- Playwright 1차: `button-unify.spec.ts` 13/14 통과 (나머지 1건은 tester 수정 후 14/14)
- Playwright 회귀: `attendance`, `departments`, `departments-list-modal`, `departments-manager`, `departments-members-modal`, `departments-responsive`, `leaves`, `leave-management`, `leave-sidebar-submenu`, `button-c8`, `button-visual`, `users`, `users-create`, `users-job-titles`, `users-responsive`, `modal-a11y`, `approvals` → 124 통과 / 0 실패
- Playwright 추가: `leave-visual`, `leave-calendar-mobile`, `attendance-status`, `dashboard`, `login` → 60 통과 / 0 실패
- 합계 E2E 198 통과 / 0 실패. 개발 DB 쓰기 spec 실행(정리는 users-cleanup 절차, 기존 샘플 사원 미변경)

### tester 수정 (테스트 측 오류, 설계 기대값 불변)
- `DepartmentsView.test.tsx` 343·361·394행, `e2e/departments-list-modal.spec.ts` 191행, `e2e/button-unify.spec.ts` 311행: 삭제된 `editSelected` → `messages.common.edit` (Q5, 「編集」). 모달 내부 검색은 `within(modal)` 유지
- `e2e/button-unify.spec.ts` P8: 部署 행 locator가 `getByRole('row')`여서 360px(카드 표시)에서 대기 시간 초과 → 이름 기준(`部署「(?!未所属).+」の詳細を表示` / `を編集`)으로 변경. 1440·1024 결과와 기대값 불변

### 실패 항목 (미해결 1건)
- [SCR-010 768px 操作列 はみ出し] 현재 브랜치에서 768px 표 스크롤 영역(clientWidth 670)의 table 폭 782px, 操作列 right 831px → 操作列이 스크롤 영역 밖으로 잘림. 보고 항목 대비 기준 측정:
  - 계측: `/admin/departments` 768px, 현재(3000, turbopack dev) 버튼 폭 詳細 74 / 編集 74 / 削除 74 px (높이 36). 詳細에 EyeIcon 추가로 폭 증가.
  - 기준(fac0ed7) 계측 시도: 임시 worktree + webpack prod 빌드에서 버튼 크기가 토큰 값(36px)과 맞지 않게(24px·폭 32px) 측정되어 **신뢰할 수 없음**. 기준 측정 실패로 악화 여부는 **판정 불가**. 임시 worktree·junction·서버는 정리 완료.
  - 판단: 今回 변경으로 詳細 버튼에 아이콘이 추가되어 操作列 폭이 늘어난 것은 사실이나, 이 잘림이 기준선부터 있던 문제인지는 확정하지 못함. 어느 쪽이든 현재 상태는 操作列 접근 불가 → **[담당: frontend]**. 권장 조치: 768px 操作列을 표 밖으로 밀리지 않게 (예: 操作列 버튼을 md 미만에서 세로 배치 또는 열 폭 확보, 詳細 아이콘 제거 여부 결정). 수정 후 `zz` 계측과 `button-unify` P8(768)로 재확인.
  - 참고: 같은 계측에서 確認 버튼도 54×36으로 측정됨(변경 파일에 없음). 기준 측정이 신뢰 불가라 이 값도 변화 여부 미확인.

### 미실행
- `attendance-sheet-layout.spec.ts` — 기지의 1024/768 overflow 범위 외 실패 기록(본 변경 대상 아님)으로 제외
- `password.spec.ts` — 순서 의존 기지 실패로 제외
- `dashboard-renewal.spec.ts` — 테스트 DB 전용 spec으로 개발 DB 실행 대상 아님
- SCR-005 [詳細][承認][却下] 실물 행: button-unify P 테스트가 승인 목록 GET을 고정 주입해 행 버튼 검사(행 DETAIL_NAME `/さんの申請の詳細を開く$/`)로 커버. 별도 실데이터 확인은 없음
- SCR-004 360px 카드 개별 버튼은 P8의 문서 overflow 검사만 수행(버튼 개별 위치 미검사)
- 임시 측정 spec(`zz-measure-dept768.spec.ts`)은 양쪽 저장소에서 삭제 완료

### 결론
- 테스트·타입·lint·E2E 회귀: 전부 통과
- RESULT는 768px 操作列 잘림 미해결로 FAIL. 담당 frontend 수정 후 PHASE: RUN 재실행 필요

## Run 2 (PHASE: RUN, MODE: FULL, Fix 2: SCR-010 表/カード切替 md→xl)

### 変更したテスト
- `frontend/e2e/button-unify.spec.ts`
  - P8: 行(`getByRole('row')`)依存を名前ベースに変更。上端揃えの検査は 1280 以上の表のみ
  - P11 追加: 360/768/1024/1279/1280/1440 で SCR-010 の [詳細][編集][削除] が画面内に見え、文書の横はみ出し 0。表は 1280 以上のみ表示(操作ボタンを持つ表に限定)
  - import に `measureBox` 追加
- 既存 spec の確認: `departments-responsive`(1366/1440/390/375)、`departments*`(1440/375)、`button-c8`/`button-visual`(幅で分岐済み)は 768〜1279 で表を前提にしていないため変更なし

### 実行結果
- タイプチェック: `frontend/` `npx tsc --noEmit` → 0 件
- lint: `frontend/` `npm run lint` → 0 件
- Unit: `npx vitest run` → 65 ファイル / 909 テスト 全通過
- Playwright: `button-unify`・`departments`・`departments-list-modal`・`departments-manager`・`departments-members-modal`・`departments-responsive`・`button-c8`・`button-visual`・`modal-a11y`・`users`・`users-create`・`users-job-titles`・`users-responsive` → 116 通過 / 0 失敗

### 未実行(前回と同じ除外)
- `attendance-sheet-layout.spec.ts`(1024/768 の既知 overflow)、`password.spec.ts`(順序依存の既知失敗)、`dashboard-renewal.spec.ts`(テスト DB 専用)
- Fix 2 は SCR-010 のみ影響のため、Run 1 で通過した他画面の spec は今回対象外

### 残件
- 前回の 768px 操作列はみ出しは Fix 2(カード切替)で解消。P8・P11 の 768 で確認済み

## Run 3 (PHASE: RUN, MODE: FULL, 修正ループ B Round 1)

### 테스트 수정 (tester, review.md [tester] 항목)
- `e2e/button-unify.spec.ts` P6 주석: 「この部署を編集」→「編集」
- P8 주석: 「反応式」→「レスポンシブ」
- P8에 SCR-005 검사 추가: 768 이상에서 `/leaves/approvals` 표의 행 버튼 3개([詳細][承認][却下]) 존재, 上端差 1px 미만, 右端 ≤ viewport+1
- 100자 초과 줄 정리: `npx prettier --write e2e/button-unify.spec.ts` (프로젝트 prettier, 스펙 파일만)
- measurements.jsonl: 변경 없음(git status 확인)

### 실행 결과
- frontend 타입체크 `npx tsc --noEmit` → 0 오류
- frontend lint `npm run lint` → 0 오류
- Unit `npx vitest run` → 65 파일 / 909 테스트 전부 통과
- 실행 시점 확인: AdminAttendanceView.tsx 들여쓰기 수정 **반영 완료**(git diff 시점에는 미반영, 실행 전 prettier --check 통과). DepartmentsView.tsx 주석 「xl 以上/xl 未満」 반영 확인. 두 파일 관련 unit 재실행 104/104 통과
- format: `npx prettier --check` 대상 변경 파일 3종(spec, AdminAttendanceView, DepartmentsView) 통과. `npm --prefix frontend run format:check`는 148 파일 경고 — 원인은 작업 트리 CRLF(`file` 확인). 변경하지 않은 파일(useMediaQuery.ts 등)도 걸리므로 본 변경과 무관한 환경 문제로 보고, 미해결
- Playwright(button-unify, departments*, attendance, button-c8, button-visual; 76 테스트): **1 통과 / 46 실패 / 26 skip / 3 미실행**
  - 원인: 셸·env에 `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD`가 없고 `frontend/.env.local`·`backend/.env`의 값도 비어 있음. globalSetup/beforeAll이 "E2E_ADMIN_PASSWORD と E2E_INITIAL_PASSWORD が必要です"로 실패하고, 로그인 spec은 `/api/v1/auth/login` 응답 대기 30초 타임아웃
  - [담당: 환경] 코드·테스트 결함이 아님. 기존 Run 1·2는 키를 export하여 통과했음
  - 이 실행으로는 button-unify P1~P11, 회귀 spec의 결과를 **확인하지 못함**. 키를 export한 뒤 재실행 필요

### 미실행
- `button-unify`·`departments`·`attendance`·`button-c8`·`button-visual` 외 전체 Playwright(회귀 범위)는 Run 3 범위 밖
- 위 Playwright 76건 전부 미검증(로그인 불가)

### 결론
- RESULT: FAIL — 원인은 E2E 로그인 env 미설정(환경). 코드 측 검사(unit·tsc·lint·prettier 대상 파일)는 통과
- 재실행: `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD` export 후 `frontend/`에서 `npx playwright test e2e/button-unify.spec.ts e2e/departments e2e/attendance.spec.ts e2e/button-c8.spec.ts e2e/button-visual.spec.ts`

## Run 4 (PHASE: RUN, MODE: FULL, 修正ループ B Round 1 再実行)

### 実行環境
- `frontend/.env.local` の E2E パスワード 2 つを `set -a; . <(tr -d '\r' < .env.local); set +a` でシェルに読み込み(値は非表示)。両方とも非空を確認
- Playwright: `npx playwright test e2e/button-unify.spec.ts e2e/departments e2e/attendance.spec.ts e2e/button-c8.spec.ts e2e/button-visual.spec.ts`(76 テスト、1 worker)

### 結果
- **74 通過 / 2 失敗 / 0 skip / 0 未実行**
- 失敗 2 件(同一テストの幅違い): `button-unify.spec.ts` P8 `shouldFitActionButtonsWithoutOverflowAt768`, `...At1024`
  - エラー: 「SCR-005 ボタンの右端がビューポート外」 768 は右端 792.4 > 769、1024 は右端 1058.4 > 1025
  - 原因推定: SCR-005 表の操作列(`renderActions`: `flex flex-wrap justify-end`)が 768〜1024 で表の幅を超え、外側の `overflow: hidden`(globals.css 144行付近)で切られる。文書の横スクロールは発生しないため既存の文書はみ出し検査では検出されなかった。Run 1 の SCR-010 操作列の問題と同じ型
  - [担当: frontend] 実装側の問題。テストの期待値は変更していない(review の SCR-005 検査要求どおり)。修正方針の例: 768〜1279 の操作列を縦に積む、列幅の確保、ボタン文言・アイコンの調整。修正後に P8 の 768・1024 を再確認
- 上記以外の 74 件(button-unify P1〜P11 の大半、departments*、attendance、button-c8、button-visual)は通過

### 静的検査 (Run 3 から変更なし)
- tsc 0 件 / lint 0 件 / unit 65 ファイル 909 通過(Run 3 時点)

### format:check の CRLF 148 件(範囲外・既存と判断)
- 作業ツリーの一部ファイルが CRLF。index(`git ls-files --eol`)は全て LF で、fac0ed7 の `git show` でも対象の未変更ファイル(src/lib/useMediaQuery.ts 等)は LF
- 未変更ファイルも対象に含まれるため、本変更とは無関係な作業ツリー(改行)の問題。変更したファイルの prettier --check は通過
- stash・ブランチ切替はしていない

### 結論
- RESULT: FAIL(SCR-005 操作列の 768・1024 はみ出し、frontend 修正待ち)

## Run 5 (PHASE: RUN, MODE: FULL, Fix 4: SCR-005 表/カード切替 md→xl)

### テスト変更
- `e2e/button-unify.spec.ts` P8: SCR-005 検査を `expectScr005ActionsInViewport` に切り出し。1280 以上は表の行 [詳細][承認][却下](3 個・上端が揃う・右端が画面内)、1280 未満はカード 1 枚の [詳細] 1 個(画面内)を検査。SCR-005 §5 の「カードは [詳細] のみ、承認・却下は詳細モーダル内」に合わせた。カード内に 承認・却下 を求めない
- `SCR005_TABLE_MIN_WIDTH` を 768 → 1280(xl)
- `e2e/approvals.spec.ts`: 狭幅テストのカード locator `ul.md\:hidden` → `ul.xl\:hidden`、コメントの「md 未満」→「xl 未満」(このセレクタは旧 md 基準のままだとカードを見つけられず、表・カードの確認が無効になっていた)
- 768〜1279 を表前提にしていた既存 spec は他になし(leave-management の承認は DESKTOP 幅、leave-visual・button-visual は表示確認のみ)

### 実行結果
- Unit `npx vitest run`: 65 ファイル / 909 テスト 全通過
- `npx tsc --noEmit`: 0 件 / `npm run lint`: 0 件
- prettier --check(変更ファイル 5 件: button-unify.spec, approvals.spec, ApprovalsView, AdminAttendanceView, DepartmentsView): 通過
- Playwright(button-unify, approvals, leave-management, leaves, departments*, attendance, button-c8, button-visual; env は .env.local から読み込み): **98 通過 / 0 失敗 / 0 skip**
- 途中の 1 回目実行で approvals.spec の 2 件が「ログイン処理中にエラーが発生しました」で失敗したが、同じ条件の再実行で通過(一過性。コード原因なし)。P8 は 1 回目の 360/768/1024 の件数不一致(カード内が 1 個だった)を検査仕様の修正で解消し、再実行で通過

### 結論
- RESULT: PASS
