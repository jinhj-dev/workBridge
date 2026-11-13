# test-plan — 버튼 공통 UI 패턴 리팩터링

근거: `docs/UI_BUTTON_REFACTOR_PLAN.md` §2 각 단계 "테스트"·§5, `docs/UI_BUTTON_PATTERNS.md` §4.4·§6·§7, 청크 정의는 `design-frontend.md`.
원칙: 동작 변경이 없으므로 **기존 테스트는 기대값을 바꾸지 않고 통과해야 한다**. 기존 테스트가 깨지면 기대값을 고치기 전에 구현 회귀인지 먼저 판단해 보고한다(예외: 아래 "기대값 변경 허용" 3건).
진행: 청크마다 frontend 구현 직후 해당 T·E 항목을 작성·실행한다.

## 기대값 변경 허용 (설계상 바뀌는 것만)
1. `components/Button.test.tsx` 높이·padding·radius 클래스: C1은 `h-9/h-10/h-12`·`rounded-lg` 등, C2에서 `h-btn-sm/md/lg`·`px-btn-x-*`·`rounded-btn`로 갱신
2. `components/form.test.tsx:46-47`(`modalDangerButtonClass` 직접 단언): C9에서 삭제하고 `Button.test.tsx` danger variant 단언(`bg-danger-100`·`disabled:bg-danger-100/50`)으로 이전
3. 아이콘 존재 단언이 있는 경우(BT11 Search 제거 B14) — 현재 `LeavesView.test.tsx`에는 해당 단언 없음(확인됨)

## 단위·컴포넌트 (Vitest + Testing Library)

### T1. `frontend/src/components/Button.test.tsx` (신규, C1 작성 / C2 갱신 / C9 보강)
- 정상: variant 7종 각각 핵심 색 클래스(`primary`→`bg-primary-100`, `danger`→`bg-danger-100`, `dangerOutline`→`border-danger-100`·`text-danger-100`, `secondary`→`border-general-50` 등 form.tsx 상수와 같은 토큰)
- size별 높이 클래스(sm/md/lg), iconOnly 박스 클래스, 기본값 `secondary`·`md`
- `type` 기본 `button`; `type="submit"` + `form="x"` 전달 → 폼 밖 버튼 클릭 시 해당 form 제출
- `loading`: disabled, `svg.animate-spin` 존재, 문구(접근 이름) 유지, `icon`이 있으면 Spinner로 대체(아이콘 SVG 없음)
- 아이콘 슬롯 `aria-hidden="true"`; `iconOnly` + `aria-label` → `getByRole('button',{name})`로 찾힘
- `onClick` 호출, disabled 시 클릭 무시(호출 0회), `autoFocus`·`data-autofocus`·`ref`(React 19 prop)·`aria-pressed` 전달
- 구조: 렌더 결과 container 직계 자식이 `<button>` 1개
- `text`: `inline-flex`·`whitespace-nowrap` 없음, `withIcon`(icon 있음)일 때만 `inline-flex`; sm에만 `whitespace-nowrap`; 어느 variant에도 `select-none` 없음
- `buttonClass({variant:'text'})`·`buttonClass({variant:'ghost',iconOnly:true})` 반환 문자열 단언(Link용)
- 타입: `// @ts-expect-error` — `iconOnly`인데 `aria-label` 없음 / `iconOnly`인데 children 있음 (tsc로 검증)
- C9: danger variant에 `disabled:bg-danger-100/50` 포함(form.test 이전분)

### T2. SectionError (C3)
- 사용 화면 1곳 이상(예: 대시보드 카드)의 기존 테스트에서 조회 실패 → `再試行` 버튼 표시 → 클릭 → 재조회(fetch mock 호출 횟수 증가). 기존 테스트에 이미 있으면 실행만.

### T3. 모달 (C4) — 기존 테스트 실행 + 누락분 보강
- `ConfirmDialog.test.tsx`(`:61,64` danger 색, `:80,85` `svg.animate-spin`), `FormModal.test.tsx`(`:67,72` Spinner, **Enter 제출**: 입력에서 Enter → onSubmit 1회), `Modal.test.tsx`(`:60` footer, X 버튼 이름으로 찾기·`busy` 시 disabled)
- `LeaveDetailModal`: 단계 전환 후 확정 버튼 포커스(`autoFocus`), 제출 중 취소 disabled, `canCancel`/`canProcess` false면 버튼 없음
- `AttendanceEditModal.test.tsx`, `DepartmentMembersModal.test.tsx`, `DashboardView.test.tsx`(출퇴근 확인), `LeaveApplyModal`·`DepartmentFormModal` 사용처 테스트
- 실패: 제출 API 실패 후 확정 버튼 다시 활성(loading 해제)

### T4. 페이지 주 동작 (C5)
- Enter 제출 5곳: `LoginForm.test.tsx`, `PasswordChangeForm.test.tsx`, 검색 3곳(`AttendanceHistoryView.test.tsx` 照会, `AdminAttendanceView.test.tsx` 照会, `LeavesView.test.tsx` 検索) — 입력에서 Enter 시 제출/Query 갱신
- 로딩: 로그인·비밀번호 변경 제출 중 버튼 disabled + Spinner + 문구 유지, 실패 후 재활성
- 비활성: 出勤 로딩 전(`!loaded`), 退勤済み(`done`), 条件をクリア(조건 없음)
- 권한: SCR-009 `mustChangePassword`면 キャンセル 없음·ログアウト 있음, 아니면 반대
- `DashboardView.test.tsx:337` 출근 카드 버튼 수 1 유지, `LeaveManagementLayout.test.tsx`, `DepartmentsView.test.tsx`

### T5. 표 안 버튼·텍스트 링크 (C6)
- `ApprovalsView.test.tsx`: 본인 신청 承認·却下 disabled, `PENDING` 아니면 미표시, aria-label로 찾기
- `DepartmentsView.test.tsx`: `:365-371` `border-danger-100`·`text-danger-100`(削除), 詳細엔 `text-danger-100` 없음, 시스템 부서 編集·削除 미표시
- `AdminAttendanceView.test.tsx`: 修正 클릭 → 수정 모달, 사원명 링크 href `/admin/users/{id}`
- `LeavesView.test.tsx` 詳細, `DashboardView.test.tsx` CardLink(비관리자 미표시, href)

### T6. 아이콘 버튼 (C7)
- `AppShell.test.tsx`(벨 링크 이름·href), `LeaveCalendarView.test.tsx`·`AttendanceSheetView.test.tsx`·`AttendanceView.test.tsx`(前月·翌月·今月 이름으로 찾기, 今月 이번 달이면 disabled, 클릭 시 월 변경), `DashboardView.test.tsx`

## E2E (Playwright, `frontend/e2e/`)

### E1. 기존 spec 회귀 (청크별)
- C4: `modal-a11y`·`leaves`·`approvals`·`departments*` / C5: `login`·`password`·`dashboard*`·`attendance*`·`leaves`·`departments*` / C6: `approvals`·`departments-responsive`·`attendance` / C7: `attendance-sheet-layout`(헤더 +4px로 화면 높이 가정이 깨지는지 확인)·`leave-calendar-mobile`·`leave-visual`·`leave-management`·`leave-sidebar-submenu` / C9: 전체 `npm run test:e2e`
- E2E 계정 환경변수(`E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD`)·백엔드가 없으면 skip되므로 실행 여부와 skip 수를 보고

### E2. 계산값 단언 (C4에서 추가, B6 검증)
- 위치: `modal-a11y.spec.ts`에 추가하거나 신규 `button-visual.spec.ts`(tester 판단)
- 모달 footer 버튼 `toHaveCSS('height','40px')`, SectionError 또는 표 행 버튼 `'36px'`, 휴가 신청·검색 버튼 `'48px'`(C5 이후 lg 사용처가 생기므로 48 단언은 C5에서 추가), 모달 X `toHaveCSS('border-radius','8px')`

### E3. B3·B10 캡처 확인 (신규 `frontend/e2e/button-visual.spec.ts`, C5·C6·C8)
- 폭: 360 / 768 / 1024 / 1440(D15), `test.use({ viewport })` 반복(기존 `attendance-sheet-layout` 방식)
- **개발 DB 업무 데이터 쓰기 금지**: 로그인은 기존 spec과 같은 E2E 관리자 계정. 화면 데이터 GET은 `page.route`로 고정 응답(긴 사원명·修正 가능한 행·비시스템 부서 포함), POST/PATCH/DELETE는 route로 가로채 실제 백엔드에 보내지 않는다. 버튼 클릭은 모달 열기까지만
- 캡처: `page.screenshot({ path: testInfo.outputPath(...) })` + `testInfo.attach`(Playwright 출력 폴더, 커밋 안 함). 기준 이미지 비교(`toHaveScreenshot`)는 쓰지 않는다
- 단언(사용자 확인 근거를 수치로 남긴다):
  - B3① 360에서 `/leaves`·`/admin/departments` PageHeader 제목이 한 줄(제목 요소 높이 ≤ line-height) + 주 버튼이 제목과 같은 행(top 차이 < 버튼 높이)
  - B3② SCR-010 헤더 버튼 높이 48 / B3③ 条件をクリア 높이 40, SearchInput 44 — 세로 중앙 차이 ≤ 1px 기록 / B3④ 대시보드 出勤 버튼 48
  - B10 `/admin/attendance` 360(카드형)·1024(표): 修正 버튼 높이 36(한 줄), 아이콘 포함, 표 영역 `scrollWidth`/`clientWidth` 값 기록(변경 전 대비는 frontend 화면 확인 결과와 비교)
  - C8: SCR-001~004·008~010과 모달(신청·삭제 확인 등 GET만으로 열리는 것) 전 폭 캡처, 검색 버튼 360 전폭(버튼 폭 = 폼 폭), 모달 footer 버튼 2개 2열
- 결과 수치와 캡처 경로는 test-report에 기록. 사용자 확인용 이미지 목록을 함께 보고

### E4. 접근성 (C4·C7·C8)
- 키보드: Tab으로 모달 X·footer, 월 이동, 벨에 도달, 버튼은 Enter·Space, 링크(CardLink·사원명·벨)는 Enter로 동작
- 포커스 링 표시(`outline-style` ≠ none), 아이콘 전용 버튼 이름 존재(`modal-a11y` 확장 여부는 tester 판단)

## 엣지 케이스
- 제출 버튼 `type="submit"` 누락 회귀 → T4 Enter 제출·T3 FormModal Enter로 검출
- 단계형 모달에서 단계 전환 후 이전 단계 버튼 포커스 잔존 없음(key 재마운트)
- 긴 모달 확정 문구가 360 2열 footer에서 줄바꿈(넘치지 않음) — E3 C8
- 표 안 sm 버튼 줄바꿈 없음(행 높이 유지) — E3 B10

## 실행 명령 (`frontend/`)
- 단일: `npx vitest run src/components/Button.test.tsx`, 전체 `npm test`, 정적 `npx tsc --noEmit`·`npm run lint`·`npm run build`
- e2e: `npm run test:e2e -- e2e/button-visual.spec.ts` (개발 서버·백엔드 필요)
