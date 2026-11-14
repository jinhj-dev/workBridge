VERDICT: APPROVE

# review — button-unify (MODE: FULL)

## Round 2 (재리뷰, 수정 파일만)

대상: frontend.md Fix 3·Fix 4, test-report.md Run 3~5, decisions.md Q7, `AdminAttendanceView.tsx`, `DepartmentsView.tsx`, `leaves/approvals/ApprovalsView.tsx`, `e2e/button-unify.spec.ts`, `e2e/approvals.spec.ts`.

### Round 1 이슈 해결 여부
- [중간] SCR-010 Q6 문서 갱신 누락 → **해결**. frontend.md Fix 3에 04 SCR-010 §3(34·41·56·57행, 「SCR-008と同じ」 수정)·08·10 갱신 예정이 추가됨.
- [낮음] AdminAttendanceView 들여쓰기 → **해결**(182-185, 224-227 Prettier 형식). spec의 100자 초과 줄도 정리됨.
- [낮음] DepartmentsView 336·404 주석 → **해결**(「xl 以上/未満」).
- [낮음] ActionButtons children → **처리**(유지하고, 09 §6·UI_BUTTON_PATTERNS에 "예외적으로만 사용"을 적는다고 갱신 예정에 추가).
- [낮음] spec P6·P8 주석 → **해결**.
- [낮음] P8 SCR-005 행 배치 검사 → **해결**. 추가한 검사가 768·1024 잘림을 실제로 잡아냈다(Run 4). 그에 따라 Q7 Fix 4가 들어갔다.
- [낮음] measurements.jsonl → **해결**(메인이 되돌림).

### Fix 4 (Q7) 검토 — 문제 없음
- `ApprovalsView.tsx` 173-174·241-242: 표 `hidden xl:table`, 카드 `xl:hidden`, 주석까지 바꿨다. 남은 `md:gap-6`·`md:p-5`(289·326)는 여백이라 전환점과 관계없다. SCR-010(Q6)과 같은 xl 기준이라 두 화면이 일관된다.
- 768~1279에서는 카드에 [詳細]만 있어 承認·却下는 상세 모달에서 처리한다. 이는 SCR-005 §3의 기존 좁은 폭 규칙을 확장한 것이고, Q7 "部署一覧과 같은 방식(전환점 상향, 디자인 불변)"과도 맞는다. `disabled={own}` 등 행 버튼 조건은 그대로다.
- 문서 갱신 예정(04 SCR-005 61행의 `md` 미만 → `xl` 미만, 08, 10)이 Fix 4에 기록되어 있다.
- 테스트:
  - `approvals.spec.ts`의 카드 셀렉터를 `ul.md\:hidden`에서 `ul.xl\:hidden`으로 고친 것은 타당하다. 예전 셀렉터로는 검사가 무효였다.
  - `expectScr005ActionsInViewport`는 표에서 3버튼·top 정렬·right를, 카드에서 1버튼·right를 검사한다. 명세(카드는 [詳細]만)와 맞는다.
  - Run 5 결과: unit 909, tsc·lint 0, Playwright 98 통과.
- CRLF 148건(format:check): index는 LF이고, 변경하지 않은 파일에도 같은 현상이 있으며, 변경한 파일은 `prettier --check`를 통과했다. 범위 밖이라는 판단을 받아들인다.

### 신규 이슈
[낮음] [담당: tester] [분류: 테스트] e2e/button-unify.spec.ts:375 — P8의 SCR-005 검사는 `WIDTHS`(360·768·1024·1440)만 돌아서 전환점 1279/1280 양쪽은 E2E로 검사하지 않는다(SCR-010은 P11이 경계를 검사함). frontend.md Fix 4의 수동 측정으로 1279·1280을 확인했으므로 낮음으로 둔다 / 필요하면 P11처럼 [1279, 1280]을 추가한다.

### Round 2 담당별 이슈 수
- frontend: 0
- tester: 낮음 1
- backend: 0

---

## Round 1 (기록)

VERDICT(당시): CHANGES_REQUESTED

### 이슈

[중간] [담당: frontend] [분류: 문서갱신] frontend.md Fix 2 / docs/04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md:34,41,56,57 — Q6으로 SCR-010 목록 표/카드 전환점이 md→xl(1280)로 바뀌었는데 "문서 갱신 예정"에 없음. SCR-010 §3은 "`md` 이상은 표, 미만은 카드(SCR-008과 같음)", 並び替え Select "`md` 미만", 표 5행 스크롤 "(`md` 이상)", 카드 "(`md` 미만)"으로 남아 있음 / 명세·구현 불일치 / 갱신 예정에 SCR-010 §3 xl 기준·사유(Q6) 추가, 08·10에도 반영.

[낮음] [담당: frontend] [분류: 컨벤션] AdminAttendanceView.tsx:182-185, 224-227 — props 들여쓰기 깨짐(format:check 실패) / prettier로 정리. `e2e/button-unify.spec.ts:446,451`도.

[낮음] [담당: frontend] [분류: 코드품질] DepartmentsView.tsx:336, 404 — 주석이 "md 以上/未満" 그대로 / 「xl 以上/未満」으로.

[낮음] [담당: frontend] [분류: 코드품질] ActionButtons.tsx:17,36 — Q5 이후 children 문구 대체 사용처 0 / 유지 시 문서에 "예외적으로만" 명시.

[낮음] [담당: tester] [분류: 테스트] e2e/button-unify.spec.ts:300, 351 — P6 주석 「この部署を編集」 잔존, 「反応式」 오기.

[낮음] [담당: tester] [분류: 테스트] e2e/button-unify.spec.ts:373-377 — P8의 SCR-005 표 행 배치·right 검사 없음(문서 overflow만).

[낮음] [담당: tester] [분류: 컨벤션] .claude/work/button-refactor/screenshots/c8/measurements.jsonl — 이전 작업 산출물 변경 / 커밋 제외 또는 되돌림.

### 확인한 항목 (문제 없음)
- 통일 기준: 詳細 5곳은 모두 `DetailButton`(secondary+Eye), 編集 6곳은 모두 `EditButton`(primaryOutline+Pencil, 役職確認 iconOnly, 모달 footer md).
- 컴포넌트 구조: `Button`에 variant·icon·기본 문구만 고정하고 새 클래스는 없다. `type`은 항상 button이다. ESLint selector를 확장했다.
- 아이콘: EyeIcon을 leaveIcons.tsx로 옮겼다(같은 path·속성). 원래 위치에서는 삭제했다.
- 동작 유지: onClick, disabled(busy·editing·!user·own), 표시 조건(isSystem·isActive·PENDING)이 그대로다.
- 「修正」→「編集」: 바꾼 것은 버튼 문구, editLabel, sr-only 열 제목(Q3)뿐이다. Q1 「修正する」와 제목·설명·확인문·토스트·管理者修正은 그대로다. 삭제한 키를 참조하는 곳은 없다.
- 접근성: 아이콘은 aria-hidden이고, 보이는 문구가 접근 이름에 포함된다(WCAG 2.5.3). focus와 Enter/Space는 Button 내장 동작이며 테스트로 확인했다.
- 레이아웃: Q6 외에는 변경이 없다.
- candidates-report.md: 보고만 했고 코드는 수정하지 않았다. 내용은 실제 코드와 일치한다.
- 테스트: 단위 U1~U10, 화면 테스트 S1~S9, E2E P1~P11의 단언이 의미 있다. 기존 spec은 문구·키만 교체했다.
- docs/를 직접 수정하지 않았다.
