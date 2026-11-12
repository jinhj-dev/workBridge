# frontend 구현 결과: 휴가관리 통합 (SCR-004 탭 3개)

## 생성·수정 파일 (frontend/src/)
- 신규: `app/(app)/leaves/layout.tsx`·`LeaveManagementLayout.tsx`·`LeaveDataVersion.tsx`, `leaves/calendar/{page,LeaveCalendarView,CalendarFilters,MonthLeaveCalendar,LeaveScheduleTable,DayLeaveList}.tsx`, `components/{PageHeader,NavTabs,SearchInput}.tsx`, `components/leave/{LeaveCategoryBadge,MonthNavigator,LeaveDayModal,leaveIcons}.tsx`, `lib/leave-calendar.ts`
- 수정: `globals.css`, `components/{form.tsx,table.ts,Tabs.tsx,StatCard.tsx}`, `layout/{Sidebar,MobileTabBar}.tsx`, `leaves/{LeavesView,LeaveHistoryList}.tsx`, `approvals/ApprovalsView.tsx`, `lib/{leave-days,api/types}.ts`, `messages/ja.ts`

## 구현한 화면
- SCR-004 自分の休暇(`/leaves`) / 休暇カレンダー(`/leaves/calendar`, PC·모바일) / 承認(`/leaves/approvals`, SCR-005 통합). 신청 모달·상세 모달은 기존 재사용, 신청 성공 시 layout Context `bump` → 두 탭 재조회
- 承認 탭: ADMIN 항상 표시, 그 외 `pending-approval?scope=mine&status=…&limit=1` totalCount>0일 때만. 직접 접근 시 판정 전 스켈레톤 → 거짓이면 `/leaves`로 replace
- 사용 시스템 컴포넌트: Card(미사용, 시스템 카드 클래스 직접), Badge·LeaveStatusBadge(soft)·StatCard·Select·Pagination·Modal·Skeleton·SectionError·Tabs·LeaveApplyModal·LeaveDetailModal·form 클래스·useApiQuery·useMediaQuery·usePendingApprovalCount
- 새 시스템 컴포넌트: PageHeader, NavTabs, SearchInput, LeaveCategoryBadge, MonthNavigator, LeaveDayModal, leaveIcons(아이콘 묶음)

## 화면 리스트와 다른 점
- 承認 요약 카드 선택 표시: `aria-pressed` 대신 링크 카드 + `aria-current="true"`(StatCard `selected` prop 추가, 링크는 pressed 불가)
- `LeaveFilterButtons`(+테스트)는 더 이상 사용처 없음. 테스트 불가침 규칙상 삭제하지 않음 → 삭제 필요(보고)
- `parseLeavesQuery(params)` 시그니처 변경(currentYear 제거, `yearOptions`·`year` 삭제). 이력 빈 문구는 필터와 무관하게 기존 문구 1개
- 申請履歴에 승인자 열 없음(이미지 표 기준: 申請日/休暇期間/種別/取得日数/ステータス/操作)

## 문서 갱신 예정
- 09 §2: 토큰 `leave-paid-bg/fg`, `leave-special-bg/fg`, `calendar-sunday`(danger-100 값)·`calendar-saturday #2F5BEA`, `text-page-title`(28/36, md 미만 22/30), 컨트롤 radius 4→8(버튼·입력·셀렉트). Primary 변경 없음. 버튼 높이 신청 48/기본 44/소형 36
- 09 §3 하단 탭 4개(ホーム·出勤簿·休暇管理·メニュー), 승인 대기 점·배지는 休暇管理로. 사이드바 休暇承認 삭제·활성 판정은 하위 경로 포함. §5에 "이미지 우선, Primary는 기존 유지" 결정 추가
- 09 §6 신규 행: PageHeader / NavTabs / SearchInput / LeaveCategoryBadge / MonthNavigator / LeaveDayModal / leaveIcons / `table.ts` bandThClass·bandTdClass / StatCard `selected` / Tabs 3px 선 / `lib/leave-calendar.ts` / LeaveFilterButtons 삭제
- 03: SCR-004 탭 3개·SCR-005 통합, 전역 내비·하단 탭 4개. 04: SCR-004 개정(탭·캘린더·필터), SCR-005 → 承認 탭 명세. 10: 로드맵

## impeccable 점검 후 고친 점
- 모바일 `/leaves` 필터 폼 가로 넘침(grid minmax) 수정, 모바일 캘린더 셀 버튼 내용이 세로 중앙에 가던 문제와 `+N件` 겹침 수정, 모바일 목록 사번·부서 줄바꿈 정리, PC 우측 표 잘림(열 폭·기간 줄바꿈·2xl 미만 아바타 숨김, 2열 균등)

## 화면 확인
- Playwright(headless)로 1440/375 캡처(`screenshots/`): leaves-pc/sp, calendar-pc/sp, calendar-nov-search-pc/sp, approvals-pc/sp. 모두 페이지 가로 스크롤 없음. 영향 검토: `screenshots/regression/`(dashboard, attendance, admin-departments, admin-attendance × pc/sp) — radius 8 적용 후 겹침·잘림 없음. 로그인·비밀번호 화면은 미캡처(radius만 영향)
- 미확인: 에러/로딩 상태 캡처, 모달 열린 상태, 비승인자의 承認 탭 숨김(E2E 계정은 ADMIN)

## 임시 처리·후속
- 기존 테스트(`LeavesView.test`·`ApprovalsView.test`·`leave-days.test`·`AppShell.test`·`LeaveApplyModal.test`·`e2e/leaves·approvals.spec`)는 messages/시그니처 변경으로 타입 에러 → tester 단계에서 수정 필요(`npm run build`는 이 때문에 type check 실패, 소스는 통과)
- 모바일 캘린더 목록의 항목 `›`(상세 이동)는 이동 대상이 없어 생략. 승인 요약 카드는 모바일에서 세로 3장
- 개발 DB에 `db:e2e-accounts`(임시 비밀번호)·`db:e2e-leave-calendar-fixture` 실행함

## Fix 1 (test-report Run 2 시각 검증 항목)
- 수정 파일: `CalendarFilters.tsx`(모바일 분기), `MonthLeaveCalendar.tsx`(모바일 주 렌더), `messages/ja.ts`(`leaveCalendar.chipLabel` 추가, 미사용이 된 `searchToggle`·`searchToggleLabel` 삭제)
- 1) 모바일 막대: 셀 높이 h-16 → h-20, 칩 글자 10px·좌우 패딩 최소, 라벨은 refs/03처럼 PAID·OTHER=「休暇」, SPECIAL=「特別休暇」(`chipLabel`, 凡例가 「休暇（有給休暇など）」로 보충). 아이콘은 2칸 이상 걸치는 막대에만 표시(1칸 막대는 폭 부족). 375/390/430에서 라벨 전체 표시 확인. 320px는 「特別休暇」만 말줄임(…) 남음
- 2) 모바일 검색: 「検索」 토글 삭제, 부서 select + 이름 검색 + 사원번호 검색(2열, 각각 독립 입력창)을 항상 표시
- 3) PC 1440 배경 끊김: 실제 스크롤(맨 아래까지)에서는 재현 안 됨. `body { background: ... fixed }`가 fullPage 캡처 때 뷰포트 높이까지만 그려지는 캡처 한정 현상이라 코드 수정 없음(`leaves-calendar-pc-1440-scrolled.png`)
- 가로 스크롤: 320/360/375/430 모두 0px
- 확인: tsc·eslint·vitest 통과. 캡처 `leaves-calendar-sp-375.png`, `-sp-390/430.png`, `-pc-1440.png`, `leaves-calendar-pc-1440-scrolled.png`, `leaves-calendar-sp-320.png`
- 메인 색 변경 없음, 테스트 파일 미수정

## Fix 2 (review Round 1, frontend 중간 3·낮음 7)
- 중간1 카드 외곽: `Card.tsx`에 `cardFrameClass`(패딩 없는 외곽) 추가, `cardSurfaceClass`는 이를 재사용. LeavesView·LeaveHistoryList(2곳)·ApprovalsView·DayLeaveList·LeaveCalendarView의 직접 클래스 6곳을 `cardFrameClass`+자체 패딩으로 교체. 「休暇予定一覧」은 헤더 구성·높이 제어(absolute/스크롤)가 달라 `Card` 대신 frame 클래스 사용
- 중간2 글자 크기: `globals.css @theme`에 `text-page-title-sm`(22/30)·`text-cal-holiday`(10/14)·`text-cal-note`(11/14)·`text-cal-chip`(10/20) 추가, PageHeader·MonthLeaveCalendar의 임의값 4곳 교체
- 중간3 문서 갱신 예정: 아래에 4건 추가
- 낮음: LeaveScheduleTable 0건 문구(`filtered` prop, 조건 없음은 `emptyMonth`) / `bandThClass`·`bandTdClass` 재사용(sticky·여백은 `!` 덮어쓰기) / 디바운스 타이머가 `latestUrlParams` ref로 최신 URL 조건 사용 / StatCard selected일 때 border 색 중복 제거 / `parseLeavesQuery`가 appliedFrom > appliedTo 범위를 버림
- 낮음 DateRangeFields 미사용: 수정하지 않음. 이미지의 한 줄 `～` 레이아웃(시작·종료 입력을 한 행에 배치)과 맞지 않기 때문. 접근성(aria-label·aria-invalid·FieldError)은 직접 구현에서 동일하게 유지 → "화면 리스트와 다른 점"으로 확정
- 낮음 LeaveFilterButtons(+test) 삭제: 수행하지 않음. 테스트 파일 수정 금지 지침에 따라 tester/메인이 테스트와 함께 삭제 필요(09 §6 행도 삭제)
- 검증: tsc·eslint 통과, vitest 610/611. 실패 1건은 `LeaveCalendarView.test` FC-12(조건 없이 0건일 때 「条件に一致する…」 기대): 리뷰 지적대로 동작을 바꿔 테스트 기대값이 낡음 → tester가 `emptyMonth`(「該当する休暇予定はありません。」)로 갱신 필요
- 메인 색 변경 없음, 테스트 파일 미수정

### 문서 갱신 예정 (추가분)
- 09 §2: 토큰 `text-page-title-sm`(22/30), `text-cal-holiday`(10/14), `text-cal-note`(11/14), `text-cal-chip`(10/20). 09 §6: `Card.tsx`의 `cardFrameClass` 추가
- 09 §6 `lib/leave-days.ts` 행: `parseLeavesQuery(params)`(currentYear 제거, 단일 값 status·leaveType, appliedFrom/To, 역전 범위는 버림), `yearOptions` 삭제
- 09 §6 신규: `LeaveManagementLayout`(탭·신청 모달 공용 레이아웃) + `LeaveDataVersion`(`useLeaveDataVersion` Context, 신청 성공 시 `bump` → 탭 재조회)
- 04 SCR-004 §4.1: 「신청 성공 후 필터 초기화」 → 「필터 유지·재조회」
- 03·04: 承認 탭 표시 판정(ADMIN 항상 / 그 외 본인 할당 pending 1건 이상, 직접 접근 시 판정 전 스켈레톤 → 거짓이면 `/leaves`로 replace)

## Fix 3 — 휴가 캘린더 모바일·새로고침 수정
- 수정: `frontend/src/app/(app)/leaves/calendar/{LeaveCalendarView,MonthLeaveCalendar,DayLeaveList}.tsx`, `LeaveCalendarView.test.tsx`(날짜·범위 전환 2건을 History API 기준으로 갱신, assertion 추가), 신규 `frontend/e2e/leave-calendar-mobile.spec.ts`
- 사용 시스템 컴포넌트·토큰: Card 프레임, `text-cal-chip`/`text-cal-note` 등 기존 토큰만. 새 컴포넌트·문서 갱신 예정 없음. 화면 리스트와 다른 점 없음
- 1 선택 윤곽: 윤곽(ring)을 셀 버튼에서 떼어 막대 위(z-10) 오버레이로 이동, 휴가 칩 좌우 여백 mx-[3px]·rounded, "+N件" truncate. 데스크톱 분기 미변경
- 2/3 DayLeaveList·범례: 제목 text-xs(390px 이상 text-sm)·flex-nowrap·truncate, 버튼 `h-9` 유지, 범례 `text-cal-chip`·아이콘 size-3.5·간격 축소, 1행 고정
- 4 원인: 날짜/選択日/月全体 변경이 `router.push/replace`로 URL을 바꿔 Next가 RSC 요청(`_rsc`)을 매번 발송(재현: 4회 클릭 시 RSC 4건). 해결: `window.history.pushState/replaceState`로 URL만 갱신(Next가 useSearchParams에 반영), API 재호출 0건, 캘린더 DOM 유지. 월·부서 변경은 데이터가 바뀌므로 기존 router 유지
- 검증: tsc·eslint 오류 없음, vitest 44파일 605건 통과, Playwright leave-management+leave-calendar-mobile 13건 통과(375/390px 레이아웃, 새로고침 없음, window marker·DOM 유지·RSC/API 0건). 스크린샷 fix3-mobile-375.png, fix3-mobile-390.png
- impeccable 점검: 터치 영역(h-9) 유지, 대비 변경 없음. 범례 10px는 가독성 한계(남은 문제)
- 임시 처리: 없음. 개발 DB: 픽스처 스크립트 실행만(스크립트가 2026-11 샘플 재생성)

## Fix 4 — 모바일 범례 3줄
- 수정: `frontend/src/app/(app)/leaves/calendar/LeaveCalendarView.tsx`(모바일 범례 `ul`만), `frontend/e2e/leave-calendar-mobile.spec.ts`("범례 1행" → 3줄 검증, 스크린샷명 fix4-legend-375/390.png)
- 변경: `flex-col items-start gap-1`로 凡例 / 休暇 / 特別休暇 3줄 세로 배치, nowrap·overflow-hidden 제거(긴 문구는 줄바꿈, `min-w-0`), 글자 `text-cal-chip`(10px)→`text-cal-note`(11px), 아이콘 size-3.5/2.5→size-4/3, 항목 간격 gap-0.5→gap-1.5, 패딩 px-3 py-2. 데스크톱·타이틀·버튼·색 미변경
- 주의: 캘린더 디렉터리가 미커밋(untracked)이라 git diff로 Fix 3 이전 값을 복원할 수 없었음. globals.css 주석의 「凡例 11/14」와 아이콘 표준 크기를 근거로 추정 복원
- 검증: tsc·eslint 오류 없음, vitest(calendar) 14건 통과, Playwright leave-calendar-mobile 3건 통과(375/390px 3줄·오버플로 없음). 스크린샷 fix4-legend-375.png, fix4-legend-390.png
