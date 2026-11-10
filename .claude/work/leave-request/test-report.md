RESULT: PASS

# test-report: 휴가 신청·조회·취소 (Run 1)

근거: `test-plan.md`. 구현 담당이 먼저 작성한 테스트에 계획 항목 누락분을 추가했다. 구현 코드와 docs는 수정하지 않았다.

## 작성·보강한 테스트 파일
- `backend/test/leave-requests.e2e-spec.ts` (16건 → 37건): 승인·자동 승인 상세, 잔여 경계(부여 15/16·정확히 같은 일수), 부여 미등록 ANNUAL 422 / OTHER 201, SPECIAL 20일, 잔여 연도=시작일 연도, PENDING·APPROVED 겹침 409, REJECTED·CANCELLED 겹침 201, 연차 후 반차 409, 타 사용자 겹침 201, 동시 신청 2건(잔여 초과 1건, 같은 날짜 1건), ADMIN 신청, 과거 시작일, 승인자 후보 필드 4개, 취소 승인자 유지·타인 403, 취소 동시 2건, 취소와 승인 동시, 취소 후 재신청, mustChangePassword 403 매트릭스, 토큰 없음 401
- `backend/src/modules/leaves/leave-rules.spec.ts` (19건 → 23건): UT-LV-02, 인접 날짜 비충돌, 부분 겹침, 경계일 겹침
- `frontend/src/app/(app)/leaves/LeaveApplyForm.test.tsx` (+1): 반차→연차 전환 시 종료일 활성화·시작일 추종·일수 미리보기
- `frontend/src/app/(app)/leaves/LeavesView.test.tsx` (+3): 요약 실패 시 SectionError와 이력 유지, 요약 로딩 상태, 신청 성공 후 신청 연도 이력으로 이동(`/leaves?year=2027`)
- `frontend/src/components/leave/LeaveDetailModal.test.tsx` (+1): 취소 요청 중 더블클릭 시 PATCH 1회, 버튼 disabled

## 실행 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| backend unit (전체) | `npx vitest run` | 14 파일 / 199건 통과 (실패 0) |
| backend unit (leave-rules) | `npx vitest run src/modules/leaves/leave-rules.spec.ts` | 23건 통과 |
| backend e2e (leave) | `npx vitest run --config ./vitest.config.e2e.ts test/leave-requests.e2e-spec.ts` | 37건 통과 |
| backend e2e (전체, 회귀) | `npm run test:e2e` | 11 파일 / 271건 통과 (실패 0) |
| frontend unit (전체) | `npx vitest run` | 21 파일 / 330건 통과 (실패 0) |
| backend 타입·린트 | `npx tsc --noEmit`, `npm run lint` | 통과 |
| frontend 타입·린트 | `npx tsc --noEmit`, `npm run lint` | 통과 |
| 테스트 파일 포맷 | `prettier --check` (작성·수정한 테스트 파일) | 통과 (e2e 파일은 포맷 후 재실행 통과) |

- 실패 항목: 없음
- 테스트 DB: `npm run db:migrate:test` 실행, pending 마이그레이션 없음 확인

## 실행하지 못한 항목 (미검증)
- Playwright `frontend/e2e/leaves.spec.ts`: `E2E_ADMIN_PASSWORD`가 설정되지 않아 실행하지 않았다. 개발 DB와 실 백엔드가 필요하다. 로그인 테스트는 이 환경에서 skip 대상이므로 통과로 보고하지 않는다.
- E2E-02(승인 필요 사용자의 신청→승인 흐름): 계획대로 범위 밖(승인 필요 E2E 계정 없음).
- 폼 초기화(test-plan "201 후 폼 초기화"): 폼은 성공 시 명시적 reset을 하지 않고 이력 탭 전환으로 언마운트된다. 전환 동작은 `LeavesView` 테스트로 검증했지만 폼 단독 reset은 검증하지 않았다. 구현 방식에 따른 차이라 실패로 보지 않는다.
- 동시성 테스트는 실제 PostgreSQL에서 통과했지만 실행 타이밍에 따라 경합이 항상 재현되지는 않는다.

## 최종 품질 평가
계획된 backend 단위·API 통합과 frontend 컴포넌트 시나리오는 대부분 자동 테스트로 검증되었다. 회귀 전체 스위트(backend unit·e2e, frontend unit)가 모두 통과했다. 남은 위험은 Playwright E2E 미실행 1건이다.

---

# test-report: 휴가 신청·조회·취소 (Run 2)

근거: `review.md` Round 1의 tester 담당 5건 반영 + backend/frontend 코드 변경(주석 수정, ApproverSelect error 표시) 후 회귀 확인.
RESULT는 실행한 자동 테스트 기준이다. Playwright는 환경변수 미설정으로 실행되지 않았다(아래 미검증 항목).

## 보강한 테스트 (review.md tester 항목 대응)
| review 항목 | 조치 | 파일 |
|---|---|---|
| 승인자 후보 사원번호 오름차순·이름 대소문자 무시 keyword | `shouldSortApproversByEmpIdAndMatchNameIgnoringCase` 추가 | `backend/test/leave-requests.e2e-spec.ts` |
| 내 이력 createdAt desc·동순위 id desc, totalPages, year=abc 400 | `shouldOrderOwnHistoryByCreatedAtDescThenIdDescAndPaginate` 추가 | 同上 |
| leaveType 미정의 값 → 400 VALIDATION_ERROR | 기존 `shouldReturn400WhenPeriodInvalid` 케이스 추가 | 同上 |
| IT-CAN-04 REJECTED → 409 | 기존 `shouldReturn409WhenApprovedByApproverOrAlreadyCancelled`에 추가 | 同上 |
| 취소 후 pendingDays 감소 (GET /leaves/balance 전후 비교) | `shouldDecreasePendingDaysOnCancel` 추가 | 同上 |
| 테스트명 404 → 403 | `shouldKeepApproverOnCancelAndReturn403ForNonApplicant`로 변경 | 同上 |
| [취소] 경계: 시작일 = 오늘 ✕ / 내일 ○ (vi.setSystemTime, Date만 fake) | `開始日の境界` describe 4건 추가 | `frontend/src/components/leave/LeaveDetailModal.test.tsx` |
| [취소] REJECTED·CANCELLED ✕ | 上記 describe 内に 2건 추가 | 同上 |
| Playwright: 대시보드 [휴가를 신청] → /leaves?tab=apply | `shouldOpenApplyTabFromDashboardButton` | `frontend/e2e/leaves.spec.ts` |
| Playwright: 같은 기간 재신청 → LEAVE_CONFLICT 토스트 | `shouldShowLeaveConflictToastWhenSameDateAppliedAgain` (서버 메시지는 ja.ts에 없어 정규식으로 확인) | 同上 |
| Playwright: 375px 가로 스크롤 없음 | `shouldNotOverflowHorizontallyAtNarrowWidth` (/leaves, /leaves?tab=apply) | 同上 |

수정 파일: `backend/test/leave-requests.e2e-spec.ts`, `frontend/src/components/leave/LeaveDetailModal.test.tsx`, `frontend/e2e/leaves.spec.ts`.
구현 코드·docs는 수정하지 않았다.

## 실행 중 발견한 테스트 자체 오류 [담당: tester]
- `getBalance` 헬퍼가 Response 객체를 반환해 `toMatchObject`가 실패했다(API 값은 정상: pendingDays 2, remainingDays 8). 헬퍼가 body를 반환하도록 고친 뒤 통과했다. assertion은 바꾸지 않았다.

## 실행 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| backend e2e (leave) | `npx vitest run --config ./vitest.config.e2e.ts test/leave-requests.e2e-spec.ts` | 40건 통과 (Run 1: 37) |
| backend unit (전체) | `npx vitest run` | 14 파일 / 199건 통과 |
| backend e2e (전체, 회귀) | `npm run test:e2e` | 11 파일 / 274건 통과 (Run 1: 271) |
| frontend unit (modal) | `npx vitest run src/components/leave/LeaveDetailModal.test.tsx` | 38건 통과 |
| frontend unit (전체, 회귀) | `npx vitest run` | 21 파일 / 334건 통과 (Run 1: 330) |
| backend 타입·린트 | `npx tsc --noEmit`, `npm run lint` | 통과 |
| frontend 타입·린트 | `npx tsc --noEmit`, `npm run lint` | 통과 |
| 포맷 | `prettier --check` (수정한 테스트 파일 3개) | 통과 |
| Playwright | `npx playwright test e2e/leaves.spec.ts` | 미실행(아래) |

- 실패 항목(최종): 없음
- 테스트 DB: `npm run db:migrate:test` 실행, pending 마이그레이션 없음.

## 실행하지 못한 항목 (미검증)
- Playwright `frontend/e2e/leaves.spec.ts` 7건 전부: `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD`가 이 환경에 설정되지 않아 `beforeAll`의 환경 검사에서 중단되었다. DB 초기화 전에 멈추므로 개발 DB는 변경되지 않았다. 신규 3건(대시보드 링크, LEAVE_CONFLICT 토스트, 375px 가로 스크롤)을 포함해 이번 Run에서 실제로 검증된 E2E는 없다. 환경변수 설정 후 `npm run test:e2e`(frontend)로 재실행이 필요하다.
- E2E-02(승인 필요 사용자의 신청→승인 흐름): 계획대로 범위 밖.
- ApproverSelect의 error 표시 변경(review frontend 낮음 항목): `ApproverSelect.test.tsx`가 frontend 전체 회귀(334건)에 포함되어 통과했다. 해당 변경 전용 신규 assertion은 추가하지 않았다(test-plan 범위 밖 변경은 frontend 담당 확인 대상).
- 화면 확인(데스크톱·375px 스크린샷): 수행하지 않았다. 가로 스크롤 검증은 Playwright 미실행으로 미검증이다.

## 최종 품질 평가
review tester 담당 5건은 모두 반영되었고, 자동 테스트 범위(backend unit·e2e, frontend unit) 회귀는 전부 통과했다. 남은 위험은 Playwright 7건 미실행이며, 특히 신규 E2E 3건은 실행 전까지 검증되지 않았다.
