# 10. Development Roadmap

> 기능 구현의 진행 상태를 관리하는 문서이다. 사양은 이 문서에 쓰지 않고 기준 문서의 ID로 참조한다.
> 업무 규칙: 02_REQUIREMENTS.md / 화면: 03_SCREEN_LIST.md, 04_SCREEN_SPECIFICATIONS / DB: 05_DATABASE_DESIGN.md / API: 06_API_SPECIFICATION.md / 구조: 07_ARCHITECTURE.md / 테스트: 08_TEST_PLAN.md

최종 갱신: 2026-11-14

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
| 6 | 휴가 신청·조회·취소 | FR-LEAVE-001, 004, 005, 006 | 완료 | 완료 | 진행 중 |
| 7 | 휴가 승인 | FR-LEAVE-002, 003 | 완료 | 완료 | 완료 |
| 8 | 사원 관리 | FR-USER-001, 002, FR-JOB-001, FR-LEAVE-006, FR-DEPT-001 | 진행 중 | 진행 중 | 진행 중 |
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

- [x] Prisma Schema(테이블 7개, ENUM 4개, FK RESTRICT, 인덱스) — 05 §0~§7
- [x] 마이그레이션(`init`, `split_leaves_rejected_check`, `add_users_hire_date`, `department_code_and_required_user_department`, `add_departments_description_manager`), CHECK 14개 — departments.code(UNIQUE)·未所属 부서·users.department_id NOT NULL (05 §1·§2), departments.description·manager_id(FK RESTRICT, UNIQUE 없음)·인덱스 `departments(manager_id)` (05 §1·§7, 개발·테스트 DB 적용)
- [x] Seed: 부서 5개(未所属 포함, 코드 부여), 초기 ADMIN(활성 ADMIN이 없을 때만, 総務部 소속)
- [x] 직책 마스터·連絡先: 마이그레이션 `add_job_titles_and_users_contact` — `job_titles`(name UNIQUE, tone ENUM `job_title_tone` 기본 GRAY)·`users.job_title_id`(FK RESTRICT, 인덱스 없음)·`users.contact_email`(VARCHAR 254, UNIQUE 없음), 기존 행 NULL. seed 직책 4개(이름 기준 중복 없음, 기존 행 불변) (05 §0·§2·§2-1·§7, 개발·테스트 DB 적용). DB 통합 테스트(UNIQUE·FK RESTRICT·ENUM·길이·컬럼 정의, seed 재실행 시 tone 불변) 통과
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
- [ ] SCR-003 출근부 태블릿 폭 가로 overflow(기존 결함): `e2e/attendance-sheet-layout.spec.ts` `shouldNotBreakLayoutAt1024`·`shouldNotBreakLayoutAt768`이 28px·18px(Run 1에서는 41px·31px) 페이지 가로 overflow로 실패. 커밋 6c3d6ec(변경 전)에서도 같은 DB 상태로 재현되며 900001의 2026-11 근태 데이터 상태에 따라 실패 여부가 달라진다. 화면 명세 「横スクロールしない」 위반이므로 테스트는 완화하지 않음(employee-management test-report Run 2 §3·Run 4 §4, 담당 frontend)
- [ ] `e2e/attendance-sheet-layout.spec.ts` 보강(리뷰 낮음): E3 1366에서 region 넘침·`scrollLeft > 0` 실검증, E7 토요일 색을 `primary-100` rgb로 확인, 66-69행 `pageHorizontalOverflow` 헬퍼 사용, 224행 주석(안전망 위치) 정정

### 6. 휴가 신청·조회·취소 — 진행 중

백엔드
- [x] 휴가 신청 API-LEAVE-001 (일수 계산, 날짜 중복, 잔여 연차, 즉시 승인, 사용자 단위 잠금 — FR-LEAVE-001, NFR-004, 05 §8)
- [x] 승인자 후보 목록 API-LEAVE-002
- [x] 내 휴가 이력 API-LEAVE-003 (FR-LEAVE-005, `status`·`leaveType` 쉼표 구분 복수 필터, 신청일 범위 `appliedFrom`·`appliedTo` — 2026-11-12, e2e IT-HIS-01~03)
- [x] 휴가 상세 API-LEAVE-004 (조회 권한 — FR-LEAVE-005)
- [x] 휴가 취소 API-LEAVE-005 (FR-LEAVE-004, 조건부 UPDATE)
- [x] 내 휴가 현황(잔여 연차) API-LEAVE-006 (FR-LEAVE-001, 006)
- [x] 공유 휴가 캘린더 API-LEAVE-010 (FR-LEAVE-005 공유 캘린더 공개 규칙: APPROVED·활성 사원만, 공개 7필드, NFR-002 페이지네이션 예외) — `leaves/leave-calendar-rules.ts`, e2e IT-CAL-01~12, 개발 DB 픽스처 `db:e2e-leave-calendar-fixture`

프론트엔드
- [x] 휴가 관리 화면 SCR-004 (경로 기반 탭 3개 自分の休暇·休暇カレンダー·承認, 공통 휴가 신청 모달, 신청일 범위·휴가 종류·상태 필터, 공통 휴가 상세 모달, 공유 캘린더 PC·모바일) — 2026-11-12 휴가관리 통합으로 SCR-005를 承認 탭으로 흡수, 참조 이미지 재현(Primary 유지). Vitest, Playwright `e2e/leave-management.spec.ts`·`leaves.spec.ts`·`approvals.spec.ts`·`leave-visual.spec.ts` 61건 통과(test-report Run 4)
- [x] 휴가 관리 사이드바 하위 메뉴 (03 전역 내비게이션, SCR-004 §3.0) — 2026-11-12 페이지 안 탭 UI(`NavTabs`) 삭제, 사이드바·드로어 休暇管理 개폐 하위 메뉴(`SidebarSubmenu`)로 이동, 承認 표시 판정 공유(`ApprovalsAccessProvider`). Vitest 44파일 612건, Playwright `e2e/leave-sidebar-submenu.spec.ts` 포함 22건 통과

후속 과제
- [ ] IT-CAL-04 같은 사원·같은 날 HALF_AM/HALF_PM 동률 정렬(「AM 먼저」) e2e 미검증(리뷰 Round 2 낮음)
- [ ] `lib/leave-days.ts` `parseLeavesQuery`의 `appliedFrom > appliedTo` 역전 범위 폐기에 단위 테스트 없음(리뷰 Round 2 낮음)
- [ ] `LeaveCalendarView.tsx`의 `cardClass = cardFrameClass` 별칭 정리(리뷰 Round 2 낮음)

### 7. 휴가 승인 — 완료

백엔드
- [x] 승인 대기 목록 API-LEAVE-007 (`scope=mine` / `all`, FR-LEAVE-003. 2026-11-12 `status`(PENDING 기본·APPROVED·REJECTED) 추가, `scope=all`은 즉시 승인 제외 — e2e IT-APR-01~05)
- [x] 휴가 승인 API-LEAVE-008 (FR-LEAVE-002, 조건부 UPDATE)
- [x] 휴가 반려 API-LEAVE-009 (FR-LEAVE-002)

프론트엔드
- [x] 휴가 승인 화면 SCR-005 — 2026-11-12 SCR-004 承認 탭으로 통합(상태 요약 카드·상태별 목록, 표시 판정 ADMIN 항상 / 본인 할당 1건 이상)
- [x] 사이드바 승인 대기 배지 (03 전역 내비게이션) — 2026-11-12 사이드바 休暇承認 메뉴·하단 탭 休暇承認 삭제, 배지·빨간 점은 休暇管理로 이동(하단 탭 4개)

### 8. 사원 관리 — 진행 중

백엔드
- [x] 사원 목록 API-USER-001 (검색 조건, 페이지네이션. 2026-11 `keyword`·`jobTitleId`·`status`(在籍中·入社予定·無効 계산) 추가, `jobTitle`·`contactEmail`·`employmentStatus` 응답) — employee-management test-report Run 4: backend e2e 514건 통과
- [x] 사원 등록 API-USER-002 (FR-USER-001: 사원번호 자동 채번(5자리 최댓값+1, advisory lock, 재채번 3회)/직접 입력·중복, 役職·メール·入社日·初期パスワード 필수, 초기 비밀번호는 관리자 입력·서버 정책 검증·해시만 저장·평문 비노출. 메일 발송·재발급 없음)
- [x] 사원 상세 API-USER-003
- [x] 사원 수정 API-USER-004 (FR-USER-002: 마지막 활성 ADMIN 보호(활성 ADMIN 선잠금), 비활성화 처리 — PENDING 취소·토큰 무효화·부서 책임자 자동 해제(겸임 포함). 부서 이동은 책임자 유지. 役職 변경은 Role 불변. 화면의 削除 = 비활성화)
- [x] 사원 요약 API-USER-006·다음 자동 채번 예정 번호 API-USER-007(`next-emp-id`) 신규
- [x] 직책 관리 API-JOB-001~004 신규 (FR-JOB-001: 이름 1~50자·제어 문자 불가·중복 409, tone 8색 — 마이그레이션 `extend_job_title_tone`으로 enum 4값 추가, 사용 중(비활성 포함) 삭제 409) — e2e `admin-job-titles.e2e-spec.ts`
- [x] 개발 DB 정리 스크립트 `db:e2e-users-cleanup`(E2E 社員·E2E役職만 삭제: 이름 접두사 AND 13자리 숫자 메일 AND 보호 사번 제외, 다른 사원 기록이 참조하면 아무것도 지우지 않고 exit 1, 사용 중 E2E役職은 보존) — test-report Run 5 테스트 DB 시나리오 A·B 통과
- [ ] 부여 연차 등록·수정 API-USER-005 (FR-LEAVE-006, 사용 일수 미만 금지) — 2026-11 사원 관리 구현 범위 밖, 미구현
- [x] 부서 목록 API-DEPT-001
- [x] 부서 관리 API-DEPT-002~006 (FR-DEPT-001: 코드 대문자 정규화·중복, 未所属 보호, 활성 사원 있는 부서 삭제 금지, 비활성 사원 未所属 이동, 부서 행 잠금 — 05 §8)
- [x] 부서 관리 재설계 백엔드 (FR-DEPT-001): API-DEPT-002 `sort`·`order`(활성 사원 수 기준 memberCount 정렬, 동률 code 오름차순), 002~005 `description`·`manager`, 004·005 `managerId`(활성 사원만, 400 INVALID_MANAGER, 부서 → 사원 잠금 — 05 §8), API-DEPT-007 요약(未所属 제외)·008 소속 사원·009 책임자 후보(최대 100건) 신규 — backend unit 320건, e2e 408건 통과(test-report Run 3)

프론트엔드
- [x] 사원 관리 화면 SCR-006 (2026-11 레퍼런스 화상 재현: 요약 3개·키워드/部署/役職/ステータス(기본 すべて) 검색·10건 boxed 페이지네이션·xl 이상 표/미만 카드, 모달 社員追加·社員詳細·社員編集·社員削除(=비활성화)·役職確認(8색, 항목별 즉시 저장). 공용 `JobTitleBadge`(役職 색 단일 정의, SCR-010 所属社員確認에도 적용)·`lib/password-policy.ts`, 社員管理 한정 예외(원형 아이콘·`FormStack`·`Pagination boxed`·`StatCard iconCircle`, 09 §5 12·UI_MODAL_PATTERNS E1)) — test-report Run 4: frontend Vitest 64파일 885건, Playwright users*.spec 4파일 42건(1440·1024·390·375) 통과, tsc·lint 오류 0. 리뷰 Round 2 APPROVE·보안 PASS
- [x] 사원 상세 화면 SCR-007 — 페이지는 만들지 않고 SCR-006 社員詳細·社員編集 모달로 대체(2026-11 사용자 결정). 부여 연차 UI는 API-USER-005와 함께 미구현
- [x] 부서 관리 화면 SCR-010 (등록·수정 모달, 삭제 확인 모달, 사이드바 部署管理) — Vitest 25건, Playwright `e2e/departments.spec.ts` 4건 통과(임시 DB). 개발 DB에는 이 마이그레이션 미적용
- [x] 부서 관리 화면 SCR-010 재구성: 헤더·요약 2개(部署数 未所属 제외·所属社員数)·부서명 검색(디바운스)·열 정렬(기본 部署名 오름차순, md 미만 select)·部署責任者/説明 열·選択中の部署情報·所属社員確認 모달·등록/수정 모달 説明·部署責任者(서버 검색, `ApproverSelect` `texts`·`onSearch` 추가). 今月の変更·状態 필터는 범위 밖 — frontend Vitest 45파일 634건, Playwright `departments`·`departments-manager`·`departments-responsive` 19건 포함 31건 통과(test-report Run 3, 개발 DB)
- [x] SCR-010 목록·모달 추가 수정(사용자 요청): 표 5행 높이 내부 스크롤·헤더 고정(모바일 카드는 페이지 스크롤 유지), 所属社員数 옆 [確認], 액션 [詳細][編集][削除](削除 Danger, 未所属은 詳細만), 部署詳細 모달(조회 전용) 신설·選択中の部署情報 삭제, 所属社員確認 모달 재구성(社員番号·氏名·部署 3열, `limit=100` 전 페이지 수집 후 클라이언트 검색, 인원 수는 부서 전체 기준). 공용 `dangerOutlineButtonClass`·`Modal` `subtitle` 추가. API·DB 변경 없음 — frontend Vitest 45파일 642건, Playwright 부서 5개 spec·휴가 포함 37건 통과(test-report Run 4, 개발 DB). 리뷰 Round 4 APPROVE

- [x] 사원 役職·連絡先 표시(employee-position-contact): 직책 마스터(seed 4개, 관리 화면·목록 API 없음)·연락처(사내 이메일) DB 추가, API-DEPT-008 응답 `jobTitle`·`contactEmail`(ADMIN 전용, 다른 API 미노출), 所属社員確認 모달 5열(役職 tone 배지·連絡先, 빈 값 「—」, 入社日 제외, `Modal` size `xl`), 색 토큰 `violet-30/110`·`pink-30/110`·Badge `violet`·`pink`(09 §5 8). 샘플 사원·E2E 계정 값 부여. 실제 사원은 입력 경로가 없어 「—」 — backend unit 323건, e2e 418건, frontend Vitest 656건, Playwright 93건 통과(test-report Run 3). 리뷰 APPROVE·보안 PASS

후속 과제
- [x] 사원 관리 화면·API(SCR-006·007, API-USER-002·004) 구현 시 役職·連絡先 입력 경로와 서버 검증 추가 — 2026-11 employee-management에서 해소(役職은 API-JOB-001 목록에서 선택, 連絡先 서버 검증). mailto 링크를 도입하면 형식 검증된 값만 href에 사용(미도입)
- [ ] seed e2e의 tone 미덮어쓰기 테스트가 앞 테스트의 직책 등록에 의존(단독 실행 시 실패 가능, 리뷰 Round 2 낮음 1건, 미반영)
- [ ] 부여 연차 관리(API-USER-005·SCR-007 §3.2)와 승인 필요 여부 변경 안내 「이후 신규 신청부터 적용됩니다.」(SCR-007 §4) 미구현
- [ ] P2002/P2003 제약 이름 추출 중복: `common/prisma/constraint-name.ts`(users·job-titles)와 `departments.repository.ts:66-75` — departments도 `violatedConstraintOf`로 통일(employee-management 리뷰 Round 1·2 낮음)
- [ ] 예상 밖 DB 오류를 요약 로그 + 공통 500으로 바꾸는 처리가 `users.repository.ts`에만 있음(비밀번호 해시 보호 목적). 같은 정책이 필요해지면 `common/` 헬퍼로 이동 검토(리뷰 Round 2 낮음, 07 §5)
- [ ] SCR-008 사원명 링크 대상 `/admin/users/:id`(SCR-007 페이지 미구현): 연결 대상 재결정 필요(03 Screen Flow)
- [ ] 테스트 보강: `UserDeleteDialog` 전용 단위 테스트 없음(UserDetailModal.test에서 간접 확인), `UserEditModal`의 LAST_ADMIN 외 오류 분기 미작성, 社員編集·詳細·削除의 원형 아이콘·`FormStack` 외형은 스크린샷 육안 확인만(employee-management test-report Run 4 §5)
- [ ] `db:e2e-users-cleanup` 주의: E2E로 만든 사원의 메일을 바꾸는 테스트를 추가하면 정리 대상에서 빠진다(남을 뿐 안전 측). 샘플 사원 이름을 「E2E社員」으로 바꾸는 테스트 금지(2026-11 Run 1 사고: 샘플 사원 10085 삭제, 휴가·근태 미복구)

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
- [x] 사용자 확인: 하단 탭 참조의 社員情報·各種設定 — 추가하지 않음으로 확정(2026-11-12 휴가관리 통합 승인 시), 하단 탭은 ホーム·出勤簿·休暇管理·メニュー 4개
- [ ] 사용자 확인: 휴가 카드 라벨 「承認済み日数」
- [ ] 백엔드 `approvedDays` 정의 확인: 해당 연도 시작일 기준 APPROVED 합계로 미래 날짜 승인분도 포함(test-report Run 4 §5)
- [ ] 미구현 테스트: P-06 사이드바 승인 배지 갱신 확인, IT-DASH-25 DB 세션 TZ 3종(08 §5.5)

### 10. 테스트·품질 — 진행 중

- [x] DB 통합 테스트 (§2 참조)
- [ ] 업무 규칙 단위 테스트 (08 §4) — 각 도메인 구현과 함께
- [ ] API 통합 테스트 (08 §5) — 각 도메인 구현과 함께
- [ ] 권한 매트릭스 테스트 (08 §6)
- [ ] 동시성 테스트: 휴가 신청 잠금, 조건부 UPDATE (NFR-004)
- [ ] 화면 테스트 (08 §7) — SCR-001 완료(Vitest 51건 — 화면 25·redirect 검증 26, Playwright 7건), SCR-009 완료(Vitest 17건, Playwright 3건), SCR-002 개편 진행 중(test-report Run 4: Vitest 40파일 556건 전체 통과, Playwright `e2e/dashboard-renewal.spec.ts` 9건(P-01·02·04~10)·`dashboard.spec` 포함 통과. 休暇カレンダー 테스트는 기능 삭제로 제거. 디자인 재현 3차 반영분은 tester 재실행 전, §2 #9), SCR-008 완료(Vitest — 전체 근태 8·수정 모달 9·Tooltip 7·관리자 가드 3 외, Playwright 3건), SCR-003 출근부 진행 중(Vitest — AttendanceSheetView·CurrentDateTimeCard·WorkTimeline·`lib/attendance-sheet`·AttendanceView(폭 전환)·`useMediaQuery`·AttendanceHistoryView·StatusFilterButtons 통과, Playwright `e2e/attendance-sheet-layout.spec.ts` 8건·`e2e/attendance.spec.ts` 4건·`e2e/attendance-status.spec.ts` 6건 통과(Fix 1 반영 전), §2 #5 후속 과제 미해결), SCR-005·승인 대기 배지 완료(Vitest — 화면 19·Tabs 3·휴가 상세 모달·공통 셸 추가분 외, Playwright 5건), SCR-004 완료(2026-11-12 휴가관리 통합, test-report Run 4: Vitest 44파일 605건, Playwright 휴가 관련 61건 통과. `LeaveFilterButtons`는 삭제), SCR-010 완료(Vitest 25건, Playwright 4건. 2026-11-12 재구성 후 test-report Run 3: Vitest 634건 전체 통과, Playwright 부서 3개 spec 19건 통과. 목록·모달 추가 수정 후 test-report Run 4: Vitest 642건, Playwright 부서 5개 spec 포함 37건 통과)
- [ ] 모달 공통 패턴 리팩터링(UI_MODAL_PATTERNS v3·REFACTOR_PLAN 단계 1~7, 모달 9종 M01~M09, 프론트만·비즈니스 로직 무변경, 브랜치 `feature/modal-refactor`, PR 리뷰 대기) — 구현·리뷰(Round 2 APPROVE) 완료, test-report Run 3: frontend `tsc --noEmit`·`npm run lint` 오류 0, Vitest 50파일 724건 전체 통과, Playwright `e2e/modal-a11y.spec.ts` 1건 통과(출근 POST·당일 GET은 route mock). **미검증(사용자 확인 대기)**: ① 단계 왕복 포커스(M06 承認·却下·取消, M08 確認·INVALID_TIME_RANGE 복귀)의 실제 브라우저 확인(jsdom 단위 테스트만) ② `npm run build`(개발 서버가 `.next` 사용 중이라 미실행) ③ 기존 Playwright 스펙 회귀(`dashboard`·`departments*`·`leaves`·`leave-management`·`approvals`·`attendance*`, 개발 DB 쓰기 승인 필요로 미실행) ④ `dashboard-renewal.spec.ts` 8건 실패(Run 1, E2E 계정·픽스처 미초기화, 아래 항목과 같은 원인) ⑤ 개발 DB에 Run 1 시점 추정 E2E 계정 오늘자 attendance 1건(정리 여부 사용자 판단) ⑥ M06 승인·반려, M07, M09 退勤 스크린샷 미촬영 및 before/after 47장 의도 차이 판정 미수행 ⑦ 접근성 수동 체크(Tab 순환·스크린 리더 낭독) 미수행 ⑧ backend 테스트(backend 변경 없음) 미실행 ⑨ RS-2·FO-3 얕은 단정 보강 여부. 권장안 적용 U1~U4·A1~A10은 사용자 확인 후 변경 가능
  - 추가(2026-11-13 사용자 요청): 날짜·일시 입력 표시 「YYYY年MM月DD日」「HH時MM分」(24시) 통일 — 공용 `DateInput`(09 §6) 신설, DateRangeFields·休暇申請·勤怠修正·휴가 이력 필터 적용. 却下 사유 입력란 플레이스홀더 추가. `.claude/work/date-input/test-report.md` RESULT PASS: Vitest 51파일 741건, tsc·lint 오류 0, Playwright 임시 spec(route mock)으로 겹침 표시 위치 차이 0px 확인(Chromium만, 실제 기본 달력 팝업·Safari·Firefox 미확인)
- [ ] 버튼 공통 패턴 리팩터링(UI_BUTTON_PATTERNS v3·UI_BUTTON_REFACTOR_PLAN 단계 1~8, 이행 53건, 프론트만·동작·문구 무변경, 브랜치 `feature/button-refactor`) — 구현·리뷰(Round 2 APPROVE) 완료, test-report Run 11: Vitest 54파일 801건 통과, `tsc --noEmit`·`npm run lint` 오류 0, 읽기 전용 Playwright 6 spec 68건 통과(`modal-a11y`·`button-visual`·`button-c8`·`attendance-sheet-layout`·`leave-sidebar-submenu`·`leave-visual`). **머지 전 미검증(리뷰 #5)**: ① DB를 쓰는 e2e spec(`leave-calendar-mobile`·`leave-management`·`leaves`·`attendance`·`attendance-status`·`login`·`password`·`dashboard`·`dashboard-renewal`·`approvals`·`departments`·`departments-manager`·`departments-responsive`·`departments-list-modal`·`departments-members-modal`) 미실행 ② `npm run test:e2e` 전체 미실행 ③ E4 키보드 도달 확인 미실행 ④ `npm run build`(C2 시점 1회만 통과, 이후 미실행). **후속 과제(범위 밖)**: `LeaveHistoryList` `dateInputClass`(`h-11 px-3 text-sm/5`)와 `inputClass`(`h-12 px-4 text-base/6`) 클래스 충돌, `iconInputClass`(`pl-11`)와 `inputClass` `px-4` 중복 지정, `leave-visual` `shouldCaptureScrolledBottomAtPc1440` 간헐 실패(변경 전부터 있던 문제), SCR-009 キャンセル 제출 중 활성(동작 변경이라 범위 밖). 상세는 UI_BUTTON_REFACTOR_PLAN §8
- [ ] E2E 하네스 정비(`PLAYWRIGHT_BASE_URL` 지정·임시 DB 실행): `e2e/attendance-status.spec.ts` 6건은 이전 실행에서 실패 이력이 있었으나(2026-11-10 이력) 2026-11-11 개발 DB 실행에서 통과(해소). `e2e/leaves.spec.ts`는 `db:e2e-leaves-reset` 스크립트 추가 후 2026-11-12 개발 DB 실행에서 통과(해소). `e2e/dashboard-renewal.spec.ts` 8건은 900002 PENDING 2건 부재·globalSetup의 mustChangePassword 초기화 충돌로 미해결(2026-11-12 휴가관리 통합 test-report Run 2~4)
  - 2026-11-14 employee-management test-report Run 2: `dashboard-renewal.spec.ts`는 **테스트 DB 전용**으로 실행하면 14/14 통과(테스트용 backend 6100 + 임시 frontend 3300, 픽스처: 900002 mustChangePassword false, 900001·900002 2026년 연차 20일, 실행 전 두 사용자 attendance·leaves 삭제 후 PENDING 2건 재삽입). 개발 DB에서는 globalSetup과 spec 전제가 구조적으로 충돌한다. 테스트 DB 전용 실행 절차(픽스처 리셋 스크립트)를 확정·문서화할 것
  - `e2e/password.spec.ts` 2건 순서 의존(전체 실행에서만 실패): 앞선 `leave-management.spec.ts`가 900002 비밀번호를 임시값 → 원래값으로 바꾸며 mustChangePassword 해제 상태를 남겨 「初回ログイン → /password」 전제가 깨진다. 커밋 6c3d6ec(변경 전)에서도 재현. 수정 방향(미적용): password.spec 시작 시 또는 leave-management 종료 시 900002 상태 초기화(`db:e2e-accounts` 패턴, `PLAYWRIGHT_BASE_URL` 미지정 시만)
  - `frontend/playwright.config.ts`는 `.env.local`을 읽지 않는다(Next dev만 로드). `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD`를 셸에 export해야 globalSetup 초기화와 로그인 테스트가 동작한다(미설정이면 users*.spec 41건이 로그인 실패). config에서 로드할지 결정 필요
  - `e2e/leave-visual.spec.ts` 4건 간헐 실패(전체 실행 후반 관리자 로그인 후 /login 잔류, 단독 재실행 45/45 통과, 원인 미확정)
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
| 2026-11-12 | 휴가관리 통합: SCR-004를 경로 기반 탭 3개(自分の休暇 `/leaves`·休暇カレンダー `/leaves/calendar`·承認 `/leaves/approvals`)로 개편하고 SCR-005를 承認 탭으로 흡수. 공유 휴가 캘린더 API-LEAVE-010 신규(APPROVED·활성 사원만, 공개 7필드, 페이지네이션 없음 = NFR-002 예외), API-LEAVE-007 `status`, API-LEAVE-003 `appliedFrom`·`appliedTo`(연도 필터 UI 폐지). 사이드바·하단 탭 休暇承認 삭제(하단 탭 4개, 社員情報·各種設定 미추가). 참조 이미지 재현(Primary 유지, 컨트롤 radius 8, 휴가 분류·요일 색·타이포 토큰), 공용 `PageHeader`·`NavTabs`·`SearchInput`·`LeaveCategoryBadge`·`MonthNavigator`·`LeaveDayModal`·`cardFrameClass`·band 표 클래스 추가, `LeaveFilterButtons`·`yearOptions` 삭제. 02·03·SCR-004·SCR-005·06·08·09 반영. DB 변경 없음(test-report Run 4: backend unit 312건, e2e 385건, frontend Vitest 605건 통과, Playwright 휴가 관련 61건 통과(1차 flake 2건 단독 재실행 통과). 리뷰 Round 2 낮음 중 코드·테스트 3건은 §2 #6 후속 과제) |
| 2026-11-12 | 휴가 관리 사이드바 하위 메뉴: SCR-004 페이지 안 탭 UI 삭제, 사이드바(`lg` 미만 드로어) 休暇管理를 개폐 하위 메뉴(自分の休暇·休暇カレンダー·承認[표시 대상만])로 변경, 승인 대기 배지는 부모 행. 하단 탭 休暇管理는 `/leaves` 링크 유지. 공용 `SidebarSubmenu`·`ApprovalsAccessProvider`/`useApprovalsVisible` 추가, `NavTabs`·`messages.leaveManagement.tabsLabel` 삭제. 03·SCR-004·09 반영. API·DB 변경 없음(frontend tsc·eslint 오류 없음, Vitest 44파일 612건 통과, Playwright 신규 2건 포함 22건 통과. 비승인자 사원의 사이드바는 단위 테스트로만 확인) |
| 2026-11-12 | 부서 관리 재설계(SCR-010): departments에 `description`(VARCHAR 500)·`manager_id`(FK users RESTRICT, UNIQUE 없음 = 겸임 허용, 인덱스) 추가(마이그레이션 `add_departments_description_manager`, 기존 행 NULL). 부서 책임자 = 임의의 활성 사원(소속·권한 무관, 未所属 지정 불가, 400 INVALID_MANAGER), 사원 비활성화 시 자동 해제·부서 이동은 영향 없음(API-USER-004 미구현으로 문서만). API-DEPT-002 정렬, 007 요약·008 소속 사원·009 책임자 후보 신규. 화면은 헤더·요약·정렬 목록·선택 상세·所属社員 모달로 재구성(今月の変更·状態 범위 밖). 02·05·06·SCR-010·08·09 §6 반영(test-report Run 3: backend unit 320건, e2e 408건, frontend Vitest 634건, Playwright 31건 통과. 리뷰 APPROVE·보안 PASS. 리뷰 Round 2 낮음 2건(책임자 후보 100건 상한 실측 테스트, 책임자 입력 Escape 시 이전 값 미복원)은 미반영) |
| 2026-11-12 | SCR-010 목록·모달 추가 수정(사용자 요청): 표 5행 내부 스크롤·헤더 고정, 所属社員数 [確認], 행 액션 [詳細][編集][削除], 部署詳細 모달 신설·選択中の部署情報 삭제, 所属社員確認 모달 3열·전 페이지 수집 후 클라이언트 검색. 공용 `dangerOutlineButtonClass`(09 §3 Danger 구현)·`Modal` `subtitle` 추가(토큰 변경 없음). SCR-010·08·09 §6 반영. API·DB 변경 없음(test-report Run 4: backend unit 320건, e2e 408건, frontend Vitest 642건, Playwright 37건 통과, 리뷰 Round 4 APPROVE). 役職·連絡先 DB 추가는 §2 #8 후속 과제 |
| 2026-11-12 | 사원 役職·連絡先: 직책 마스터 `job_titles`(seed 4개, tone ENUM)·`users.job_title_id`(FK RESTRICT)·`contact_email` 추가(마이그레이션 `add_job_titles_and_users_contact`, 기존 행 NULL). API-DEPT-008 응답에 `jobTitle`·`contactEmail`(ADMIN 전용), SCR-010 所属社員確認 모달 5열(入社日 제외, 빈 값 「—」). 사용자 지시로 役職 배지 색 재현을 위해 색 토큰 4개·Badge `violet`·`pink` 추가, 공용 `Modal` size `xl`(800) 추가. 02·04(SCR-006·007·010)·05·06·08·09 반영, API-USER-*·SCR-006/007 입력 항목은 구현 시 적용(test-report Run 3: backend unit 323건, e2e 418건, frontend Vitest 656건, Playwright 93건 통과. 리뷰 APPROVE·보안 PASS(낮음 1건은 §2 #8 후속 과제)) |
| 2026-11-13 | 모달 공통 패턴 리팩터링(진행 중, 미커밋): 모달 9종을 UI_MODAL_PATTERNS v3로 통일. 공용 `Modal` 외형 1계열(①')·`icon` 필수·`variant` 삭제·`description`·`busy`·`data-autofocus`·footer 개수별 배치, 신규 `ConfirmDialog`·`FormModal`·`ReadOnlySummary`·`FieldHint`·`CharCount`·`modalDangerButtonClass`·`confirmMessageClass`, `Select` `autoFocus`, `ApproverSelect` `describedBy`, `FormRow` 삭제. 단계형 모달 단계 전환 포커스 수정. 문구 3개 추가(`ja.ts`). 미결 U1~U4는 사용자 부재로 권장안 적용. 03·SCR-002·004·008·010·09·UI_MODAL_PATTERNS·UI_MODAL_REFACTOR_PLAN 반영. API·DB 변경 없음(test-report Run 3: frontend tsc·lint 오류 0, Vitest 50파일 724건, Playwright `modal-a11y` 1건 통과. build·기존 E2E 회귀·브라우저 포커스·스크린샷 일부 등 미검증 항목은 §2 #10, 리뷰 Round 2 APPROVE, 보안 점검 SKIP) |
| 2026-11-14 | 버튼 공통 패턴 리팩터링(진행 중, 브랜치 `feature/button-refactor`): 공용 `Button`·`buttonClass()`(variant 7종·size sm 36/md 40/lg 48, `loading`·`iconOnly`) 신설, 버튼 크기 토큰 `--spacing-btn-*`·`--radius-btn`, ESLint `className` 배치 전용 규칙. 모달 footer·X, 페이지 주 동작, 표 행 동작·텍스트 링크, 아이콘 버튼(벨·월 이동) 이행 53건, 44px 폐지(休暇申請·部署を追加·出勤·退勤 48, 条件をクリア 40), 勤怠 修正 Primary 아웃라인 + Pencil(`PencilIcon`을 `leaveIcons`로 이동), 모달 X·벨 radius 8. `form.tsx` 버튼 상수 8개 삭제, `inputBaseClass` 신설·`SearchInput` 44px 고정(높이 충돌로 48이던 것 수정, 사용자 결정). 09 §2.3·§3·§5-10·§5-11·§6, UI_BUTTON_REFACTOR_PLAN §8 반영(화면 명세 SCR-001~010에는 바뀐 버튼 크기·색 표기가 없어 변경 없음). API·DB 변경 없음(test-report Run 11: Vitest 54파일 801건, tsc·lint 오류 0, 읽기 전용 Playwright 68건 통과. 리뷰 Round 2 APPROVE, 보안 점검 SKIP. **DB 쓰기 e2e·`npm run test:e2e` 전체·E4 키보드·`npm run build` 미검증 — 머지 전 확인 필요**, §2 #10) |
| 2026-11-14 | 사원 관리(employee-management, 브랜치 `feature/employee-management`): API-USER-001~004 구현(001 `keyword`·`jobTitleId`·`status` 확장, 002 `empIdMode` 자동 채번/직접 입력·役職·メール 필수·관리자 입력 初期パスワード, 004 비활성화 처리·LAST_ADMIN 선잠금), API-USER-006(요약)·007(`next-emp-id`)·API-JOB-001~004(직책 CRUD) 신규, `job_title_tone` 4값 추가(마이그레이션 `extend_job_title_tone`). SCR-006 社員管理 레퍼런스 재현(모달 5종, SCR-007 페이지는 모달로 대체), 공용 `JobTitleBadge`(役職 8색 단일 정의)·토큰 7개·Badge `lavender`·`yellow`, 社員管理 한정 예외(원형 아이콘·`FormStack`·`Pagination boxed`·`StatCard iconCircle`), `Select size`·`PageHeader description`·`Pagination pageSize`. 사용자 결정: 초기 비밀번호 관리자 입력(메일·재발급 없음), 入社日 필수, 社員ID 5자리 최댓값+1, 削除=비활성화, 休職中 없음, 役職確認 항목별 즉시 저장, ステータス 기본 すべて, 役職은 인증 Role과 별개. 02(FR-USER-001·002, FR-JOB-001 신규)·03·04(SCR-006 재작성·SCR-007 대체 표기)·05·06(§5·§6 신규)·07·08·09(§2.1·§4·§5 12·§6)·UI_MODAL_PATTERNS(§9.3 E1) 반영(test-report Run 4·5: backend unit 360건, e2e 514건, frontend Vitest 885건, Playwright users*.spec 42건 통과, 회귀 18 spec 140건 통과·4건 실패는 범위 외 기존 이슈(§2 #5·#10). 리뷰 Round 2 APPROVE·보안 PASS). API-USER-005 부여 연차는 범위 밖으로 미구현 |
