# 10. Development Roadmap

> 기능 구현의 진행 상태를 관리하는 문서이다. 사양은 이 문서에 쓰지 않고 기준 문서의 ID로 참조한다.
> 업무 규칙: 02_REQUIREMENTS.md / 화면: 03_SCREEN_LIST.md, 04_SCREEN_SPECIFICATIONS / DB: 05_DATABASE_DESIGN.md / API: 06_API_SPECIFICATION.md / 구조: 07_ARCHITECTURE.md / 테스트: 08_TEST_PLAN.md

최종 갱신: 2026-11-10

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
| 5 | 근태 | FR-ATT-001~005 | 완료 | 완료 | 완료 |
| 6 | 휴가 신청·조회·취소 | FR-LEAVE-001, 004, 005, 006 | 진행 중 | 진행 중 | 진행 중 |
| 7 | 휴가 승인 | FR-LEAVE-002, 003 | 완료 | 완료 | 완료 |
| 8 | 사원 관리 | FR-USER-001, 002, FR-LEAVE-006 | 진행 중 | 대기 | 진행 중 |
| 9 | 대시보드 | FR-DASH-001 | 완료 | 완료 | 완료 |
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
- [x] 마이그레이션(`init`, `split_leaves_rejected_check`), CHECK 14개
- [x] Seed: 부서 4개, 초기 ADMIN(활성 ADMIN이 없을 때만)
- [x] DB 통합 테스트: CRUD, UNIQUE, FK, CHECK 14개, DATE·Decimal 왕복, seed 멱등성
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

### 5. 근태 — 완료

백엔드
- [x] 출근 등록 API-ATT-001 (FR-ATT-001)
- [x] 퇴근 등록 API-ATT-002 (FR-ATT-002)
- [x] 오늘 근태 API-ATT-003
- [x] 내 근태 이력 API-ATT-004 (FR-ATT-003, 상태 계산, 조회 기간 제한)
- [x] 전체 근태 조회 API-ATT-005 (FR-ATT-004)
- [x] 근태 수정 API-ATT-006 (FR-ATT-005, 24시간·근무일 규칙)
- [x] 도쿄 기준 "오늘"·근무일 계산 공통 유틸리티, 주입 가능한 시계 (05 §9, 08 §3) — `common/time`(`Clock`, `tokyo-date`)

프론트엔드
- [x] 근태 관리 화면 SCR-003
- [x] 전체 근태 관리 화면 SCR-008 (수정 모달 포함)

### 6. 휴가 신청·조회·취소 — 진행 중

백엔드
- [ ] 휴가 신청 API-LEAVE-001 (일수 계산, 날짜 중복, 잔여 연차, 즉시 승인, 사용자 단위 잠금 — FR-LEAVE-001, NFR-004, 05 §8)
- [ ] 승인자 후보 목록 API-LEAVE-002
- [ ] 내 휴가 이력 API-LEAVE-003 (FR-LEAVE-005)
- [x] 휴가 상세 API-LEAVE-004 (조회 권한 — FR-LEAVE-005)
- [ ] 휴가 취소 API-LEAVE-005 (FR-LEAVE-004, 조건부 UPDATE)
- [x] 내 휴가 현황(잔여 연차) API-LEAVE-006 (FR-LEAVE-001, 006)

프론트엔드
- [ ] 휴가 관리 화면 SCR-004 (신청 탭, 이력, 공통 휴가 상세 모달) — 공통 휴가 상세 모달(`LeaveDetailModal`, 승인·반려 포함)은 대시보드 작업에서 완료

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

프론트엔드
- [ ] 사원 관리 화면 SCR-006
- [ ] 사원 상세 화면 SCR-007

### 9. 대시보드 — 완료

백엔드
- [x] 관리자 오늘 현황 API-DASH-001 (FR-DASH-001: 출근·미출근·휴가 인원, 전체 승인 대기)

프론트엔드
- [x] 대시보드 화면 SCR-002 (출퇴근 버튼, 개인 휴가 현황, 승인 대기 5건, ADMIN 전체 현황) — 공통 셸(사이드바·상단바·드로어) 포함

### 10. 테스트·품질 — 진행 중

- [x] DB 통합 테스트 (§2 참조)
- [ ] 업무 규칙 단위 테스트 (08 §4) — 각 도메인 구현과 함께
- [ ] API 통합 테스트 (08 §5) — 각 도메인 구현과 함께
- [ ] 권한 매트릭스 테스트 (08 §6)
- [ ] 동시성 테스트: 휴가 신청 잠금, 조건부 UPDATE (NFR-004)
- [ ] 화면 테스트 (08 §7) — SCR-001 완료(Vitest 51건 — 화면 25·redirect 검증 26, Playwright 7건), SCR-009 완료(Vitest 17건, Playwright 3건), SCR-002 완료(Vitest 51건 — 화면 19·휴가 상세 모달 19·공통 셸 13, Playwright 5건), SCR-003·SCR-008 완료(Vitest — 화면 10·전체 근태 8·수정 모달 9·Tooltip 7·관리자 가드 3 외, Playwright 3건), SCR-005·승인 대기 배지 완료(Vitest — 화면 19·Tabs 3·휴가 상세 모달·공통 셸 추가분 외, Playwright 5건)
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
