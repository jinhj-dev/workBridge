RESULT: PASS (Run 3: Fix 2 재검증 전 항목 통과, Run 2의 360px 제목 줄바꿈 해소. Run 1·2 기록은 아래에 그대로 둠)

# test-report: 월간 휴가 캘린더 (Run 1)

판정 기준: 백엔드 unit·e2e 전부 통과, 프론트 unit 전부 통과, tsc·lint 양쪽 통과, 캘린더 Playwright 5건 통과. 단, 프론트 unit 전체 실행 중 기존 테스트 1건의 간헐 실패가 1회 관측됨(아래 "간헐 실패" 참조). 범위 밖 기존 Playwright 실패 7건은 이 실행에서 측정하지 않음.

## 작성·수정한 테스트 파일
신규
- `backend/test/dashboard-leave-calendar.e2e-spec.ts` (40건, 실제 임시 DB, raw SQL 검증)
- `frontend/e2e/dashboard-leave-calendar.spec.ts` (Playwright 5건)

추가·보강 (구현 에이전트가 만든 테스트 파일)
- `backend/src/modules/dashboard/leave-calendar-rules.spec.ts` (+3건: 2월 비윤년 말일, 월요일 평일, ANNUAL+HALF_AM 판정)
- `frontend/src/app/(app)/dashboard/LeaveCalendarSection.test.tsx` (+3건: FS-04 스켈레톤, FS-06a PM 라벨·라벨 없음, FS-08 모달 내 실패·재시도)
- `frontend/src/components/calendar/MonthCalendar.test.tsx` (+FC-02 과거/오늘 클래스 단언)
- `frontend/src/app/(app)/dashboard/DashboardView.test.tsx` (+FD-03 승인 후 캘린더 월 재조회)

스크린샷: `.claude/work/leave-calendar/screenshots/calendar-desktop-1280.png`, `.claude/work/leave-calendar/screenshots/calendar-mobile-375.png`

## 결과 요약
| 구분 | 실행 | 결과 |
|---|---|---|
| backend unit (`npx vitest run`) | 18 파일 | 242 통과 / 0 실패 |
| backend e2e 전체 (`vitest.config.e2e.ts`, 임시 DB) | 13 파일 | 361 통과 / 0 실패 (신규 40건 포함) |
| backend e2e 캘린더 파일을 DB 세션 TZ 3종으로 재실행 (America/Los_Angeles, Asia/Tokyo, UTC) | 3회 | 각 40/40 통과 |
| backend `tsc --noEmit` / `eslint .` | - | 통과 / 통과 |
| frontend unit 전체 (`npx vitest run`) | 27 파일 | 최종 실행 412 통과 / 0 실패 |
| frontend `tsc --noEmit` / `eslint .` | - | 통과 / 통과 |
| Playwright 캘린더 스펙 (임시 백엔드 4300·임시 프론트 3300) | 5건 | 5 통과 / 0 실패 |

## 백엔드 집계 raw SQL 검증 (test-plan IT-CAL/IT-DAY 항목)
임시 DB `workbridge_leavecal_test`에 마이그레이션 4건을 적용하고 실행. 모든 항목 통과.
- 여러 날 휴가(월~금 5일), 금~월 주말 걸침(토·일 제외), 단일일, 같은 사원 중복 없음(반차 AM+PM, 종일+PM 겹침), 같은 날 2명 이상 집계
- 승인 외 상태(PENDING·REJECTED·CANCELLED) 제외, 승인+대기+반려 혼재 시 count 1
- 비활성 사원 제외(월·일 모두), 토요일 휴가 `items: []`, 과거 월(2026-10) 조회
- 월 경계: 1/29~2/3 휴가가 1월·2월 응답에 각 월의 날짜만 나옴
- 반차 판정: AM만 → `AM`, PM만 → `PM`, 승인 AM + 대기 PM → `AM`, 종일 또는 SPECIAL·OTHER 포함 → `null`
- 응답 키: 월 `{month, days}`, days 요소 `{date, count}`, 항목 `{userId, name, departmentName, halfDay}` 정확히 4개
- EMPLOYEE·ADMIN 모두 200, 응답 본문 동일. 토큰 없음 401, mustChangePassword 사용자 403 `PASSWORD_CHANGE_REQUIRED`(두 API 모두)
- 400 VALIDATION_ERROR: month `2026-13`·`2026-1`·`abcd`·`1999-12`·`2101-01`, date 누락·`2026-02-30`·`2026/11/10` (`details[0].field` 확인)
- 타임존: 도쿄 기준 기본 월 — UTC 2026-10-31 15:30 → `2026-11`, 2026-11-30 15:00 → `2026-12`
- 같은 날 월 count와 일 상세 items.length 일치(7개 날짜)
- 사원번호 오름차순 정렬 확인 (작성 순서와 반대로 생성)
- 집계 SQL 결과가 DB 세션 TZ(LA·Tokyo·UTC)에 따라 달라지지 않음

## 프론트 테스트 커버리지
test-plan FU-01·02, FC-01~04, FS-01~09(FS-06a 포함), FD-01~03 모두 대응 테스트 존재 및 통과.

## Playwright (임시 백엔드·프론트)
- 실행 방식: 임시 DB `workbridge_leavecal_test`에 E2E 관리자(900001, ADMIN)·사원(900002)과 테스트용 사원 3명, 승인 휴가 3건(현재 월 평일 기준: 3일 연차 1건, 1일 연차 1건, 午前半休 1건)을 투입. 백엔드는 tsc 빌드본을 4300에서 실행, 프론트는 4300을 바라보는 `next dev` 3300에서 실행.
- 결과: 관리자 — 캘린더 표시·今日 강조 1개·翌月/前月 이동·2名 날 클릭 시 モーダルに休暇太郎・休暇花子 표시·午前半休 라벨 표시·스크린샷 2장. 사원 — 캘린더 표시.
- 스크린샷 관찰: 1280px에서 정상. 375px에서 카드 제목 「休暇カレンダー」가 두 줄로 줄바꿈되며, 우하단에 Next.js 개발 인디케이터("1 Insight" 배지)가 칸 일부를 가린다. 이 배지는 dev 서버 전용 UI라 제품 결함은 아니지만, 375px 레이아웃 확인 시 참고.

## 실패 항목
없음 (RESULT 판정에 영향 없음)

## 간헐 실패 (주의)
- 테스트: `frontend/src/app/(app)/dashboard/DashboardView.test.tsx` › `DashboardView 勤怠` › `shouldClockInAfterConfirmAndDisableButtonsWhileSubmitting`
- 에러 요약: `expected document not to contain element, found <dialog ...>` (확인 모달이 닫히기 전에 단언)
- 원인 추정: 전체 suite 병렬 부하에서 모달 닫힘 타이밍 의존. 해당 파일 단독 실행 2회 통과, 전체 실행 재시도 1회 통과, 첫 전체 실행에서 1회 실패(3회 중 1회).
- 담당: frontend (기존 테스트. 이번 변경 범위 밖이지만 실행 중 관측됨. 모달 닫힘 대기를 `waitFor`/`waitForElementToBeRemoved`로 바꾸는 개선 필요)

## 범위 밖 · 미실행 항목
- Playwright 전체 스펙 미실행. `attendance.spec.ts`의 beforeAll 등이 `npm run db:e2e-*` 스크립트를 호출하며, 이 스크립트는 `backend/.env` (개발 DB)에 접속하므로 임시 DB 환경에서 안전하게 돌릴 수 없다. 따라서 기존 실패 7건(attendance-status 6, leaves 1)은 이번에 재측정하지 않았다.
- 캘린더 Playwright 데이터는 실행 당일 기준 월의 평일에 맞춰 투입. 다른 날짜에 실행하려면 시드를 다시 만들어야 한다.
- Playwright의 로그인 계정은 임시 DB 전용 비밀번호를 환경변수로 전달. 저장소에는 기록하지 않음.

## 환경 정리
- `backend/.env.test`: 실행 중 임시 DB URL로 바꿨다가 백업(sha256 `9e2fba54…774c6f`)에서 원복. 원복 후 백업과 바이트 단위 동일 확인.
- 임시 DB `workbridge_leavecal_test`: DROP 완료. 개발 DB `workbridge`, 공유 `workbridge_test`는 접속·변경하지 않음.
- 직접 띄운 서버 3300·4300은 종료. 사용자 프로세스 3000·4000은 건드리지 않음(4000 리스너 PID는 세션 중 바뀌었으나 내가 종료한 것은 아님).
- 임시 프론트 복사본과 시드 자격증명 파일은 스크래치패드에서 삭제. 저장소 내 변경은 위 테스트 파일과 `screenshots/`, `test-report.md`만 추가.
- 커밋·푸시·브랜치 변경 없음.

## 미검증 항목
- docs/06, 02, 08 갱신 여부(문서 작업 범위, 이번 검증 대상 아님)
- 구현 코드 및 docs/ 는 수정하지 않음

---

## Run 2 (review.md Round 1 tester 항목 반영 후 전체 재실행)

RESULT: FAIL
- 실패 1건: `frontend/e2e/dashboard-leave-calendar.spec.ts` › `shouldCaptureCalendarScreenshotsDesktopAndNarrow`
  - 에러 요약: 360px에서 제목 「休暇カレンダー」의 줄 수 `2`(기대 1). 375px은 1줄로 통과
  - 원인 추정: 헤더의 제목과 월 이동 컨트롤이 360px 본문 폭(약 288px)에 같이 들어가지 않아 제목이 「休暇カレンダ / ー」로 줄바꿈. Fix 1의 "360px 약 150px 수납" 계산이 실측과 맞지 않음. 스크린샷으로 확인함(`screenshots/calendar-mobile-360.png`). 제품 결함
  - 담당: frontend (이번 테스트는 측정을 그대로 단언. assertion 완화 없음)
  - 참고: 1회차에는 줄 수 단언이 없었고 1회차 스크린샷에서 375px이 두 줄이었음. Fix 1 후 375px은 한 줄로 개선됨. 이번에는 모든 폭을 촬영한 뒤 단언하도록 바꿈

### 작성·수정한 테스트 파일 (Run 2)
- `frontend/e2e/dashboard-leave-calendar.spec.ts` (수정): 관리자 데이터 의존 단언 제거(IT 대신 구조 확인, 반차 라벨 테스트 삭제 → FS-06a로 대체), EMPLOYEE 테스트(900002) 삭제 → FD-01로 대체, 오늘 셀 클릭 후 「一覧 または 空の文言」 확인, 스크린샷을 1280·375·360 세 폭으로 확장하고 360·375 제목 줄 수 단언 추가. `E2E_INITIAL_USER` import 제거(lint 경고 해소)
- `backend/test/dashboard-leave-calendar.e2e-spec.ts` (수정): day API 400 케이스에 `1999-12-31`, `2101-01-01` 추가
- `frontend/src/app/(app)/dashboard/LeaveCalendarSection.test.tsx` (수정): FS-01에 「데이터 없는 날(11/09)은 件数 표시 없음」 단언 추가
- `frontend/src/app/(app)/dashboard/DashboardView.test.tsx` (수정): `shouldClockInAfterConfirmAndDisableButtonsWhileSubmitting`의 모달 닫힘 단언을 `waitFor`로 변경(273행 부근)

### 결과 요약 (Run 2)
| 구분 | 실행 | 결과 |
|---|---|---|
| backend unit (`npx vitest run`) | 18 파일 | 242 통과 / 0 실패 |
| backend e2e 전체 (`vitest.config.e2e.ts`, 임시 DB) | 13 파일 | 361 통과 / 0 실패 (캘린더 40건, 400 케이스 추가 포함) |
| backend `tsc --noEmit` / `npm run lint` | - | 통과 / 통과 |
| frontend unit 전체 (`npx vitest run`) | 27 파일 | 412 통과 / 0 실패 |
| frontend `tsc --noEmit` / `npm run lint` | - | 통과 / 통과 (스펙 import 정리 후 lint 0 경고) |
| prettier check (수정한 테스트 파일 4개) | - | 통과 |
| Playwright 캘린더 스펙 (임시 백엔드 4300·임시 프론트 3300, `PLAYWRIGHT_BASE_URL`) | 3건 | 2 통과 / 1 실패(360px 줄바꿈) |

Playwright 상세: 「今日 강조 1개·翌月/前月 이동·오늘 클릭 → 모달 題名 표시」 통과, 스크린샷 3폭 촬영 후 제목 줄 수 단언에서 360px 실패.

### 스크린샷 (SCR-002, 제목 「休暇カレンダー」 줄 수 확인)
- `.claude/work/leave-calendar/screenshots/calendar-desktop-1280.png`: 정상 배치
- `.claude/work/leave-calendar/screenshots/calendar-mobile-375.png`: 제목 **한 줄** (통과)
- `.claude/work/leave-calendar/screenshots/calendar-mobile-360.png`: 제목 **두 줄** 「休暇カレンダ / ー」 (실패)
- 우하단 "1 Insight" 배지는 Next.js dev 전용 표시. 제품 결함 아님

### 실패 항목 담당 정리
- [담당: frontend] 360px 헤더 제목 줄바꿈(Playwright 1건). 제안: 좁은 폭에서 헤더를 2행으로 두거나 제목을 `whitespace-nowrap`으로 두고 컨트롤 간격을 더 줄이는 방향을 frontend가 정할 것. 수정 후 360·375 스크린샷과 이 테스트 재실행 필요
- 그 외 실패 없음

### 환경·정리 (Run 2)
- 임시 DB `workbridge_cal_run2_test`: 생성 → 마이그레이션 → `db:seed`(임시 DB 대상) → E2E 계정 초기화 → 실행 종료 후 DROP 완료. 개발 DB `workbridge`·공용 `workbridge_test`는 접속·변경하지 않음
- `backend/.env.test`: 실행 중 임시 DB URL로 바꿨다가 백업에서 원복. 원복 후 백업과 바이트 단위 동일 확인(sha256 `9e2fba54…774c6f`)
- `backend/.env`: **실행 중(20:59:52) PORT 값이 `4000`에서 `6000`으로 바뀌어 있었음.** 이 실행에서 `.env`에 쓰는 명령은 없었고 원인은 확인되지 않음. 임의로 되돌리지 않았음. 원본 백업: `C:\Users\JINHYE~1\AppData\Local\Temp\claude\980a315307d2503d\db88e78f-4d7e-4554-9934-0caae69ba071\scratchpad\envbak\.env`. 사용자 확인 후 필요하면 원복 필요
- 백엔드 임시 서버 4300: 임시 빌드(`backend/.tmp-run2-dist`, 삭제 완료)로 띄우고 종료. 프론트 임시 서버 3300: 스크래치패드 복사본에서 띄우고 종료(`.next`·repo `node_modules` 미접촉)
- 사용자 프로세스 3000·4000은 종료하거나 재시작하지 않음. 세션 중 리스너 PID가 바뀌었음(3000: 132188→133040, 4000: 142796→141500). 제가 건드린 것은 아님
- 커밋·푸시·브랜치 변경 없음. `backend/dist` 미변경

---

## Run 3 (frontend.md Fix 2: 공용 Card 헤더 flex-wrap 후 재검증)

RESULT: PASS

### 작성·수정한 테스트 파일 (Run 3)
없음. 기존 테스트를 재실행만 함. 테스트 코드·구현 코드·docs 미변경.

### 결과 요약 (Run 3)
| 구분 | 실행 | 결과 |
|---|---|---|
| frontend unit 전체 (`npx vitest run`) | 27 파일 | 412 통과 / 0 실패 |
| frontend `tsc --noEmit` / `npm run lint` | - | 통과 / 통과 |
| Playwright 캘린더 스펙 (임시 백엔드 4300·임시 프론트 3300, `PLAYWRIGHT_BASE_URL`) | 3건 | 3 통과 / 0 실패 |
| 공용 Card 영향 스크린샷 (before/after, 6화면 × 1280·360) | 12쌍 | 11쌍 바이트 동일, 1쌍(대시보드 360) 차이는 의도된 캘린더 헤더 변화만 |

backend는 변경이 없어 unit·e2e를 재실행하지 않음(요청 범위 외).

### Playwright 상세 (Run 3)
- `shouldShowCalendarWithTodayHighlighted`: 통과 (今日 강조 1개)
- `shouldMoveMonthAndOpenDayModalWhenDateClicked`: 통과 (翌月/前月, 날짜 클릭 → モーダル)
- `shouldCaptureCalendarScreenshotsDesktopAndNarrow`: 통과. 1280·375·360 모두 촬영, 375·360 제목 줄 수 1
- 스크린샷 확인(`screenshots/calendar-mobile-360.png`): 제목 「休暇カレンダー」 1행, 월 이동 컨트롤(‹ 2026年11月 ›)이 2행째 왼쪽 정렬로 표시. 칸 배치 정상
- 스크린샷 확인(`screenshots/calendar-mobile-375.png`): 제목·컨트롤 1행 유지
- 우하단 "1 Insight" 배지는 Next.js dev 전용 표시(제품 결함 아님)

### 공용 Card 영향 확인 (Run 3)
- Card에 `action`을 넘기는 곳은 3곳뿐: 대시보드 `LeaveBalanceSection`(休暇状況 연도 표시), `LeaveCalendarSection`(캘린더 월 이동), `PendingApprovalsSection`(承認待ちの申請 すべて見る). 나머지 Card 사용처(勤怠状況, 勤怠管理·休暇一覧·承認·部署管理·勤怠一覧 등)는 action이 없어 flex-wrap이 렌더에 영향을 주지 않음
- 비교 방식: 임시 프론트 복사본 하나에서 Card.tsx만 `git show HEAD:`(before)와 작업 트리 버전(after)으로 바꿔 같은 임시 DB·같은 백엔드에서 촬영. 작업 트리·git stash 미사용
- 촬영 화면: /dashboard, /attendance, /leaves, /leaves/approvals, /admin/departments, /admin/attendance × 1280·360 (각 전체 페이지 PNG + 섹션별 위치·크기 metrics JSON)
- 결과: 12쌍 중 11쌍 PNG 바이트 동일, metrics 동일. 차이는 `/dashboard` 360px 1쌍뿐이며 metrics 차이는 캘린더 카드 헤더만:
  - before: 제목 2행(「休暇カレンダ / ー」), 헤더 높이 48, 컨트롤이 제목 옆 한 줄
  - after: 제목 1행(높이 24), 컨트롤 2행째(헤더 높이 68), 섹션 높이 430→450
  - 같은 화면의 休暇状況·承認待ちの申請 카드는 위치·높이 동일(줄바꿈·간격 변화 없음)
- 판단: 예상치 못한 회귀 없음. 1280px 전 화면과 360px 나머지 화면 모두 before와 동일
- 스크린샷 위치: `screenshots/card-impact/before/`, `screenshots/card-impact/after/` (파일명 `{화면}-{폭}.png`, `metrics-{화면}-{폭}.json`)

### 실패 항목 (Run 3)
없음. 담당 할당 없음.

### 환경·정리 (Run 3)
- 임시 DB `workbridge_cal_run3_test`: 로컬 Postgres 컨테이너에 생성 → `prisma migrate deploy` → `db:seed` → `db:e2e-accounts` → 실행 후 DROP 완료(목록에서 사라짐 확인). 접속 URL은 프로세스 환경변수로만 지정. E2E 계정 비밀번호는 임시 DB용 값을 환경변수로만 전달하고 파일에 기록하지 않음
- 개발 DB `workbridge`, 공용 `workbridge_test`는 접속·변경하지 않음
- backend: `backend/.tmp-run3-dist`에 빌드 후 포트 4300으로 실행, 종료 후 디렉터리 삭제. `backend/.env`·`.env.test`는 수정하지 않음. `backend/.env`의 PORT는 현재 6000 그대로(사용자 쪽 값, 변경하지 않음)
- frontend: 스크래치패드 복사본(`fe-after`, `fe-before`)에서 `next dev` 3300 실행 후 종료, 복사본 삭제. 저장소 `frontend/.next`·`node_modules`는 건드리지 않음(node_modules는 복사본 생성 과정에서 읽기만 함, 파일 수 25078 그대로 확인)
- 직접 띄운 서버 3300·4300은 종료. 사용자 프로세스 3000·4000·6000은 건드리지 않음
- 커밋·푸시·브랜치 변경·git stash 없음. workBridge-sample-pw 미접근
- 저장소 내 변경(이번 실행): `screenshots/calendar-desktop-1280.png`·`calendar-mobile-375.png`·`calendar-mobile-360.png` 덮어쓰기, `screenshots/card-impact/` 추가, 이 `test-report.md` 갱신

### 참고 (미검증·범위 밖)
- Playwright 전체 스펙(attendance·leaves 등)은 이번 실행 범위가 아니므로 재측정하지 않음
- frontend unit 실행 로그에 jsdom의 "Not implemented: navigation to another Document" 문구가 출력됨. 실패는 아니며 이번 변경과의 관계는 확인하지 않음
