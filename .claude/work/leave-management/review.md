VERDICT: APPROVE

# 리뷰: 휴가관리 통합 (Round 1)

대상: plan.md / design-backend.md / design-frontend.md / test-plan.md / backend.md / frontend.md / test-report.md(Run 1~3) + 변경 코드 직접 확인.
사용자 확정 사항(Primary 기존 색 유지, 社員情報·各種設定 미추가·하단 탭 4개, 캘린더 공개 범위, 모바일 검색 상시 표시, dashboard-renewal e2e 8건 환경 이슈)은 지적 대상에서 제외했다.

## 총평
- Backend: API-LEAVE-010 / 007 status / 003 appliedFrom·To가 design-backend 계약과 일치한다. SELECT 단계 공개 7필드 제한, 권한 판정 코드 불변, `:id`보다 먼저 선언, Prisma 파라미터 바인딩, 픽스처 localhost·production 가드 모두 문제없다. 기능 결함은 찾지 못했다.
- Frontend: 경로 기반 탭, 承認 탭 표시 판정·replace, Context로 신청 후 재조회, 캘린더·목록 같은 응답 사용, 사이드바·하단 탭 정리가 설계대로 구현됐다. `docs/` 직접 수정 없음.
- 지적은 디자인 시스템 위반(카드 외곽 중복 구현, 임의 글자 크기), 문서 갱신 예정 누락, backend e2e 시나리오 누락이다.

## 이슈

### backend
- 없음

### frontend
- [중간] [담당: frontend] [분류: 디자인시스템] `frontend/src/app/(app)/leaves/LeavesView.tsx:122`, `LeaveHistoryList.tsx:193,261`, `approvals/ApprovalsView.tsx:328`, `calendar/DayLeaveList.tsx:30`, `calendar/LeaveCalendarView.tsx:34,258` — 카드 외곽 `rounded-2xl border border-general-40 bg-white … shadow-card-soft`를 6곳에 직접 다시 썼다. `components/Card.tsx`가 이미 `cardSurfaceClass`를 export하고 있고, design-frontend §6-1은 「休暇予定一覧」을 `Card`로 만들라고 했다 / 제목이 있는 카드는 `Card`를 쓰고, 패딩·높이가 달라서 `Card`를 못 쓰는 곳은 `cardSurfaceClass`(또는 패딩을 뺀 공용 surface 클래스를 Card.tsx에 추가)를 import한다.
- [중간] [담당: frontend] [분류: 디자인시스템] `frontend/src/components/PageHeader.tsx:21` `text-[1.375rem]/[1.875rem]`, `calendar/MonthLeaveCalendar.tsx:71` `text-[0.625rem]/[0.875rem]`, `:193` `text-[0.625rem]/5`, `:208` `text-[0.6875rem]/[0.875rem]` — 토큰 대신 글자 크기를 임의 값으로 하드코딩했다. 특히 PageHeader 모바일 22/30은 design-frontend §3에서 `text-page-title`의 일부로 정의한 값이다 / `globals.css` `@theme`에 토큰(예: `text-page-title-sm`, 캘린더 칩·공휴일명용 10/14·11/14)을 추가해 쓰고 09 §2 갱신 예정에 적는다.
- [중간] [담당: frontend] [분류: 문서갱신] `.claude/work/leave-management/frontend.md` 「문서 갱신 예정」 — 실제 변경 중 다음이 빠졌다: (1) `lib/leave-days.ts` `parseLeavesQuery` 시그니처 변경(currentYear 제거, 단일 값·appliedFrom/To)과 `yearOptions` 삭제(09 §6 기존 행 갱신 필요), (2) `LeaveManagementLayout`·`useLeaveDataVersion` Context(휴가 화면 공용 구조), (3) 04 SCR-004 §4.1의 「신청 성공 후 필터 초기화」를 「필터 유지·재조회」로 바꾼 동작, (4) 承認 탭 표시 판정 규칙(ADMIN 항상 / 본인 할당 1건 이상, 직접 접근 시 replace)을 03·04에 기록 / 위 4가지를 갱신 예정 항목으로 추가한다.
- [낮음] [담당: frontend] [분류: 버그] `frontend/src/app/(app)/leaves/calendar/LeaveScheduleTable.tsx:47` — PC 목록이 0건이면 검색 조건이 없어도 항상 「条件に一致する休暇予定はありません。」를 보여 준다(모바일 `DayLeaveList`는 `filtered`로 구분함) / `filtered`를 받아 조건이 없을 때는 `emptyMonth`를 보여 준다.
- [낮음] [담당: frontend] [분류: 컨벤션] `frontend/src/app/(app)/leaves/calendar/LeaveScheduleTable.tsx:8-10` — `table.ts`의 `bandThClass`/`bandTdClass`와 거의 같은 클래스를 파일 안에서 다시 정의했다 / sticky·px만 덧붙여 band 클래스를 재사용한다.
- [낮음] [담당: frontend] [분류: 컨벤션] `frontend/src/app/(app)/leaves/LeaveHistoryList.tsx:195-225` — design-frontend §5는 申請期間에 `DateRangeFields`를 쓰라고 했지만 날짜 입력 2개를 직접 만들었다. 이미지 레이아웃(한 줄 `～`) 때문이라면 frontend.md 「다른 점」에 적는다.
- [낮음] [담당: frontend] [분류: 컨벤션] `frontend/src/components/leave/LeaveFilterButtons.tsx`(+test) — 이번 변경으로 사용처가 없어졌다(CLAUDE.md §3: 자기 변경이 만든 orphan은 제거한다) / 테스트와 같이 삭제하고 09 §6에서도 지운다.
- [낮음] [담당: frontend] [분류: 버그] `frontend/src/app/(app)/leaves/calendar/LeaveCalendarView.tsx:117-120` — 디바운스 타이머가 키 입력 시점의 `urlParams`를 잡아 두므로, 300ms 안에 월이나 부서를 바꾸면 replace가 그 변경을 되돌린다 / 타이머 안에서 최신 searchParams를 읽거나, 월·부서를 바꿀 때 타이머를 정리한다.
- [낮음] [담당: frontend] [분류: 디자인시스템] `frontend/src/components/StatCard.tsx:64` — `selected`일 때 `border-general-40`과 `border-primary-100`이 같은 class 문자열에 함께 들어가 어느 쪽이 적용될지 CSS 순서에 달려 있다(ring으로는 보임) / selected일 때 general-40을 빼고 넣는다.
- [낮음] [담당: frontend] [분류: 버그] `frontend/src/lib/leave-days.ts:65-78` — URL을 직접 고쳐서 `appliedFrom > appliedTo`가 되면 API가 400을 돌려주고, 다시 시도해도 계속 실패하는 SectionError만 보인다 / 파싱 단계에서 역전된 범위는 버린다.

### tester
- [중간] [담당: tester] [분류: 테스트] `backend/test/leave-calendar.e2e-spec.ts` — test-plan §2 시나리오 중 다음이 빠졌다: IT-CAL-04(전체 정렬: 같은 startDate의 empId → endDate → AM 먼저. 지금은 첫 항목만 확인), IT-CAL-12(EMPLOYEE·ADMIN 동일 응답), IT-APR-02(다른 승인자에게 할당된 건이 `scope=mine`에 안 나옴), IT-APR-03(ADMIN `scope=all&status=APPROVED`에서 즉시 승인 건 제외. 이번 변경으로 새로 생긴 조건), IT-APR-04(`status=` 빈 값과 `details[].field = status.0` 확인), IT-CAL-09(11/23 포함, 0건일 때도 공휴일 포함) / 각 케이스를 추가한다.
- [중간] [담당: tester] [분류: 테스트] `frontend/e2e/leave-visual.spec.ts` — test-plan §5 자동 검사 중 「캘린더 7열·요일 색(일 빨강·토 파랑)」이 아직 구현되지 않았다(test-report Run 3에서 미검증으로 기록) / 요일 헤더·일요일/토요일 날짜의 computed color가 `--color-calendar-sunday`/`-saturday`와 같은지 검사를 추가한다.
- [낮음] [담당: tester] [분류: 테스트] `.claude/work/leave-management/test-plan.md:40` — FC-01 기대값(10/25~12/05)이 실제 달력(11/01~12/05)과 다르다. test-report에 기록돼 있으니 test-plan도 고친다.

## 지적 개수
- backend: 0
- frontend: 중간 3 / 낮음 7
- tester: 중간 2 / 낮음 1

---

# Round 2 (수정 루프 B 재리뷰)

대상: frontend.md 「Fix 2」, test-report.md 「Run 4」(RESULT: PASS), 수정 파일 직접 확인 — `Card.tsx`, `globals.css`, `PageHeader.tsx`, `MonthLeaveCalendar.tsx`, `LeavesView.tsx`, `LeaveHistoryList.tsx`, `ApprovalsView.tsx`, `DayLeaveList.tsx`, `LeaveCalendarView.tsx`, `LeaveScheduleTable.tsx`, `StatCard.tsx`, `lib/leave-days.ts`, `backend/test/leave-calendar.e2e-spec.ts`, `LeaveFilterButtons` 삭제. `docs/` 직접 수정 없음.

## Round 1 지적 처리 결과

### frontend
- 중간1 카드 외곽 — 해소. `Card.tsx:15` `cardFrameClass` 추가, `cardSurfaceClass`가 이를 재사용. 6곳 모두 `cardFrameClass` import로 교체(Grep으로 `rounded-2xl border … shadow-card-soft` 직접 기술이 Card.tsx·StatCard 외에 없음을 확인). 「休暇予定一覧」을 `Card` 대신 frame 클래스로 둔 사유(absolute 높이 제어·제목 옆 월 표시)는 타당.
- 중간2 임의 글자 크기 — 해소. `globals.css:77-86`에 `page-title-sm`·`cal-holiday`·`cal-note`·`cal-chip` 토큰 추가, `text-[` 임의값이 `frontend/src`에서 0건.
- 중간3 문서 갱신 예정 — 해소. 지적한 4건(parseLeavesQuery/yearOptions, LeaveManagementLayout·LeaveDataVersion, 04 §4.1 필터 유지, 承認 탭 판정) + 새 토큰·`cardFrameClass`가 「추가분」에 들어갔고 코드와 일치.
- 낮음 LeaveScheduleTable 0건 문구 — 해소(`filtered` prop, `LeaveCalendarView.tsx:136`에서 부서·이름·사번 기준으로 계산).
- 낮음 band 클래스 중복 — 해소(`bandThClass`/`bandTdClass` + `!` 덮어쓰기).
- 낮음 DateRangeFields 미사용 — 미수정 사유 타당. 이미지의 한 행 `～` 배치는 DateRangeFields 구조와 맞지 않고, aria-label·aria-invalid·FieldError를 동일하게 유지했다고 「다른 점」으로 확정했다. 이슈 종료.
- 낮음 LeaveFilterButtons orphan — 해소(tester가 Run 4에서 컴포넌트·테스트 삭제, 참조 0건 확인. 09 §6 행 삭제는 갱신 예정에 있음).
- 낮음 디바운스 stale URL — 해소(`latestUrlParams` ref, `LeaveCalendarView.tsx:110-127`). 월·부서 변경 후 타이머가 발화해도 최신 조건 위에 이름·사번만 덮어씀.
- 낮음 StatCard border 중복 — 해소(`StatCard.tsx:64` 삼항으로 한쪽만).
- 낮음 appliedFrom > appliedTo — 해소(`leave-days.ts:73-77` 역전 시 둘 다 버림).

### tester
- 중간1 backend e2e 누락 — 해소. IT-CAL-04(4건 전체 순서 비교, endDate 동률 포함)·09·12, IT-APR-02·03·04 추가, assertion 의미 있음. 단 IT-CAL-04의 halfDay 동률만 남음(아래 판정).
- 중간2 캘린더 7열·요일 색 시각 검사 — 해소(`expectCalendarWeekendColors`, PC·SP 양쪽).
- 낮음 FC-01 기대값 — 해소(test-plan 수정).

## IT-CAL-04 leaveType 동률 정렬 판정
- design-backend.md:43 정렬 규칙은 「startDate → empId → endDate → `halfDay`(AM 먼저)」다. 이 규칙의 대상은 같은 사원·같은 날의 오전/오후 반차 쌍이다.
- 구현 `leaves.repository.ts:259` `leaveType asc`는 PostgreSQL enum 선언 순서(`schema.prisma:46-51` ANNUAL < HALF_AM < HALF_PM < SPECIAL < OTHER)로 정렬되므로 HALF_AM이 HALF_PM보다 먼저 온다. 같은 사원·같은 기간에 종일 휴가와 반차가 겹치는 경우는 신청 단계 중복 검사로 생기지 않으므로 「ANNUAL < HALF_AM」은 실제 비교 대상이 아니다.
- 결론: 구현은 설계와 일치하고, test-plan 문구 「AM 먼저」도 설계와 일치한다. tester의 「불일치」 보고는 enum 전체 순서를 halfDay 규칙과 섞어 읽은 것으로, 구현·문서 어느 쪽도 고칠 필요 없다. 남은 것은 HALF_AM·HALF_PM 같은 날 픽스처로 「AM 먼저」를 검증하는 테스트뿐이다(endDate 동률처럼 직접 INSERT로 만들 수 있음). 담당: tester.

## 이슈 (Round 2)

### backend
- 없음

### frontend
- [낮음] [담당: frontend] [분류: 컨벤션] `frontend/src/app/(app)/leaves/calendar/LeaveCalendarView.tsx:36` — `const cardClass = cardFrameClass;`는 이름만 바꾼 별칭이다 / `cardFrameClass`를 바로 쓴다.
- [낮음] [담당: frontend] [분류: 문서갱신] `.claude/work/leave-management/frontend.md:10,15` — 「Card(미사용, 시스템 카드 클래스 직접)」「LeaveFilterButtons 삭제 필요」가 Fix 2·Run 4 이후 상태와 다르다 / `cardFrameClass` 사용, 삭제 완료로 고쳐 문서 단계 혼동을 막는다.

### tester
- [낮음] [담당: tester] [분류: 테스트] `backend/test/leave-calendar.e2e-spec.ts:208` — IT-CAL-04의 「AM 먼저」(같은 사원·같은 날 HALF_AM/HALF_PM)가 미검증 / 직접 INSERT로 HALF_PM을 먼저 넣고 HALF_AM, HALF_PM 순으로 나오는지 확인한다. test-plan 문구는 바꾸지 않는다.
- [낮음] [담당: tester] [분류: 테스트] `frontend/src/lib/leave-days.test.ts` — Fix 2로 새로 생긴 동작인 `appliedFrom > appliedTo` 역전 범위 폐기에 단위 테스트가 없다 / `appliedFrom=2026-03-31&appliedTo=2026-01-05` → 둘 다 `''` 케이스를 추가한다.

## 지적 개수 (Round 2)
- backend: 0
- frontend: 낮음 2
- tester: 낮음 2
