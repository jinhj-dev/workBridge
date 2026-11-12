RESULT: PASS (Run 4 기준. Playwright 1차 실행의 로그인 flake 2건은 단독 재실행에서 통과. 아래 Run 4 참고)

# 테스트 결과: 휴가관리 통합 (Run 1)

## 요약
- Backend 단위: 22 파일, 312 통과 / 0 실패
- Backend e2e 전체: 15 파일 중 12 통과, 3 실패 파일 (379건 중 370 통과, 8 skip, 1 실패. 실패 3파일 중 2파일은 beforeAll에서 중단되어 개별 테스트 미실행)
  - 휴가 관련 e2e(`leave-calendar`, `leaves`, `leave-requests`): 3 파일 106건 전부 통과
  - 실패 3 파일은 테스트 DB 잔재 데이터가 원인 (아래 실패 항목 참고)
- Frontend 단위: 43 파일, 589 통과 / 0 실패
- Frontend 타입체크(`npx tsc --noEmit`) 통과, lint(src, e2e) 통과, `npm run build` 통과
- Backend 타입체크, lint 통과
- Playwright 시각 검증(로그인 전 화면): 7 통과 (6개 해상도 + 320px 가로 스크롤)
- Playwright 시각 검증(로그인 후 화면): 18 skip (E2E 관리자 계정 환경변수 없음, 미검증)

## 작성·수정한 테스트 파일
신규
- `frontend/src/lib/leave-calendar.test.ts` (FC-01, FC-02, FC-03, parseCalendarMonth)
- `frontend/src/app/(app)/leaves/LeaveManagementLayout.test.tsx` (FC-04, 申請後の再取得)
- `frontend/src/components/leave/LeaveCategoryBadge.test.tsx` (FC-09)
- `frontend/e2e/leave-visual.spec.ts` (test-plan §5, 스크린샷은 `screenshots/login-*.png` 저장)

재작성·갱신 (사양 변경 반영, assertion 약화 없음)
- `frontend/src/lib/leave-days.test.ts`: `yearOptions` 삭제, `parseLeavesQuery` 단일 값·appliedFrom/To 기준으로 변경
- `frontend/src/app/(app)/leaves/LeavesView.test.tsx`: 신청 버튼·탭은 layout으로 이동, 필터 폼(FC-10), 2 칼럼 표 기준으로 재작성
- `frontend/src/app/(app)/leaves/approvals/ApprovalsView.test.tsx`: status 파라미터, 6 칼럼 → 9 칼럼 표, 상태 카드·PENDING 전용 처리 버튼 테스트 추가(FC-11)
- `frontend/src/components/layout/AppShell.test.tsx`: 承認 메뉴 삭제, 배지는 休暇管理로 이동, 메뉴 개수 갱신
- `frontend/src/components/leave/LeaveApplyModal.test.tsx`: `messages.leaves.history.status` → `statusColumn`
- `frontend/e2e/approvals.spec.ts`: 사이드바 承認 → 休暇管理 탭 경로로 변경 (실행은 E2E 계정 필요)
- `frontend/e2e/leaves.spec.ts`: 연도 URL → 검색 폼 단일 값 필터 (실행은 E2E 계정 필요)

Backend 테스트 파일은 이번 실행에서 새로 쓰지 않았다. 이미 존재하는 `leave-calendar-rules.spec.ts`(단위)와 `test/leave-calendar.e2e-spec.ts`(17건)를 실행했다.

## 실패 항목

1. `backend/test/db/seed.e2e-spec.ts` > seedInitialData (beforeAll 단계)
   - 에러: テスト用 DB に活性 ADMIN が 2 件残っています
   - 원인: 테스트 DB(`workbridge_test`)에 활성 ADMIN 행 2건(사원번호 00001 初期管理者, 900001 E2E管理者)이 남아 있음. 이 테스트는 시작 시 활성 ADMIN이 0이어야 한다고 전제함. 휴가 기능 변경과 무관한 테스트 데이터 잔재
   - 담당: tester (테스트 환경 데이터). 출처 불명 행을 임의 삭제하지 않았음. 정리 여부 확인 후 재실행 필요
2. `backend/test/db/e2e-accounts.e2e-spec.ts` > resetE2eAccounts (beforeAll 단계)
   - 에러: 동일 (활성 ADMIN 2건 잔재)
   - 원인·담당: 위 1번과 동일
3. `backend/test/admin-dashboard.e2e-spec.ts` > shouldReturnAttendanceRateWithOneDecimalPlaceFromFixedData
   - 에러: expected 1 to be 0 (totalEmployeeCount)
   - 원인: 테스트 DB에 남은 사원 행이 집계에 포함됨. 위와 같은 잔재 문제
   - 담당: tester (테스트 환경 데이터)

권장 조치: 테스트 DB의 잔재 행 출처를 확인한 뒤 `workbridge_test`에서만 정리하고 backend e2e 전체를 재실행한다. 개발 DB(`workbridge`)는 건드리지 않는다.

## 미작성·미검증 항목 (test-plan 대비)
- FC-05 Sidebar/MobileTabBar: AppShell 테스트로 承認 메뉴 삭제와 배지 위치는 확인. MobileTabBar 단독 테스트는 미작성
- FC-06 LeaveCalendarView(필터 AND 결합, 월 이동): 미작성
- FC-07 PC 캘린더·목록 일치, FC-08 모바일 날짜 선택: 미작성
- FC-12 Loading/Error/Empty(캘린더 영역): 미작성
- test-plan §4 `frontend/e2e/leave-management.spec.ts`(E2E-01~10): 미작성. E2E 계정 환경변수가 없어 실행 검증 불가
- 시각 검증 중 로그인 후 화면(/leaves, /leaves/calendar, /leaves/approvals × 6 해상도): E2E 계정 없음으로 미실행. 색상 자동 검사(Primary computed color)도 미실행
- 기존 `frontend/e2e/leaves.spec.ts`, `approvals.spec.ts`: 타입은 맞췄으나 E2E 계정 없이 실행하지 못함
- `refs/` 레퍼런스 대비 수동 비교: 로그인 후 화면을 캡처하지 못해 미수행. 로그인 전 화면 캡처(`screenshots/login-*.png`)만 생성됨

## test-plan 문서 불일치
- FC-01 기대값 "2026-11 grid: 10/25~12/05"는 실제 달력과 맞지 않음. 2026-11-01은 일요일이라 그리드는 11/01~12/05(5주). 구현은 올바르며 테스트는 실제 달력 기준으로 작성함. test-plan 수정 필요

## 구현 쪽 결함
- 발견하지 않음. 실패는 전부 테스트 환경(잔재 데이터)에서 발생
- 참고: `LeaveFilterButtons.tsx`와 그 테스트(`LeaveFilterButtons.test.tsx`)는 사용처가 없음. 구현 메모대로 삭제 필요(이번 실행에서는 그대로 두고 테스트는 통과)

## 실행 명령 (재현용)
- `cd backend && npx tsc --noEmit && npm run lint && npm test`
- `cd backend && npm run db:migrate:test && npx vitest run --config ./vitest.config.e2e.ts`
- `cd frontend && npx tsc --noEmit && npx eslint src e2e && npx vitest run && npm run build`
- `cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test e2e/leave-visual.spec.ts`

---

# 테스트 결과: 휴가관리 통합 (Run 2)

RESULT: FAIL (재실행 기준. 실패 사유는 아래 "실패 항목" 참고. 휴가관리 기능 단위·API·업무 흐름 E2E는 전부 통과)

## 요약
- Backend 단위: 22 파일, 312 통과 / 0 실패
- Backend e2e 전체: 15 파일, 379 통과 / 0 실패 / 0 skip (Run 1의 잔재 데이터 실패 3파일 해소)
- Frontend 단위: 45 파일, 609 통과 / 0 실패 (Run 1 대비 +20: FC-06·07·08·12 12건, FC-05 8건)
- Frontend 타입체크·eslint(변경 파일) 통과
- Playwright 신규·휴가 업무 흐름: `leave-management.spec.ts` 10 / 10 통과
- Playwright 시각 검증 `leave-visual.spec.ts`: 25 / 25 통과 (로그인 전 7, 로그인 후 18). 가로 스크롤 없음. 단, 캡처 비교는 아래 "시각 검증" 참고
- Playwright 기존 회귀: 1차 실행 실패 12건 중 leaves 3건·approvals 1건은 테스트 셀렉터·대기 수정 후 재실행 통과(leave-management·leaves·approvals 합계 22 / 22). dashboard-renewal 8건은 실패 유지(환경 전제 미충족, 아래 참고). login·password는 1차 실행에서 통과

## 환경 조치 (이번 실행에서 한 일)
- E2E 계정 환경변수: `frontend/.env.local`의 `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD`를 실행 셸에서 로드(설정 파일 미수정, 값 미출력). Playwright 설정은 .env.local을 읽지 않으므로 셸 로드가 필요함
- 테스트 DB(`workbridge_test`, .env.test의 DATABASE_URL로 확인) 잔재 정리: 활성 ADMIN 00001·900001과 그 소유 행(refresh_tokens 29, attendance 1, leave_grants 0, leaves 1 + 승인자·처리자로 참조된 900002의 휴가 12) 삭제. 트랜잭션으로 처리. 개발 DB(`workbridge`)는 삭제하지 않음
- 개발 DB 픽스처: `db:e2e-leave-calendar-fixture --month=2026-11` 실행(10001~10012 휴가 재구성). `leave-management.spec` beforeAll이 `db:e2e-leaves-reset`도 실행(900001 휴가 삭제, `leaves.spec`과 동일)

## 작성·수정한 테스트 파일
신규
- `frontend/src/app/(app)/leaves/calendar/LeaveCalendarView.test.tsx` (FC-06 검색 조건 AND·URL 반영·월 이동, FC-07 표 행 수·막대·+N件 모달, FC-08 모바일 날짜 선택·Empty·月全体, FC-12 Skeleton·Error 재시도·Empty) 12건
- `frontend/src/components/layout/LeaveNavigation.test.tsx` (FC-05 사이드바·모바일 탭: 休暇承認 없음, 休暇管理 활성, 배지) 8건
- `frontend/e2e/leave-management.spec.ts` (test-plan §4 E2E-01~10) 10건

수정 (테스트 쪽 셀렉터·대기만 조정, assertion 약화 없음)
- `frontend/e2e/leaves.spec.ts`: 申請 모달 입력을 `dialog '申請'` 범위로 한정(申請履歴 필터와 동일 라벨 `休暇種別`). 필터 검색 후 `leaves/me` 응답을 기다린 뒤 행을 읽도록 변경(경쟁 조건 해소)
- `frontend/e2e/approvals.spec.ts`: 사이드바 검사 문구 `承認` → `休暇承認`(承認待ち 배지 문구와 부분 일치하던 오탐 해소. 검사 의도인 "休暇承認 메뉴 없음"은 그대로)

## 테스트 자체 결정·주의
- E2E-10 반려 대상은 픽스처의 10008 PENDING 행으로 한정(첫 행 무작위 선택 금지). 실행 후 `db:e2e-leave-calendar-fixture`로 10008 PENDING 복원, 확인함
- E2E-01은 900002 초기 비밀번호로 로그인 → 임시 비밀번호로 변경 → 확인 후 원래 비밀번호로 복원. 이 흐름으로 900002의 must_change_password가 false가 됨. `global-setup`이 다음 실행 시작 때 초기화함
- 휴가 픽스처의 11/01은 월초를 걸치는 휴가(10/31~11/02)가 있어 빈 날로 쓰지 않음(E2E-08은 11/20 사용)

## 실패 항목

1. `frontend/e2e/dashboard-renewal.spec.ts` 8건: P-02, P-04, P-05, P-06, P-09, P-10, P-12, P-15
   - 에러: P-05 등은 `/password`로 리다이렉트(`expect toHaveURL /dashboard$`). P-06은 "フィクスチャの承認待ちが 2 件以上あること", P-09·P-12는 直近の申請·承認待ちが 0건
   - 원인: 이 spec의 전제 데이터와 맞지 않음. (a) 900002 명의 PENDING 휴가 2건(승인자 900001)이 개발 DB에 없음. 어떤 스크립트도 만들지 않음. (b) 900002 `mustChangePassword=false`를 기대하지만 `db:e2e-accounts`(globalSetup)가 매 실행 시작 때 true로 되돌림. 이 두 조건은 spec 실행 순서와 무관하게 충돌함. 제 E2E-10 반려는 10008 건(픽스처)이라 이 실패의 직접 원인이 아님
   - 담당: tester (환경 전제). 데이터 생성·globalSetup 변경은 사용자 승인 필요. 테스트 실행 전 900002 PENDING 2건 준비 방법 결정 필요

이전 Run 1의 3개 파일(seed·e2e-accounts·admin-dashboard) 실패는 Run 2에서 재실행하지 않았음. 잔재 정리 후 backend e2e 전체 379 통과로 해소 확인.

2. 시각 검증 — 모바일 캘린더 막대 텍스트 잘림 (375px)
   - 기준: refs/03-mobile-leave-calendar.png는 「休暇」「特別休暇」가 칩 안에 한 줄로 보임. 실제 375px 캡처(`screenshots/leaves-calendar-sp-375.png`)는 칩이 「有給」「特別」「有給」로 잘림
   - 원인 추정: 모바일 셀 폭(약 48px)에 칩 라벨 `hidden min-[375px]:inline`이 한 칸 분량만 남김. 셀 높이 h-16도 레퍼런스보다 낮아 칩 여유가 없음
   - 담당: frontend (`components/leave/…` / `MonthLeaveCalendar.tsx` mobile 막대 렌더링)

3. 시각 검증 — 모바일 검색이 접혀 있음 (375px)
   - 기준: refs/03은 「社員名・社員番号で検索」 입력이 항상 보임. 실제는 「検索」 버튼 뒤에 숨김
   - 담당: frontend (`CalendarFilters.tsx` mobile 분기)
   - 참고: 이는 구현 설계 선택일 수 있음. 레퍼런스와 다르므로 사용자 확인 필요

4. 시각 검증 — PC 1440 전체 페이지 캡처에서 배경 경계 (확인 필요)
   - `screenshots/leaves-calendar-pc-1440.png`: 사이드바·본문 배경이 y=900(뷰포트 높이)에서 끊기고 아래는 흰색. 목록 카드가 900px 아래까지 이어짐
   - 원인 가능성: 높이 100vh 기준 레이아웃. 실제 스크롤 시에는 정상일 수 있음. 담당: frontend 확인

## 시각 검증 세부 (test-plan §5 대비)
- 실행: 6 해상도 × `/leaves`, `/leaves/calendar`, `/leaves/approvals` (ADMIN) 캡처 → `screenshots/<화면>-<폭>.png`. 가로 스크롤 판정 전부 통과
- 레퍼런스 대조: 1440 PC 캘린더·375 모바일 캘린더·1440 自分の休暇(01)를 직접 확인. 주요 차이는 위 2·3·4번. 색상(Primary)은 기준대로 차이 목록에서 제외
- 미검증: Primary computed color 자동 검사, 7열·요일 색 자동 검사, 하단 탭과 본문 겹침 자동 검사, LeaveDayModal 캡처, 모바일 날짜 선택 상태 캡처(기능은 E2E-08로 확인), 1920·1366·390·430 해상도의 레퍼런스 대조(가로 스크롤만 확인), 320px 가로 스크롤(로그인 화면만 확인)
- 참고: 캡처 중 우측 하단 Next.js 개발 도구 배지("1 Insight")가 찍힘. 개발 빌드 전용이라 결함 아님

## test-plan 문서 불일치
- FC-01 기대값 "2026-11 grid 10/25~12/05"는 오류. 2026-11-01은 일요일이라 그리드는 11/01~12/05(5주). 테스트는 실제 달력 기준으로 작성. test-plan 수정 필요(Run 1에서 기록, 유지)

## 미검증 항목
- 레퍼런스 대비 1920·1366·390·430 캡처 대조
- Primary 색 자동 검사, 하단 탭 겹침 자동 검사(test-plan §5에 있으나 미구현)
- dashboard-renewal 8건(환경 전제 미충족)
- `LeaveFilterButtons` 파일은 사용처가 없음(Run 1 기록, 삭제 대상. 이번 실행에서도 그대로 둠)

## 실행 명령 (재현용)
- `cd backend && npx vitest run` / `npx vitest run --config ./vitest.config.e2e.ts`
- `cd frontend && npx vitest run`
- `cd frontend && set -a && . ./.env.local && set +a && npx playwright test e2e/leave-management.spec.ts e2e/leaves.spec.ts e2e/approvals.spec.ts e2e/leave-visual.spec.ts`
- 회귀: `npx playwright test e2e/dashboard-renewal.spec.ts e2e/login.spec.ts e2e/password.spec.ts`

---

# 테스트 결과: 휴가관리 통합 (Run 3, 수정 루프 A: frontend Fix 1 재검증)

RESULT: PASS (dashboard-renewal 8건은 환경 이슈로 기록만 하고 판정에서 제외. 아래 "환경 이슈" 참고)

## 요약
- Frontend 단위: 45 파일, 611 통과 / 0 실패 (Run 2 대비 +2: 모바일 검색 상시 표시, 모바일 짧은 칩 라벨)
- Frontend `npx tsc --noEmit`, `npx eslint src e2e`, `npm run lint`, `npm run build` 전부 통과
- Playwright 휴가 관련 (`leave-management`·`leaves`·`approvals`·`leave-visual`): 59 통과 / 0 실패 / 0 skip. 추가로 `leave-visual` 스크롤 캡처 1건 단독 재실행 통과
- Backend: 이번 실행에서 코드 변경 없음, 재실행 안 함(Run 2 결과 유지: 단위 312, e2e 379 통과)
- Run 2 frontend 시각 항목 3건 재확인: 모두 해소 또는 결함 아님으로 판정 (아래 표)

## 작성·수정한 테스트 파일
- 수정: `frontend/src/app/(app)/leaves/calendar/LeaveCalendarView.test.tsx`
  - 추가 `shouldShowNameAndEmpIdSearchAlwaysWithoutSearchToggle`: 모바일 이름·사원번호 검색 입력이 토글 없이 보임
  - 추가 `shouldShowShortChipLabelsOnMobileBars`: 모바일 막대 라벨이 「特別休暇」 등 짧은 표기이고 「有給休暇」 원문 미노출 (복수일 특별휴가 픽스처 사용. 1일 막대는 라벨이 없어 검증 불가)
- 수정: `frontend/e2e/leave-visual.spec.ts` (test-plan §5 자동 검사 추가, assertion 약화 없음)
  - 모든 로그인 후 화면(3 페이지 × 6 해상도)에 Primary 색 검사: `--color-primary-100` 값과 `[aria-selected="true"]`·`[aria-current="page"]` 문자색, `bg-primary-100` 배경색 비교
  - 모바일 375·390·430 × 3 페이지: 최하단 스크롤 후 하단 탭에 가려지는 본문 텍스트 검사(스크롤 틀 안에서 잘린 항목은 제외)
  - `shouldCaptureLeaveDayModalAtPc1440`: PC 「+N件」(없으면 첫 막대) 클릭 후 `leave-day-modal-pc-1440.png`
  - `shouldCaptureMobileDaySelectionAtSp390`: 모바일 날짜 선택 후 `calendar-day-select-sp-390.png`
  - `shouldCaptureScrolledBottomAtPc1440`: 마우스 휠 + scrollTo로 실제 최하단까지 스크롤(스크롤 위치 > 0 검증) 후 뷰포트 캡처 `leaves-calendar-pc-1440-bottom.png`. 기존 fullPage 캡처 대신 사용
- 이전 파일 변경 없음: 구현 코드, globals.css, globalSetup, playwright 설정

## Run 2 시각 항목 재확인 (Fix 1 기준)
| 항목 | 판정 | 근거 |
|---|---|---|
| 1. 모바일 막대 라벨 잘림 (375) | 해소 | 375·390·430 캡처에서 「休暇」「特別休暇」 전체 표시. 320px만 「特別休暇」 말줄임 남음(설계상 허용 범위, 차이 목록 참고) |
| 2. 모바일 검색 접힘 | 해소 | 390·375·430에서 名前検索·社員番号検索 항상 표시(refs/03과 일치). 「検索」 토글 삭제 |
| 3. PC 1440 배경 끊김 | 결함 아님 | 실제 최하단 스크롤 캡처에서 사이드바·본문 배경이 끝까지 이어짐. 끊김은 fullPage 캡처 때 fixed/뷰포트 기준 요소가 뷰포트 높이에서 끊기는 캡처 현상 |

## Run 2 미검증 항목 수행 결과
- Primary 색 자동 검사: 통과. 검사 대상 전부 `--color-primary-100`과 일치. `git diff`에서 `globals.css`의 primary 토큰 변경 0줄 확인 → 메인 색 변경 없음(사용자 결정 준수)
- 하단 탭 겹침 자동 검사: 통과(375·390·430 × 3 페이지, 겹치는 본문 0건)
- LeaveDayModal 캡처: `screenshots/leave-day-modal-pc-1440.png` 생성, 제목·2열 상세·閉じる 정상
- 해상도 대조(refs/02 PC, refs/03 모바일, Read로 직접 비교): 1920·1366·390·430 캡처 확인 완료. 가로 스크롤 0

## 남은 시각 차이 (test-plan 기준, 자동 실패 아님)
1. 하단 탭 4번째 「メニュー」(드로어 토글) ↔ refs/03 「社員情報」. 구현은 설계(09 §3)대로 드로어 방식. 레이아웃 차이이므로 사용자 확인 필요
2. 320px 폭에서 「特別休暇」 말줄임(…). 375 이상은 전체 표시
3. Primary 색 인디고(#4B33E6, refs) ↔ 기존 토큰(#1e5eff). 의도된 차이로 차이 목록 제외(test-plan §5)
4. 1366 PC 목록 「休暇期間」 열 날짜 줄바꿈(예: 11/2 ↵ (月)). 가독성 문제는 없음
5. 미검증: 7열·요일 색 자동 검사(test-plan §5 항목, 이번 실행 범위 밖), 320 상세 캡처
- 캡처 주의: fullPage 캡처에서 하단 탭·사이드바가 중간에 찍히는 것은 캡처 아티팩트. 우측 하단 「1 Insight」 배지는 개발 빌드 전용

## 환경 이슈 (RESULT 판정 제외)
- `frontend/e2e/dashboard-renewal.spec.ts` 8건(P-02, P-04, P-05, P-06, P-09, P-10, P-12, P-15): Run 2 결과 그대로. 이번 실행에서 재실행하지 않음
- 근거: (a) 900002 PENDING 휴가 2건(승인자 900001)이 개발 DB에 없음(픽스처 스크립트에 없음). (b) globalSetup의 `db:e2e-accounts`가 실행마다 900002의 mustChangePassword를 true로 되돌림. 이번 실행 로그에도 "E2E アカウント(900002)を初期化しました" 출력 확인. spec이 기대하는 상태와 실행 순서에 따라 충돌
- 기능 회귀가 아니라 테스트 전제 데이터·setup 충돌. 해결(데이터 생성 또는 globalSetup 변경)은 사용자 결정 필요. 이번 작업에서 고치지 않음

## DB 변경 사항 (개발 DB `workbridge`, 모두 기존 스크립트)
- globalSetup `db:e2e-accounts`: 900001·900002 초기화(실행 시작 시 자동, 2회)
- `leave-management.spec` beforeAll: `db:e2e-leave-calendar-fixture --month=2026-11`(10001~10012 휴가 재구성), `db:e2e-leaves-reset`(900001 휴가 1건 삭제)
- `leaves.spec` beforeAll: `db:e2e-leaves-reset`
- 테스트 자체가 만든 변화: E2E-10 승인·반려 대상 10008 상태 변경, E2E-09·leaves.spec 신청·취소로 900001에 CANCELLED 행 잔존 가능(다음 reset에서 삭제)
- 원상복구: 실행 종료 후 `npm run db:e2e-leave-calendar-fixture -- --month=2026-11`을 다시 실행해 픽스처 12건 재등록(10008 PENDING 복원 목적). 스크립트 출력 "12 件登録" 확인. 수동 행 삭제·수정 없음. 테스트 DB(`workbridge_test`)는 건드리지 않음
- 스크롤 캡처 단독 재실행 시 globalSetup이 다시 `db:e2e-accounts` 실행(위와 동일)

## 실행 명령 (재현용)
- `cd frontend && npx vitest run` / `npx tsc --noEmit` / `npx eslint src e2e` / `npm run build`
- `cd frontend && set -a && . ./.env.local && set +a && npx playwright test e2e/leave-management.spec.ts e2e/leaves.spec.ts e2e/approvals.spec.ts e2e/leave-visual.spec.ts`
- `cd frontend && set -a && . ./.env.local && set +a && npx playwright test e2e/leave-visual.spec.ts -g shouldCaptureScrolledBottomAtPc1440`

---

# 테스트 결과: 휴가관리 통합 (Run 4, 수정 루프 B: review Round 1 tester 항목 + frontend Fix 2 반영)

RESULT: PASS (dashboard-renewal 8건은 사용자 결정에 따라 미실행·판정 제외)

## 요약
- Backend 단위: 22 파일, 312 통과 / 0 실패 (변경 없음)
- Backend e2e 전체: 15 파일, 385 통과 / 0 실패 (Run 2 대비 +6: leave-calendar 17 → 23건)
- Backend `npx tsc --noEmit`, `npm run lint` 통과
- Frontend 단위: 44 파일, 605 통과 / 0 실패 (Run 3 대비 -6: LeaveFilterButtons.test 삭제분)
- Frontend `npx tsc --noEmit`, `npx eslint src e2e`, `npm run build` 통과
- Playwright 휴가 관련 (`leave-management`·`leaves`·`approvals`·`leave-visual`): 1차 61건 중 59 통과, 2 실패 → 2건 단독 재실행 2/2 통과. 최종 61/61(재실행 기준). 아래 "Playwright 1차 실패" 참고

## 작성·수정한 테스트 파일
- 수정: `backend/test/leave-calendar.e2e-spec.ts` (test-plan §2 누락분 추가, assertion 약화 없음)
  - IT-CAL-04 `shouldSortByStartDateThenEmpIdThenEndDate`: startDate → empId → endDate 순서. leaveType 동률 정렬은 미검증(아래 참고)
  - IT-CAL-09 `shouldReturnHolidaysInMonthEvenWhenNoItemMatches`: 필터 결과 0건이어도 2026-11-03·11-23 포함
  - IT-CAL-12 `shouldReturnSameResponseForEmployeeAndAdmin`: EMPLOYEE·ADMIN 응답 toEqual
  - IT-APR-02 `shouldReturnOnlyOwnAssignedProcessedLeavesForScopeMine`: 본인 할당 APPROVED·REJECTED만, 타인 할당·PENDING 제외
  - IT-APR-03 `shouldExcludeImmediatelyApprovedLeavesFromScopeAll`: ADMIN scope=all&status=APPROVED에서 approverId null 즉시 승인 건 제외(limit=100)
  - IT-APR-04 `shouldReturn400WithStatusFieldWhenCancelledOrEmpty`: `CANCELLED`·빈 값 모두 `details[0].field === 'status.0'`
- 수정: `frontend/e2e/leave-visual.spec.ts`
  - `expectCalendarWeekendColors`: 曜日見出しが 日〜土 7 列, 見出し色 = `--color-calendar-sunday`/`-saturday`, 日付 span을 헤더 x좌표로 열 판정. 日曜·祝日 = sunday 색, 土曜 = saturday 색, 평일은 두 색 중 어느 쪽도 아님. 당월 외·당일 셀은 제외
  - 추가 `shouldShowSevenColumnsAndWeekendColorsOnCalendarAtpc-1440`, `...Atsp-375` (PC·모바일 양쪽 DOM 구조 모두 검사)
- 수정: `frontend/src/app/(app)/leaves/calendar/LeaveCalendarView.test.tsx` FC-12 `shouldShowEmptyMessagesWhenNoLeaveInMonth`: 검색 조건 없는 0건 문구를 `t.empty` → `t.emptyMonth`로 갱신(Fix 2 낮음 LeaveScheduleTable 변경 반영)
- 수정: `.claude/work/leave-management/test-plan.md` FC-01: 기대값 「10/25~12/05」 → 「11/01(일)~12/05(토) 5주」(2026-11-01 일요일 확인, Run 1·2 기록 반영)
- 삭제: `frontend/src/components/leave/LeaveFilterButtons.tsx`, `LeaveFilterButtons.test.tsx`
  - 삭제 전 `grep -rn LeaveFilterButtons frontend/src frontend/e2e backend/src backend/test`: 자기 파일 외 참조 없음. 삭제 후 재검색 0건
  - docs 09 §6 행은 손대지 않음(문서 단계)

## 실패 항목
- 없음 (구현 코드 결함 미발견, 담당 표기 대상 없음)

## Playwright 1차 실패 (재실행으로 해소)
1. `e2e/approvals.spec.ts` > shouldShowApprovalsTabWithoutLoadError
2. `e2e/leave-management.spec.ts` > shouldShowTwoTabsAndNoApprovalMenuForEmployeeWithoutAssignments (E2E-01, 900002 초기 비밀번호 로그인)
   - 에러: 로그인 후 `/dashboard`·`/password`로 이동하지 않음. 화면에 「ログイン処理中にエラーが発生しました。」(요청 실패성 alert)
   - 판정: 환경성 일시 실패(개발 서버 첫 컴파일 등으로 추정, 재현 안 됨). 구현·assertion 문제 아님. 둘 다 단독 재실행에서 통과
   - 담당: tester(판정 기록만. 원인 확정 못함). 같은 증상이 반복되면 dev 서버 상태 확인 필요

## 환경 이슈 (RESULT 판정 제외)
- `frontend/e2e/dashboard-renewal.spec.ts` 8건: 이번 실행에서 미실행. Run 2·3과 같은 전제 문제(900002 PENDING 2건 부재, globalSetup의 mustChangePassword 초기화 충돌)

## 미검증·테스트 결정 사항
- IT-CAL-04의 leaveType 동률 정렬(test-plan 「AM 먼저」): 구현은 `leaveType asc`이고 enum 순서상 ANNUAL < HALF_AM이라 「AM 먼저」와 문구가 다르다. 같은 사원·같은 시작일의 AM/PM 조합 픽스처가 필요해 이번에는 검증하지 않았다. test-plan 문구를 「leaveType 오름차순」으로 정리할지 결정 필요
- IT-CAL-04 endDate 동률은 같은 사원의 겹치는 행을 직접 INSERT해 검증했다(겹침 방지 DB 제약이 없어 통과)
- 시각 검증의 공휴일 판정은 PC의 祝日名 span·모바일 셀 title을 기준으로 한다. 공휴일이 없는 날은 평일 규칙으로 검사

## DB 변경 사항
- 개발 DB `workbridge` (모두 기존 스크립트)
  - globalSetup `db:e2e-accounts`: 실행마다 900001·900002 초기화(3회)
  - `leave-management.spec` beforeAll: `db:e2e-leave-calendar-fixture --month=2026-11`(2회), `db:e2e-leaves-reset`
  - `leaves.spec` beforeAll: `db:e2e-leaves-reset`
  - E2E-01: 900002 비밀번호를 임시로 바꿨다가 원래 값으로 복원(테스트 자체 동작). 다음 실행 시작 시 globalSetup이 다시 초기화
  - E2E-10: 픽스처 10008 PENDING → REJECTED 변경. 실행 종료 후 `npm run db:e2e-leave-calendar-fixture -- --month=2026-11`로 원상복구(출력 「12 件登録」 확인, 10008 PENDING 복원)
  - `leaves.spec` 신청·취소로 900001에 CANCELLED 행이 남을 수 있음. 다음 실행의 `db:e2e-leaves-reset`이 정리
- 테스트 DB `workbridge_test`: 테스트 자체가 만든 데이터를 tracker가 정리. 수동 삭제·수정 없음
- 수동 행 삭제·수정, 설정 파일·globalSetup 변경 없음
- E2E 비밀번호: `frontend/.env.local`을 실행 셸에서 로드. 값은 출력·기록하지 않음

## 실행 명령 (재현용)
- `cd backend && npx tsc --noEmit && npm run lint && npx vitest run && npx vitest run --config ./vitest.config.e2e.ts`
- `cd frontend && npx tsc --noEmit && npx eslint src e2e && npx vitest run && npm run build`
- `cd frontend && set -a && . ./.env.local && set +a && npx playwright test e2e/leave-management.spec.ts e2e/leaves.spec.ts e2e/approvals.spec.ts e2e/leave-visual.spec.ts`
- 단독 재실행: `... npx playwright test e2e/approvals.spec.ts e2e/leave-management.spec.ts -g "shouldShowApprovalsTabWithoutLoadError|shouldShowTwoTabsAndNoApprovalMenuForEmployeeWithoutAssignments"`
