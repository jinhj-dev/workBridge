# 10. Development Roadmap

> 기능 구현의 진행 상태를 관리하는 문서이다. 사양은 이 문서에 쓰지 않고 기준 문서의 ID로 참조한다.
> 업무 규칙: 02_REQUIREMENTS.md / 화면: 03_SCREEN_LIST.md, 04_SCREEN_SPECIFICATIONS / DB: 05_DATABASE_DESIGN.md / API: 06_API_SPECIFICATION.md / 구조: 07_ARCHITECTURE.md / 테스트: 08_TEST_PLAN.md

최종 갱신: 2026-11-12

## 0. 관리 규칙

- 상태는 `완료` / `진행 중` / `대기` 세 가지만 쓴다.
  - `완료`: 구현과 테스트가 끝나고, 테스트 실행 결과를 확인한 것.
  - `진행 중`: 구현을 시작했지만 위 조건을 아직 만족하지 않은 것.
  - `대기`: 아직 시작하지 않은 것.
- 체크박스는 세부 항목 단위로 갱신한다. 도메인 상태는 세부 항목이 모두 `[x]`이면 `완료`, 하나라도 시작했으면 `진행 중`이다.
- 기능 구현을 마치면 같은 작업 안에서 이 문서의 체크박스, 상태, §1 요약표, 최종 갱신일을 갱신한다.
- 테스트를 실행하지 않은 항목은 `[x]`로 바꾸지 않는다.
- 요구사항·설계가 바뀌면 기준 문서를 먼저 고치고, 이 문서에는 항목 추가·삭제만 반영한다.

## 1. 요약

| # | 도메인 | 관련 요구사항 | 백엔드 | 프론트엔드 | 상태 |
|---|---|---|---|---|---|
| 1 | 개발 기반 | NFR-003 | 완료 | 완료 | 완료 |
| 2 | 데이터베이스 | 05 전체 | 완료 | - | 완료 |
| 3 | 인증 | FR-AUTH-001~003, NFR-001 | 완료 | 완료 | 완료 |
| 4 | 권한·접근 제어 | NFR-001, 03 Screen Access Rules | 진행 중 | 완료 | 진행 중 |
| 5 | 근태 | FR-ATT-001~006 | 완료 | 진행 중 | 진행 중 |
| 6 | 휴가 신청·조회·취소 | FR-LEAVE-001, 004, 005, 006 | 완료 | 진행 중 | 진행 중 |
| 7 | 휴가 승인 | FR-LEAVE-002, 003 | 완료 | 완료 | 완료 |
| 8 | 사원 관리 | FR-USER-001, 002, FR-LEAVE-006, FR-DEPT-001 | 진행 중 | 진행 중 | 진행 중 |
| 9 | 대시보드 | FR-DASH-001 | 완료 | 진행 중 | 진행 중 |
| 10 | 테스트·품질 | 08_TEST_PLAN | 진행 중 | 진행 중 | 진행 중 |
| 11 | 배포 | 01_PRD §7 | 대기 | 대기 | 대기 |

## 2. 도메인별 체크리스트

### 1. 개발 기반 — 완료

- [x] 모노레포 구성, Node 버전 고정, Prettier·ESLint·EditorConfig
- [x] 개발용 PostgreSQL(docker compose), 테스트 DB(`workbridge_test`)
- [x] 백엔드 골격: NestJS, 환경변수 검증(zod), 공통 예외·에러 응답 필터, 입력 검증 파이프, health API
- [x] 백엔드 테스트 구성: unit(`*.spec.ts`), e2e(`*.e2e-spec.ts`, 테스트 DB 전용)
- [x] 프론트엔드 골격: Next.js, Tailwind(09 토큰을 `globals.css` `@theme`에 반영), 일본어 문구 사전(`messages/ja.ts`), API 클라이언트
- [x] 프론트엔드 테스트 구성: Vitest + Testing Library(컴포넌트), Playwright(실제 백엔드 연동 E2E)

### 2. 데이터베이스 — 완료

- [x] Prisma Schema(테이블 6개, ENUM 3개, FK RESTRICT, 인덱스) — 05 §0~§7
- [x] 마이그레이션(`init`, `split_leaves_rejected_check`, `add_users_hire_date`, `department_code_and_required_user_department`), CHECK 14개 — 마지막은 departments.code(UNIQUE)·未所属 부서·users.department_id NOT NULL (05 §1·§2)
- [x] Seed: 부서 5개(未所属 포함, 코드 부여), 초기 ADMIN(활성 ADMIN이 없을 때만, 総務部 소속)
- [x] DB 통합 테스트: CRUD, UNIQUE, FK, CHECK 14개, DATE·Decimal 왕복, seed 멱등성, departments.code UNIQUE·users.department_id NOT NULL·마이그레이션 후 상태
- [x] DB 사용 절차 문서화(`backend/README.md`)

### 3. 인증 — 완료

백엔드
- [x] 로그인 API-AUTH-001 (FR-AUTH-001) — Access Token 15분, Refresh Token 쿠키 발급
- [x] 로그아웃 API-AUTH-003 (FR-AUTH-002)
- [x] 내 정보 API-AUTH-004 (FR-AUTH-001)
- [x] 토큰 갱신 API-AUTH-002, Refresh Token 회전·동시 갱신 1건만 성공 (FR-AUTH-002, 05 §3)
- [x] 비밀번호 변경 API-AUTH-005, 다른 세션 토큰 무효화 (FR-AUTH-003)

프론트엔드
- [x] 로그인 화면 SCR-001 (반응형 360px~, 성공 후 이동은 대시보드가 생길 때까지 임시 팝업)
- [x] 비밀번호 변경 화면 SCR-009 (최초 로그인 강제 포함)
- [x] 앱 최초 로드 시 refresh → me(새로고침 후 유지), 401 시 1회 갱신 후 재시도(single-flight), Access Token 메모리 보관 (03 Common UI Rules)
- [x] 로그아웃 UI(사용자 메뉴) — 상단바 사용자 메뉴(비밀번호 변경·로그아웃)
- [x] 로그인 성공 후 이동(`/password`, `redirect`, `/dashboard`) — 임시 팝업 제거. `redirect`는 같은 origin 내부 경로만 허용(`safeRedirect`, `/login` 제외)

### 4. 권한·접근 제어 — 진행 중

백엔드
- [x] 전역 인증 Guard(토큰 검증, 비활성 계정 차단), PUBLIC 지정 (07 §3)
- [x] 비밀번호 변경 Guard(`PASSWORD_CHANGE_REQUIRED`) (06 §0) — 인증 Guard가 순서대로 호출, 테스트 전용 보호 라우트로 e2e 확인. 실제 보호 API가 생기면 권한 매트릭스(08 §6) e2e 추가
- [x] Role Guard(`/admin/*`는 ADMIN만) (07 §3) — `@AdminOnly()` 메타데이터, 인증 → 비밀번호 변경 → Role 순서
- [ ] 리소스 단위 권한(신청자·할당된 승인자·ADMIN)은 각 도메인 Service에서 구현 (07 §3)

프론트엔드
- [x] 라우트 가드: 비로그인, mustChangePassword, 비관리자 `/admin/*` (03 Screen Access Rules) — 비로그인(`/login?redirect=`)·mustChangePassword(`/password`)·비관리자 `/admin/*`(토스트 + `/dashboard`) 모두 `AppShell`

### 5. 근태 — 진행 중

백엔드
- [x] 출근 등록 API-ATT-001 (FR-ATT-001)
- [x] 퇴근 등록 API-ATT-002 (FR-ATT-002)
- [x] 오늘 근태 API-ATT-003
- [x] 내 근태 이력 API-ATT-004 (FR-ATT-003, 상태 계산, 조회 기간 제한)
- [x] 전체 근태 조회 API-ATT-005 (FR-ATT-004)
- [x] 근태 수정 API-ATT-006 (FR-ATT-005, 24시간·근무일 규칙)
- [x] 도쿄 기준 "오늘"·근무일 계산 공통 유틸리티, 주입 가능한 시계 (05 §9, 08 §3) — `common/time`(`Clock`, `tokyo-date`)
- [x] 출근부 월간 조회 API-ATT-007 (FR-ATT-006: 일본 공휴일 판정, 법정 최저 휴게 계산, 実働·時間外·深夜·休日労働 집계) — 공휴일 래퍼 `common/time/japanese-holiday.ts`(`@holiday-jp/holiday_jp` 2.5.2), unit(UT-ATT-03~07)·e2e 24건(IT-ATT-13~19) 임시 DB 통과

프론트엔드
- [ ] 출근부 화면 SCR-003 (월 이동, 月間表·月間集計, 공휴일 행 표시, 신규 공용 컴포넌트 `WorkTimeline`) — md(768px) 이상은 출근부, md 미만은 기존 기간 검색·상태 필터·카드 목록·페이지네이션 화면(`AttendanceHistoryView`, 복원) 유지. 폭 판정 `lib/useMediaQuery.ts`, 한쪽만 마운트(`AttendanceView`). 月間表 UI 개편(2026-11-11: 좌우 2표·時間帯 영역만 가로 스크롤·행 36·勤務パターン Pill·日付 `1日（日）`·申請 `休暇 {상태}`) 구현. Vitest 통과, Playwright `e2e/attendance-sheet-layout.spec.ts` 8건·`e2e/attendance.spec.ts` 4건·`e2e/attendance-status.spec.ts` 6건 통과(Fix 1 반영 전 코드 기준). 리뷰 CHANGES_REQUESTED 미해결(아래 후속 과제)이라 진행 중 유지
- [x] 전체 근태 관리 화면 SCR-008 (수정 모달 포함)

후속 과제
- [ ] 공휴일 취급 통일: 출근부(SCR-003·API-ATT-007)와 대시보드 출근 집계(FR-DASH-001)는 공휴일=휴일, 휴가 일수(FR-LEAVE-001)는 공휴일=평일 (02 FR-ATT-006)
- [ ] 공휴일 데이터 유지: `@holiday-jp/holiday_jp` 수록 범위가 2050년까지이고 정부 발표 반영은 라이브러리 버전 업데이트에 의존하므로 Dependabot 등으로 정기 업데이트(06 API-ATT-007)
- [ ] SCR-003 선택 행 표현: 일반 `<table>`의 `<tr aria-selected>`는 보조기기가 읽지 않을 수 있으므로 `aria-current="true"` 또는 grid 패턴 검토(설계·테스트 함께 변경)
- [ ] SCR-003 출근부 UI 개편 Fix 1 검증: `whitespace-nowrap`(出勤時刻·退勤時刻·実働時間), `workPatternOf` 판별 유니온, `useHorizontalOverflow`·時間帯 영역 조건부 `tabIndex`는 Vitest(관련 12파일 201건)·tsc·lint만 확인. Playwright 재실행·리뷰 재확인 미실시
- [ ] `e2e/attendance-sheet-layout.spec.ts` 스크린샷 저장 경로: 작업 폴더(`.claude/work/attendance-sheet-ui/screenshots`) 고정 → `testInfo.outputPath(...)`로 변경(리뷰 중간)
- [ ] SCR-003 768px 레이아웃 시각 확인: 768 스크린샷이 로딩 스켈레톤으로 찍혀 태블릿 안전망 레이아웃을 눈으로 확인한 근거 없음. 캡처 직전 표 표시 확인 후 재캡처, 재마운트·재조회 재현 시 원인 기록(리뷰 중간, 원인 미재현)
- [ ] `e2e/attendance-sheet-layout.spec.ts` 보강(리뷰 낮음): E3 1366에서 region 넘침·`scrollLeft > 0` 실검증, E7 토요일 색을 `primary-100` rgb로 확인, 66-69행 `pageHorizontalOverflow` 헬퍼 사용, 224행 주석(안전망 위치) 정정

### 6. 휴가 신청·조회·취소 — 진행 중

백엔드
- [x] 휴가 신청 API-LEAVE-001 (일수 계산, 날짜 중복, 잔여 연차, 즉시 승인, 사용자 단위 잠금 — FR-LEAVE-001, NFR-004, 05 §8)
- [x] 승인자 후보 목록 API-LEAVE-002
- [x] 내 휴가 이력 API-LEAVE-003 (FR-LEAVE-005, `status`·`leaveType` 쉼표 구분 복수 필터)
- [x] 휴가 상세 API-LEAVE-004 (조회 권한 — FR-LEAVE-005)
- [x] 휴가 취소 API-LEAVE-005 (FR-LEAVE-004, 조건부 UPDATE)
- [x] 내 휴가 현황(잔여 연차) API-LEAVE-006 (FR-LEAVE-001, 006)

프론트엔드
- [ ] 휴가 관리 화면 SCR-004 (공통 휴가 신청 모달, 이력 상태·휴가 종류 토글 필터, 공통 휴가 상세 모달) — 공통 휴가 상세 모달(`LeaveDetailModal`, 승인·반려 포함)은 대시보드 작업에서 완료. 탭을 없애고 신청을 공통 모달(`LeaveApplyModal`)로 변경(SCR-002 휴가 카드의 신청 진입은 2026-11-12 삭제). 화면·[취소] 단계 구현과 Vitest는 완료, Playwright `e2e/leaves.spec.ts` 8건(대시보드 신청 모달 포함)은 미실행(E2E 환경변수 미설정)

### 7. 휴가 승인 — 완료

백엔드
- [x] 승인 대기 목록 API-LEAVE-007 (`scope=mine` / `all`, FR-LEAVE-003)
- [x] 휴가 승인 API-LEAVE-008 (FR-LEAVE-002, 조건부 UPDATE)
- [x] 휴가 반려 API-LEAVE-009 (FR-LEAVE-002)

프론트엔드
- [x] 휴가 승인 화면 SCR-005
- [x] 사이드바 승인 대기 배지 (03 전역 내비게이션)

### 8. 사원 관리 — 진행 중

백엔드
- [ ] 사원 목록 API-USER-001 (검색 조건, 페이지네이션)
- [ ] 사원 등록 API-USER-002 (FR-USER-001, 사원번호 정규화·중복)
- [ ] 사원 상세 API-USER-003
- [ ] 사원 수정 API-USER-004 (FR-USER-002: 마지막 활성 ADMIN 보호, 비활성화 처리 — PENDING 취소·토큰 무효화)
- [ ] 부여 연차 등록·수정 API-USER-005 (FR-LEAVE-006, 사용 일수 미만 금지)
- [x] 부서 목록 API-DEPT-001
- [x] 부서 관리 API-DEPT-002~006 (FR-DEPT-001: 코드 대문자 정규화·중복, 未所属 보호, 활성 사원 있는 부서 삭제 금지, 비활성 사원 未所属 이동, 부서 행 잠금 — 05 §8)

프론트엔드
- [ ] 사원 관리 화면 SCR-006
- [ ] 사원 상세 화면 SCR-007
- [x] 부서 관리 화면 SCR-010 (등록·수정 모달, 삭제 확인 모달, 사이드바 部署管理) — Vitest 25건, Playwright `e2e/departments.spec.ts` 4건 통과(임시 DB). 개발 DB에는 이 마이그레이션 미적용

### 9. 대시보드 — 진행 중

백엔드
- [x] 관리자 오늘 현황 API-DASH-001 개편 (FR-DASH-001: 대상자 = 활성·입사일 도래, 출근 > 휴가 > 미출근 배타 3분류, 비근무일(토·일·일본 공휴일)은 출근만, 출근율·`totalEmployeeCount`·`isWorkday` 추가) — `dashboard/today-status-rules.ts`, 부서별 집계 합계로 계산
- [x] 부서별 오늘 현황 API-DASH-004 (신규, USER, 숫자만 공개·0명 부서 제외·未所属 마지막)
- [x] 월간 휴가 캘린더 API-DASH-002·003 제거(404) — 출근부가 쓰던 `isWeekend`·`monthRange`는 `common/time/calendar-rules.ts`로, 월 형식 검증은 `attendance-monthly-query.dto.ts`로 이관(동작 동일). test-report Run 4는 백엔드 변경 없음으로 백엔드 테스트 생략(이전 Run 기록은 test-report 참조)

프론트엔드
- [x] 대시보드 화면 SCR-002 개편(1단계·디자인 재현 1·2차): ADMIN 통계 3개·全社 도넛(`DonutChart`), 承認待ち(승인자·ADMIN, 상세 모달에서 승인·반려), 今日の出勤状況(단일 출퇴근 버튼·退勤時刻(실제 퇴근 시각, 퇴근 전 `--:--`)·진행률), 今月の勤務状況 4칸, 休暇の残り日数, 各部署の状況, 直近の申請履歴. 캘린더 삭제. `xl` 이상 행 단위 그리드(ADMIN ① 今日|承認待ち ② 全社|今月 ③ 休暇|部署|直近 3열, 사원은 今月·休暇 세로 묶음) / 미만 1열(SCR-002 §3-0·D19) — test-report Run 4: Vitest 40파일 556건, tsc·lint 오류 없음, Playwright `dashboard-renewal` 9건·login·dashboard·attendance-sheet-layout 20건·approvals·departments 9건·leaves 8건·attendance-status 6건·password 3건 통과(격리 스택·테스트 DB)
- [x] 공통 셸 재현(디자인 재현 2차, 09 §3·§5 6): 사이드바 아이콘·활성 스타일, 상단바 벨·아바타, `lg` 미만 하단 탭 `MobileTabBar` — test-report Run 4에서 390·360 탭·드로어 동작, 다른 화면 4개 가로 넘침 없음 확인
- [ ] 디자인 재현 3차 반영분 테스트 최종 확인: 휴가 카드 라벨 「承認済み日数」·[休暇を申請] 버튼 제거·모바일 승인 대기 행 말줄임·部署 표 「出勤（率）」 1줄. frontend 자체 Vitest만 실행(tester Run 미실시, Playwright `dashboard-renewal`·`leaves` 갱신분 미실행)

확인 대기
- [ ] 참조 이미지(8~11) 차이 최종 확인 — P-03은 체크리스트 수동 대조. 남은 차이(お知らせ 없음, アラート 열 없음, 休日出勤 시간 단위, 월간 4지표, 사원 모바일 部署 카드 노출, 모바일 헤더 소제목·일러스트 없음)는 사용자 결정으로 유지
- [ ] 사용자 확인: 하단 탭 참조의 社員情報·各種設定을 休暇承認·メニュー로 대체한 구성
- [ ] 사용자 확인: 휴가 카드 라벨 「承認済み日数」
- [ ] 백엔드 `approvedDays` 정의 확인: 해당 연도 시작일 기준 APPROVED 합계로 미래 날짜 승인분도 포함(test-report Run 4 §5)
- [ ] 미구현 테스트: P-06 사이드바 승인 배지 갱신 확인, IT-DASH-25 DB 세션 TZ 3종(08 §5.5)

### 10. 테스트·품질 — 진행 중

- [x] DB 통합 테스트 (§2 참조)
- [ ] 업무 규칙 단위 테스트 (08 §4) — 각 도메인 구현과 함께
- [ ] API 통합 테스트 (08 §5) — 각 도메인 구현과 함께
- [ ] 권한 매트릭스 테스트 (08 §6)
- [ ] 동시성 테스트: 휴가 신청 잠금, 조건부 UPDATE (NFR-004)
- [ ] 화면 테스트 (08 §7) — SCR-001 완료(Vitest 51건 — 화면 25·redirect 검증 26, Playwright 7건), SCR-009 완료(Vitest 17건, Playwright 3건), SCR-002 개편 진행 중(test-report Run 4: Vitest 40파일 556건 전체 통과, Playwright `e2e/dashboard-renewal.spec.ts` 9건(P-01·02·04~10)·`dashboard.spec` 포함 통과. 休暇カレンダー 테스트는 기능 삭제로 제거. 디자인 재현 3차 반영분은 tester 재실행 전, §2 #9), SCR-008 완료(Vitest — 전체 근태 8·수정 모달 9·Tooltip 7·관리자 가드 3 외, Playwright 3건), SCR-003 출근부 진행 중(Vitest — AttendanceSheetView·CurrentDateTimeCard·WorkTimeline·`lib/attendance-sheet`·AttendanceView(폭 전환)·`useMediaQuery`·AttendanceHistoryView·StatusFilterButtons 통과, Playwright `e2e/attendance-sheet-layout.spec.ts` 8건·`e2e/attendance.spec.ts` 4건·`e2e/attendance-status.spec.ts` 6건 통과(Fix 1 반영 전), §2 #5 후속 과제 미해결), SCR-005·승인 대기 배지 완료(Vitest — 화면 19·Tabs 3·휴가 상세 모달·공통 셸 추가분 외, Playwright 5건), SCR-004 진행 중(Vitest — 화면·신청 모달·LeaveFilterButtons·ApproverSelect·휴가 상세 모달 취소·`leave-days` 외 통과, Playwright 8건 미실행), SCR-010 완료(Vitest 25건, Playwright 4건)
- [ ] E2E 하네스 정비(`PLAYWRIGHT_BASE_URL` 지정·임시 DB 실행): `e2e/attendance-status.spec.ts` 6건은 이전 실행에서 실패 이력이 있었으나(2026-11-10 이력) 2026-11-11 개발 DB 실행에서 통과(해소). `e2e/leaves.spec.ts` `shouldShowSummaryAndHistoryWithoutLoadError`는 이전 실행 이력에 의존해 실패. `backend/package.json`에 `db:e2e-leaves-reset` 스크립트가 없어(main에도 없음) `leaves.spec.ts`의 `beforeAll`은 기본 실행에서도 실패(2026-11-11 확인, 미실행)
- [ ] E2E 핵심 여정 E2E-01~05 (08 §8, Playwright)
- [ ] CI(GitHub Actions): lint, 타입 검사, unit, e2e(postgres 서비스 컨테이너), build

### 11. 배포 — 대기

- [ ] 배포 환경 구성(Docker, AWS) — 07 §6
- [ ] 운영 환경변수·비밀정보 관리, 운영 DB 마이그레이션(`migrate deploy`)·seed 절차
- [ ] 배포본 접속 확인 (01_PRD §7 "실제 환경에 배포되어 접근 가능")

## 3. 갱신 이력

| 날짜 | 내용 |
|---|---|
| 2026-11-08 | 최초 작성. 개발 기반(백엔드)·데이터베이스 완료 |
| 2026-11-08 | 인증 백엔드: 로그인·로그아웃·내 정보, 인증 Guard·비밀번호 변경 Guard 완료(unit 31건, e2e 74건 통과) |
| 2026-11-08 | PRODUCT.md·09 §5: 데스크톱 전용 → 전체 앱 반응형(최소 360px)으로 범위 변경 |
| 2026-11-08 | 인증 QA·코드 리뷰 지적 반영: 사원번호 숫자 전용 규칙(FR-USER-001), 네이티브 bcrypt 교체, 500 오류 2건 수정, Guard fail-closed(unit 62건, e2e 93건 통과) |
| 2026-11-08 | 토큰 갱신 API-AUTH-002 완료(unit 72건, e2e 105건 통과) |
| 2026-11-08 | 로그인 화면 SCR-001, 인증 유지(refresh → me), 프론트엔드 테스트 구성 완료(Vitest 18건, Playwright 7건 — 실제 백엔드 연동) |
| 2026-11-08 | 비밀번호 변경 API-AUTH-005·화면 SCR-009 완료, 로그인 후 `/password` 이동(unit 96건, e2e 124건, frontend 36건 통과, Playwright 9건 통과) |
| 2026-11-08 | 대시보드 SCR-002·API-DASH-001 완료. Role Guard, 근태 API-ATT-001~003·시계 유틸, 휴가 API-LEAVE-004·006~009, 공통 셸·라우트 가드(비관리자 제외)·로그인 후 이동·로그아웃 UI(unit 140건, e2e 193건, frontend 129건 통과. Playwright 14건 중 Run 1 13건 통과, Run 2는 개발 DB 관리자 비밀번호 불일치로 로그인 필요 6건 미통과 — 환경 문제) |
| 2026-11-09 | E2E 전용 계정 900001(ADMIN)/900002(최초 로그인 EMPLOYEE) 도입, `npm run db:e2e-accounts`를 Playwright globalSetup이 자동 실행해 매 실행 초기화(Playwright 15건 연속 2회 통과). 기존 "개발 DB 관리자 비밀번호 불일치"(14건 중 Run 2 미통과) 환경 문제 해소 |
| 2026-11-09 | 근태 완료: API-ATT-004~006, 근태 관리 SCR-003, 전체 근태 관리 SCR-008(수정 모달). 부서 목록 API-DEPT-001, 비관리자 `/admin/*` 라우트 가드 완료. `Attendance.modifiedAt` 추가(06 §0). 공용 컴포넌트 Pagination·Tooltip·table·DateRangeFields·attendanceStatus·selectClass(09 §6)(backend unit 173건, e2e 229건, frontend 202건 통과, Playwright 18건 통과) |
| 2026-11-10 | 휴가 승인 완료: 휴가 승인 화면 SCR-005, 사이드바 승인 대기 배지. 공용 컴포넌트 Tabs·PendingApprovalCount, LeaveDetailModal `initialStep`(09 §6). E2E 관리자 근태 초기화 스크립트 `db:e2e-attendance-reset` 추가(backend unit 176건, e2e 229건, frontend 245건 통과, Playwright 23건 통과) |
| 2026-11-10 | 휴가 신청·조회·취소 백엔드 완료: API-LEAVE-001·002·003·005. 휴가 관리 화면 SCR-004와 LeaveDetailModal [취소] 단계 구현, 공용 컴포넌트 ApproverSelect·`textareaClass`·`lib/leave-days.ts`(09 §6). E2E 관리자 휴가 초기화 스크립트 `db:e2e-leaves-reset` 추가(backend unit 199건, e2e 274건, frontend 334건 통과. Playwright `e2e/leaves.spec.ts` 7건은 E2E 환경변수 미설정으로 미실행 — SCR-004는 진행 중 유지) |
| 2026-11-10 | 휴가 관리 개편: SCR-004 탭 삭제, 휴가 신청을 공통 모달 `LeaveApplyModal`로 변경(SCR-002 휴가 현황 카드에서도 사용, 화면 이동 없음), 이력 필터를 상태·휴가 종류 토글 복수 선택(`LeaveFilterButtons`)으로 변경. API-LEAVE-003 `status` 쉼표 복수·`leaveType` 추가(06), 공용 컴포넌트·`LEAVE_TYPES`(09 §6)(backend unit 199건, e2e 277건, frontend 358건 통과. Playwright `e2e/leaves.spec.ts` 8건은 E2E 환경변수 미설정으로 미실행 — SCR-004는 진행 중 유지) |
| 2026-11-10 | 사원 입사일: `users.hire_date`(DATE, NOT NULL, 기본값 없음)와 마이그레이션 `add_users_hire_date` 추가(기존 행·seed 초기 ADMIN·E2E 계정은 2026-01-01). 02·05·06·SCR-006·SCR-007·08에 입사일 계약 반영. API-USER-001~004·SCR-006/007 구현은 기능 8에서 진행(backend unit 185건, e2e 238건 통과) |
| 2026-11-10 | 부서 관리 백엔드 완료: API-DEPT-002~006(FR-DEPT-001 신설), departments.code·시스템 부서 未所属·users.department_id NOT NULL 마이그레이션, seed·E2E 계정 부서 지정. 부서 관리 화면 SCR-010·사이드바 部署管理 구현. 사원 쪽 부서 필수화는 문서(02·06·SCR-006·007)만 반영(backend unit 222건, e2e 313건, frontend 391건 통과 — 임시 테스트 DB. Playwright `e2e/departments.spec.ts`는 개발 DB 미마이그레이션으로 미실행 — SCR-010은 진행 중 유지) |
| 2026-11-10 | 부서 관리 화면 SCR-010 완료: Playwright `e2e/departments.spec.ts` 4건 임시 DB에서 통과. 부서 API `:id` 형식 오류 400 VALIDATION_ERROR, 검색어 `%`·`_`·`\` 문자 그대로 일치, 未所属 부재 시 500(06·08 반영)(backend unit 222건, e2e 317건, frontend 391건 통과). 범위 밖 기존 Playwright 실패 7건(attendance-status 6, leaves 1)은 §2 #10 "E2E 하네스 정비"로 분리 |
| 2026-11-10 | 대시보드 월간 휴가 캘린더 완료: API-DASH-002·003(신규, USER), SCR-002 §3-6 休暇カレンダー. 공개 범위는 이름·부서·반차 구분만(신청 사유·상태 미표시, 02 FR-DASH-001·FR-LEAVE-005 보충). 공용 컴포넌트 `MonthCalendar`·`lib/calendar.ts` 추가, Card 헤더 좁은 폭 줄바꿈(09 §6), 공용 `common/validation/date-schema.ts`. DB 변경 없음(backend unit 242건, e2e 361건, frontend 412건 통과 — 임시 테스트 DB. Playwright `e2e/dashboard-leave-calendar.spec.ts` 3건 임시 DB 통과, Card 변경 전후 6화면×2폭 스크린샷 비교에서 의도 외 변화 없음. 범위 밖 기존 Playwright 스펙은 미재측정) |
| 2026-11-10 | 출근부: API-ATT-007(신규, USER, FR-ATT-006 신설) 완료, SCR-003을 "근태 관리"(기간 검색·상태 필터·페이지네이션)에서 월간 출근부 `出勤簿`로 교체. 일본 공휴일은 백엔드에서만 판정(`@holiday-jp/holiday_jp` 2.5.2, 1970~2050), 휴게는 법정 최저 계산값. 공용 컴포넌트 `WorkTimeline`·`lib/attendance-sheet.ts` 추가(02·03·SCR-003·06·08·09 반영). md 미만은 구 화면 유지(복원) — `StatusFilterButtons`·`AttendanceHistoryView`·`e2e/attendance-status.spec.ts`·`db:e2e-attendance-fixture`는 유지(아래 추가 요구 행). DB 변경 없음(backend unit 290건, e2e 385건, frontend 437건 통과 — 임시 테스트 DB. Playwright `e2e/attendance.spec.ts`는 E2E 환경변수 미설정으로 미실행 — SCR-003은 진행 중). 후속 과제 3건(공휴일 통일·공휴일 데이터 갱신·선택 행 ARIA)을 §2 #5에 기록 |
| 2026-11-10 | 출근부 추가 요구(모바일 구 레이아웃): SCR-003을 화면 폭으로 분기 — md(768px) 이상은 출근부, md 미만은 기존 근태 이력 화면(기간·상태 검색, 카드 목록, API-ATT-004). 공용 훅 `lib/useMediaQuery.ts`(서버 스냅샷 null, 판정 전 스피너, 한쪽만 마운트). `AttendanceHistoryView`·`StatusFilterButtons`·`parseMyHistoryQuery`·`e2e/attendance-status.spec.ts`(390px 지정)·`db:e2e-attendance-fixture`를 main에서 복원(02 FR-ATT-003·03·SCR-003 §9·08 §7·09 §6 반영). API·DB 변경 없음(backend unit 294건, e2e 385건, frontend 482건 통과. Playwright는 E2E 환경변수 미설정으로 Run 1~5 내내 미실행 — `attendance-status` 6건 해소 여부 미확인, SCR-003은 진행 중 유지) |
| 2026-11-11 | 출근부 UI 개편: SCR-003 月間表를 좌우 2표(왼쪽 8열 고정 + 時間帯 영역만 가로 스크롤, 2px 구분선)로 분리, 행 36, 勤務パターン Pill, 日付 `1日（日）`, 申請 `休暇 {상태}`, 1024px 2단 스크롤 명시(SCR-003 §4). 공용 `Badge` `shape`·`table.ts` `compactTdClass`/`compactTdBaseClass`·`attendance/workPattern.ts`·`lib/useHorizontalOverflow.ts`·`workPatternOf`(09 §2.3·§6), 08 §7 레이아웃 E2E. API·DB 변경 없음(frontend 498건, backend unit 294건, e2e 385건 통과. Playwright 8개 spec 42건 2회 연속 통과 — 단 Fix 1(nowrap·판별 유니온·조건부 tabIndex) 반영 후 E2E·리뷰 재확인 없음. 리뷰 CHANGES_REQUESTED의 tester 항목(스크린샷 경로·768 시각 확인·E3/E7 보강)은 사용자 지시로 미수정 종료 → §2 #5 후속 과제, SCR-003은 진행 중 유지). 개발 백엔드 표준 포트 4000 → 6000(bad port 주의는 context.md) |
| 2026-11-12 | 대시보드 개편(SCR-002): API-DASH-001 집계 규칙 개편(배타 3분류·입사일·비근무일·출근율), API-DASH-004 부서별 현황 신규(USER, 숫자만), 월간 휴가 캘린더(API-DASH-002·003, SCR-002 §3-6) 삭제. 승인자·ADMIN 대시보드 승인·반려, 退勤予定 目安(9시간, 표시 전용), 정적 SVG 도넛. 참조 디자인 재현으로 공용 `Card`·`body` 배경·토큰 추가, 셸(사이드바 아이콘·벨·아바타·모바일 하단 탭) 변경(D16 변경, 09 §5 6). 대시보드 휴가 신청 버튼 삭제. 02·03·SCR-002·SCR-004·06·08·09 반영. DB 변경 없음(test-report Run 4: frontend Vitest 40파일 556건, Playwright 55건 통과, 백엔드는 변경 없음으로 생략. 디자인 재현 3차 반영분 테스트 최종 확인·참조 이미지 차이·사용자 확인 항목 대기로 진행 중) |
| 2026-11-12 | 대시보드 UI 수정(SCR-002, 사용자 요청): 今日の出勤状況의 退勤予定（目安）(출근 + 9시간)을 폐기하고 退勤時刻(실제 퇴근 시각, 퇴근 전 `--:--`)으로 변경(진행률은 유지). 承認待ち 0건 시 표 헤더 유지 + 빈 문구, 直近の申請履歴 상단 구분선·행 전체 포인터, 공용 `Card` 패딩(좌우 20·상하 16, `sm` 이상 24·20)·본문 간격 12·본문 `flex-1`, `lib/work-progress.ts` `expectedClockOut` 삭제. 02·SCR-002·08·09 반영. API·DB 변경 없음(frontend tsc·eslint 오류 없음, Vitest 40파일 560건 통과. Playwright 미실행) |
