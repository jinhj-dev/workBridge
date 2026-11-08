# 대시보드 — 테스트 계획

## 근거 문서 (해당 섹션만)
- `docs/08_TEST_PLAN.md` — §3 시간 고정, §4 UT-LV-07~09·12·13, UT-ATT-02, §5.2 IT-ATT-01~05, §5.4 IT-APV-01~12·IT-LV-DET-01~02, §5.5 IT-DASH-01~03, §6 권한 매트릭스(해당 행), §7 SCR-001·SCR-002·공통
- `docs/06_API_SPECIFICATION.md` — 각 API의 에러 코드 / `docs/04_SCREEN_SPECIFICATIONS/SCR-002_DASHBOARD.md` §4·§7
- 설계: `.claude/work/dashboard/design-backend.md`, `design-frontend.md`

## 공통 전제
- 시간 고정: e2e는 `Clock`을 `overrideProvider(Clock)`로 바꿔 고정 시계 사용(기본 `2026-11-09T09:00:00+09:00` 월요일, 테스트 안에서 변경 가능). 단위 테스트는 시계를 인자로 주입
- 데이터: `TestDataTracker`로 사용자·부서 생성, 휴가·근태·부여 연차는 Prisma 직접 INSERT(휴가 신청 API 미구현). cleanup은 기존 메서드 사용
- 관리자 현황은 DB 전체 집계이므로 **기준값(사전 조회) 대비 증감**으로 검증(다른 테스트 잔여 데이터 영향 제거, e2e는 파일 순차 실행)
- 금지: `test.skip`, `.only`, 빈 테스트

## 1. 백엔드 단위 (Vitest, `src/**/*.spec.ts`)
| ID | 대상 | 시나리오 | 기대 |
|---|---|---|---|
| U-01 | tokyo-date | `2026-11-08T14:59:59Z` / `15:00:00Z` | `2026-11-08` / `2026-11-09` (UT-ATT-02) |
| U-02 | tokyo-date | formatTokyoDateTime | `YYYY-MM-DDTHH:mm:ss+09:00` |
| U-03 | tokyo-date | toDbDate/fromDbDate 왕복 | 같은 문자열 |
| U-04 | attendance.mapper | clock_out 있음 / 오늘·없음 / 과거·없음 | DONE / WORKING / MISSING_CLOCK_OUT, workMinutes 계산·null |
| U-05 | leave-rules.calculateBalance | 부여 15, APPROVED 3, PENDING 2 | remaining 10 (UT-LV-07) |
| U-06 | 〃 | 부여 미등록 | granted 0 (UT-LV-08) |
| U-07 | 〃 (Repository 조건) | REJECTED·CANCELLED·SPECIAL·OTHER 포함 | 차감 제외 (UT-LV-09, UT-LV-06) — e2e E-LV-03에서도 확인 |
| U-08 | leave-rules.canProcessLeave | 할당 승인자 / ADMIN 대리 / 신청자 본인(ADMIN 포함) / 무관 사용자 | true / true / false / false |
| U-09 | pagination | page·limit 기본값, limit 101, page 0, 0건 totalPages | 1·20 / 검증 실패 / 검증 실패 / 0 |
| U-10 | guards.spec(AdminGuard) | 메타 없음 / ADMIN / EMPLOYEE / user 없음 | 통과 / 통과 / 403 / 401 |
| U-11 | guards.spec(JwtAuthGuard) | 호출 순서 | 인증 → 비번변경 → 역할 (mustChangePassword인 ADMIN이 admin API 호출 시 PASSWORD_CHANGE_REQUIRED) |

## 2. 백엔드 API 통합 (Vitest + Supertest, 실제 테스트 DB)
### `test/attendance.e2e-spec.ts`
| ID | 시나리오 | 기대 |
|---|---|---|
| E-ATT-01 | 출근 기록 없음에서 GET /attendance/today | 200, 본문 텍스트 `null` |
| E-ATT-02 | 첫 출근 | 201, status WORKING, workDate 2026-11-09, clockIn `+09:00`, workMinutes null (IT-ATT-01) |
| E-ATT-03 | 출근 후 today | 200, 같은 기록 |
| E-ATT-04 | 출근 중복 | 409 ALREADY_CLOCKED_IN (IT-ATT-02) |
| E-ATT-05 | 동시 출근 2건 | 201 1건 + 409 1건, 행 1개 |
| E-ATT-06 | 출근 없이 퇴근 | 409 NOT_CLOCKED_IN (IT-ATT-03) |
| E-ATT-07 | 출근 → 시계 +9h → 퇴근 | 200, DONE, workMinutes 540 |
| E-ATT-08 | 퇴근 후 재퇴근 | 409 ALREADY_CLOCKED_OUT (IT-ATT-04) |
| E-ATT-09 | 전날 미퇴근 기록(직접 INSERT) 후 오늘 출근 | 201 (IT-ATT-05) |
| E-ATT-10 | 전날 기록만 있고 오늘 기록 없이 퇴근 | 409 NOT_CLOCKED_IN, 전날 clock_out 그대로 NULL (IT-ATT-06) |
| E-ATT-11 | 도쿄 자정 경계: 시계 23:59 JST 출근 → 00:01 JST 출근 | 둘 다 201, 다른 workDate |
| E-ATT-12 | 다른 사용자 기록이 응답에 섞이지 않음 | today는 본인 기록만 |
| E-ATT-13 | 토큰 없음 / mustChangePassword | 401 / 403 PASSWORD_CHANGE_REQUIRED (3개 API 모두) |

### `test/leaves.e2e-spec.ts`
| ID | 시나리오 | 기대 |
|---|---|---|
| E-LV-01 | balance: 부여 15, APPROVED ANNUAL 2 + HALF_AM 0.5, PENDING 1 | 200 `{year:2026, granted 15, approved 2.5, pending 1, remaining 11.5}` |
| E-LV-02 | balance: 부여 미등록, 휴가 없음 | 200, grantedDays 0, remainingDays 0 |
| E-LV-03 | balance: REJECTED·CANCELLED·SPECIAL·OTHER, 2025년 시작 휴가 | 합계에서 제외 |
| E-LV-04 | balance `year=2025` / `year=abc` / `year=1999` | 2025 기준 / 400 / 400 |
| E-LV-05 | pending mine: 본인 할당 PENDING 3, 타인 할당 1, 본인 할당 APPROVED 1 | 본인 할당 PENDING 3건만 (IT-APV-10) |
| E-LV-06 | pending mine 정렬·limit=5·페이지 형태 | createdAt DESC(동순위 id DESC), `{items,page,limit,totalCount,totalPages}` |
| E-LV-07 | pending scope=all: EMPLOYEE / ADMIN | 403 / 모든 PENDING, 즉시 승인 건 제외 (IT-APV-11·12) |
| E-LV-08 | pending scope=invalid, limit=101 | 400 VALIDATION_ERROR |
| E-LV-09 | pending 할당 0건 EMPLOYEE | 200 빈 items (§6 "허용(빈 목록)") |
| E-LV-10 | 상세: 신청자 / 할당 승인자 / ADMIN | 200, Leave 형태(user·approver UserSummary, autoApproved, `+09:00`) (IT-LV-DET-01) |
| E-LV-11 | 상세: 무관 사용자 / 없는 UUID / 비UUID | 403 / 404 / 404 (IT-LV-DET-02) |
| E-LV-12 | 할당 승인자 승인 | 200 APPROVED, processedBy = 승인자, DB processed_at 저장 (IT-APV-01) |
| E-LV-13 | 무관 사용자 승인 | 403 (IT-APV-02) |
| E-LV-14 | 신청자 본인 승인(ADMIN 신청자 포함) | 403 (IT-APV-03) |
| E-LV-15 | ADMIN 대리 승인 | 200, processedBy = admin ≠ approver (IT-APV-04) |
| E-LV-16 | 이미 승인된 건 재승인 / 즉시 승인 건 ADMIN 승인 | 409 ALREADY_PROCESSED (IT-APV-07·09) |
| E-LV-17 | 승인자와 ADMIN 동시 승인 | 1건 200, 1건 409 (IT-APV-08) |
| E-LV-18 | 반려 사유 없음 / 공백만 / 501자 | 400 VALIDATION_ERROR, details field `rejectReason` (IT-APV-05) |
| E-LV-19 | 반려 사유 포함 반려 | 200 REJECTED, rejectReason 저장 (IT-APV-06) |
| E-LV-20 | 반려 후 승인 시도 | 409 ALREADY_PROCESSED |
| E-LV-21 | 토큰 없음 / mustChangePassword | 401 / 403 PASSWORD_CHANGE_REQUIRED |

### `test/admin-dashboard.e2e-spec.ts`
| ID | 시나리오 | 기대 |
|---|---|---|
| E-DS-01 | EMPLOYEE 호출 | 403 FORBIDDEN (IT-DASH-01) |
| E-DS-02 | 토큰 없음 / mustChangePassword ADMIN | 401 / 403 PASSWORD_CHANGE_REQUIRED |
| E-DS-03 | 기준값 조회 후 활성 사용자 A(출근), B(미출근), C(오늘 포함 APPROVED 연차), D(HALF_AM APPROVED + 출근), E(비활성·출근), PENDING 2건 추가 | 증감: clockedIn +2(A,D), onLeave +2(C,D), notClockedIn +1(B), pending +2. E는 어느 수에도 미포함 (IT-DASH-02·03) |
| E-DS-04 | 오늘이 기간에 없는 APPROVED, 오늘 포함 PENDING·REJECTED·CANCELLED 휴가 | onLeave 증가 없음, 해당 사용자는 미출근으로 셈 |
| E-DS-05 | 응답 date | 고정 시계의 도쿄 날짜 |
| E-DS-06 | 경로 대소문자 변형(`/api/v1/ADMIN/dashboard/summary`)을 EMPLOYEE가 호출 | 403 또는 404(200이 아님) |

## 3. 프론트엔드 컴포넌트 (Vitest + Testing Library, `apiFetch`·`useAuth`·router mock)
### `DashboardView.test.tsx` (08 §7 SCR-002)
| ID | 시나리오 | 기대 |
|---|---|---|
| F-DB-01 | EMPLOYEE | 오늘 전체 현황 미렌더링, summary API 미호출 |
| F-DB-02 | ADMIN | 4개 수치 표시, 승인 대기 카드 링크 `/leaves/approvals?scope=all` |
| F-DB-03 | today = null | 미출근, 출근 활성·퇴근 비활성 |
| F-DB-04 | WORKING / DONE | 출근 비활성·퇴근 활성 / 둘 다 비활성, 시간 HH:mm |
| F-DB-05 | 출근 클릭 → 확인 모달 → 확인 | POST 1회, 상태 갱신, success 토스트, 요청 중 버튼 비활성 |
| F-DB-06 | 확인 모달 취소 | API 미호출 |
| F-DB-07 | 출근 409 ALREADY_CLOCKED_IN | 서버 message 토스트 + today 재조회 |
| F-DB-08 | 퇴근 성공 / 409 ALREADY_CLOCKED_OUT | 상태 DONE / 토스트 + 재조회 |
| F-DB-09 | 휴가 현황 표시, grantedDays 0 | 수치 표시 / 미등록 안내 표시, 휴가 신청 링크 `/leaves?tab=apply` |
| F-DB-10 | 승인 대기 5건 / 0건 | 5행, 컬럼 6개 / Empty 문구, 전체보기 링크 `/leaves/approvals`, 요청 path에 `scope=mine&limit=5` |
| F-DB-11 | 한 영역 API 실패(예: balance 500) | 그 영역만 조회 실패 문구+[다시 시도], 다른 영역 정상. [다시 시도] 클릭 시 재호출 |
| F-DB-12 | 로딩 중 | 각 영역 스켈레톤 |
| F-DB-13 | 네트워크 오류로 출근 실패 | 네트워크 토스트 |
| F-DB-14 | 상단 | 이름·부서·도쿄 기준 날짜(시계 고정) |

### `LeaveDetailModal.test.tsx`
| ID | 시나리오 | 기대 |
|---|---|---|
| F-LM-01 | 상세 표시 | SCR-004 §4.4 항목, 승인자 null → 자동 승인, 반려 사유는 REJECTED만 |
| F-LM-02 | 버튼 노출: 할당 승인자·PENDING / ADMIN 대리 / 처리된 건 | 승인·반려 표시 / 표시 / 닫기만 |
| F-LM-03 | 승인 → 확인 → 성공 | PATCH approve, "승인되었습니다." 토스트, onProcessed·onClose 호출 |
| F-LM-04 | 반려 사유 빈 값 / 공백 / 501자 | 필드 오류(SCR-005 §8), API 미호출 |
| F-LM-05 | 반려 성공 | PATCH reject body `{rejectReason}`, "반려되었습니다." 토스트 |
| F-LM-06 | 승인 409 ALREADY_PROCESSED | 토스트, 닫힘, onProcessed |
| F-LM-07 | 403 FORBIDDEN / 404 (상세 조회 또는 처리) | 토스트, 닫힘, onProcessed |
| F-LM-08 | 요청 중 중복 클릭 | API 1회 |

### `AppShell.test.tsx`
| ID | 시나리오 | 기대 |
|---|---|---|
| F-SH-01 | loading | 스피너, 자식 미렌더링 |
| F-SH-02 | unauthenticated, pathname `/dashboard` | `router.replace('/login?redirect=%2Fdashboard')` |
| F-SH-03 | mustChangePassword | `router.replace('/password')` |
| F-SH-04 | EMPLOYEE / ADMIN 메뉴 | 4개 / 6개, 현재 메뉴 `aria-current="page"` |
| F-SH-05 | 로그아웃 클릭 (성공 / API 실패) | 두 경우 모두 logout 호출 후 `/login`(redirect 파라미터 없음) |
| F-SH-06 | 사용자 메뉴 | 이름 표시, 비밀번호 변경 링크 `/password` |
| F-SH-07 | 좁은 폭 드로어 | 햄버거로 열림(`aria-expanded`), 메뉴 클릭 시 닫힘 |

### `LoginForm.test.tsx` (기존 임시 팝업 테스트 교체, 08 §7 SCR-001)
| ID | 시나리오 | 기대 |
|---|---|---|
| F-LG-01 | 로그인 성공(redirect 없음) | `/dashboard`로 replace, dialog 없음 |
| F-LG-02 | `redirect=/leaves` | `/leaves`로 이동 |
| F-LG-03 | `redirect=https://evil.example`, `//evil`, `/\evil` | 무시하고 `/dashboard` |
| F-LG-04 | 이미 로그인 상태로 /login 표시 | `/dashboard`로 이동 |
| F-LG-05 | mustChangePassword | 기존대로 `/password` (회귀) |

### `format.test.ts`
- 도쿄 날짜·시간 포맷(UTC 15:00 경계), 일수 표시(10 / 10.5)

## 4. E2E (Playwright, `e2e/dashboard.spec.ts`, E2E_ADMIN_PASSWORD 없으면 기존 방식대로 skip 처리 유지)
| ID | 시나리오 | 기대 |
|---|---|---|
| P-01 | 비로그인으로 /dashboard | `/login?redirect=%2Fdashboard` |
| P-02 | 관리자 로그인 | `/dashboard` 이동, 4개 영역 제목 표시(오늘 전체 현황 포함), 사이드바에 관리자 메뉴 |
| P-03 | P-01 후 로그인 | redirect 대상(`/dashboard`)으로 복귀 |
| P-04 | 로그아웃 | `/login`, 이후 /dashboard 접근 시 다시 로그인 화면 |
| P-05 | 새로고침 | 로그인 유지, 대시보드 재표시 |
- 출근·퇴근 클릭은 개발 DB에 하루 1회만 가능해 반복 실행이 깨지므로 E2E에서 제외(컴포넌트·API 테스트로 대체). E2E-01 여정은 SCR-003 구현 시 작성
- `e2e/login.spec.ts`의 "dialog 없음" 검증은 `/dashboard` 이동 검증으로 갱신

## 5. 실행
- backend: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run db:migrate:test` 후 `npm run test:e2e`
- frontend: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`(백엔드·개발 DB 기동, E2E_ADMIN_PASSWORD 필요)
