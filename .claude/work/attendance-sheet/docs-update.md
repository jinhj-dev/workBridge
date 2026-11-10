# docs-update: 出勤簿 (API-ATT-007, SCR-003)

## 반영한 문서·섹션
- `docs/06_API_SPECIFICATION.md` §3 근태: **API-ATT-007 출근부 월간 조회** 신설(Query·응답 예·`dayType`/`holidayName`·공휴일 데이터 출처와 수록 범위 1970~2050·갱신 정책·`breakTime` 법정 최저 계산표·実働/時間外/深夜·work_date 기준·`leaves` 규칙·`summary` 집계·400 VALIDATION_ERROR)
- `docs/02_REQUIREMENTS.md` §1: **FR-ATT-006 출근부** 신설(공휴일 판정, 계산 휴게, 월간 집계, 기존 `workMinutes` 불변, 공휴일 취급 불일치·후속 과제 명시)
- `docs/03_SCREEN_LIST.md`: 화면 목록 SCR-003 행(출근부, FR-ATT-006), 전역 내비게이션 메뉴 `出勤簿`, Common UI Rules "공휴일 취급" 신설(SCR-003만 공휴일=휴일, SCR-002·004는 평일), 목록 검색 버튼 문구의 SCR-003 언급 제거(SCR-003에 기간 조회가 없어짐)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-003_ATTENDANCE.md`: 전면 교체(구성·月間表 열/행 규칙·배경 우선순위·선택(`bg-primary-30`만)·가로 스크롤(日付 sticky, 時間帯 min 480)·月間集計·API·상태 처리·완료 조건). 상태 필터·기간 검색·페이지네이션·md 미만 카드 목록 삭제
- `docs/08_TEST_PLAN.md`: §4 UT-ATT-03~07, §5.2 IT-ATT-13~19 추가, §7 SCR-003 검증 항목 교체(실제 spec 기준. 법정 휴게 경계값은 spec 값과 대조)
- `docs/09_DESIGN_SYSTEM.md` §6: `StatusFilterButtons` 행 삭제 → `WorkTimeline`/`WorkTimelineAxis` 행 추가(markerMinute 원형 점 포함), `LeaveFilterButtons` 행을 값으로 풀어씀(접근성: `role="group"`+`aria-labelledby`·`aria-describedby`·`aria-pressed`·체크 `aria-hidden` — review Round 2 낮음 제안 반영), 유틸 목록에 `lib/attendance-sheet.ts` 추가. (`parseMyHistoryQuery`는 09에 언급이 없어 삭제할 것 없음)
- `docs/10_DEVELOPMENT_ROADMAP.md`: §1 근태 행(FR-ATT-001~006, 프론트·상태 진행 중), §2 #5(API-ATT-007 `[x]`, 출근부 SCR-003 `[ ]`, 후속 과제 3건), §2 #10 화면 테스트 문구(SCR-003 진행 중 분리)·E2E 하네스 항목에서 attendance-status 6건 제거, §3 갱신 이력 1행 추가. 183행 과거 이력은 유지
- `.claude/work/context.md`: 기술 스택에 `@holiday-jp/holiday_jp` 2.5.2, 공용 모듈에 `japanese-holiday.ts`·`attendance-sheet-rules.ts`·`attendance-sheet.service.ts`·`WorkTimeline.tsx`·`lib/attendance-sheet.ts` 추가, 명령어에서 `db:e2e-attendance-fixture` 삭제. (`StatusFilterButtons`·`parseMyHistoryQuery`는 context.md에 언급이 없어 삭제할 것 없음)

## 리뷰·보안 후속 과제 판단
- review Round 2 낮음 ① `aria-selected` 후속 과제 → 반영(로드맵 §2 #5 후속 과제)
- review Round 2 낮음 ② LeaveFilterButtons 접근성 항목 → 반영(09 §6)
- security 낮음 3 공휴일 데이터 2050년 한계·정기 업데이트 → 반영(06 API-ATT-007 설명 + 로드맵 후속 과제)
- security 낮음 1(`findHireDate` 500 가능성)·2(rate limit 없음) → 문서화하지 않음. 1은 코드 확인 사항이고 2는 기존 API와 같은 수준이라 이번 기능 고유 과제가 아님

## 로드맵 검증 근거
- 코드 확인: `attendance.controller.ts` `@Get('monthly')`, `attendance-sheet-rules.ts`(휴게 표·dayType·leaves·summary가 06 기술과 일치), `japanese-holiday.ts`, `backend/package.json`(`@holiday-jp/holiday_jp ^2.5.2`, fixture 스크립트 없음), 프론트 `AttendanceSheetView.tsx`·`MonthlySummarySection.tsx`·`CurrentDateTimeCard.tsx`·`WorkTimeline.tsx`·`LeaveFilterButtons.tsx`·`ja.ts` 문구
- 테스트: 신규 spec 파일 존재, `.skip`/`.only`/TODO 없음, e2e `it` 16개 + `it.each` 2개(6+2건) = 24건이 test-report Run 2와 일치. 테스트 실행 수치는 test-report.md Run 2 기준(이 단계에서는 직접 실행하지 않음)
- 삭제 확인: `StatusFilterButtons`·`AttendanceHistoryView`·`attendance-status`·`e2e-attendance-fixture`·`parseMyHistoryQuery` 코드 잔존 참조 없음
- Playwright·화면 확인 미실행 → 로드맵 §0 규칙과 SCR-004 선례에 따라 SCR-003은 `[ ]` 진행 중으로 둠

## 추가 요구 1: 모바일 구버전 레이아웃

### 반영한 문서·섹션
- `docs/04_SCREEN_SPECIFICATIONS/SCR-003_ATTENDANCE.md`: §1 URL(md 이상 `month` / md 미만 `startDate`·`endDate`·`status`·`page`)·관련 요구사항(FR-ATT-003 추가), §2 목적에 md 미만 분기, §3 폭별 표시 표(판정 전 스피너 / md 이상 출근부 / md 미만 이력)·한쪽만 마운트·전환 시 URL 미변환·상태 초기화, §4 마지막 줄 "md 이상에서 폭이 부족하면 가로 스크롤", §6 API에 API-ATT-004(md 미만), §8 완료 조건 1줄, **§9 좁은 폭(md 미만) 표시 신설**(되돌림 4: 이전 반영에서 삭제한 상태 필터·기간 검색·페이지네이션·카드 목록 명세를 복원했음을 명시. 제목 `出勤簿`). 기존 절 번호는 유지하고 끝에 추가
- `docs/03_SCREEN_LIST.md`: 화면 목록 SCR-003 행(md 미만 기간별 근태 이력 목록, FR-ATT-003 추가), 목록 규칙 검색 버튼 문구 「照会」에 `SCR-003 md 미만` 복원
- `docs/02_REQUIREMENTS.md` FR-ATT-003: 첫 항목에 화면 표기(SCR-003의 md 미만 화면, API-ATT-004)만 추가
- `docs/08_TEST_PLAN.md` §7 SCR-003 행: 폭별 표시(AttendanceView·useMediaQuery), md 미만 근태 이력 항목, E2E `attendance-status.spec.ts`(390×844, 카드 목록 기준, fixture)·`attendance.spec.ts` 폭 전환(1440→390, 360 가로 스크롤 없음) 추가
- `docs/09_DESIGN_SYSTEM.md` §6: **`StatusFilterButtons` 행 복원**(되돌림 1, `DateRangeFields` 다음. 내용은 복원된 `StatusFilterButtons.tsx` 기준. `LeaveFilterButtons` 풀어쓰기는 유지), 유틸 목록에 `lib/useMediaQuery.ts` 추가
- `docs/10_DEVELOPMENT_ROADMAP.md`: §2 #5 SCR-003 항목(md 미만 구 화면 유지, `useMediaQuery`·`AttendanceView`, Playwright 2개 spec 미실행), §2 #10 화면 테스트의 SCR-003 Vitest 목록 보강, **§2 #10 E2E 하네스 항목에 attendance-status 6건 재기재**(되돌림 3: 과거 실패 이력 + 셀렉터 수정 후 미실행으로 해소 미확인), **191행 정정**(되돌림 3: "삭제" → "md 미만은 구 화면 유지(복원)", "spec 삭제로 해소" 문장 제거), §3 갱신 이력 1행 추가
- `.claude/work/context.md`: **명령어에 `db:e2e-attendance-fixture` 재기재**(되돌림 2), 공용 모듈 `attendance/`에 `StatusFilterButtons`, `lib/date-range.ts`에 `parseMyHistoryQuery`, `lib/useMediaQuery.ts` 추가

### 반영하지 않은 것
- `docs/09_DESIGN_SYSTEM.md:139`(Figma 매핑의 "SCR-003 근태 관리")는 갱신 예정 목록에 없어 손대지 않음
- `docs/06_API_SPECIFICATION.md`: API-ATT-004 계약 변경 없음(갱신 예정 없음)
- decisions.md D12 의미 변경("md 이상에서 교체, md 미만 유지")은 작업 폴더 기록으로 남기고 docs에는 SCR-003 §3·§9로 표현

### 로드맵 검증 근거
- 코드 확인: `page.tsx`가 `AttendanceView`·`AttendanceLoading` 사용, `AttendanceView.tsx`(`(min-width: 768px)`, null→스피너, 한쪽만 마운트), `lib/useMediaQuery.ts`(서버 스냅샷 null), 복원 파일 `AttendanceHistoryView(.test).tsx`·`StatusFilterButtons(.test).tsx`·`backend/prisma/e2e-attendance-fixture.ts` 존재, `backend/package.json` `db:e2e-attendance-fixture` 존재, `e2e/attendance-status.spec.ts` `test.use({ viewport: 390x844 })`·fixture 호출, `e2e/attendance.spec.ts` 폭 전환 테스트 존재, `ja.ts` `empty`·`emptyFiltered`·`statusHint` 존재
- 대상 파일에 `.skip(`·`.only(`·TODO 없음(Grep)
- 테스트 수치는 test-report.md Run 3(backend unit 294, e2e 385, frontend 482)·Run 5(frontend 482) 기준. 이 단계에서는 직접 실행하지 않음
- Playwright는 Run 1~5 내내 E2E 자격 증명 부재로 미실행(Run 4·5는 `--list`만) → 로드맵 §0("테스트를 실행하지 않은 항목은 `[x]`로 바꾸지 않는다")에 따라 SCR-003 화면은 `[ ]` 진행 중 유지, §1 근태 프론트 "진행 중" 유지
