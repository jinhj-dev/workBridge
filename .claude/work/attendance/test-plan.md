# 근태 관리 — 테스트 계획

근거: `docs/08_TEST_PLAN.md` §4 UT-ATT, §5.2 IT-ATT-07~12, §6 권한 매트릭스, §7 SCR-003·SCR-008, §8 E2E-01 / `docs/06_API_SPECIFICATION.md` §3 / 화면명세 SCR-003·SCR-008. 계약 세부는 `design-backend.md`.
시계는 `FixedClock`(백엔드), 고정 `Date`(프론트)로 고정한다. "오늘"은 2026-11-09(도쿄) 같은 고정값을 쓴다.

## 1. 백엔드 단위 — `backend/src/modules/attendance/attendance-rules.spec.ts`, `attendance.mapper.spec.ts`
| ID | 시나리오 | 기대 |
|---|---|---|
| U-01 | 기간 생략 | 이번 달 1일 ~ 오늘(도쿄). 월초 00:30 JST(UTC 전날) 시각에서도 도쿄 기준 |
| U-02 | start만 / end만 지정 | 다른 쪽만 기본값 |
| U-03 | start = end | 허용 |
| U-04 | start > end | INVALID_DATE_RANGE(순서 문구) |
| U-05 | 양끝 포함 366일 / 367일(윤년 포함 구간 1건) | 허용 / INVALID_DATE_RANGE(기간 문구) — IT-ATT-10 경계 |
| U-06 | clockOut = clockIn, < clockIn | INVALID_TIME_RANGE (UT-ATT-01) |
| U-07 | clockOut = clockIn + 24h / + 24h 1분 | 허용 / INVALID_TIME_RANGE |
| U-08 | clockIn이 근무일 23:59 JST / 다음 날 00:00 JST / 전날 23:59 JST | 허용 / 거부 / 거부 (UT-ATT-02) |
| U-09 | clockOut null | 허용 |
| U-10 | 매퍼 modifiedAt 있음 / 없음 | `+09:00` 문자열 / null |

## 2. API 통합 (실제 테스트 DB) — `backend/test/attendance.e2e-spec.ts`, `admin-attendance.e2e-spec.ts`, `departments.e2e-spec.ts`
ATT-004 내 근태 이력
| ID | 시나리오 | 기대 |
|---|---|---|
| I-01 | 기본 조회(이번 달 기록 3건 + 지난달 1건) | 200, 이번 달 3건, workDate 내림차순, 페이지네이션 형식 |
| I-02 | 다른 사용자 기록 존재 + `userId` 쿼리 지정 | 본인 기록만 (IT-ATT-11) |
| I-03 | 오늘 미퇴근 / 어제 미퇴근 / 퇴근 완료 | WORKING / MISSING_CLOCK_OUT / DONE, workMinutes 계산 (IT-ATT-05 조회 부분) |
| I-04 | 367일 기간, start > end | 400 INVALID_DATE_RANGE (IT-ATT-10) |
| I-05 | `startDate=2026-13-01`, `limit=101` | 400 VALIDATION_ERROR |
| I-06 | page=2, limit=2 (5건) | items 2건, totalCount 5, totalPages 3 |
| I-07 | 관리자가 수정한 기록 | `modifiedAt` 값 있음, 미수정은 null |
| I-08 | 비로그인 / mustChangePassword | 401 / 403 PASSWORD_CHANGE_REQUIRED |

ATT-005 전체 근태 조회
| ID | 시나리오 | 기대 |
|---|---|---|
| I-11 | EMPLOYEE 호출 / 비로그인 | 403 FORBIDDEN / 401 (§6 매트릭스) |
| I-12 | 정렬: 같은 근무일 여러 사원 | workDate desc → name asc → id asc |
| I-13 | name 부분 일치(대소문자 무시, 앞뒤 공백) | 해당 사원만 |
| I-14 | departmentId 지정 / 없는 부서 UUID / 비UUID | 해당 부서만 / 200 빈 목록 / 400 VALIDATION_ERROR |
| I-15 | status=MISSING_CLOCK_OUT / WORKING / DONE | 전날 미퇴근만 (IT-ATT-12) / 오늘 미퇴근만 / 퇴근 있음만 |
| I-16 | status=ABSENT | 400 VALIDATION_ERROR |
| I-17 | 비활성 사용자의 기록 | 포함 |
| I-18 | 기간 367일 | 400 INVALID_DATE_RANGE |

ATT-006 근태 수정
| ID | 시나리오 | 기대 |
|---|---|---|
| I-21 | 어제 미퇴근 기록에 퇴근 추가 | 200, status DONE, DB에 modified_by = 관리자, modified_at = 고정 시각 (IT-ATT-07) |
| I-22 | 퇴근 ≤ 출근 | 400 INVALID_TIME_RANGE, DB 변경 없음 (IT-ATT-08) |
| I-23 | 출근이 근무일 밖 / 퇴근이 출근 + 24h 초과 | 400 INVALID_TIME_RANGE |
| I-24 | 자정 넘은 퇴근(다음 날 02:00) | 200 |
| I-25 | 오늘 근무 중 기록, clockOut null로 출근만 수정 | 200, status WORKING |
| I-26 | 없는 UUID / 비UUID | 404 NOT_FOUND |
| I-27 | clockIn 누락, 오프셋 없는 일시 | 400 VALIDATION_ERROR |
| I-28 | EMPLOYEE 호출 | 403 FORBIDDEN, DB 변경 없음 (IT-ATT-09) |
| I-29 | 관리자 퇴근 추가 후 본인 퇴근 등록(오늘 기록) | 409 ALREADY_CLOCKED_OUT |

DEPT-001
| I-31 | USER 호출 | 200, name 오름차순 `[{id,name}]` / 비로그인 401 |

회귀: 기존 attendance·admin-dashboard·leaves e2e 전부 통과(ATT-001~003 응답에 `modifiedAt: null` 추가 확인).

## 3. 프론트 컴포넌트 (Vitest + Testing Library, API는 mock)
`frontend/src/lib/date-range.test.ts`, `lib/format.test.ts`
- F-01 validateDateRange: 빈 값 / 역순 / 366·367일 경계 / 정상
- F-02 formatWorkMinutes(0, 65, 545, null), formatWorkDate 요일

`app/(app)/attendance/AttendanceHistoryView.test.tsx` (SCR-003)
- F-11 진입 시 기본 기간(이번 달 1일~오늘)으로 `GET /attendance` 호출, 입력값 표시
- F-12 시작일 > 종료일 → 문구 표시, API 미호출 / 빈 값 → 「照会期間を入力してください。」 / 367일 → 기간 문구
- F-13 퇴근 누락 행 강조 + 툴팁 문구, 「管理者修正」 비고, 퇴근 없음 `-`
- F-14 Loading 스켈레톤 / Empty 문구 / 조회 실패 → SectionError, [再試行]로 재호출
- F-15 서버 400 INVALID_DATE_RANGE → 서버 message 표시
- F-16 URL Query(`page=2&startDate=...`)로 진입 시 그 조건으로 조회, 페이지 클릭 시 URL 갱신, [照会] 시 page=1

`app/(app)/admin/attendance/AdminAttendanceView.test.tsx`, `AttendanceEditModal.test.tsx` (SCR-008)
- F-21 검색 조건(이름·부서·상태)이 쿼리에 반영, 부서 Select에 `/departments` 결과 표시, 부서 조회 실패해도 목록 표시
- F-22 사원명 링크가 `/admin/users/:id`
- F-23 모달: 사원명·근무일 읽기 전용, 기존 값 초기 표시
- F-24 퇴근 ≤ 출근 → 「退勤時刻は出勤時刻より後にしてください。」, 출근 빈 값 → 문구, API 미호출
- F-25 저장 → 확인 단계 → PATCH 본문(`+09:00`, 빈 퇴근은 null) → 토스트 「勤怠を修正しました。」 + 목록 재조회
- F-26 400 INVALID_TIME_RANGE → 모달 안 문구 / 404 → 모달 닫힘 + 토스트 + 재조회 / 요청 중 버튼 비활성

`components/layout/AppShell.test.tsx`, `components/Pagination.test.tsx`
- F-31 EMPLOYEE가 `/admin/attendance` → `/dashboard` replace + 「アクセス権限がありません。」 토스트 1회, children 미렌더링 / ADMIN은 렌더링
- F-32 Pagination: 번호·`...`·이전/다음 비활성 경계, `aria-current`

## 4. E2E (Playwright, 실제 백엔드) — `frontend/e2e/attendance.spec.ts`
- E-01 (E2E-01 일부) 900001로 로그인 → 대시보드 출근 → `/attendance`에서 오늘 기록이 「勤務中」으로 보임
- E-02 900001(ADMIN) `/admin/attendance` → 오늘 기록 검색(이름) → 수정 모달에서 퇴근 입력·저장 → 토스트, 상태 「退勤済み」
- E-03 EMPLOYEE 계정으로 `/admin/attendance` 직접 접근 → `/dashboard` + 토스트 (08 §6 화면 접근 검증). 900002는 최초 로그인 계정이므로 비밀번호 변경 후 사용하거나, 불가하면 skip 사유를 보고
- 개발 DB를 쓰므로 데이터가 남는다. 오늘 기록이 이미 있으면 출근 단계는 건너뛰도록 작성

## 5. 실행 명령
- backend: `npm test`, `npm run db:migrate:test` 후 `npm run test:e2e`, `npx tsc --noEmit`, `npm run lint`
- frontend: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run test:e2e`
