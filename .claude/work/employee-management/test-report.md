RESULT: PASS (Run 5: cleanup 참조 검증 시나리오 A·B 통과, backend tsc·lint·unit 통과. Run 4 §3 실패 해소. 나머지 기존 실패는 Run 2 §2·§3 근거로 범위 외 제외)

## 작성한 테스트 파일 ↔ 시나리오
Backend unit
- `backend/src/modules/users/emp-id-generator.spec.ts`: 자동 채번(없음→00001, 6자리 무시, 0채움, 99999→null, 비숫자 무시)
- `backend/src/modules/users/employment-status.spec.ts`: ACTIVE/UPCOMING/INACTIVE, 도쿄 날짜 경계(UTC 15:00)
- `backend/src/modules/users/dto/create-user.dto.spec.ts`: MANUAL empId, 제어 문자·길이, 역 이메일 trim, 실재 날짜, initialPassword 누락·정책 3종·72바이트 경계·trim 없음·값 비에코, strict
- `backend/src/modules/job-titles/dto/job-title.dto.spec.ts`: name trim·50자, tone 8값, update 빈 객체·strict

Backend e2e
- `backend/test/admin-users.e2e-spec.ts`: 권한 매트릭스(401/403/PASSWORD_CHANGE_REQUIRED), 목록 keyword(empId·name·email)·`%`·`_` 리터럴·필터 AND·status(FixedClock)·페이지네이션·null 키·400 메시지, summary(활성 기준·월 경계), next-emp-id(예정 번호·null), 등록 AUTO(201·bcrypt·로그인 연계·평문 비노출·5건 병렬·사전 점유 재채번·99999→409 EMP_ID_EXHAUSTED), MANUAL(0 유지·trim·중복 409·`00123`≠`123`), 등록 실패(initialPassword details·INVALID_DEPARTMENT·INVALID_JOB_TITLE), 상세(leaveGrants 내림차순·pendingApprovalCount·400·404), 수정(필드별·empId 중복·jobTitle null·email ''·role 불변·비밀번호 400·빈 객체·null 불가), 무효화(PENDING→CANCELLED·책임자 해제·토큰 폐기·타인 PENDING 유지·로그인 401 후 재활성화), LAST_ADMIN(단독 비활성·강등·동시 상호 비활성화 1건만), DELETE·재발급 엔드포인트 404
- `backend/test/admin-job-titles.e2e-spec.ts`: 권한 매트릭스, 목록(createdAt asc·userCount 비활성 포함), 등록(trim·신규 tone·409 trim 후 비교·tone 400 문구·50자), 수정(tone 상세 반영·중복 409·404·400), 삭제(204·활성/비활성 사용 중 409·404), enum 8값 확인(마이그레이션)

Frontend unit (Vitest)
- `frontend/src/lib/password-policy.test.ts`: 규칙·72바이트 경계
- `frontend/src/components/JobTitleBadge.test.tsx`: tone 8개 클래스·pill·null 「—」
- `frontend/src/components/Pagination.test.tsx`(추가 describe): pageSize 범위 문구·마지막 페이지 clamp·미지정 시 기존 문구
- `frontend/src/app/(app)/admin/users/UsersView.test.tsx`: 요약·열/행 버튼 aria·INACTIVE 삭제 숨김·Empty·요약 실패·디바운스 검색 page 리셋·상태 필터 page 리셋·URL Query 복원·범위 문구·상세 모달
- `.../UserCreateModal.test.tsx`: 자동 채번 읽기 전용·null 처리·直接入力·필수 7항목·정책·password 타입·메일 형식·役職 배지·POST 1회(더블 클릭)·바디(initialPassword·role·approvalRequired)·성공 토스트/닫힘·409 DUPLICATE·EMP_ID_EXHAUSTED·400 details·500·key 리셋(비밀번호 포함)
- `.../JobTitlesModal.test.tsx`: 목록 N건·필수 오류·미리보기 색·화살표 키·저장 토스트·중복 409·편집 초기값·삭제 409 IN_USE(단계 유지, 버튼 disabled)·삭제 성공
- `.../UserEditModal.test.tsx`: 초기값·비밀번호 항목 없음·변경 없으면 disabled·변경 필드만 PATCH·무효화 확인 단계·LAST_ADMIN 표시
- `.../UserDetailModal.test.tsx`: 상세 항목 라벨·UserDeleteDialog 승인 대기 경고·PATCH `{isActive:false}`·토스트

Frontend E2E (Playwright, 개발 DB)
- `frontend/e2e/users-helpers.ts`(공용: cleanup 호출, 로그인, 가로 overflow 검사)
- `frontend/e2e/users.spec.ts`(1440): 요약·검색·필터 Query·페이지네이션·상세·편집·削除(무효화)·overflow·미로그인 리다이렉트
- `frontend/e2e/users-create.spec.ts`(1440): 예정 번호 읽기 전용·등록→확정 번호 토스트→그 계정 로그인→/password·필수 검증·직접 입력 중복·정책·500 주입·더블 클릭 POST 1회
- `frontend/e2e/users-job-titles.spec.ts`(1440): 追加→編集→닫기, 사용 중 삭제 409 문구(route 주입)
- `frontend/e2e/users-responsive.spec.ts`(1440·1024·390·375): 가로 overflow·테이블/카드 전환(lg 기준)·役職 행 배지·버튼 비겹침·社員追加 footer 가시성·높이 640 모달 본문 스크롤·페이지네이션 폭

## 실행 전 확인 필요 (RUN에서 구현 명세와 대조)
구현 파일이 아직 없어 시그니처를 설계 문서 기준으로 가정했다. 다르면 test를 구현 명세에 맞게 고칠 것(assertion 약화 금지).
- `nextEmpId(existing: readonly string[]): string | null` (emp-id-generator.ts)
- `employmentStatusOf(user: {hireDate, isActive}, now: Date)` (employment-status.ts)
- `CreateUserSchema`(dto/create-user.dto.ts), `CreateJobTitleSchema`·`UpdateJobTitleSchema`(job-titles dto)
- `JobTitleBadge.tsx`: `JobTitleBadge`, `JOB_TITLE_TONES`(`{tone,label}` 배열)
- 컴포넌트 props: `UserCreateModal`(open·onClose·onCreated), `JobTitlesModal`(open·onClose·onChanged), `UserEditModal`(open·user·onClose·onSaved), `UserDetailModal`(open·userId·onClose·onEdit), `UserDeleteDialog`(open·user·onClose·onDeleted), `UsersView`(무 props)
- 모달 본문 `[data-modal-body]` 속성 존재 여부(responsive의 높이 640 스크롤 테스트)
- `prisma.user.delete`·`refreshToken` 등 Prisma 모델명은 기존 schema 기준

## 미작성 (test-plan 대비 누락, 보고용)
- `backend/test/db/schema.e2e-spec.ts` 수정 없음(enum 확인은 admin-job-titles e2e에 넣음)
- `departments.service.spec.ts` import 경로 회귀는 실행 시 확인만 (수정 불필요 예상)
- `common/security/password-policy.spec.ts` 회귀는 기존 파일 그대로 (변경 없음)
- `StatCard`·`PageHeader` 회귀 테스트, `DepartmentMembersModal.test.tsx` 회귀(공용 배지) 미작성
- SCR-010 所属社員確認 모달의 役職 배지 색 반영 E2E 미작성
- `UserEditModal`의 LAST_ADMIN 외 오류 처리·`UserDetailModal` 404 경로 미작성
- 로그 출력(Logger spy)에 비밀번호 없음 검증 미작성(응답·검증 details 비노출만 확인)
- 동시 수정 이외의 Playwright 기존 spec(departments-*, modal-a11y, button-*, password) 회귀는 RUN에서 전체 실행으로 확인

(PREPARE 시점 기록. 실행 결과는 아래 Run 1 참조)

## Run 1 (MODE: FULL, PHASE: RUN)

### 실행 명령·환경
- backend: `npx vitest run`(단위), `npx vitest run --config ./vitest.config.e2e.ts`(e2e, workbridge_test), `npx tsc --noEmit`, `npx eslint .`, `npm run build`
- frontend: `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npx playwright test`(개발 DB, 3000/6000 기동 중). E2E 계정 비밀번호는 frontend/.env.local에서 로드
- 개발 DB 정리: `npm run db:e2e-users-cleanup`(실행 결과 0건 — 각 spec afterAll에서 이미 정리)

### 결과 요약
| 대상 | 결과 |
|---|---|
| backend 단위 (26 파일) | 358 통과 / 0 실패 |
| backend e2e (17 파일) | 514 통과 / 0 실패 (admin-users 67 포함, 전체 재실행은 Logger 테스트 추가 전 513) |
| frontend 단위 (63 파일) | 869 통과 / 0 실패 |
| tsc (backend · frontend) | 오류 0 · 0 |
| lint (backend · frontend) | 오류 0 · 0 |
| backend build | 성공 |
| Playwright 전체 (22 spec 파일) | 194 통과 / 14 실패 |

### 이번 Run에서 고친 테스트 쪽 오류 (실제 구현 코드는 미수정)
- [담당: tester] backend: spec import를 camelCase(`createUserSchema`, `createJobTitleSchema`, `updateJobTitleSchema`)로 수정. e2e 기본 `jobTitleId`·`departmentId`가 null이라 400이던 것을 실제 생성 값으로 교정
- [담당: tester] backend e2e: 비활성 계정 로그인 기대값을 401 → 403 `ACCOUNT_DISABLED`(06 API-AUTH-001, SCR-001: 비밀번호 일치 후에만 반환)로 교정. 기존 스키마 테스트의 tone ENUM 기대값을 마이그레이션 반영 8값으로 교정
- [담당: tester] backend e2e 추가: `shouldNotWritePlainPasswordToLogs`(Logger 전 레벨 spy, 평문 비밀번호 미출력)
- [담당: tester] frontend: `password-policy.test.ts`는 메시지가 아니라 위반 코드(`policy`/`tooLong`)를 검증하도록 교정(메시지 매핑은 ja.ts)
- [담당: tester] frontend 사원관리 테스트 4파일: `next/navigation` 모의 추가, fixture를 `UserDetail` 타입으로 지정(role 리터럴 오류 해소), 필수 라벨은 RequiredMark(`*`) 때문에 정규식 조회, 「マネージャー」는 배지 한정 조회
- [담당: tester] `UsersView.test`: matchMedia 스텁(데스크톱=표), 요약 실패 시 「—」 3건 + 再試行 확인
- [담당: tester] 추가: `UserDetailModal` 404 토스트·닫힘 테스트, `StatCard.test.tsx`(icon/iconCircle/selected 회귀), `PageHeader.test.tsx`(description/action/icon 회귀)

### E2E 테스트 데이터 사고와 복구 (중요)
- 원인: users.spec의 편집·削除 테스트가 목록 첫 행(개발 DB 샘플 사원 10085)을 대상으로 해서, 이름을 `E2E社員…`으로 바꾼 뒤 `db:e2e-users-cleanup`이 이름 접두사로 물리 삭제했다(연결된 휴가·근태 포함). 그 결과 대시보드 등 다른 spec의 전제가 깨졌다.
- 조치: users.spec의 편집·削除가 `createE2eUserThroughModal`로 자기가 만든 E2E 社員만 대상으로 하도록 변경(users-helpers.ts). 샘플 사원은 `npm run db:sample-users`로 복구(신규 3명 재등록, 휴가·근태는 복구되지 않음).
- 남은 위험: cleanup은 `E2E社員` 접두사 전체를 삭제하므로, 샘플 사원 이름을 바꾸는 테스트를 다시 추가하면 같은 사고가 난다.

### Playwright 실패 (14건) — 구현 결함이 아닌 전제·상태 문제
1. [담당: tester] `dashboard-renewal.spec.ts` 10건(P-02, P-04, P-05, P-06, P-07, P-08, P-09, P-10, P-14, P-15)
   - spec 헤더는 "테스트 DB에 연결된 백엔드"와 "900002가 900001 앞 PENDING 휴가 2건 보유"를 전제로 하는데, 실행은 개발 DB에서 했다. 그래서 `フィクスチャの承認待ちが 2 件以上あること`, `未出勤の状態で開始すること`, 900002가 `/password`로 리다이렉트되는 현상(초기화 상태 mustChangePassword=true)이 발생한다.
   - 조치 제안: 테스트 DB 백엔드로 이 spec만 실행하거나, 개발 DB용 fixture를 준비하도록 spec을 고친다. 자동 판단은 하지 않았다.
2. [담당: tester] `password.spec.ts` 2건, `attendance-sheet-layout.spec.ts` 2건(1024·768 가로 overflow 41·31px): 전체 실행에서만 실패하고 두 파일만 단독 실행하면 11/11 통과. 같은 실행 안의 앞선 spec이 900002 상태·출근 데이터를 바꾸는 순서 의존으로 판단. 원인을 확정하지는 못했다.
- 참고: 이전 부분 실행(사원 관리 spec 제외)에서는 이 4건이 통과했다. 사원 관리 spec 추가 후 순서가 바뀌며 드러난 것으로 보이며, 사원 관리 spec이 바꾸는 데이터는 이제 자기 생성 사원으로 한정된다.

### 사원 관리 E2E (users*.spec) — 전부 통과
- users.spec 9/9, users-create·users-job-titles·users-responsive 전부 통과(단독 실행 기준)
- 셀렉터·기대값 교정: 요약 값은 화면이 받은 summary 응답(route)과 비교, 페이지 2 버튼은 `2ページ`, 表 표시 기준은 xl(1280px)(Fix 1), 모달 본문은 `overflow-y-auto` 영역(Modal에 `data-modal-body` 없음), 役職確認 닫기는 본문 버튼으로 한정, 등록 확인은 검색으로 확인

### 미실행·미작성 (test-plan 대비)
- 미작성: SCR-010 所属社員確認 모달의 役職 배지 색 반영 E2E
- 미작성: Modal·FormTable 회귀의 전용 단위 테스트(기존 Modal/FormModal 테스트와 modal-a11y E2E로 간접 확인, 통과)
- 미작성: 레퍼런스 화상과의 차이 기록(스크린샷은 test-results/에 저장만 됨, 자동 비교 아님)
- 미작성: UserEditModal의 LAST_ADMIN 외 오류 분기

### 구현 측 참고 (차단 아님)
- [담당: frontend] `StatCard`: `selected`는 아이콘 있는 링크 카드에서만 `aria-current`를 붙인다. 아이콘 없는 링크 카드는 무시하며, prop 주석("リンクのカードのみ")과 맞지 않는다. 현재 호출부에는 해당 사용이 없다.

## Run 2 (MODE: FULL, PHASE: RUN, 재실행)

### 실행 명령·환경
- backend: `npx vitest run`(단위), `npx vitest run --config ./vitest.config.e2e.ts`(e2e, `workbridge_test`, `db:migrate:test` 미적용 없음), `npx tsc --noEmit`, `npx eslint .`
- frontend: `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npx playwright test`(개발 DB, 3000/6000, dashboard-renewal 제외)
- dashboard-renewal: 테스트 DB 전용. 테스트용 backend(`nest build` 후 `node dist/main.js`, `DATABASE_URL`=workbridge_test, 포트 6100) + 동일 코드의 임시 복사본 frontend(포트 3300, `BACKEND_URL`=6100). 개발 서버(3000/6000)는 재기동하지 않음
- 테스트 DB는 실행 후 원래 상태(900002만 존재)로 복구함

### 결과 요약
| 대상 | 결과 |
|---|---|
| backend 단위 (26 파일) | 358 통과 / 0 실패 |
| backend e2e (17 파일) | 514 통과 / 0 실패 |
| frontend 단위 (63 파일) | 869 통과 / 0 실패 |
| tsc (backend · frontend) | 오류 0 · 0 |
| lint (backend · frontend) | 오류 0 · 0 |
| users*.spec 4파일 재실행 (개발 DB) | 41 통과 / 0 실패 |
| Playwright 전체 (dashboard-renewal 제외) | 188 통과 / 6 실패 (leave-visual 4, password 2) |
| dashboard-renewal (테스트 DB, 픽스처 정비 후) | 14 통과 / 0 실패 |
| cleanup 안전성 확인 (테스트 DB) | 기대 1건 삭제 → 실제 4건 삭제 (실패, 아래 5번) |

### 1. dashboard-renewal.spec.ts — 테스트 DB에서 14/14 통과
- Run 1 실패 원인은 spec 전제와 개발 DB 상태의 불일치 3가지였다.
  (a) `db:e2e-accounts`(globalSetup)가 900002의 mustChangePassword를 true로 초기화 → 일반 사원 API가 403 `PASSWORD_CHANGE_REQUIRED` (P-04 등)
  (b) 테스트 DB에 900001 연차 부여가 없어 신청 시 `INSUFFICIENT_LEAVE_BALANCE` (P-09, P-12 연쇄)
  (c) 실행 1회가 출근·승인 상태를 남겨, 재실행 시 「未出勤」「承認待ち 2件」 전제가 깨짐
- 테스트 DB 픽스처만 정비(spec·구현 무수정): 900002 must_change=false, 2026년 연차 부여 20일(900001·900002), 실행 전 두 사용자의 attendance·leaves 삭제 후 PENDING 2건 재삽입 → 14/14 통과.
- 담당: [담당: tester] 실행 절차(픽스처 리셋)가 문서화되어 있지 않음. 개발 DB에서는 globalSetup과 spec 전제가 충돌하므로 구조적으로 실패한다(로드맵의 기존 미해결 항목과 동일). 테스트 DB 전용 실행 절차 확정 필요.

### 2. password.spec.ts 2건 (전체 실행에서 실패) — 사원 관리와 무관한 기존 순서 의존
- 원인: 변경되지 않은 기존 spec `leave-management.spec.ts`가 900002의 비밀번호를 임시값 → 원래값으로 바꾸면서 mustChangePassword 해제 상태를 남긴다. 알파벳 순으로 뒤에 오는 `password.spec.ts`가 「初回ログイン → /password」를 전제로 하는데 /dashboard로 이동한다(2건 모두 같은 원인).
- 변경 전 기준 검증: 커밋 6c3d6ec(feature/button-refactor와 동일, 작업트리 미변경)을 임시 worktree에 두고 같은 DB 상태에서 `leave-management.spec.ts` + `password.spec.ts`를 실행 → password 2건 동일 실패 확인. 따라서 users 변경과 무관하다.
- 담당: [담당: tester] E2E 상태 의존. 수정 방향(미적용): password.spec 시작 시 또는 leave-management 종료 시 900002 상태를 초기화(기존 attendance.spec afterAll과 같은 `db:e2e-accounts` 패턴, PLAYWRIGHT_BASE_URL 미지정 시에만).

### 3. attendance-sheet-layout.spec.ts 1024·768 — 기존 레이아웃 결함(데이터 상태 의존)
- Run 2 전체 실행에서는 통과했으나, 단독 재실행에서 `shouldNotBreakLayoutAt1024`(가로 overflow 28px), `shouldNotBreakLayoutAt768`(18px)이 실패. Run 1의 41px·31px 실패와 같은 종류다.
- 변경 전 기준 검증: 커밋 6c3d6ec에서 같은 DB 상태로 실행 → 동일하게 28px·18px 실패. users 변경과 무관한 기존 결함이며, 실패 여부가 900001의 2026-11 근태 데이터 상태에 따라 달라진다.
- 담당: [담당: frontend] 출근부 태블릿 폭(768·1024)에서 페이지 가로 overflow가 발생. 요구(화면 명세의 "横スクロールしない")와 맞지 않으므로 테스트는 완화하지 않음. 구현 변경은 이번 작업 범위 밖.

### 4. leave-visual.spec.ts 4건 (전체 실행 후반, 관리자 로그인 후 /login 잔류) — 재현 안 됨
- 전체 실행 종료 직전 다른 Playwright 실행(테스트 DB dashboard-renewal 초회 시도)과 시간이 겹쳤다. 원인은 확정하지 못함.
- 단독 재실행(attendance-sheet-layout과 함께) leave-visual 45/45 통과. 재현되지 않으므로 담당 미지정, 다음 전체 실행에서 재확인.

### 5. e2e-users-cleanup.ts 안전성 — 실패, [담당: backend]
- 확인 방법: 테스트 DB(`workbridge_test`)에 「E2E社員」 접두사 사원 4명을 넣고 `DATABASE_URL`=테스트 DB로 `npx tsx prisma/e2e-users-cleanup.ts` 실행(개발 DB 미사용).
  - 80001 「E2E社員削除対象」 / メール `1234567890123@example.com` (삭제 대상이어야 함)
  - 10001 「E2E社員サンプル残存」 (샘플 사원, 보존이어야 함)
  - 900001 「E2E社員固定残存」 (固定アカウント, 보존이어야 함)
  - 80002 「E2E社員名前のみ」 / `someone@example.com` (보존이어야 함)
- 결과: 「E2E 社員を 4 件削除」 → 4건 모두 삭제. 기대는 1건(80001)만 삭제.
- 원인: `backend/prisma/e2e-users-cleanup.ts`의 삭제 조건이 이름 접두사 `E2E社員`뿐이다. backend.md의 Fix 1(연락처 메일 `^\d{13}@example\.com$`, 固定 900001/900002·サンプル 10001〜10100 제외, 削除前の対象表示)이 파일에 반영되어 있지 않다(파일 수정 시각 12:49, Fix 1 보고와 불일치). 구현 측 확인과 수정이 필요하다.
- 현 상태 주의: 이 스크립트를 개발 DB에서 실행하면 샘플 사원 10001 등 이름이 같은 접두사인 사원이 삭제된다. 수정 전까지 실행 금지 권고. 개발 DB에는 현재 「E2E社員」 이름 사원이 0명이라 피해 없음을 확인함.
- 테스트 DB는 실행 후 원래 상태로 복구함.

### 6. SCR-010 所属社員確認의 役職バッジ色 E2E — 추가하지 않음(기존 테스트가 이미 있음)
- `frontend/e2e/departments-members-modal.spec.ts`의 `shouldShowJobTitleBadgeAndContactForE2eAccountsInDevDepartment`가 「マネージャー」(VIOLET)의 배경·문자색을 토큰 값(rgb 241,235,253 / 109,40,217)으로 검증하고 있으며, Run 2 전체 실행에서 통과했다(departments-members-modal 13/13). Run 1의 「미작성」 기록은 이 테스트를 놓친 것이므로 중복 추가하지 않았다.

### 7. 기타
- 변경 파일: 테스트 파일·구현 파일 모두 수정하지 않음. 임시 파일은 scratchpad에만 두었고, 임시 worktree·임시 서버·임시 node_modules 링크는 정리함.
- 개발 서버(3000 frontend, 6000 backend)는 그대로 둠. 3000을 테스트 backend로 바꾸려는 재기동은 권한 거부로 수행하지 않았고, 대신 별도 인스턴스를 썼다.
- 개발 DB E2E 계정(900001·900002)은 globalSetup·attendance.spec afterAll 등 기존 절차대로 초기화됨. 샘플 사원(10001~10100)은 편집·삭제하지 않음.
- 미실행: 없음(dashboard-renewal은 테스트 DB 전용 실행으로 대체).

## Run 3 (MODE: FULL, PHASE: RUN, backend.md Fix 2 반영 후 재검증)

### 실행 명령·환경
- cleanup 안전성: `DATABASE_URL`=workbridge_test(`.env.test`에서 로드, 개발 DB 미사용)로 `npx tsx prisma/e2e-users-cleanup.ts`. 픽스처 삽입·확인용 임시 스크립트(backend/prisma/_tmp_*.ts)는 검증 후 삭제
- backend: `npx vitest run`, `npx vitest run --config ./vitest.config.e2e.ts`, `npx tsc --noEmit`, `npx eslint .`
- frontend: `npx playwright test e2e/users.spec.ts e2e/users-create.spec.ts e2e/users-job-titles.spec.ts e2e/users-responsive.spec.ts`(개발 DB, 3000/6000 기동 중). 최초 시도는 E2E 비밀번호 미주입으로 41건 전부 로그인 실패 → 환경 문제로 판단해 `frontend/.env.local`의 `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD`를 셸 환경에 주입해 재실행(값은 기록하지 않음). 재실행 41/41 통과

### 결과 요약
| 대상 | 결과 |
|---|---|
| cleanup 안전성 (테스트 DB) | 기대대로 동작: 80001만 삭제, 10001·900001·80002는 보존되고 「削除しない」로 3건 표시 |
| backend 단위 (26 파일) | 358 통과 / 0 실패 |
| backend e2e (17 파일) | 514 통과 / 0 실패 |
| tsc · lint (backend) | 오류 0 · 0 |
| users*.spec 4파일 (개발 DB) | 41 통과 / 0 실패 |

### 1. cleanup 안전성 재검증 (테스트 DB, Run 2 §5와 같은 방법)
- 삽입: 80001 「E2E社員削除対象」 `1234567890123@example.com` / 10001 「E2E社員サンプル残存」 `1234567890124@example.com` / 900001 「E2E社員固定残存」 `1234567890125@example.com` / 80002 「E2E社員名前のみ」 `someone@example.com`
- 실행 출력: 「削除対象の E2E 社員: 1 件 [80001]」 / 「名前は一致するが E2E 専用条件を満たさず削除しない社員: 3 件 [10001, 900001, 80002]」 / 「E2E 社員を 1 件、E2E 役職を 0 件削除」
- 사후 확인: 80001 삭제됨, 나머지 3건 보존(OK). Run 2에서 4건 모두 삭제되던 문제는 Fix 2로 해소
- 테스트 DB 복구: 임시 4건 삭제 후 스냅샷이 실행 전과 동일(users=900002만, refresh_tokens 19, departments 3, job_titles 4, attendance·leaves·leave_grants 0)

### 2. users*.spec 4파일 (개발 DB, 41/41)
- afterAll의 cleanup 호출 출력: 削除 대상 0~2건. 2건은 spec이 생성한 10101·10102(AUTO 채번, 「E2E社員」 이름·13자리 메일, 보호 범위 밖)이며 설계대로 삭제됨. 役職 1건(E2E役職)도 삭제됨. 「削除しない」 출력은 없었음
- 샘플 사원 10001~10100과 E2E 고정 계정 900001·900002는 cleanup이 건드리지 않음(보호 목록)
- 개발 DB 편집·삭제 대상은 spec이 자기 생성 사원으로 한정되어 있음(Run 1 사고 재발 없음)

### 3. 판정
- users 기능 기인 실패 0 → **PASS**
- 범위 외 제외(Run 3에서 실행하지 않음, Run 2 근거 유지): password.spec 순서 의존 2건, attendance-sheet-layout 1024·768 가로 overflow(구현 결함, frontend 담당), leave-visual 간헐 실패(재현 안 됨), dashboard-renewal(테스트 DB 전용)
- 실행하지 않은 스위트: 전체 Playwright(위 범위 외 spec 포함)는 이번 Run 대상이 아님. 필요 시 별도 실행

### 4. 참고 (차단 아님)
- `frontend/playwright.config.ts`는 `.env.local`을 읽지 않는다. Next dev만 로드하므로 E2E 비밀번호를 셸에 export해야 globalSetup 초기화와 로그인 테스트가 동작한다. 재현 시 절차로 남긴다(환경 문제, 코드 수정 없음).
- 구현 코드·docs는 수정하지 않았다. 테스트 파일 변경 없음.

## Run 4 (MODE: FULL, PHASE: RUN, review B1 · frontend.md Fix 3 · backend.md Fix 3 반영 후)

### 작성·수정한 테스트 (tester 수정분)
- review [tester] 중간 항목
  - `frontend/e2e/users-job-titles.spec.ts`: `shouldAddEditAndDeleteJobTitleThroughModal`에 실제 削除(未使用の E2E役職) 추가. 신규 `shouldReflectJobTitleColorChangeInUserListBadge`(E2E役職色 緑 → 社員追加で割当 → 一覧バッジ background = 緑 토큰 → 黄 변경 → 閉じた後 バッジ background = 黄 토큰). `users-helpers.ts` `createE2eUserThroughModal(page, name, jobTitleName?)` 인자 추가(미지정 시 기존 동작)
  - `UsersView.test.tsx` 추가 6건: 所属部署 변경(page 1·keyword 유지), 役職 변경(page 1), クリア 비활성, クリア 동작(パスのみ), 一覧 로딩(件数 없이 「社員一覧」), 一覧 실패(SectionError)
- frontend.md Fix 3 전달 사항
  - `JobTitleBadge.test.tsx`: `JOB_TITLE_TONES[].label` 참조 제거, 색명은 `messages.jobTitles.tones`로 검증
  - `StatCard.test.tsx`: `tone="violet"`(삭제됨) → `tone="danger"`
  - 신규 `users/userFormRules.test.ts` 9건(사번·사원명 제어 문자·trim·100자, 메일 필수 분기, 서버 오류 → 필드 매핑, 알 수 없는 details 무시)
  - `UserEditModal.test.tsx`: 社員名 제어 문자 → 오류 표시 + PATCH 미호출 추가
  - 편집·상세·삭제의 円形アイコン・FormStack 변경은 기존 테스트가 라벨 접근 이름으로 통과(외형 자체는 자동 검증 대상 아님, 미검증 항목 참조)
- backend.md Fix 3 전달 사항: `job-title.dto.spec.ts` 制御文字 거부(create·update) 추가. 파일 전체를 다시 작성(수정 중 깨진 부분 정리)

### 실행 명령·환경
- backend: `npx vitest run`, `npx vitest run --config ./vitest.config.e2e.ts`(DATABASE_URL=workbridge_test), `npx tsc --noEmit`, `npx eslint .`
- frontend: `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npx playwright test`(개발 DB, 3000/6000 기동 중, E2E 비밀번호는 frontend/.env.local 값을 셸에 주입해 실행 — 값은 기록하지 않음)
- cleanup 검증: 테스트 DB(workbridge_test)에서만 실행. 검증 후 원래 상태(users=900002만, job_titles 4, departments 3, refresh_tokens 19, leaves/attendance/leave_grants 0)로 복구 확인

### 결과 요약
| 대상 | 결과 |
|---|---|
| backend 단위 (26 파일) | 360 통과 / 0 실패 |
| backend e2e (17 파일) | 514 통과 / 0 실패 |
| frontend 단위 (64 파일) | 885 통과 / 0 실패 |
| tsc (backend · frontend) | 오류 0 · 0 |
| lint (backend · frontend) | 오류 0 · 0 |
| Playwright users*.spec 4파일 (1440·1024·390·375 포함) | 42 통과 / 0 실패 |
| Playwright 회귀 18 spec (departments·modal-a11y·button-c8/visual·dashboard·leaves·leave-management·leave-calendar-mobile·approvals·password·attendance·attendance-status·attendance-sheet-layout·leave-visual) | 140 통과 / 4 실패 (아래 §4, 범위 외) |
| cleanup 참조 해제 검증 (테스트 DB) | 실패 — §3 |

### 3. cleanup 검증 (테스트 DB) — 실패, [담당: backend]
- 시나리오 A (E2E社員 X를 보호 아닌 Y의 休暇 approver·processedBy, Y의 勤怠 modifiedBy로 참조, E2E役職 A는 保護社員 900002가 사용, 役職 B는 미사용):
  - 결과: `e2e-users-cleanup.ts` 실패(exit 1), 트랜잭션 전체 롤백. X·Y·役職 A/B 모두 그대로 남음(삭제 0건, 부분 적용 없음)
  - 원인: 참조 해제(`approverId`/`processedBy`/`modifiedBy` → null)가 DB CHECK 제약 위반
    - `leaves_processed_state_check`: APPROVED/REJECTED/CANCELLED는 processed_by 필수 → processedBy null 불가 (실제 발생한 오류 `23514`)
    - `leaves_pending_state_check`·`leaves_rejected_approver_check`: PENDING·REJECTED는 approver_id 필수 → approverId null 불가(제약 독해, 미실행)
    - `attendance_modified_pair_check`: modified_by와 modified_at은 둘 다 NULL 또는 둘 다 NOT NULL → modifiedBy만 null 불가(제약 독해, 미실행)
  - 영향: Fix 3의 "참조만 null로 해제" 설계는 처리 완료 건에서 성립하지 않음. 현재 구현은 데이터를 잃지 않고 실패(롤백)하지만, 그 경우 E2E 社員 정리도 되지 않음
  - 수정 방향(backend 결정 필요): (a) 다른 社員의 기록이 E2E 社員을 참조하면 삭제 전에 건수·사번을 출력하고 중단(전체 롤백 안전), 또는 (b) 참조 대상 기록을 설계상 허용되는 방식으로 처리(시스템 사용자 재배정 등, 설계 변경이므로 승인 필요)
- 시나리오 B (위 참조 기록을 먼저 제거하고 보호 役職만 남긴 상태):
  - 결과 OK: E2E社員 X 삭제, X의 休暇·勤怠·付与 삭제, 未使用 E2E役職 B 삭제, 使用中 E2E役職 A 보존(「使用中のため削除しなかった E2E 役職: 1 件」 출력), 保護社員 900002의 役職 유지
- 테스트 DB 복구 완료(원래 스냅샷과 일치). 임시 검증 스크립트는 삭제함.
- 개발 DB에서는 cleanup 검증 미실행.

### 4. Playwright 회귀 실패 4건 — 범위 외 제외(Run 2 §2·§3 근거 유지)
- `attendance-sheet-layout.spec.ts` 1024·768 가로 overflow 2건: 출근부 태블릿 폭 기존 결함(데이터 상태 의존). [담당: frontend] 기존 이슈, 이번 변경과 무관
- `password.spec.ts` 2건: 앞선 `leave-management.spec.ts`가 900002 상태를 남기는 순서 의존(Run 2 §2 — 커밋 6c3d6ec 기준 동일 재현 확인됨). 테스트 완화하지 않음

### 5. 미검증·미작성 (보고용)
- 편집·상세·삭제 모달의 円形アイコン・FormStack 외형: 자동 테스트는 라벨 접근 이름·동작만 확인. 외형은 스크린샷 육안 확인(frontend.md Fix 3) 대상
- `UserDeleteDialog` 전용 단위 테스트 없음(삭제 PATCH·경고는 UserDetailModal.test에서 간접 확인)
- SCR-010 所属社員確認의 役職 色 E2E는 Run 2 §6의 기존 `departments-members-modal.spec.ts`로 간접 확인(이번 Run 통과)
- dashboard-renewal.spec.ts: 테스트 DB 전용 spec이라 이번 회귀 실행에서 제외(Run 2 절차 필요 시 별도 실행)
- 구현 코드·docs 미수정. 개발 DB 샘플 사원(10001~10100)·E2E 고정 계정 편집·삭제 없음

## Run 5 (MODE: FULL, PHASE: RUN, backend.md Fix 4 반영 후 재검증)

### 실행 명령·환경
- cleanup 검증: 테스트 DB(`workbridge_test`, `.env.test`)에서만 `npx tsx prisma/e2e-users-cleanup.ts`. 개발 DB 미사용. 픽스처·확인용 임시 스크립트(backend/prisma/_tmp_*.ts)는 검증 후 삭제
- backend: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`
- 실행 전 스냅샷: users=900002만, refresh_tokens 19, departments 3, job_titles 4, attendance·leaves·leave_grants 0

### 픽스처
- 보호 社員 900002에 E2E役職A(使用中), E2E役職B(未使用) 할당
- 削除対象 X 「E2E社員検証X」 80101 `1234567890123@example.com` (X 자신의 휴가 PENDING·근태·연차 부여 포함)
- 非対象 Y 「テスト社員Y検証」 80102 (Y의 処理済み休暇 approverId·processedBy = X, Y의 勤怠 modifiedBy = X)

### 결과
| 시나리오 | 기대 | 결과 |
|---|---|---|
| A (Y가 X를 참조) | exit 1, 아무것도 삭제 안 됨, 件数·社員番号 표시 | PASS. exit 1. 출력「休暇: 1 件 [社員番号: 80102]、勤怠: 1 件 [社員番号: 80102]」. 실행 전후 users 3·job_titles 6·leaves 2·attendance 2·leave_grants 1 동일 |
| B (참조 제거 후) | 成功. X 삭제, 未使用役職 B 삭제, 使用中役職 A 보존 | PASS. exit 0. 「削除対象 1 件 [80101]」「使用中のため削除しなかった E2E 役職: 1 件 [E2E役職A検証]」「E2E 社員を 1 件、E2E 役職を 1 件削除」. X의 휴가·근태·부여 함께 삭제, 900002 役職 유지 |

- 테스트 DB 복구: 픽스처·임시 데이터 삭제, 900002의 jobTitleId 원복(null), E2E役職 삭제. 스냅샷과 일치 확인(위 스냅샷 값과 동일, users=900002만)
- 임시 스크립트 삭제 확인 완료

### backend 기타 검증
| 대상 | 결과 |
|---|---|
| tsc --noEmit | 오류 0 |
| eslint . | 오류 0 |
| unit (vitest run) | 26 파일 / 360 통과 / 0 실패 |

### 판정
- cleanup 참조 해제 검증(Run 4 §3) 해소 → 실패 항목 0. **RESULT: PASS**
- 범위: Run 5는 cleanup 스크립트 변경에 따른 재검증만 수행(Run 4 대비 나머지 PASS 항목은 재실행하지 않음). 개발 DB 미실행
- 범위 외 기존 이슈 유지(Run 2 §2·§3, Run 4 §4 근거): password.spec 순서 의존 2건, attendance-sheet-layout 1024·768 가로 overflow, leave-visual 간헐 실패, dashboard-renewal(테스트 DB 전용, 이번 Run 미실행)
- 미실행: frontend 스위트·Playwright 전체(변경 없음, Run 4 PASS 유지)
