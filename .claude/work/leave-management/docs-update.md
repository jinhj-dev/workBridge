# 문서 반영: 휴가관리 통합

근거: backend.md·frontend.md 「문서 갱신 예정」(Fix 2 추가분 포함), plan.md 확정 사항, 코드 직접 확인(LeaveManagementLayout·ApprovalsView·LeavesView·LeaveCalendarView·CalendarFilters·MonthLeaveCalendar·leave-days·leave-calendar·DTO 3종·repository·globals.css·공용 컴포넌트), test-report Run 4.

## 반영한 문서·섹션
- `docs/06_API_SPECIFICATION.md` §4: API-LEAVE-003(`appliedFrom`·`appliedTo`, 400 조건, `year` 호환 유지), API-LEAVE-007(`status`, `scope=all` 승인자 있는 건만, 承認 탭 건수·판정 조회 방법), API-LEAVE-010 신규(공개 7필드, 페이지네이션 없음 = NFR-002 예외)
- `docs/02_REQUIREMENTS.md`: FR-LEAVE-003(처리 완료 목록 조회 범위, 承認 탭 표시 기준), FR-LEAVE-005(신청일 범위 검색·연도 필터 폐지, 공유 휴가 캘린더 공개 규칙), NFR-002(캘린더 페이지네이션 예외)
- `docs/03_SCREEN_LIST.md`: 화면 목록 SCR-004·SCR-005 행, Screen Access Rules(承認 탭 판정·직접 접근 replace), 전역 내비게이션(休暇承認 메뉴 삭제·배지 휴가 관리로 이동, 社員情報·各種設定 미추가, 하단 탭 4개), Screen Flow
- `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md`: §1·§2·§3(공통 헤더), §3.0 탭(신규), §3.1 요약(다음 부여 예정일 미표시), §3.3 이력·필터(신청일 범위, 연도 폐지, URL 규칙), §3.4 休暇カレンダー(신규, PC·모바일, 모바일 검색 항상 표시), §4.1(필터 유지·재조회), §4.2·§4.2-1, §7 API, §8 권한, §9 상태, §10 완료 조건
- `docs/04_SCREEN_SPECIFICATIONS/SCR-005_LEAVE_APPROVAL.md`: 통합 안내, §1·§2, §3(상태 요약 카드·status URL·목록 컬럼·모바일 [詳細]만), §4 조회 조건, §6·§7 처리 후 재조회, §9 API, §10 Empty, §11 완료 조건
- `docs/08_TEST_PLAN.md`: §5.4-1 신규(IT-CAL-01~12, IT-APR-01~05, IT-HIS-01~03. IT-CAL-04 AM 동률 미검증 표기), §6 권한 매트릭스(API-LEAVE-010 행, status 지정), 화면 접근 검증(承認 탭 replace), §7 SCR-004·SCR-005 행
- `docs/09_DESIGN_SYSTEM.md`: §2.1 추가 토큰(leave-paid/special, calendar-sunday/saturday, Primary 유지 명기), §2.3(컨트롤 radius 8, 버튼 높이, band 표), §3 App Shell(하단 탭 4개)·Page Header, §5 6(재현 제외 문구 정정)·§5 7 신규(SCR-004 이미지 우선·Primary 유지), §6 행 수정(form radius, Card `cardFrameClass`, StatCard `selected`, Tabs 3px, table band, Sidebar·MobileTabBar)·신규(PageHeader, NavTabs, SearchInput, LeaveCategoryBadge, MonthNavigator, LeaveDayModal, leaveIcons)·삭제(LeaveFilterButtons), `lib/leave-days.ts` 설명 갱신(`yearOptions` 삭제), `lib/leave-calendar.ts`·`LeaveManagementLayout`/`LeaveDataVersion` 설명 추가, 타이포 토큰(text-page-title·-sm, text-cal-holiday·note·chip)
- `docs/10_DEVELOPMENT_ROADMAP.md`: §1 #6 프론트엔드 완료(도메인은 후속 과제로 진행 중), §2 #6(API-LEAVE-003 보충, API-LEAVE-010 추가, SCR-004 완료, 후속 과제 3건), #7(API-LEAVE-007·SCR-005·배지 보충), #9 사용자 확인 항목(社員情報·各種設定 미추가 확정), #10 화면 테스트·E2E 하네스 문구, §3 갱신 이력 1행
- `.claude/work/context.md`: MobileTabBar 4탭, leave-days 시그니처, SCR-004 구조·신규 공용 모듈, LeaveFilterButtons 삭제, backend 신규 모듈, `db:e2e-leave-calendar-fixture` 명령

## 기재와 코드가 달랐던 점(코드 기준으로 반영)
- frontend.md 추가분은 承認 탭 판정을 「본인 할당 pending 1건 이상」으로 적었으나, 코드(`LeaveManagementLayout.tsx`)와 plan.md 확정은 `PENDING·APPROVED·REJECTED` 1건 이상 → 이 기준으로 반영
- 공유 캘린더 근거 FR은 backend.md대로 FR-LEAVE-005(06 API-LEAVE-010 표기도 동일)

## 반영하지 않은 것
- 09 §6 `Modal` `icon?`·`size?`, `DetailTable`(PR #18 미기록, 이번 갱신 예정 항목 아님)
