# test-plan: 휴가관리 통합

근거: `docs/06_API_SPECIFICATION.md` §0·§4(에러 코드), `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md`·`SCR-005_LEAVE_APPROVAL.md`(흐름·문구), `docs/03_SCREEN_LIST.md` Common UI Rules, `design-backend.md`·`design-frontend.md`

## 1. Backend 단위 (`backend/src/modules/leaves/leave-calendar-rules.spec.ts`)
| ID | 시나리오 | 기대 |
|---|---|---|
| U-01 | ANNUAL·HALF_AM·HALF_PM → category | 모두 `PAID` |
| U-02 | SPECIAL / OTHER → category | `SPECIAL` / `OTHER` |
| U-03 | halfDay | HALF_AM `AM`, HALF_PM `PM`, 그 외 `null` |

## 2. Backend API 통합 (`backend/test/leave-calendar.e2e-spec.ts`, 실제 테스트 DB, FixedClock)
| ID | 시나리오 | 기대 |
|---|---|---|
| IT-CAL-01 | APPROVED·PENDING·REJECTED·CANCELLED 각 1건이 같은 월 | APPROVED 1건만 반환 |
| IT-CAL-02 | 비활성 사원의 APPROVED | 미포함 |
| IT-CAL-03 | 월 걸침(10/30~11/02), 월 밖(10/01~10/31, 12/01) | 걸침만 포함 |
| IT-CAL-04 | 정렬 | startDate → empId → endDate → AM 먼저 |
| IT-CAL-05 | 응답 필드 | 항목 키가 정확히 7개(name, empId, departmentName, startDate, endDate, category, halfDay). `reason`·`id`·`days`·`status`·`leaveType` 없음 |
| IT-CAL-06 | `departmentId` / `name`(대소문자 무시 부분) / `empId`(부분) 각각, 3개 동시 | AND로 좁혀짐 |
| IT-CAL-07 | 존재하지 않는 `departmentId`(UUID) | 200, `items: []` |
| IT-CAL-08 | `month` 생략 | FixedClock 도쿄 날짜 기준 이번 달(UTC 15:00 경계 포함) |
| IT-CAL-09 | `holidays` | 2026-11 → 11/03·11/23 포함, 필터 결과 0건이어도 포함 |
| IT-CAL-10 | 400: `month=2026-13`, `month=1999-12`, `departmentId=abc`, `name` 101자, `empId` 51자 | `VALIDATION_ERROR`, 해당 field |
| IT-CAL-11 | 미인증 / mustChangePassword | 401 / 403 `PASSWORD_CHANGE_REQUIRED` |
| IT-CAL-12 | EMPLOYEE와 ADMIN 동일 조건 | 동일 응답 |
| IT-APR-01 | `pending-approval` status 생략 | 기존과 동일(PENDING만) — 기존 e2e 회귀 통과 |
| IT-APR-02 | `scope=mine&status=APPROVED,REJECTED` | 본인 할당 처리 완료 건만, 타인 할당 건 미포함 |
| IT-APR-03 | `scope=all&status=APPROVED`(ADMIN) | 즉시 승인 건(approver null) 제외 |
| IT-APR-04 | `status=CANCELLED`, `status=` | 400 `status.0` |
| IT-APR-05 | EMPLOYEE `scope=all&status=APPROVED` | 403 |
| IT-HIS-01 | `appliedFrom/To` 경계 | 도쿄 날짜 기준 양끝 포함(23:59 JST 신청 포함, 다음날 00:00 제외) |
| IT-HIS-02 | 한쪽만 지정 / `appliedFrom > appliedTo` / 실재하지 않는 날짜 | 동작 / 400 `appliedTo` / 400 |
| IT-HIS-03 | 기존 `year`·`status`·`leaveType` | 기존 e2e 회귀 통과 |
- 기존 신청·승인·반려·취소 e2e(`backend/test/leaves*.e2e-spec.ts` 등) 전체 회귀 실행

## 3. Frontend 단위·컴포넌트 (Vitest + Testing Library)
| ID | 대상 | 기대 |
|---|---|---|
| FC-01 | `lib/leave-calendar.ts` `buildMonthGrid` | 2026-11: 일요일 시작, 11/01(일)~12/05(토) 5주, 월 밖 표시 플래그 (2026-11-01은 일요일이라 그리드 시작이 11/01) |
| FC-02 | `layoutWeekLanes` | 연속 휴가 1 lane으로 연결, 주 경계에서 분할, maxLanes 초과분 날짜별 `+N`, 월 밖 구간 제외 |
| FC-03 | `formatLeavePeriod`·`calendarDayCount` | 단일일·기간·반차(午前/午後, 半日) 표기 |
| FC-04 | `LeaveManagementLayout` 탭 | EMPLOYEE 할당 0건 → 탭 2개, 할당 1건 이상 → 3개, ADMIN → 3개. 비승인자 `/leaves/approvals` → `/leaves` replace |
| FC-05 | `Sidebar`·`MobileTabBar` | 休暇承認 없음, `/leaves/calendar`에서 休暇管理 활성, 배지·빨간 점이 休暇管理에 표시 |
| FC-06 | `LeaveCalendarView` | 부서·이름·사원번호 입력이 하나의 API 호출 Query에 동시에 반영, 월 이동 시 `month` 변경·재조회 |
| FC-07 | PC 캘린더·목록 일치 | 같은 응답에서 목록 행 수 = 고유 건수, 막대 클릭·`+N件` → `LeaveDayModal` 내용 |
| FC-08 | 모바일 날짜 선택 | 셀 클릭 → 목록 제목·항목 갱신, Empty 문구, [月全体] 전환 |
| FC-09 | `LeaveCategoryBadge` | OTHER → 「休暇」, 종류 원문 미표시 |
| FC-10 | `LeavesView` 필터 | 검색 클릭 시 URL(`appliedFrom`·`appliedTo`·`leaveType`·`status`)·1페이지, 표 컬럼 6개, 신청 성공 후 재조회 |
| FC-11 | `ApprovalsView` | 건수 카드 3개, 카드 클릭 → `status` URL, PENDING만 承認·却下 버튼, 본인 신청 비활성, 처리 후 목록·건수·배지 refresh |
| FC-12 | Loading / Error / Empty | 각 영역 스켈레톤 / `SectionError` 재시도 / 정의 문구 |
- 기존 `LeavesView.test.tsx`·`ApprovalsView.test.tsx`·`AppShell.test.tsx`·`LeaveApplyModal.test.tsx`·`LeaveDetailModal.test.tsx` 갱신 후 전체 통과

## 4. Playwright E2E (`frontend/e2e/leave-management.spec.ts`, 실제 백엔드·개발 DB)
사전: `db:sample-users` → `db:e2e-leave-calendar-fixture --month=<고정 월>`(beforeAll, `PLAYWRIGHT_BASE_URL` 지정 시 skip)
| ID | 시나리오 | 기대 |
|---|---|---|
| E2E-01 | EMPLOYEE(900002, 할당 없음) 로그인 → 休暇管理 | 탭 2개, 사이드바에 休暇承認 없음 |
| E2E-02 | ADMIN(900001) | 탭 3개, 承認 탭 건수 카드 표시 |
| E2E-03 | 탭 전환 → 뒤로/앞으로, 각 탭 URL 직접 진입·새로고침 | URL·선택 탭 일치 |
| E2E-04 | 캘린더 월 이동 | 연월 라벨·데이터 갱신 |
| E2E-05 | 이름 검색 / 사원번호 검색 / 부서+이름 동시 | 목록·캘린더 모두 좁혀짐, 0건 Empty |
| E2E-06 | 픽스처의 PENDING·REJECTED·CANCELLED 사원 | 캘린더·목록 어디에도 없음 |
| E2E-07 | 캘린더 API 응답 감시(`page.waitForResponse`) | 항목 키 7개, `reason` 없음 |
| E2E-08 | 모바일(375) 날짜 선택 | 하단 목록 갱신, [月全体] 전환 |
| E2E-09 | 休暇申請(특별휴가, 즉시 승인) | 自分の休暇 이력 반영, 캘린더에 표시 |
| E2E-10 | 承認 탭 승인·반려(반려 사유 필수) | 건수·목록·배지 갱신 |
- 기존 `leaves.spec.ts`·`approvals.spec.ts`·`dashboard*.spec.ts` 회귀(사이드바 링크 변경 반영)

## 5. 시각 검증 (`frontend/e2e/leave-visual.spec.ts`)
- 해상도: PC 1920×1080, 1440×900, 1366×768 / 모바일 375×812, 390×844, 430×932 (+ 320×568 가로 스크롤 확인만)
- 대상: `/leaves`, `/leaves/calendar`(고정 월), `/leaves/approvals`(ADMIN), 모바일 캘린더 날짜 선택 상태, `LeaveDayModal`
- 저장: `.claude/work/leave-management/screenshots/<화면>-<폭>.png`
- 자동 검사: `document.documentElement.scrollWidth <= innerWidth`(가로 스크롤 없음), 캘린더 7열·요일 색(일 빨강·토 파랑), 하단 탭과 본문 겹침 없음
- 수동 비교: refs 02(PC)·03(모바일)·01(自分の休暇)과 레이아웃·간격·radius·글자 크기·탭·버튼·캘린더 크기·막대·배지·하단 탭을 대조해 차이 목록을 test-report.md에 기록. 차이가 크면 frontend 수정 후 재캡처
- 색상 비교 기준: Primary(버튼·활성 탭·링크·선택일·하단 탭 활성)는 이미지의 인디고(#4B33E6)가 아니라 **기존 Primary 토큰(`primary-100`~`30`, 09 §2)**이 기준. 이 차이는 의도된 것이므로 차이 목록에 넣지 않는다. 대신 Primary 사용 요소의 computed color가 기존 `--color-primary-*` 값과 일치하는지 자동 검사. 휴가 분류 색(`leave-paid-*`·`leave-special-*`)·요일 색은 이미지 기준으로 비교
- 토큰 영향: `/dashboard`, `/attendance`, `/admin/departments`, `/admin/attendance`, `/login`을 1440·375로 캡처해 깨짐(겹침·radius) 확인. Primary는 바뀌지 않으므로 색 회귀가 없어야 함(색이 바뀌었으면 결함)

## 6. 실행 명령
- backend: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run db:migrate:test` 후 `npm run test:e2e`
- frontend: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`(E2E 계정 환경 변수 필요, 없으면 skip 사유 보고)
