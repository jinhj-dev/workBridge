# test-plan: 휴가 신청·조회·취소

근거: `docs/08_TEST_PLAN.md` §3(시드·시간 고정), §4 UT-LV-01~09, §5.3 IT-LV-01~17, §5.4 IT-CAN-01~05, §6 권한 매트릭스, §7 SCR-004 / `docs/06_API_SPECIFICATION.md` §4 에러 표 / `SCR-004_LEAVE.md` §4~6
시간 고정: FixedClock `2026-11-09T09:00:00+09:00`(월요일). 기존 TC ID가 있으면 테스트 이름이나 주석에 ID를 남긴다.

## 1. 단위 (backend `src/modules/leaves/leave-rules.spec.ts`)
| ID | 입력 | 기대 |
|---|---|---|
| UT-LV-01 | ANNUAL 2026-11-09~13 | 5 |
| UT-LV-02 | ANNUAL 2026-11-13~16 | 2 |
| UT-LV-03 | HALF_AM 평일 하루 | 0.5 |
| UT-LV-04 | HALF_PM 시작≠종료 | INVALID_DATE_RANGE 사유 |
| UT-LV-05 | ANNUAL 토~일 | 0(→ NO_WORKING_DAYS) |
| 추가 | HALF_AM 토요일 | 0 |
| 추가 | 시작>종료 / 2026-12-31~2027-01-01 | INVALID_DATE_RANGE 사유(각각) |
| 추가 | isLeaveConflict: 같은 날 HALF_AM↔HALF_PM | 비충돌 |
| 추가 | isLeaveConflict: HALF_AM↔HALF_AM, HALF_AM↔ANNUAL, 기간 일부 겹침, 경계일 겹침 | 충돌 |
| 추가 | isLeaveConflict: 인접(전날 종료) | 비충돌 |

## 2. API 통합 (backend `test/leave-requests.e2e-spec.ts`, 실제 테스트 DB)
신청 (POST /leaves)
- IT-LV-01 승인 필요 사용자 + 승인자 → 201 PENDING, approver = 지정자, processedBy null
- IT-LV-02 승인 불필요 사용자 → 201 APPROVED, autoApproved true, approver null, processedBy = 본인, processedAt = createdAt
- IT-LV-03 승인자 미지정 → 400 APPROVER_REQUIRED
- IT-LV-04 승인 불필요 사용자가 approverId 전송 → 201, approver null
- IT-LV-05 본인 승인자 / 추가: 존재하지 않는 UUID, UUID 아닌 문자열 → 400 INVALID_APPROVER
- IT-USER-09 비활성 사용자를 승인자로 → 400 INVALID_APPROVER
- IT-LV-06 사유 누락·공백만·501자 → 400 VALIDATION_ERROR(details field=reason). 500자·앞뒤 공백은 trim 저장 201
- 추가: leaveType 미정의 값, 날짜 형식 오류(`2026-02-30`) → 400 VALIDATION_ERROR
- IT-LV-07 시작>종료, 추가: 연도 걸침, 반차 기간 → 400 INVALID_DATE_RANGE
- 추가: 토~일 → 400 NO_WORKING_DAYS
- IT-LV-08 부여 15, 16일 신청 → 422 INSUFFICIENT_LEAVE_BALANCE(message에 잔여 포함). 경계: 잔여와 같은 일수 → 201
- IT-LV-09 즉시 승인 사용자의 초과 → 422
- IT-LV-10 SPECIAL 20일 → 201, 이후 balance 불변
- 추가: 부여 미등록 + ANNUAL → 422, OTHER → 201
- 추가: 잔여 연도 = 시작일 연도(다음 해 부여만 있는 경우 다음 해 신청 201)
- IT-LV-11/12 PENDING·APPROVED와 겹침 → 409 LEAVE_CONFLICT
- IT-LV-13 REJECTED·CANCELLED와 겹침 → 201
- IT-LV-14 같은 날 HALF_AM, HALF_PM → 둘 다 201 / IT-LV-15 연차 후 반차 → 409
- 추가: 다른 사용자의 휴가와 겹침 → 201
- IT-LV-16 같은 사용자 동시 2건으로 잔여 초과 → 하나 201, 하나 422(`Promise.all`, 실제 PostgreSQL). 추가: 같은 날짜 동시 2건 → 하나 201, 하나 409
- IT-LV-17 ADMIN 신청 → 201
- 추가: 과거 시작일 신청 → 201

승인자 후보 (GET /leaves/approvers)
- 본인·비활성 제외, 사원번호 오름차순, 응답 필드는 UserSummary 4개만
- keyword 이름 부분 일치(대소문자 무시)·사원번호 부분 일치, 101자 → 400 VALIDATION_ERROR

내 이력 (GET /leaves/me)
- 본인 것만(다른 사용자 건 미포함, IT-ATT-11과 같은 취지), createdAt desc·동순위 id desc
- year 필터는 start_date 연도, status 필터, 페이지네이션 totalCount/totalPages
- year=1999·abc, status=FOO → 400 VALIDATION_ERROR

취소 (PATCH /leaves/:id/cancel)
- IT-CAN-01 PENDING → 200 CANCELLED, processedBy 본인, approver 유지
- IT-CAN-02 즉시 승인 + 시작일 2026-11-10 → 200
- IT-CAN-02b 즉시 승인 + 시작일 2026-11-09(오늘) → 409 NOT_CANCELLABLE
- IT-CAN-03 즉시 승인 + 시작일 과거 → 409
- IT-CAN-04 승인자가 승인한 건(approver 있음, APPROVED) → 409. 추가: REJECTED, CANCELLED → 409
- IT-CAN-05 다른 사용자·ADMIN → 403
- 추가: 없는 id·UUID 아님 → 404
- 추가: 같은 PENDING 동시 취소 2건 → 하나 200, 하나 409. 취소와 승인 동시 → 하나만 성공
- 추가: 취소 후 balance의 pendingDays 감소, 같은 날짜 재신청 201

권한 매트릭스(08 §6): 비로그인 → 4개 API 모두 401, mustChangePassword 사용자 → 403 PASSWORD_CHANGE_REQUIRED

## 3. 컴포넌트 (frontend Vitest + Testing Library)
`lib/leave-days.test.ts`
- countLeaveDays: UT-LV-01~05와 같은 입력이 같은 값
- parseLeavesQuery: 잘못된 tab·year·status·page → 기본값

`app/(app)/leaves/LeaveApplyForm.test.tsx`
- 반차 선택 시 종료일 = 시작일·disabled, 시작일 변경 시 따라감, 연차로 바꾸면 enabled
- 일수 미리보기(주말 제외, 반차 0.5, 미입력 시 noValue)
- approvalRequired=false → 승인자 필드 없음·안내 문구, true → 필드 있음·후보 조회
- 빈 제출 시 §5 문구, 사유 501자, 기간 전체 주말
- 요청 중 버튼 disabled + 연속 클릭 시 POST 1회
- 201 PENDING / APPROVED 각각 토스트 문구, 폼 초기화, 이력 탭 URL 이동
- 422 → 서버 message 토스트 + 요약 reload, 409 LEAVE_CONFLICT 토스트, INVALID_DATE_RANGE → 기간 필드 오류, INVALID_APPROVER → 승인자 필드 오류 + 후보 재조회, VALIDATION_ERROR details → 필드 오류

`components/leave/ApproverSelect.test.tsx`
- 입력으로 이름·사원번호 필터, ↑↓·Enter 선택, Esc 닫기, 후보 0건 문구, 조회 실패 [다시 시도]

`app/(app)/leaves/LeavesView.test.tsx`
- 기본 history 탭, `?tab=apply`면 신청 탭, 탭 클릭 시 URL
- 요약 4개 값 표시, 요약 실패 시 SectionError(이력은 표시)
- 이력: 로딩 스켈레톤, Empty 문구, 실패 [다시 시도], 승인자 "자동 승인", 상태 배지, 필터 변경 시 page 1 + API Query 반영, 새로고침 시 URL 복원
- [상세] → 모달

`components/leave/LeaveDetailModal.test.tsx`(추가분)
- [취소] 노출: 본인 PENDING ○ / 본인 즉시 승인·시작일 내일 ○ / 시작일 오늘 ✕ / 승인자 승인 APPROVED ✕ / REJECTED·CANCELLED ✕ / 타인 건 ✕
- 확인 단계 → [戻る] 상세 복귀, [取り消す] PATCH 후 성공 토스트·onProcessed
- 409 NOT_CANCELLABLE → 문구 토스트 + 닫힘 + onProcessed. 요청 중 버튼 disabled
- 기존 승인·반려 테스트 회귀 없음

## 4. E2E (Playwright `frontend/e2e/leaves.spec.ts`)
- beforeAll: `npm run db:e2e-leaves-reset`(PLAYWRIGHT_BASE_URL 지정 시 생략, `attendance.spec.ts`와 같은 방식). E2E 관리자 900001은 approvalRequired=false·부여 미등록 → SPECIAL로 검증
- 비로그인 `/leaves` → `/login?redirect=%2Fleaves`
- 대시보드 [휴가를 신청] → `/leaves?tab=apply`
- SPECIAL(미래 평일) 신청 → "休暇が承認されました。" 토스트 → 이력에 "承認済み"·"自動承認" (E2E-03 일부)
- 같은 기간 재신청 → LEAVE_CONFLICT 토스트
- 이력 [상세] → [취소] → 확인 → "取消" 상태로 변경
- 좁은 폭(375)에서 가로 스크롤 없음
- 미검증으로 보고: E2E-02(승인 필요 사용자의 신청→승인 흐름)는 비밀번호를 아는 승인 필요 E2E 계정이 없어 이번 범위 밖

## 실행 명령
- backend: `npx vitest run src/modules/leaves/leave-rules.spec.ts`, `npm run db:migrate:test` 후 `npx vitest run --config ./vitest.config.e2e.ts test/leave-requests.e2e-spec.ts`, 회귀로 `npm test`·`npm run test:e2e`
- frontend: `npm test`, `npm run test:e2e`(E2E_ADMIN_PASSWORD 필요), `npx tsc --noEmit`, `npm run lint`
