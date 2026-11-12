VERDICT: CHANGES_REQUESTED

# review: dashboard-renewal (Round 2)

대상: review.md Round 1 지적의 수정분만. frontend.md 「리뷰 수정 1」, backend.md 「Fix 2」, test-report.md 「리뷰 보강」·Run 7, 수정된 구현·테스트 파일 직접 확인. D1 배치는 사용자 결정(현재 구현 유지)이라 지적하지 않음.

## 이슈

### 중간
- [중간] [담당: frontend] [분류: 문서갱신] .claude/work/dashboard-renewal/frontend.md:122-124 — 휴가 색을 violet-80으로 바꿨는데 「문서 갱신 예정」에는 09 §6만 있고, `docs/04_SCREEN_SPECIFICATIONS/SCR-002_DASHBOARD.md:88`(「休暇 `general-40`」)의 색 정정이 빠졌다. SCR-002 항목은 §3-0 배치만 적혀 있다. Round 1 지적이 "09 §6 DonutChart·SCR-002 색 기술을 맞춘다"였다. / SCR-002:88 도넛 색(休暇 violet-80)을 추가하고, 09 §1 토큰 표 `violet-80` 용도(72행, 지금은 "진행 막대 그라데이션 끝색"만 있음)에 도넛 休暇를 더하는 것도 함께 적는다.

### 낮음
- [낮음] [담당: frontend] [분류: 문서갱신] frontend.md:126 — "비텍스트 3:1 기준 충족"은 사실과 다르다. `violet-80`(#9B86F5)과 흰 바탕의 대비는 약 2.95:1로 조금 모자란다(`violet-100` #7C5CF0이면 약 4.5:1). 세 구간끼리는 색상·명도로 구분되고, 트랙(general-40)은 구간이 원 전체를 채우므로 합계가 0일 때만 보인다. 범례 숫자와 `aria-label`이 색 말고도 값을 알려 주므로 실사용 문제는 작다. / 문구를 정정하거나 `violet-100`을 검토한다. 참고: 기존 未出勤 `general-50`도 흰 바탕과의 대비가 약 1.4:1로 낮지만 이번 수정 범위 밖이다.
- [낮음] [담당: tester] [분류: 테스트] backend/test/admin-dashboard.e2e-spec.ts:308-320 — `shouldKeepTotalEmployeeCountOnNotWorkday`가 clock 복원을 `finally` 없이 하고 있다. 중간 assertion이 실패하면 다음 테스트가 바뀐 시각으로 돈다. 같은 파일의 다른 케이스는 `try/finally`를 쓴다. / `try/finally`로 맞춘다.

## Round 1 지적 해소 확인
1. 도넛 休暇 색(중간): `CompanyAttendanceSection.tsx:24`가 `text-violet-80`으로 바뀌어 트랙 `stroke-general-40`과 구분된다. 기존 토큰(globals.css:43)만 썼다. 문서 반영은 위 중간 이슈 참고. **해소(코드)**.
2. 退勤 버튼(중간): `form.tsx:23` `primaryOutlineButtonClass`(테두리·색·hover·focus·disabled 포함)를 추가했고 `AttendanceSection.tsx:130`이 이것을 쓴다. 일회성 조합은 남아 있지 않다. **해소**.
3. D1 배치(중간): 사용자 결정으로 현 구현을 유지한다. frontend.md 124행에 decisions.md D1·D19와 SCR-002 §3-0 확정·정정이 적혀 있다. **대상 제외**.
4. 프런트 테스트 F-02·F-25·F-26·F-27(중간): `DashboardView.test.tsx:662-824`에 7건이 들어갔다. F-02는 배지 조회 실패 시 heading이 없고 limit=5 호출도 0인지 본다. F-25는 빈 값·공백만·501자일 때 검증 문구가 나오고 API를 부르지 않는지, 정상 반려는 trim된 body·PATCH·토스트·재조회까지 본다. F-26은 409 토스트, 모달 닫힘, 목록·배지 재조회를 본다. F-27은 상태가 바뀌는 mock(`remaining`)으로 카드가 사라지고 토스트가 남는지 본다. 결과 화면을 직접 관찰하는 검증이라 동어반복이 아니다. **해소**.
5. 백엔드 e2e(중간): 동어반복 rate 테스트는 `…FromFixedData`(2025-06-02, 0명 가드, 3명, 고정 기대값 33.3·1/1/1)로 바뀌었다. 응답 키 8개 정확 일치, 비근무일 totalEmployeeCount 불변(IT-DASH-18), 부서 코드 오름차순(작성 순서를 뒤집은 격리 부서, IT-DASH-21), 부서 합계 = summary(같은 Clock·같은 DB 상태, IT-DASH-22)가 들어갔다. **해소**.
6. 낮음 항목: `clockedInWithRate` 삭제 → `rateInParens`(ja.ts:141)로 전각 괄호를 옮겼다. `cardThClass`(table.ts:6)는 두 섹션이 공유한다(`text-left`+`text-right` 조합은 기존 화면과 같은 패턴). `cardSurfaceClass`는 Card·AdminStatsSection이 공유한다. 인라인 SVG는 `InfoIcon`(dashboard/icons.tsx:197)과 `ChevronDownIcon`(navIcons.tsx:103)으로 옮겼다. 출근 모달 버튼은 `modalPrimary/SecondaryButtonClass`를 쓴다. frontend.md 19행도 정정됐다. U-01(2028-01-01 토요일 원일), U-03(33.3·66.7), 제거 API 404의 EMPLOYEE·ADMIN 확인(dashboard-department-status.e2e-spec.ts:278-292)이 모두 들어갔다. **해소**.

## 기존 테스트 약화 여부
- backend.md Fix 2: 중복 블록 4건을 지우고 더 격리된 쪽(`toDbDate`, 2098-01-04)을 남겼다. 지금 파일에서 각 케이스는 1번씩만 있고 기대값도 같다.
- 동어반복 테스트를 바꾼 것은 의도된 교체다. 고정 기대값이라 오히려 더 강해졌다.
- 기존 대시보드 테스트(`（80.0%）`, 배치·order 클래스 등)의 기대값은 그대로다. 대시보드 테스트에는 색·버튼 클래스를 확인하는 assertion이 없어 이번 스타일 수정으로 바뀐 기대값도 없다.
- Run 7: `AttendanceSheetView.test.tsx` 1건을 `waitFor`로 감쌌다. 기대값(`tabindex="0"`)은 그대로라 약화가 아니다.
- Run 7: 백엔드 unit 302, e2e 362(skip 0), 프런트 vitest 561, Playwright 29, tsc·lint 모두 통과. 8 skipped는 테스트 DB에 seed ADMIN이 남아 있던 환경 문제였고, DB를 초기화한 뒤 해소됐다.

---

# review: dashboard-renewal (Round 1)

(Round 1 판정: VERDICT: CHANGES_REQUESTED)

대상: backend.md·frontend.md(1단계 + 디자인 재현 1~4차) 변경 파일, design-backend/frontend.md, decisions.md 확정 항목, docs-update.md, test-plan/test-report. 코드 직접 확인.

## 이슈

### 중간
- [중간] [담당: frontend] [분류: 디자인시스템] frontend/src/app/(app)/dashboard/CompanyAttendanceSection.tsx:24 + frontend/src/components/DonutChart.tsx:42 — 休暇 호 색(`text-general-40`)이 도넛 트랙(`stroke-general-40`)과 같아 휴가 구간이 보이지 않는다(범례 점도 흰 바탕에서 거의 안 보임). / 休暇 색을 트랙과 구분되는 토큰(예: `warning-100`·`violet-80`)으로 바꾸거나 트랙 색을 바꾸고, 09 §6 DonutChart·SCR-002 색 기술을 맞춘다.
- [중간] [담당: frontend] [분류: 디자인시스템] frontend/src/app/(app)/dashboard/AttendanceSection.tsx:121-131 — [退勤する] 버튼을 `secondaryButtonClass`를 두고 테두리·색·hover·disabled를 직접 조합한 일회성 스타일로 만들었다. / 공용 `form.tsx`에 Primary 아웃라인 변형을 추가(09 §6 기록)하거나 `secondaryButtonClass` 기반으로 바꾼다.
- [중간] [담당: frontend] [분류: 문서불일치] frontend/src/app/(app)/dashboard/DashboardView.tsx:126-160 — 배치가 확정 결정 D1(1행 承認待ち|今日, 3행 休暇|部署 + 直近 전폭)·design-frontend("10.png 今月/休暇 세로 묶음은 재현하지 않는다")와 다르다(구현: 今日|承認待ち, 休暇|部署|直近 3열, 사원은 今月+休暇 세로). SCR-002 §3-0은 구현 기준으로 갱신됐지만 decisions.md D1·D19는 그대로다. / 사용자 확인 후 decisions.md D1에 변경 확정(취소선)을 기록하거나 D1대로 되돌린다.
- [중간] [담당: tester] [분류: 테스트] frontend/src/app/(app)/dashboard/DashboardView.test.tsx — test-plan F-02(배지 count null → 承認待ち 카드 없음), F-25(반려: 사유 미입력·501자·정상 후 갱신), F-26(승인 409 ALREADY_PROCESSED → 목록 reload), F-27(승인자 사원이 마지막 1건 처리 → 배지 0으로 카드가 사라지고 토스트 유지)이 없다. 현재 승인 테스트는 처리 후에도 같은 1건을 돌려줘 카드 소멸을 검증하지 않는다. / 4개 시나리오를 추가한다.
- [중간] [담당: tester] [분류: 테스트] backend/test/dashboard-department-status.e2e-spec.ts, backend/test/admin-dashboard.e2e-spec.ts:248-253 — 08 §5.5에 "있다"고 적힌 IT-DASH-21 부서 코드 오름차순, IT-DASH-22 부서 합계 = API-DASH-001(같은 Clock), IT-DASH-02 `attendanceRate` 33.3·응답 키 8개, IT-DASH-18 비근무일 `totalEmployeeCount` 불변이 검증되지 않는다. `shouldReturnAttendanceRateWithOneDecimalPlace`는 구현 식을 그대로 다시 계산하는 동어반복 assertion이다. / 격리된 부서로 정렬·합계·고정값 33.3·키 집합을 검증하는 케이스를 추가하고, 동어반복 테스트는 고정 기대값 검증으로 바꾼다.

### 낮음
- [낮음] [담당: frontend] [분류: 컨벤션] frontend/src/messages/ja.ts:141, frontend/src/app/(app)/dashboard/DepartmentStatusSection.tsx:77-79 — `dashboard.departments.clockedInWithRate`가 쓰이지 않고(D18 미사용 키 삭제 대상), 같은 형식의 전각 괄호 「（…）」를 JSX에 하드코딩했다. / 키를 쓰거나 삭제하고 괄호도 메시지로 옮긴다.
- [낮음] [담당: frontend] [분류: 디자인시스템] DepartmentStatusSection.tsx:21-25, PendingApprovalsSection.tsx:23-25 — `table.ts`를 두고 카드 안 표 클래스(헤더 띠)를 파일마다 따로 정의했다(09 §2.3에는 기록됨). / 두 곳이 같은 스타일이면 `table.ts`에 한 번만 정의한다.
- [낮음] [담당: frontend] [분류: 디자인시스템] AdminStatsSection.tsx:26(Card 외곽 스타일 복제), LeaveBalanceSection.tsx:58-71·TopBar.tsx:95-108(인라인 SVG) — / 아이콘은 `icons.tsx`·`navIcons.tsx`로 옮기고, 에러 외곽은 공용 스타일을 재사용한다.
- [낮음] [담당: frontend] [분류: 컨벤션] AttendanceSection.tsx:237,245 — 모달 footer 버튼 클래스가 `modalSecondaryButtonClass`·`modalPrimaryButtonClass`와 같은 문자열을 직접 조합한다. / 공용 상수를 쓴다.
- [낮음] [담당: frontend] [분류: 문서갱신] .claude/work/dashboard-renewal/frontend.md:19 — "StatCard 3열은 sm 미만에서 아이콘·화살표 숨김"은 현재 코드와 다르다(docs-update.md에서도 지적). / 현재 코드 기준으로 고친다.
- [낮음] [담당: tester] [분류: 테스트] backend/src/modules/dashboard/today-status-rules.spec.ts — U-01 토요일 공휴일, U-03 1/3→33.3·2/3→66.7 케이스가 없다. dashboard-department-status.e2e-spec.ts:216 제거 API 404는 EMPLOYEE만 확인(IT-DASH-26은 ADMIN 포함). / 케이스를 추가한다.

## 점검 결과 (문제 없음 확인)
1. 집계: `dashboard.repository.ts` 1개 `$queryRaw`(바인딩, `::date`)에서 사용자별 CASE(출근 > APPROVED 휴가(종류 무관·반차 포함) > 미출근)로 사람당 1회 분류, 대상 `is_active AND hire_date <= 오늘`, `HAVING COUNT(*) > 0`. 서비스는 부서 합계로 全社를 만들어 규칙 중복이 없다. `isWorkday` = 주말 아님 + `japaneseHolidaysInRange` 비어 있음. 비근무일에는 `applyWorkday`로 휴가·미출근 0. 출근율 분모 0이면 null, 소수 1자리 half-up. 全社員数 = 대상자 수(비근무일도 같음). D4~D6·06 API-DASH-001과 일치.
2. API-DASH-004: 응답 7개 키만(새 객체로 `departmentCode` 누출 차단, e2e로 키 집합 검증), 이름·사원번호·userId 없음, 「未所属」은 `departmentId: null`로 마지막. 컨트롤러에 `@AdminOnly` 없음 → 로그인 사용자 전원(EMPLOYEE·ADMIN 같은 본문, e2e 확인).
3. 권한: `admin-dashboard.controller.ts` `@AdminOnly()` 유지(EMPLOYEE 403 e2e). `scope=all`은 `leaves.service.ts:229`에서 ADMIN만, `leaves.e2e-spec.ts:295` 403 검증. 대시보드 승인은 기존 `LeaveDetailModal`(새 prop 없음, `canProcess` 그대로)과 기존 승인·반려 API를 쓴다. 새 승인 로직 없음.
4. 退勤予定·진행률: `lib/work-progress.ts`(프런트, 표시 전용)에서만 계산. 백엔드·집계에 쓰는 곳 없음.
5. 캘린더 제거: 백엔드 라우트 삭제·404 e2e. 프런트·백엔드 코드에 `leave-calendar`·`LeaveCalendar*`·`MonthCalendar`·`buildMonthWeeks`·`AdminSummarySection` 참조 없음(테스트의 "호출 없음" 확인과 docs의 제거 기록만 남음). `isWeekend`·`monthRange`는 `common/time/calendar-rules.ts`로 옮겨졌고 출근부 import만 바뀌었다. `attendanceMonthlyQuerySchema`의 month 규칙(YYYY-MM, 2000~2100)은 06 API-ATT-007과 일치하며 `attendance-monthly.e2e-spec.ts` 400 검증이 남아 있다.
6. 컴포넌트 중복: 카드는 역할별로 나누지 않고 하나씩, 역할 차이는 prop·조건으로만 처리. PC·모바일은 같은 마운트에 CSS `contents`·`order`만 사용(`useMediaQuery` 없음). 변경 파일에 hex·rgb·arbitrary px 하드코딩 없음(Grep).
7. 셸: `TopBar`·`SidebarNav`·`MobileTabBar`는 `AppShell`에서만 쓰인다. 라우트 가드·관리자 메뉴 노출 규칙은 그대로. 드로어는 `bottom-16`으로 탭 바를 가리지 않고, `main` `pb-28`로 본문이 겹치지 않는다. Toast는 상단 고정이라 탭 바와 겹치지 않는다. 다른 화면 Playwright(test-report Run 5) 통과.
8. 프로젝트 문서: 02·03·04 SCR-002·06·08·09·10 갱신은 architect(docs-update.md)가 했고, 구현 에이전트가 docs를 직접 고친 흔적은 없다.
