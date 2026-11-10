# frontend — 出勤簿 UI/UX 수정 (attendance-sheet-ui)

## 생성·수정한 파일 (frontend/)
- 수정: `src/app/(app)/attendance/AttendanceSheetView.tsx`(좌우 분리 2표, `SheetDayRow`·`TimelineRow`, max-w-7xl 제거), `src/components/Badge.tsx`(`shape` prop), `src/components/table.ts`(`compactTdBaseClass`·`compactTdClass`), `src/lib/attendance-sheet.ts`(`WorkPatternKind`, `workPatternOf`, `approvedFullDayLeave`(이동), `SheetRequestKind`, `formatSheetDate` → `2日（月）`), `src/messages/ja.ts`(`requestKinds`, `timelineDayLabel`)
- 신규: `src/components/attendance/workPattern.ts`(`WORK_PATTERN_BADGE`), `e2e/attendance-sheet-layout.spec.ts`
- 테스트: `lib/attendance-sheet.test.ts`, `AttendanceSheetView.test.tsx`(§0 날짜 갱신 + 신규 describe), `AttendanceView.test.tsx`

## 구현한 화면 / 사용 시스템 컴포넌트
- SCR-003 出勤簿 月間表(md 이상). Card, Badge(pill/rounded), Tooltip, SkeletonLines, SectionError, LeaveDetailModal, WorkTimeline·WorkTimelineAxis, table.ts(thClass/compactTdBaseClass/compactTdClass), attendanceStatus.ts
- 구현: 좌측 8열 고정(구분선 `border-r-2 border-general-60`) + 우측 `時間帯` region만 가로 스크롤, 바깥 `overflow-x-auto` 안전망, 행 36px, 勤務パターン Pill(NORMAL neutral / 休日·祝日 danger / 休暇 success), 申請 `休暇 {状態}`, 日付 `1日（日）`, 그래프 label 날짜 접두

## 화면 리스트와 다른 점
- 없음.

## 기존 테스트 변경 (test-plan §0 외)
- `AttendanceView.test.tsx`: 표가 2개가 되어 sheet 쪽 `findByRole('table')` 7곳을 `{ name: t.sheet.tableTitle }`로 한정(검증 의도 동일). §0에는 없지만 구조 변경의 불가피한 결과.
- `AttendanceSheetView.test.tsx`: §0 날짜 외에 img 이름(날짜 접두, 우측 표로 이동), 申請 배지 문구(`休暇 …`), 행 수 검증(표 2개)을 C1·C9·C12에 맞춰 갱신.

## 문서 갱신 예정
- 04 SCR-003 §4: 좌우 분리(그래프 영역만 가로 스크롤, 안전망), 구분선, 행 높이 36, 勤務パターン Pill 색, 申請 `休暇 {상태}`, 日付 `11/2(月)` → `2日（月）`
- 09 §2.3: 표 compact 행 36, Pill 배지. §6: `Badge` `shape`('rounded'|'pill', 기본 rounded), `table.ts` `compactTdClass`/`compactTdBaseClass`(문자색을 호출측이 정할 때 Base), `attendance/workPattern.ts`, `formatSheetDate(ymd)` 설명을 `2日（月）`로
- 08 SCR-003 행: `e2e/attendance-sheet-layout.spec.ts`(레이아웃 E2E). 10 로드맵

## impeccable 점검
- 날짜 셀 색 충돌 발견·수정: `tdClass`의 `text-general-100`이 `text-danger-100`/`primary-100`보다 우선되어 일요일이 빨갛게 안 보임(E2E로 발견; 기존에도 같은 구조). 날짜 셀은 색 없는 `compactTdBaseClass` + `dateColorClass` 사용.
- E2E 스크롤 직후 비교의 타이밍 불안정 → 대기 추가. 그 외 하드코딩 색·px 없음(토큰 클래스만).

## 화면 확인
- Playwright(실제 백엔드, E2E 관리자)로 1920×1080·1440×900·1366×768·1024·768 확인, 스크린샷 `screenshots/sheet-1920x1080.png`, `sheet-1440x900.png`, `sheet-1366x768.png`, `sheet-1024.png`, `sheet-768.png`.
- 1440에서 좌우 행 정렬·구분선·Pill·日付 형식·일요일 적색 정상. 768에서는 안전망 스크롤로 그래프 영역이 오른쪽으로 밀려 좁아짐(U2 설계대로). 모바일(md 미만)은 변경 없음, 미확인.
- Playwright `attendance-sheet-layout.spec.ts` 7개 전체 통과(E1~E9 해당). 기존 `attendance.spec.ts`·`attendance-status.spec.ts` 재실행은 하지 않음(미검증).

## 검증
- `tsc --noEmit` 오류 없음, `eslint src e2e` 오류 없음, `vitest` 497 통과(전체).
- `npm run build`는 개발 서버(3000)가 `.next`를 쓰고 있어 실행하지 않음(미검증). `prettier --check`는 기존 파일 85개가 이미 경고(CRLF로 추정, 이번 변경과 무관), 변경 파일은 `--write` 적용.

## 임시 처리·백엔드 요청
- 없음. `lib/api/types.ts`·백엔드 변경 없음.

## Fix 1 (review.md 낮음 4건 + 중간 이슈 2 원인 확인)
- 수정 파일: `AttendanceSheetView.tsx`, `lib/attendance-sheet.ts`, `messages/ja.ts`, `AttendanceSheetView.test.tsx`(1건 기대값 변경 + 1건 추가). 신규: `lib/useHorizontalOverflow.ts`
- (1) 出勤時刻·退勤時刻·実働時間 셀에 `whitespace-nowrap` 추가(설계 §1).
- (2) `workPatternOf` 반환을 판별 유니온 `WorkPattern`(`LEAVE`는 leaveType 필수)으로 변경, View의 `''` 대체 분기 제거. `requestKinds`에 `satisfies Record<SheetRequestKind, string>`(ja.ts에 type import 추가).
- (3) `mx-auto` 제거. 時間帯 region의 `tabIndex`는 `useHorizontalOverflow`(scrollWidth > clientWidth, ResizeObserver로 요소·표 크기 변화 추적)가 true일 때만 0. 근거: 스크롤 불가한 영역을 Tab 순서에 넣지 않음(WCAG scrollable-region-focusable는 스크롤 가능할 때만 요구). 테스트: 기존 `tabindex=0` 단언은 jsdom(치수 0)에서 속성 없음으로 바꾸고, scrollWidth/clientWidth를 모킹한 신규 테스트로 넘칠 때 0임을 확인. (기존 테스트 변경은 이 1건뿐)
- (4) 1024px 2단 스크롤(바깥 안전망 → 그래프 영역)은 코드 변경 없음. 문서 갱신 예정(04 SCR-003 §4)에 추가: "사이드바가 있는 1024px 부근에서는 왼쪽 8열이 본문 폭 대부분을 차지해 그래프가 처음엔 거의 보이지 않는다. 바깥 래퍼를 가로 스크롤한 뒤 그래프 영역을 다시 스크롤하는 2단 스크롤이 된다(U2 승인 설계). 키보드 조작은 그래프 영역이 넘칠 때만 포커스 가능."
- 중간 이슈 2(768 스크린샷이 스켈레톤) 원인 확인 — 구현 쪽 원인 없음:
  - `AttendanceView`: `(min-width: 768px)`는 768 포함 true. `useSyncExternalStore` 스냅샷은 값이 안 바뀌면 재렌더·재마운트 없음, 같은 요소 타입이라 key 변화 없음. 리사이즈 중에도 경계(768)를 넘을 때만 전환.
  - 재조회: `useApiQuery`는 `path`/`nonce`/`router`가 바뀔 때만 fetch. 리사이즈 이벤트로는 호출되지 않고 `router`는 안정. 스켈레톤은 `status==='loading'`(첫 조회 또는 `reload()`)일 때만 표시. 月 변경은 `keepPreviousData`로 스켈레톤이 아닌 opacity-60.
  - 가능성 높은 원인(미재현): Playwright `fullPage` 캡처가 뷰포트를 일시 변경해 경계를 넘거나(768 미만 → `AttendanceHistoryView`/로딩), 개발 서버 Fast Refresh 중이었을 가능성. 구현 수정 없음. tester가 캡처 직전 `expect(left).toBeVisible()` 후 재캡처, 필요하면 fullPage 대신 viewport 캡처 권장. 브라우저 재현은 하지 않음.
- 검증: `tsc --noEmit` 오류 없음, `eslint src` 오류 없음, vitest attendance·lib·messages 12파일 201 통과. E2E·화면 확인은 생략(이번 수정 범위 밖, 미검증).
