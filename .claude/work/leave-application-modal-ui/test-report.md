RESULT: PASS

# test-report — leave-application-modal-ui

## Run 1

실행 일시: 2026-11-11 (브랜치 feature/leave-application-modal-ui, 미커밋)
범위: 프론트 Vitest 전체, tsc, lint, Playwright 휴가 관련 spec. 백엔드는 변경 없으므로 unit·e2e 생략(사유: backend 파일 변경 없음).

### 작성·수정한 테스트 파일
- `frontend/src/components/leave/LeaveApplyModal.test.tsx`: 신규 describe 7건 추가 (dialog 이름 `休暇申請`, aria-required 5개·4개, 필수 * 행 기준, 申請日数 * 없음, 승인 불필요 시 안내 행, 반차 시 終了日 aria-required 유지, 3日 표시, ステータス 문구 부재)
- `frontend/src/components/Select.test.tsx`: chevron aria-hidden, aria-required 미지정 시 속성 없음 (1건 추가)
- `frontend/src/components/leave/ApproverSelect.test.tsx`: `required`에 따른 aria-required 전환 (1건 추가)
- `frontend/e2e/leaves.spec.ts`: 休暇種別 locator 4곳을 `page.getByRole('combobox', { name: t.apply.leaveType })`로 변경. 기존 `getByLabel`은 휴가 이력 필터 group(aria-labelledby 동일 문구)과 충돌해 strict mode 오류 발생. 단언 의미는 변경 없음.
- `frontend/src/components/Select.test.tsx`, `FormTable.test.tsx`는 plan 항목을 이미 포괄하여 추가 변경 없음

### 결과 요약

| 구분 | 명령 | 결과 |
|---|---|---|
| Vitest 전체 | `npm test` (frontend) | 38 파일 / 538건 통과, 실패 0 |
| 타입체크 | `npx tsc --noEmit` | 오류 없음 (exit 0) |
| 린트 | `npm run lint` | 오류 없음 (exit 0) |
| Playwright 휴가·관련 spec | `leaves`, `approvals`, `dashboard`, `dashboard-leave-calendar` | 아래 참고 |

Playwright 실행 방식: 개발 서버(3000)·백엔드(6000)가 떠 있는 상태에서 실행. leaves.spec은 `PLAYWRIGHT_BASE_URL=http://localhost:3000`을 지정해 `db:e2e-leaves-reset` 호출(존재하지 않는 스크립트)을 우회했다. 우회 시 globalSetup의 계정 초기화는 건너뛰므로 `npm run db:e2e-accounts`를 먼저 실행했다.

- approvals.spec 5건, dashboard.spec 5건, dashboard-leave-calendar.spec 2건 통과, 1건 skip (E2E_SCREENSHOT_DIR 미설정, 스크린샷 전용 케이스)

### 기준선(변경 전 leaves.spec)
- 기존 spec 그대로 실행 시 파일 수준 beforeAll에서 `npm run db:e2e-leaves-reset`이 `Missing script`로 실패하여 8건 중 1건만 실패로 기록되고 7건은 실행되지 않음(did not run). package.json에 해당 스크립트가 없음(HEAD 기준 기존 결함).

### 변경 후 leaves.spec 결과 (우회 실행)
- 통과 6건: 未認証 redirect, 요약·이력 표시, 대시보드 모달 신청(초회), 이력 필터, 기간 중복 토스트(초회), 좁은 폭 overflow, 빈 제출 검증 오류 (실행 횟수에 따라 변동, 아래 참고)
- 실패 1건: `shouldApplyLeaveAutoApprovedThenCancelFromDetail` (마지막 실행)
  - 에러 요약: `getByRole('row', { name: /2027\/03\/01/ })` strict mode violation, 같은 날짜의 행 3개
  - 원인 추정: 개발 DB의 E2E 관리자(900001)에 이전 실행이 남긴 CANCELLED 휴가 행 2건(2027-03-01)이 있어 행 locator가 중복됨. spec은 실행 전후 데이터를 정리하지 않고, 정리용 `db:e2e-leaves-reset`도 없음(기존 결함). 코드 변경과 직접 관련 없음
  - 담당: tester (테스트 데이터 정리 부재 — 기존 결함과 연계)
  - 이번 세션에서 한 조치: 이번 실행으로 생성된 APPROVED 휴가(2027-03-02 重複申請, 2027-03-08 ダッシュボード申請, 2027-03-01 休暇申請)는 API로 취소(200). 취소 완료 행은 API로 삭제할 수 없어 DB에 CANCELLED 상태로 남음
- 이전 실행에서 확인된 같은 종류의 문제: `shouldApplyFromDashboardModalAndStayOnDashboard`는 2회차 실행 시 2027-03-08 기존 APPROVED 행과 충돌(409)해 토스트 확인 실패. 취소 정리 후 재실행하면 통과

### 판정
- 이번 UI 변경으로 인한 신규 실패: 없음(locator 충돌은 spec 수정으로 해소, 나머지 케이스는 통과).
- 단, 위 실패 1건은 개발 DB 잔존 데이터 때문이므로 깨끗한 DB에서 재실행해 확인이 필요함. 정리 후 재실행 전까지 RESULT는 FAIL로 둠.

### 미검증·제외 항목
- 백엔드 unit·e2e: 백엔드 변경 없음으로 생략
- 제출 흐름: 실제 제출 spec은 개발 DB에 데이터를 남김. 생성된 데이터는 위와 같이 취소로 정리했으나 CANCELLED 행은 남음
- 스크린샷 기반 시각 비교(test-plan §3): 이번 실행 범위 외
- 승인 필요 사용자(900002) 흐름의 Playwright 검증: 미실행(단위 테스트로만 확인)
- `db:e2e-leaves-reset` 부재: 기존 결함으로 보고만 함, 스크립트 추가는 하지 않음

### 필요한 후속 조치
1. 개발 DB의 E2E 관리자(900001) 휴가 데이터 정리(CANCELLED 잔존 행 포함) 또는 `db:e2e-leaves-reset` 구현 후 leaves.spec 재실행
2. 재실행 결과로 `RESULT` 재판정

## 담당 요약
- tester: `shouldApplyLeaveAutoApprovedThenCancelFromDetail`(데이터 정리 부재 연계)

## Run 2

실행 일시: 2026-11-11 (브랜치 feature/leave-application-modal-ui 확인, 미커밋, 커밋·브랜치 변경 없음)
목적: 개발 DB의 E2E 관리자(900001) 휴가 데이터 삭제 후 `frontend/e2e/leaves.spec.ts`를 기준선 우회 없이 재실행해 신규 실패 여부 확인.
작성·수정한 테스트 파일: 없음 (이번 실행은 데이터 정리와 재실행만 수행).

### 1. 대상 DB 확인
- `backend/.env`의 DATABASE_URL: host `localhost:5432`, database `workbridge` (테스트 DB `workbridge_test` 아님)
- 사원번호 900001 사용자: id `9e379df0-f90e-47fc-92c8-a4674dedf2d7` (role ADMIN, E2E管理者)

### 2. 휴가 데이터 삭제 (사용자 범위 한정)
- 삭제 전: `leaves.user_id` = 900001 의 행 **8건** (전부 CANCELLED)
- 900001을 `approver_id` / `processed_by`로 참조하는 다른 사용자 행: **0건**
- 스키마(`backend/prisma/schema.prisma`)상 `leaves`를 참조하는 다른 테이블 없음 → 추가 정리 대상 없음
- 실행 SQL (node `pg`, 단일 트랜잭션, 삭제 행 수가 사전 개수와 다르면 ROLLBACK하도록 작성):
  ```sql
  SELECT id FROM users WHERE emp_id = '900001';
  SELECT count(*) FROM leaves WHERE user_id = '9e379df0-f90e-47fc-92c8-a4674dedf2d7';  -- 사전 8
  BEGIN;
  DELETE FROM leaves WHERE user_id = '9e379df0-f90e-47fc-92c8-a4674dedf2d7';            -- rowCount 8
  COMMIT;
  SELECT count(*) FROM leaves WHERE user_id = '9e379df0-f90e-47fc-92c8-a4674dedf2d7';  -- 사후 0
  ```
- 삭제 후 확인: 900001 leaves 0건 / 전체 leaves 3건(타 사용자 행, 변경 없음) / users 103건(변경 없음)
- 변경하지 않은 것: leave_grants, attendance, refresh_tokens 등 다른 테이블, 다른 사용자 행, 스키마

### 3. E2E 재실행
- 명령: `E2E_ADMIN_PASSWORD=test0000 E2E_INITIAL_PASSWORD=test0000 npx playwright test e2e/leaves.spec.ts` (PLAYWRIGHT_BASE_URL 미설정, 3000 dev 서버 재사용)
- globalSetup: `db:e2e-accounts` 실행, 900001·900002 계정 초기화 성공 (표준 절차. 계정 행 갱신이며 휴가 데이터는 건드리지 않음)
- 결과: 8건 중 **실패 1건, 미실행 7건, 통과 0건**
  - 실패: `shouldRedirectToLoginWithReturnPathWhenNotAuthenticated` (파일 수준 `beforeAll`)
  - 에러 요약: `npm run db:e2e-leaves-reset` → `Missing script`
  - 원인 확인: 에러 원인은 이 스크립트 부재 하나뿐. `backend/package.json`에 `db:e2e-leaves-reset` 없음(기존 결함, Run 1과 동일).
  - 신규 실패 여부: **신규 아님** (기준선 결함)
  - 기준선 우회(PLAYWRIGHT_BASE_URL 지정 등): 지시에 따라 사용하지 않음. 따라서 나머지 7건은 실행되지 않음.
  - 참고: 이번 정리는 Run 1의 CANCELLED 잔존 행 충돌 원인을 제거했지만, 해당 spec은 실행 후 생성 데이터를 정리하지 않으므로 재실행마다 행이 다시 쌓인다.

### 4. 판정
- 코드 변경으로 인한 신규 실패: 없음
- 다만 leaves.spec 8건 중 7건이 실행되지 않아 휴가 UI 변경의 E2E 검증이 완료되지 않았다. 검증 미완 상태에서 PASS로 볼 수 없어 **RESULT: FAIL**로 둔다. (엄격히 "신규 실패" 기준만 적용하면 PASS가 될 수 있으나, 이는 상위 에이전트가 판단한다.)

### 5. 조치 필요 (결정 사항)
- `[담당: tester]` `leaves.spec.ts` beforeAll이 존재하지 않는 `db:e2e-leaves-reset`을 호출한다. 해결 방법은 둘 중 하나로 사용자 결정이 필요하다.
  - (a) `backend/package.json`에 `db:e2e-leaves-reset` 추가 (900001 applicant leaves만 삭제. 기존 `db:e2e-attendance-reset` 패턴과 동일, 이번에 수행한 SQL과 같은 범위)
  - (b) spec의 beforeAll 호출 제거 또는 조건부화 (정리 없이 실행하면 재실행 시 데이터 충돌 가능)
- 조치 후 leaves.spec 재실행으로 8건 전체 결과를 확인해야 RESULT를 PASS로 바꿀 수 있다.

## 담당 요약 (Run 2)
- tester: `leaves.spec.ts` beforeAll의 `db:e2e-leaves-reset` 부재 (기준선 결함, 해결 방법 결정 필요)

## Run 3

실행 일시: 2026-11-11 (브랜치 feature/leave-application-modal-ui 확인, 미커밋, 커밋·브랜치 변경 없음)
목적: `db:e2e-leaves-reset` 스크립트 추가 후 전체 재실행. 기준선 우회(PLAYWRIGHT_BASE_URL) 미사용.

### 작성·수정한 테스트 파일
- `frontend/e2e/leaves.spec.ts` (1건 수정): `shouldShowSummaryAndHistoryWithoutLoadError`의 `getByRole('table')` 단언을 `getByRole('table').or(getByText(t.history.empty))`로 변경.
  - 사유: 시작 시 reset이 900001 휴가를 전부 삭제하므로 이력이 0건일 수 있다. 0건이면 화면은 정상적으로 空表示(`t.history.empty`)을 보여주므로, 실제 UI 동작에 맞춘 단언이다. 로드 에러 부재 단언은 그대로 유지.
  - 담당: tester (테스트 전제 조건 불일치). 구현 코드 변경 없음.

### 1. 백엔드 (변경 없음, 검증만)
| 명령 | 결과 |
|---|---|
| `npx vitest run prisma/e2e-account-data.spec.ts` | 1 파일 / 26건 통과 |
| `npx tsc --noEmit` | 오류 없음 (exit 0) |
| `npm run lint` | 오류 없음 |

### 2. 프론트엔드
| 명령 | 결과 |
|---|---|
| `npx vitest run` (전체) | 38 파일 / 538건 통과, 실패 0 |
| `npx tsc --noEmit` | 오류 없음 |
| `npm run lint` | 오류 없음 |

### 3. Playwright
- 대상 DB 사전 확인: 900001 휴가 3건(전체 6건, 타 사용자 3건). 실행 전 reset이 900001 휴가 3건을 삭제.
- `e2e/leaves.spec.ts` (`E2E_ADMIN_PASSWORD=test0000 E2E_INITIAL_PASSWORD=test0000`, PLAYWRIGHT_BASE_URL 미설정): **8건 중 8건 통과**
  - 1차 실행에서 `shouldShowSummaryAndHistoryWithoutLoadError` 1건 실패(위 수정 사유). 수정 후 재실행 8/8 통과.
- `e2e/approvals.spec.ts`, `e2e/dashboard.spec.ts`, `e2e/dashboard-leave-calendar.spec.ts`: **12건 통과, 1건 skip**
  - skip: `shouldCaptureCalendarScreenshotsDesktopAndNarrow` (E2E_SCREENSHOT_DIR 미설정, 스크린샷 전용 케이스)
- 실행 후 900001 휴가 3건 발생 → `npm run db:e2e-leaves-reset`으로 3건 삭제(900001 휴가만). 타 사용자 3건 유지.

### 4. 판정
- Run 1·2의 실패 원인(`db:e2e-leaves-reset` 부재, 잔존 CANCELLED 행 충돌)은 스크립트 추가로 해소됨.
- 이번 변경 범위(휴가 신청 모달 UI)로 인한 실패: 없음.
- 미검증: `approvals`·`dashboard` 관련 skip 1건(스크린샷 케이스), 승인 필요 사용자(900002) 흐름의 Playwright 검증, 시각 비교(test-plan §3).

## 담당 요약 (Run 3)
- 실패 없음. 수정 1건(tester): leaves.spec 이력 단언의 전제 조건 보정.
