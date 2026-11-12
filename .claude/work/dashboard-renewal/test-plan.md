# test-plan: dashboard-renewal

> 기준: `design-backend.md`·`design-frontend.md`(D1~D19 확정, D20-A 추천). 근거 문서: 06 §2 API-DASH-001·004, 02 FR-DASH-001·FR-LEAVE-002(갱신 예정), SCR-002, SCR-005(승인·반려 흐름), 03 Common UI Rules, 08 §5.4·§5.5·§6 권한 매트릭스.

## 1. Backend unit
### `backend/src/modules/dashboard/today-status-rules.spec.ts`
| ID | 시나리오 | 기대 |
|---|---|---|
| U-01 | `isWorkday`: 평일 / 토 / 일 / 평일 공휴일(2026-11-03) / 토요일 공휴일 | true / false / false / false / false |
| U-02 | `attendanceRate`: 96/16/8 | 80.0 |
| U-03 | 반올림 1/3 → 33.3, 2/3 → 66.7, 20/24 → 83.3 | half-up 소수 1자리 |
| U-04 | 분모 0 | null |
| U-05 | `applyWorkday(false)` | onLeave·notClockedIn 0, clockedIn 유지 |
| U-06 | `sumStatusCounts` | 각 필드 합 |
### `backend/src/common/time/calendar-rules.spec.ts` (D20-A, 이관)
| U-07 | 기존 `leave-calendar-rules.spec.ts`의 `isWeekend`·`monthRange` 케이스 그대로 | 기존과 동일 |

## 2. Backend e2e — 실제 테스트 DB, FixedClock
### `backend/test/admin-dashboard.e2e-spec.ts` (갱신)
| ID | 시나리오 | 기대 |
|---|---|---|
| E-01 | 기존 권한 4건(EMPLOYEE 403, 토큰 없음 401, mustChangePassword 403 PCR, 대소문자 변형 경로) | 유지 |
| E-02 | 평일: 출근 A, 휴가 B(ANNUAL), 미출근 C | 1/1/1, total 3, rate 33.3 |
| E-03 | 반차(HALF_AM APPROVED) + 출근한 D | 出勤에만 1(합계 = total) |
| E-04 | 반차 APPROVED, 출근 없음 | 休暇 |
| E-05 | PENDING·REJECTED·CANCELLED 휴가만, 출근 없음 | 未出勤 |
| E-06 | 비활성 사용자, `hire_date` > 오늘(출근 기록 있어도) | 모든 수치·total에서 제외 |
| E-07 | 토요일: 출근 1, 휴가 1 | isWorkday false, clocked 1, leave 0, notClocked 0, total = 대상자 수, rate 100.0 |
| E-08 | 평일 공휴일(2026-11-03) | isWorkday false |
| E-09 | 비근무일 출근 0명 | rate null |
| E-10 | pendingLeaveCount = 전체 PENDING | 일치 |
| E-11 | 도쿄 날짜 경계(UTC 11-19 15:30 = 도쿄 11-20) | date `2026-11-20` |
| E-12 | 응답 키 | 8개 키만 |
### `backend/test/dashboard-department-status.e2e-spec.ts` (신규)
| ID | 시나리오 | 기대 |
|---|---|---|
| E-20 | 권한: 토큰 없음 / mustChangePassword / EMPLOYEE / ADMIN | 401 / 403 PCR / 200 / 200(같은 본문) |
| E-21 | 부서 2개 + 0명 부서 | 0명 제외, code 오름차순 |
| E-22 | 부서별 3분류·rate가 E-02~E-06 규칙과 같음 | 일치 |
| E-23 | 부서 합계 = API-DASH-001 값(같은 Clock) | 일치 |
| E-24 | 「未所属」 대상자 | 포함 |
| E-25 | 최소 공개: `departments[]` 키 7개만(이름·사원번호·userId 없음) | 일치 |
| E-26 | 비근무일 | leave·notClocked 0, isWorkday false |
| E-27 | 세션 TZ America/Los_Angeles·UTC·Asia/Tokyo | 동일 결과 |
| E-28 | 1명 부서(소규모) | 숫자만 반환, 개인 식별 필드 없음(security 점검 근거) |
### 삭제 확인 (D20-A)
| E-30 | `GET /dashboard/leave-calendar?month=2026-11`, `/leave-calendar/day?date=2026-11-10`(EMPLOYEE·ADMIN) | 404 |
| E-31 | 출근부 월 형식 검증(`month` 이관 후) — 기존 IT-ATT 월 검증 케이스 | 400 VALIDATION_ERROR, 기존과 동일 |
### 승인 권한 서버 검증 (D8, 기존 e2e로 확인 — 신규 로직 없음)
| E-40 | EMPLOYEE `GET /leaves/pending-approval?scope=all` | 403 |
| E-41 | EMPLOYEE `scope=mine` | 본인 할당 PENDING만 |
| E-42 | 할당되지 않은 EMPLOYEE가 승인·반려 API 호출 / 본인 신청 승인 / 처리된 건 재처리 | 403 / 403 / 409 ALREADY_PROCESSED (기존 IT-LEAVE 케이스 통과 확인) |
### 회귀
- 근태·휴가·승인 e2e 전체, `attendance-monthly.e2e-spec.ts`(캘린더 1건 삭제 후), 출근부 e2e(`isWeekend`·`monthRange` 이동 후 동일).

## 3. Frontend 컴포넌트 (Vitest + Testing Library)
### `DashboardView.test.tsx` (교체)
| ID | 시나리오 | 기대 |
|---|---|---|
| F-01 | EMPLOYEE, 배지 count 0 | summary·pending-approval(limit=5) 호출 안 함, 통계·全社·承認待ち 카드 없음, 今日·今月·休暇·部署·直近 표시, 캘린더 없음·`/dashboard/leave-calendar` 호출 없음 |
| F-02 | EMPLOYEE, 배지 count null(배지 조회 실패) | 承認待ち 카드 없음 |
| F-03 | EMPLOYEE 승인자, 배지 count 2 | 承認待ち 카드 표시, `scope=mine&limit=5` 호출, 「すべて見る」 `/leaves/approvals` |
| F-04 | ADMIN | 통계 3개(120名·96名·8件), 承認待ち `scope=all&limit=5`, 링크 `/leaves/approvals?scope=all`, summary 1회 |
| F-05 | 헤더 도쿄 9/14/20시 | 인사말 3종 + 이름, 날짜 라벨 |
| F-06 | 각 카드 로딩 | 카드별 스켈레톤 |
| F-07 | department-status 500 | 그 카드만 SectionError, 재시도 |
| F-08 | 출근 성공 | 확인 모달 → POST → [退勤する], summary·department·monthly 재조회 |
| F-09 | 출퇴근 409 3종·네트워크 오류 | 기존 SCR-002 §7 토스트 + today 재조회 |
| F-10 | 未出勤 | 出勤時刻·退勤予定 「--:--」, 진행률 0, [出勤する] |
| F-11 | 勤務中 clockIn 09:00, 현재 13:30 | 退勤予定（目安） 18:00, 진행률 50 |
| F-12 | 退勤済み clockIn 09:00, clockOut 19:00 | 진행률 100(클램프), 退勤時刻 19:00 표시, [退勤済み] 비활성 |
| F-13 | ADMIN 1열 순서 | 全社 카드가 承認待ち보다 앞(`order`) — DOM은 데스크톱 순서 |
### 承認待ち (D8 승인 흐름)
| ID | 시나리오 | 기대 |
|---|---|---|
| F-20 | 제목 `（8件）`=totalCount, 5행, 4열 + chevron | 일치 |
| F-21 | 승인자(할당된 건) 행 클릭 | 모달에 [承認]·[却下] 표시 |
| F-22 | ADMIN이 할당되지 않은 건 클릭 | [承認]·[却下] 표시(기존 canProcess) |
| F-23 | ADMIN 본인 신청 건 | 승인·반려 버튼 없음 |
| F-24 | 모달에서 승인 성공 | 승인 API 1회, 목록 reload, 배지 refresh, (ADMIN) summary·department 재조회, 토스트 |
| F-25 | 모달에서 반려: 사유 미입력 / 501자 / 정상 | 검증 메시지 / 검증 메시지 / 반려 API 호출 후 F-24와 같은 갱신 |
| F-26 | 승인 409 ALREADY_PROCESSED | 기존 메시지, 목록 reload |
| F-27 | 승인자 사원이 마지막 1건 처리 → 배지 0 | 카드가 사라지고 토스트는 표시 |
| F-28 | ADMIN Empty | 「承認待ちの申請はありません。」 |
### 기타 카드
| ID | 대상 | 기대 |
|---|---|---|
| F-30 | 全社 96/16/8, rate 80.0 | 「80.0%」, 범례 「96名（80.0%）」「16名（13.3%）」「8名（6.7%）」, aria-label |
| F-31 | 全社 isWorkday false, rate null | 「—」, 휴일 안내 |
| F-32 | 今月 | 12日 / 96時間 / 8時間 / 0時間(라벨 休日出勤), 「96時間30分」, 링크 `/attendance` |
| F-33 | 休暇 remaining 8, approved 12, granted 0 | 8日·12日, 미등록 안내, 「今年の取得日数」 없음, [休暇を申請] → 모달 → 성공 후 재조회 |
| F-34 | 部署 | 열 5개, ADMIN만 「すべて見る」(`/admin/attendance`), 비근무일 안내 |
| F-35 | 直近 | `limit=3`, 상태 배지, 클릭 → 상세(본인 PENDING이면 취소 버튼), 취소 후 재조회, Empty 문구 |
### 공용
| F-40 | `DonutChart` | dasharray 비율, 합 0이면 빈 링, `role="img"` |
| F-41 | `StatCard` icon·unit 생략 | 기존 렌더 동일(LeavesView 테스트 통과) |
| F-42 | `Badge info` | `bg-primary-30 text-primary-100` |
| F-43 | `greetingOf` 경계 4:59/5:00/10:59/11:00/17:59/18:00 | 각 구간 |
| F-44 | `shareOf`·`formatHours` | 반올림·null·분 표기 |
| F-45 | `expectedClockOut`·`workProgressPercent` | +540분, 경계(0분 0 / 270분 50 / 540분 100 / 600분 100 / clockIn null 0 / until < clockIn 0), 날짜 넘김(22:00 출근 → 익일 07:00) |
| F-46 | `lib/calendar.ts` | `shiftMonth`·`formatMonthLabel` 기존 테스트 통과(`buildMonthWeeks` 테스트 삭제) |

## 4. Playwright (실제 백엔드·개발 DB, 900001 ADMIN / 900002 EMPLOYEE, 승인자 계정은 시드에서 확인)
- 파일: `frontend/e2e/dashboard-renewal.spec.ts`(신규), `frontend/e2e/dashboard.spec.ts`(갱신), `dashboard-leave-calendar.spec.ts` 삭제
| ID | 시나리오 | 기대 |
|---|---|---|
| P-01 | ADMIN 1440 / 1024 / 390 / 375 스크린샷 | `.claude/work/dashboard-renewal/screenshots/admin-{폭}.png` |
| P-02 | EMPLOYEE 같은 4폭 | `employee-{폭}.png` |
| P-03 | 참조 이미지 체크리스트: 8↔admin-1440(D1 배치), 9↔admin-390, 10↔employee-1440, 11↔employee-390. 카드 순서·열 수·제목·도넛·표 열·390/375 가로 넘침 없음. 의도된 차이(캘린더·お知らせ 없음, 색·셸 유지, 10.png 세로 묶음 미재현) 구분 기록 | test-report에 기록 |
| P-04 | EMPLOYEE `page.request`로 `/admin/dashboard/summary`, `/leaves/pending-approval?scope=all` | 403 / 403 |
| P-05 | 할당 건 없는 EMPLOYEE(900002) 대시보드 | 承認待ち 카드 없음 |
| P-06 | ADMIN 承認待ち 행 클릭 → 모달 [承認] → 확인 | 목록에서 사라짐, 통계 承認待ち 件数 −1, 사이드바 배지 갱신(해당 시) |
| P-07 | ADMIN 반려(사유 입력) | 목록에서 사라짐 |
| P-08 | ADMIN 출근 → 本日の出勤者·全社 出勤 +1, 部署 해당 부서 +1, 退勤予定 = 출근+9h | 증가분·시각 일치 |
| P-09 | 휴가 신청(대시보드) → 直近 최상단, 残日数 반영 | 일치 |
| P-10 | 360px 이상 카드 제목 1줄, 가로 넘침 없음 | 일치 |

## 5. 회귀
- frontend `npm test` 전체(LeavesView·ApprovalsView·LeaveDetailModal·AppShell·AttendanceSheetView), backend `npm test`·`npm run test:e2e`, Playwright `approvals.spec.ts`·`leaves.spec.ts`·`attendance*.spec.ts`.
- SCR-005 승인·반려 후 배지 갱신(기존 동작).
- 타입체크·lint·build(backend·frontend). 삭제 파일의 import 잔존 없음.

## 6. 08 TEST_PLAN 갱신 항목 (문서 반영용)
- §5.5: IT-DASH-02·03 새 정의, IT-DASH-04~16 삭제(D20-A), 부서별 현황·비근무일·입사일·최소 공개 신규 IT-DASH.
- §6 권한 매트릭스: API-DASH-004(EMPLOYEE·ADMIN 200), 캘린더 API 행 삭제.
- §7 SCR-002 행: 승인자·ADMIN만 承認待ち 표시, 일반 사원 숨김, 모달 내 승인·반려 노출 조건, 처리 후 목록·배지·3분류 갱신, 退勤予定 目安·진행률, 캘린더 항목 삭제.

## 7. 미검증 위험
- Playwright 수치는 증가분으로만 판정(개발 DB 의존).
- 이미지 비교는 체크리스트 기반.
- 승인자 사원 Playwright는 시드에 할당 PENDING이 있어야 하므로, 없으면 컴포넌트 테스트(F-03·F-21·F-27)로 대체하고 보고.
