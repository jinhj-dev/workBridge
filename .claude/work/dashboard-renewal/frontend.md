# frontend: dashboard-renewal (1단계)

## 생성·수정·삭제 파일 (frontend/ 기준)
- 신규: `src/app/(app)/dashboard/` DashboardHeader, AdminStatsSection, CompanyAttendanceSection, MonthlyWorkSection, DepartmentStatusSection, RecentRequestsSection, icons / `src/components/DonutChart.tsx`(+test) / `src/lib/greeting.ts`, `work-progress.ts`, `attendance-rate.ts`(각 +test)
- 수정: DashboardView(+test 전면 재작성), AttendanceSection, LeaveBalanceSection, PendingApprovalsSection / `components/StatCard.tsx`, `Badge.tsx` / `lib/api/types.ts`, `lib/format.ts`(+test `formatHours`), `lib/calendar.ts`(+test, `buildMonthWeeks` 삭제) / `messages/ja.ts`(dashboard 재구성, `common.hours`) / `AttendanceSheetView.test.tsx`(버튼 키 이름) / e2e: `dashboard.spec.ts`, `login.spec.ts`(h1 = 「{挨拶}、{氏名}さん」), `attendance.spec.ts`(버튼 이름)
- 삭제: `AdminSummarySection.tsx`, `LeaveCalendarSection.tsx`(+test), `LeaveCalendarDayModal.tsx`, `components/calendar/MonthCalendar.tsx`(+test), `e2e/dashboard-leave-calendar.spec.ts`, 미사용 메시지 키(dashboard.summary/calendar/pending 6열 헤더 등)

## 구현한 화면
- SCR-002 대시보드. 카드 구성·순서·배치는 design-frontend.md 그대로(xl 2열 / 미만 1열, ADMIN 1열 순서는 `order-*` + `xl:order-none`, 직근 카드 전폭 규칙은 앞 카드 수 짝수 판정). PC·모바일 같은 컴포넌트·같은 조회, CSS만으로 배치. 공지 카드·캘린더 없음.
- 사용 시스템 컴포넌트: Card, StatCard, Badge(+LeaveStatusBadge), LeaveDetailModal(변경 없음, 승인·반려 기존 로직 그대로), LeaveApplyModal, Modal, Spinner, Skeleton/SkeletonLines, SectionError, Toast, table.ts(thClass/compactTdClass), form.tsx, CalendarIcon, useApiQuery, useHorizontalOverflow, usePendingApprovalCount
- 조회는 DashboardView가 보유(summary·부서·월간·잔여·직근, summary는 통계·全社 공유 1회). 승인 카드와 오늘 출근은 자체 조회. 재조회: 출퇴근 → summary·부서·월간 / 승인·반려 → 승인 목록·배지·summary·부서 / 신청 → 잔여·직근 / 직근 모달 처리 → 직근·잔여.
- 출퇴근 단일 버튼(출근する/退勤する/退勤済み 비활성). 退勤予定 = 출근+9h(目安), 진행률 0~100 클램프, 근무 중에만 60초 갱신, 표시 전용.

## 새 시스템 컴포넌트
- `components/DonutChart.tsx` (정적 SVG). `Badge` variant `info`, `StatCard` prop `icon?`·`unit?`. 대시보드 전용 `dashboard/icons.tsx`.

## 화면 리스트와 다른 점
- 承認待ち 표 헤더: 5열(社員名/部署/休暇種別/期間/아이콘 열 「詳細」은 sr-only). 좁아 넘치면 표 안에서만 가로 스크롤(xl 2열의 약 420px 폭 대응).
- StatCard 3열은 아이콘 지정 시 그라데이션 카드(1차에서 변경). 아이콘·화살표를 sm 미만에서 숨기는 처리는 현재 코드에 없음(리뷰 수정 1에서 정정).
- 全社 도넛 색: 出勤 primary-100 / 未出勤 general-50 / 休暇 violet-80(리뷰 수정 1에서 변경, 트랙 general-40과 구분).

## 문서 갱신 예정 (architect)
- `docs/09_DESIGN_SYSTEM.md`: §4 SCR-002 행(카드 구성), §5-4 차트 예외(정적 SVG 도넛), §6에 `DonutChart`·Badge `info`·StatCard `icon/unit`·`lib/greeting`·`work-progress`·`attendance-rate`·`formatHours` 추가, `MonthCalendar`·`buildMonthWeeks` 행 삭제, 대시보드 전용 icons 언급
- `docs/04 SCR-002`: §3 전면, §4 동작(승인 대기는 모달에서 승인·반려, 단일 출퇴근 버튼, 目安 규칙, 캘린더 삭제), §5 권한별 표시(承認待ち: ADMIN 전체/승인자 본인 할당/일반 사원 숨김), §6 API, §7 상태, §8
- `docs/02` FR-DASH-001, `docs/03` SCR-002 행·Screen Flow(승인 대기 항목 → 상세 모달), context.md 43·50행(calendar 컴포넌트 삭제)

## impeccable 점검
- 모바일 3열 통계에서 라벨이 4줄로 꺾이던 문제를 패딩·화살표 숨김으로 완화. 직근 카드 전폭, 카드 높이 stretch(`[&>section]:flex-1`)로 행 끝을 맞춤. 진행 막대 `role=progressbar`, 도넛 `role=img`+요약 라벨, 숫자 `tabular-nums`.

## 화면 확인
- Playwright(E2E 관리자)로 1440·1024·390·375 확인: `screenshots/dashboard-admin-{1440,1024,390,375}.png`, 가로 넘침 0. 일반 사원 화면은 E2E 사원 900002가 비밀번호 변경 필요 상태라 스크린샷 생략(컴포넌트 테스트로 확인).
- 백엔드는 이미 신규 코드로 동작(department-status 401, leave-calendar 404). 재기동 불필요.

## 검증
- tsc·eslint 오류 없음, vitest 40파일 556 통과, Playwright `dashboard.spec`·`login.spec` 12 통과(attendance·leaves 등 다른 e2e spec은 문자열만 수정, 미실행).
- 임시 처리 없음. 커밋 안 함.

## 디자인 재현 1차 (참조 8~11.png)
- 변경: `globals.css`(토큰), `Card`(icon prop·radius 16·테두리·soft 그림자), `StatCard`(icon 지정 시 그라데이션 카드, `tone`), `Badge`(`positive`·`caution`), `LeaveStatusBadge`(`soft`), `DonutChart`(굵기·크기), dashboard 전 섹션, 신규 `dashboard/CardLink.tsx`·`MetricValue.tsx`, `icons.tsx` 확장, `messages/ja.ts`(`progressValue`「約 n%」, `noTime`「--:--」), `DashboardView.test.tsx`(배치·숫자 분리 기대값 갱신).
- 배치: ADMIN = 통계 → 今日|承認待ち → 全社|今月 → 休暇|部署|直近(8.png). EMPLOYEE = 今日|(今月+休暇 세로) → 部署|直近(10.png). 행은 `contents xl:grid`로 1열 순서(order)와 공존. 카드 간격 16.
- 추가 토큰(09 반영): `success-30 #e6f7ee`, `success-110 #047a49`, `warning-30 #fff1e0`, `warning-110 #b45309`, `violet-100 #7c5cf0`, `violet-80 #9b86f5`, `page-from #fafbff`, `page-to #f1f3fc`(body 그라데이션), `shadow-card-soft`, `text-greeting 28/36`, `text-stat 36/44`.
- 문서 갱신 예정: 09 §2 위 토큰, §6 Card(icon·soft 스타일)·StatCard(tone, 아이콘 카드)·Badge(positive/caution)·LeaveStatusBadge(soft)·DonutChart, 대시보드 `CardLink`·`MetricValue`. SCR-002 §3 카드 배치(위 배치), 休暇 카드 履歴 링크는 ADMIN 비표시.
- 다른 화면 영향: Card 스타일(radius·테두리·그림자·제목 18px)은 Card 사용처 전부(근태 출근부·이력·월간집계, 全体勤怠, 部署管理, 휴가 승인·이력)에 적용, body 배경 그라데이션은 전 화면. StatCard 아이콘 없는 형태는 휴가 화면에서 동일 동작(radius는 기존 유지). vitest 40파일 556 통과, tsc·eslint 오류 없음. e2e 미실행.
- 차이 목록(미재현·편차):
  - 셸(사이드바 아이콘·TopBar 벨·아바타·모바일 하단 탭·헤더 히어로)은 D16대로 미변경. 사이드바 폭 250(참조 약 211).
  - お知らせ 카드·承認待ち 하단 안내 바 미구현(데이터·기능 없음, 날조 금지). 部署 표의 アラート 열 없음(API 없음).
  - 見出し은 「挨拶、{氏名}さん」 유지(login e2e 기준). 管理者 모바일 eyebrow·일러스트 없음. 今月の勤務 4칸(休日出勤 포함, 참조 관리자는 3칸). 休暇 라벨 残日数/承認済み 유지(의미 보존). 休暇を申請 버튼은 참조에 없으나 기능 유지. 申請 기간 표기 yyyy/mm/dd 유지.
  - 390px 통계 3열 라벨은 좁아 2줄로 꺾임(참조는 1줄). 部署 표는 390에서 표 내부 가로 스크롤.
  - 카드 높이·행 간격은 데스크톱 ±8px 수준(통계 카드 100 vs 참조 약 93, 제목 18px vs 약 17px). 1차 재촬영 1회 반영(간격 24→16, 통계 높이 113→100).
- 화면 확인: 관리자 900001 1440·390 촬영(`screenshots/design-admin-1440.png`, `design-admin-390.png`, 가로 넘침 0). 사원 900002는 비밀번호 불명(E2E 계정 초기화 명령이 권한 거부됨)으로 로그인 실패, `design-employee-*.png` 미촬영 — 사원 레이아웃은 vitest로만 확인. 관리자는 오늘 미출근 상태라 参照의 勤務中 상태 화면은 비교 못 함.

## 디자인 재현 2차
### 변경 파일
- 신규 `frontend/src/components/layout/navIcons.tsx`(셸용 선화 아이콘 10종), `layout/MobileTabBar.tsx`(lg 미만 하단 탭)
- 수정 `layout/Sidebar.tsx`(아이콘·활성=primary-30 배경+primary 문자·배지 danger), `layout/TopBar.tsx`(햄버거 제거, 벨+구분선+아바타), `layout/AppShell.tsx`(탭 바 장착, 드로워 bottom-16, main pb-28 lg:pb-10), `messages/ja.ts`(nav.home/menu/tabLabel/approvalsLink, dashboard.leave.approved=「今年の取得日数」), `dashboard/DepartmentStatusSection.tsx`
### 내용
1. 셸: 사이드바 아이콘, 상단 벨(빨간 점)·아바타(사용자 아이콘 원형, 이름은 sm 이상만), 모바일 하단 탭 ホーム/出勤簿/休暇管理/休暇承認/メニュー. 라우트·권한별 메뉴 노출 불변(관리자 메뉴는 사이드바·드로워에만, 탭의 「メニュー」가 드로워 토글 = 기존 aria 계약 유지).
   - 벨: 알림 기능이 없어 가짜 알림을 만들지 않고 `/leaves/approvals` 링크로 구현. 빨간 점은 승인 대기 건수>0일 때만(기존 PendingApprovalCount 사용).
   - 참조 탭의 社員情報(`/admin/users` 미구현·관리자 전용)·各種設定(화면 없음)은 제외하고 休暇承認 + メニュー로 대체. 비활성 표시는 하지 않음.
2. 휴가 카드 라벨 「今年の取得日数」. 값은 기존 `approvedDays` 그대로(계산 변경 없음). 「休暇を申請」 유지. **D12 충돌 기록**: `approvedDays`는 승인 완료 휴가 합이라 미래 승인분 포함 여부는 API 정의에 따름. 라벨이 「今年の取得日数(실제 취득)」로 읽혀 미래 승인 휴가가 포함되면 의미가 어긋날 수 있음 → 결정/백엔드 정의 확인 필요.
3. 休日出勤은 시간 유지(참조 「日」과 다름, 사용자 결정).
4. 사원 모바일 부서 카드: 이미 숨김 없이 표시 중(코드 변경 없음).
5. 「各部署の状況」 표: min-w-100 제거, 열 패딩 축소(<sm 6px), 출근율은 <sm에서 인원 아래 줄로 접음. 필요 시 표 내부 가로 스크롤(기존 overflow-x-auto + 키보드 포커스) 유지. 관리자·사원 공통.
### 영향 범위(Grep)
- AppShell 사용: `app/(app)/layout.tsx` 1곳 → 로그인 후 전 화면. TopBar/SidebarNav는 AppShell만 import. 기존 테스트의 `getAllByRole('navigation',{name: mainLabel})[0]` 등은 탭 nav 라벨이 달라(`モバイルメニュー`) 영향 없음. e2e는 mainLabel nav로 한정해 충돌 없음.
- 사이드바 활성 배경이 primary-100 → primary-30으로 변경(참조 대로).
### 차이 목록 갱신
- 남은 차이: お知らせ·캘린더 없음(기능 없음), 社員情報/各種設定 탭 없음, 부서 표 アラート 열 없음(데이터 없음), 休日出勤 日→時間, 모바일 헤더 소제목·일러스트 없음, 사원 모바일 월간 4지표(참조 3지표).
### 문서 갱신 예정
- 09_DESIGN_SYSTEM.md §3 App Shell: 사이드바 아이콘·활성 스타일, TopBar 벨·아바타 구성, 하단 탭(MobileTabBar, lg 미만, 5탭), `layout/navIcons.tsx`. 03_SCREEN_LIST 전역 내비게이션: 모바일 하단 탭·벨(승인 대기 링크). SCR-002: 휴가 카드 라벨 「今年の取得日数」.
### impeccable 점검
- 터치 타겟(탭 h-12), 활성 상태 aria-current, 아이콘 aria-hidden, 배지 sr-only 대체문구, 드로워가 탭을 가리지 않도록 bottom-16.
### 검증·화면 확인
- tsc 0 오류, eslint 0, vitest 40 파일 556 통과. 화면 확인: 생략(개발 DB 쓰기 금지·로그인 필요로 스크린샷 미실시, tester 담당 폭 390/360 실측 필요).
- 참고: 작업 중 스크립트 중복 실행으로 생긴 import·messages 중복은 수정 완료.

## 디자인 재현 3차
### 변경 파일
- `messages/ja.ts`(`dashboard.leave.approved`=「承認済み日数」, `dashboard.leave.apply` 삭제), `dashboard/LeaveBalanceSection.tsx`(「休暇を申請」 버튼·LeaveApplyModal·`onApplied` 제거, 履歴 링크 유지), `DashboardView.tsx`(onApplied 전달 삭제), `PendingApprovalsSection.tsx`, `DepartmentStatusSection.tsx`, `DashboardView.test.tsx`, `e2e/leaves.spec.ts`, `e2e/dashboard-renewal.spec.ts`
### 내용
1. 라벨 「承認済み日数」(값 `approvedDays` 그대로, 계산 불변). 2차의 D12 충돌 기록은 해소.
2. 대시보드 신청 버튼 제거. 신청은 휴가 관리(`/leaves`) 화면에서만. 테스트: 버튼 존재 기대 → 버튼 없음(카드 내 button 0) + 라벨 확인으로 갱신, 대시보드 모달 신청 테스트 2건(모달 열림/신청 후 재조회)은 기능 삭제로 제거. e2e `leaves.spec`의 대시보드 신청 시나리오 삭제(`/leaves` 신청은 기존 시나리오가 커버), `dashboard-renewal` P-09는 `/leaves`에서 신청 후 대시보드로 이동해 반영 확인하도록 변경.
3. 部署 표 アラート 열: 추가 안 함(현 상태 유지).
4. 月間 근무 지표 4개 유지.
5. 390px 결함: (a) 모바일 승인 대기 행 이름·부서에 `truncate`, 정보 열 `basis-0`, 유형 배지·기간은 `shrink-0 nowrap`으로 이름이 말줄임되고 줄바꿈 안 함. (b) 部署 표 헤더 nowrap, 「出勤（率）」 셀의 率을 인원 아래로 접던 동작 제거(항상 1줄). 좁으면 표 내부 가로 스크롤(기존). 1440·1024(md 이상 표/xl 레이아웃)는 코드 변경 없음.
6. 셸 탭: 「休暇承認」·「メニュー」 대체 유지.
### 사용자 확인 필요
- 모바일 하단 탭 참조의 社員情報·各種設定 화면이 없어 現在 休暇承認·メニュー로 대체 중. 해당 화면 신설 여부/탭 구성 확인 필요.
### 문서 갱신 예정 (architect)
- `docs/09_DESIGN_SYSTEM.md`: SCR-002 휴가 카드에서 신청 버튼 제거, 라벨 「承認済み日数」, 部署 표 출근（率）은 nowrap(좁으면 표 내부 스크롤).
- `docs/03_SCREEN_LIST.md` SCR-002: 대시보드에서 휴가 신청 모달 진입 삭제(신청은 SCR 휴가 관리), 모바일 승인 대기 행 말줄임.
- `docs/04 SCR-002`: §3 휴가 카드(라벨, 신청 버튼 없음), §4 동작(휴가 신청 모달 삭제), 部署 표 アラート 열 없음 명기.
### impeccable 점검
- 말줄임 대상은 `min-w-0 basis-0` 조합 필요(flex 자식이 내용 폭으로 늘어나 4줄 꺾임 발생). 이름은 잘려도 행 전체가 버튼이라 상세 모달에서 전체 확인 가능.
### 검증·화면 확인
- tsc 0 오류, eslint 0, vitest 40파일 554 통과(556 → 신청 테스트 2건 삭제). Playwright 미실행. 화면 확인: 생략(개발 DB 쓰기 금지·로그인 필요). 390px 실측은 tester에서 필요(특히 部署 표가 표 내부 스크롤로 넘치는지).

## 디자인 재현 4차
### 변경 파일
- `frontend/src/app/(app)/dashboard/PendingApprovalsSection.tsx` (md 미만 목록 행만. md 이상 표는 변경 없음)
### 내용
- 결함: 390/360px에서 이름·부서가 `truncate`로 「E2…」「開…」로만 보임.
- 행 재배치: 왼쪽 아바타(size-9, 기존 large 폐기·Avatar의 prop 제거) + 가운데 이름(위)/부서(아래), 오른쪽에 유형 배지 → 기간 → 일수를 세로 우측정렬(`shrink-0 whitespace-nowrap`) + 쉐브론.
- 이름·부서는 `truncate` 대신 `line-clamp-2 wrap-break-word`(최대 2줄, 말줄임은 3줄째부터인 최후 수단). 아바타 축소와 우측 세로 적층으로 이름 폭 확보.
### impeccable 점검
- 터치 타겟(행 전체 버튼)·순서(이름→부서→배지/기간)·토큰만 사용 유지. Tailwind 정규 클래스(`wrap-break-word`) 사용.
### 검증
- tsc 0 오류, eslint 0, vitest dashboard 38 통과.
- 화면 확인: 생략. 로그인에 개발 DB 의존(쓰기 금지)이라 Playwright 390·360 스크린샷 미촬영(screenshots/ 추가 없음). tester에서 390/360 실측 필요.

## 리뷰 수정 1 (review.md Round 1, frontend 담당)
### 변경 파일 (frontend/src)
- `components/form.tsx`(`primaryOutlineButtonClass` 추가), `components/Card.tsx`(`cardSurfaceClass` export), `components/table.ts`(`cardThClass` 추가), `components/layout/navIcons.tsx`(`ChevronDownIcon`), `components/layout/TopBar.tsx`
- `app/(app)/dashboard/` CompanyAttendanceSection, AttendanceSection, DepartmentStatusSection, PendingApprovalsSection, AdminStatsSection, LeaveBalanceSection, icons(`InfoIcon`), `messages/ja.ts`
### 내용
1. 도넛 休暇 색 `text-general-40` → `text-violet-80`(트랙 general-40과 구분, 범례 점도 흰 바탕에서 보임). 기존 토큰만 사용.
2. 退勤する 버튼: form.tsx에 Primary 아웃라인 변형 `primaryOutlineButtonClass`(테두리·색·hover·focus·disabled 포함) 추가, 일회성 클래스 제거. 크기 `base`는 출근 버튼과 공유.
3. 낮음: `clockedInWithRate` 삭제 → 전각 괄호는 `departments.rateInParens(rate)` 메시지로 이동 / 카드 내 표 헤더 공통부를 `table.ts`의 `cardThClass`로 통합(높이·패딩·글자 크기는 호출 측, 외관 불변) / AdminStatsSection 에러 외곽을 `cardSurfaceClass`(Card와 공유)로 / 인라인 SVG 2곳을 `InfoIcon`(dashboard/icons)·`ChevronDownIcon`(navIcons)으로 / 출근 모달 버튼을 `modalPrimaryButtonClass`·`modalSecondaryButtonClass`로.
4. D1 배치는 현재 구현 유지(화면 변경 없음). frontend.md 19행 정정 완료.
### 새로 만든 공용 항목
- `primaryOutlineButtonClass`, `cardSurfaceClass`, `cardThClass`, `InfoIcon`, `ChevronDownIcon`.
### 문서 갱신 예정 (architect)
- `docs/09_DESIGN_SYSTEM.md`: §6 DonutChart 색(出勤 primary-100 / 未出勤 general-50 / 休暇 violet-80, 트랙 general-40), §3 Button에 Primary 아웃라인(`primaryOutlineButtonClass`) 추가, §2.3 Table에 카드 내 표 헤더 `cardThClass`, Card의 `cardSurfaceClass`, 아이콘 모듈에 `InfoIcon`·`ChevronDownIcon`.
- `.claude/work/.../decisions.md` D1·D19, `docs/04 SCR-002 §3-0`: 배치는 구현 기준(1행 今日|承認待ち, 3행 休暇|部署|直近 3열, 사원은 今月+休暇 세로)으로 확정·정정.
### impeccable 점검
- 휴가 구간 색 대비는 비텍스트 요소(3:1 기준) 충족 범위, 범례 숫자로도 구분 유지. 색 의미(보라=休暇)는 진행 막대 그라데이션 색과 같은 계열.
### 검증
- tsc 0 오류, eslint 0, vitest 40파일 554 통과(테스트 기대값 변경 없음). 화면 확인: 생략(개발 DB 쓰기 금지·로그인 필요). 커밋 안 함.

## 리뷰 수정 2 (review.md Round 2, frontend 담당)
### 변경 파일
- `frontend/src/app/(app)/dashboard/CompanyAttendanceSection.tsx`: 休暇 구간·범례 점 색 `text-violet-80` → `text-violet-100`(도넛과 범례가 같은 colorClass 공유).
### 정정
- 리뷰 수정 1의 "휴가 색 3:1 충족" 서술은 오류. violet-80(#9B86F5)은 흰 바탕 대비 약 2.95:1로 비텍스트 기준 3:1 미달. violet-100(#7C5CF0)은 약 4.5:1로 충족.
- 세 구간(出勤 primary-100 / 未出勤 general-50 / 休暇 violet-100)과 트랙 general-40은 색상(청/회/보라)이 달라 구분 유지. 범례 숫자로도 구분.
### 문서 갱신 예정 (architect)
- `docs/09_DESIGN_SYSTEM.md`: §6 DonutChart 색을 出勤 primary-100 / 未出勤 general-50 / 休暇 violet-100(트랙 general-40)으로 기재(리뷰 수정 1의 violet-80 표기 대체). violet-100 용도에 "도넛 休暇 구간·범례 점(비텍스트 대비 약 4.5:1)" 추가.
### 검증
- tsc 0 오류, eslint 0, vitest 40파일 561 통과(테스트 기대값 변경 없음, 색 클래스 검증 없음). 화면 확인: 생략(도구 없음). 커밋 안 함.

## UI 수정 5종 (+6번 하단 여백)
수정 파일: `components/Card.tsx`, `dashboard/AttendanceSection.tsx`·`RecentRequestsSection.tsx`·`PendingApprovalsSection.tsx`, `lib/work-progress.ts`(+test), `messages/ja.ts`, `DashboardView.test.tsx`, `e2e/dashboard-renewal.spec.ts`. 백엔드 수정 없음.
1. 退勤時刻: `GET /attendance/today`가 `clockOut`을 이미 제공 -> 프론트만 수정. 라벨 항상 「退勤時刻」, 퇴근 전 `--:--`, 퇴근 후 실제 HH:mm. 퇴근 직후는 기존 `query.setData(POST 응답)`으로 즉시 반영. `expectedClockOut`(9시간 목안)과 `messages.expectedClockOut` 삭제. 진행률 바는 유지(`workProgressPercent`, 540분 기준, 퇴근 후엔 clockOut 시각으로 고정)-기존 동작 불변.
2. 直近の申請履歴: 리스트/빈 상태 위에 `border-t border-general-40`(기존 `divide-general-40`과 같은 색). 별도 Divider 컴포넌트는 없어 동일 토큰 사용.
3. 직근 행: 버튼이 이미 행 전체(w-full)였음, `cursor-pointer` 추가. onClick·aria-label·키보드(버튼) 유지.
4. 承認待ち: 0건이어도 표 헤더 유지, 헤더 아래 `承認待ちの申請はありません。`(데이터 행 3개분 높이 h-30 확보). 모바일도 0건일 땐 표 표시(詳細 열 숨김, 앞 패딩 축소). 데이터 있을 때 모바일은 기존 목록.
5. 여백: Card `p-5 sm:p-6` -> `px-5 py-4 sm:px-6 sm:py-5`, 본문 `mt-4` -> `mt-3`. 데이터 행 pending 44->40px, recent/모바일 pending `py-3`->`py-2.5`, 勤怠 카드 내부 gap 축소. Card 사용처 14파일(대시보드 6, 출근부 3, 휴가 이력/승인 2, 관리자 근태/부서 3 등)에 세로 여백만 영향. Card 본문을 `flex flex-1 flex-col`로 변경(자식은 블록과 동일하게 전폭, 영향 없음 - 전체 vitest 통과). `cardSurfaceClass`는 AdminStatsSection 에러 박스도 사용.
6. 하단 공백 원인: Slot이 `section`을 행 높이로 stretch(`flex-1`)하는데 본문이 위에 쌓여 남는 높이가 버튼 아래에 생김. 본문을 `flex-1 justify-center`로 해 남는 높이를 버튼 위쪽 본문이 흡수, 버튼은 카드 하단 padding만 남김(버튼 크기·폭 유지). 레이아웃 배치 변경 없음.
- 검증: tsc 0 오류, eslint 0, vitest 40파일 560 통과. Playwright(관리자 900001, 읽기 전용) 1440·390 스크린샷 `ui5-admin-1440.png`, `ui5-admin-390.png`. 사원(900002)은 초기 비밀번호 변경 필요로 미확인(공통 코드라 동일 경로). 퇴근 처리 직후 화면은 단위 테스트(`shouldShowDisabledDoneButtonAndActualClockOutWhenDone` 등)만, 개발 DB 쓰기 안 함. e2e 미실행.
- 문서 갱신 예정: `SCR-002_DASHBOARD.md` 今日の出勤状況 — D10 목안(출근+9시간) 표시 폐기, 항목명 「退勤時刻」·퇴근 전 `--:--`·퇴근 후 실제 시각; 承認待ち 0건 시 헤더 유지+빈 메시지; 직근 申請履歴 구분선·행 전체 클릭. `09_DESIGN_SYSTEM.md` §6 Card: 패딩 横24·縦20, 본문 `flex-1 flex-col`; `lib/work-progress.ts`에서 `expectedClockOut` 삭제(§6 목록·context.md 52행 정정).
- impeccable 점검: 새 장식 없음, 토큰만 사용, 터치 영역 40px 이상 유지.
