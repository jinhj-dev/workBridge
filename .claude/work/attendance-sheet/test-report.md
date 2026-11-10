RESULT: PASS

# test-report: 出勤簿 (API-ATT-007, SCR-003)

## Run 1 (2026-11-10)

### 작성·보강한 테스트 파일
- 신규(구현 단계에서 작성, 테스트 단계에서 검토): `backend/src/modules/attendance/attendance-sheet-rules.spec.ts`, `backend/src/common/time/japanese-holiday.spec.ts`, `backend/test/attendance-monthly.e2e-spec.ts`, `frontend/src/app/(app)/attendance/AttendanceSheetView.test.tsx`, `CurrentDateTimeCard.test.tsx`, `frontend/src/components/attendance/WorkTimeline.test.tsx`, `frontend/src/lib/attendance-sheet.test.ts`
- 테스트 단계에서 추가(test-plan 누락 행): `attendance-sheet-rules.spec.ts` 4건(9:00~15:00 휴게 0, 9:00~16:00 휴게 45·実働 375, 18:00~翌02:00 深夜 218·휴게 21:37~22:22, 04:00~13:00 深夜 60), `japanese-holiday.spec.ts` 1건(2026-06 빈 Map)

### 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| Backend unit (전체) | `npx vitest run` | 281 / 281 통과 (20 파일) |
| Backend unit (출근부 대상) | `npx vitest run japanese-holiday.spec.ts attendance-sheet-rules.spec.ts` | 40 / 40 통과 (추가 5건 포함) |
| Backend e2e (전체) | `npm run test:e2e` | 375 / 375 통과 (14 파일, 신규 attendance-monthly 14건 포함) |
| Frontend vitest (전체) | `npx vitest run` | 423 / 423 통과 (29 파일) |

### 실패 항목
없음.

### 실행 불가·미실행 항목
- **Playwright e2e (`frontend/e2e/attendance.spec.ts`)**: 미실행. 이유: `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD` 환경변수가 설정되어 있지 않음(spec의 beforeAll이 비밀번호 필수로 검사). 또한 이 spec은 개발 DB의 E2E 관리자 근태를 삭제(`db:e2e-attendance-reset`)하므로 자격 증명 확인 없이 실행하지 않음. `attendance-status.spec.ts`는 삭제되어 대상 아님.
- **화면 확인(데스크톱·375px)**: 미실행. 이유: 출근부(`/attendance`)는 로그인 후에만 열리며 테스트 계정 비밀번호가 없어 로그인 불가. 개발 서버(:3000)는 응답 중이나 화면 스크린샷 검증은 자격 증명 확보 후 재실행 필요.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`: 이번 테스트 단계에서 미실행(구현 단계 backend.md·frontend.md에 통과 기록 있음). 테스트 파일 추가 후 재확인 필요 시 별도 실행.

### 검토 메모 (미검증·주의)
- 작업 폴더 기준 브랜치는 `feature/attendance-sheet`여야 하나, 현재 워킹트리 브랜치는 `main`(origin/main보다 1 behind). 브랜치는 변경하지 않음. 커밋 없음.
- `frontend/src/app/(app)/attendance/AttendanceSheetView.test.tsx`의 일부 항목(計算値 라벨, 休日労働時間 라벨, 所定労働時間 미표시, 申請 배지→LeaveDetailModal)은 문구를 메시지 키로 참조하므로 test-plan 항목과의 1:1 대응은 테스트 이름 기준으로만 확인함.
- 사이드바 `出勤簿` 메뉴는 `AppShell.test.tsx`의 기존 링크 검증 범위 안에서만 간접 확인.
- 공휴일 라이브러리 수록 범위(1970~2050) 밖 월의 빈 결과는 `japanese-holiday.spec.ts` 2100년 케이스로 확인.

### 담당 요약
실패 없음. 담당 배정 대상 없음.

## Run 2 (2026-11-10)

### 작성·보강한 테스트 파일 (Run 2 추가분)
- `backend/src/modules/attendance/attendance-sheet-rules.spec.ts`: 법정 휴게 경계 380·480·535·1440, 공휴일 근무(実働 510 → overtime 0, holidayWork 510), 평일 공휴일 제외 scheduledWorkDays(전체 3 / 입사 11/5 기준 2), 평일 공휴일을 포함한 APPROVED 年休 3일, 토요일 공휴일의 leaves 빈 배열
- `backend/src/common/time/japanese-holiday.spec.ts`: 수록 범위 다음 해(2051) 빈 Map
- `backend/test/attendance-monthly.e2e-spec.ts`: 2026-02(28일)·2028-02(29일) 일수, mustChangePassword 403 `PASSWORD_CHANGE_REQUIRED`, 전월 말일 23:00 출근→11/1 02:00 퇴근(10/31 행에만 존재, 180분·휴게 0·深夜 180), 월 경계 휴가(10/30~11/2: 10월은 10/30, 11월은 11/2만), CANCELLED 제외, 조회 전후 attendance·leave 행 전체(updated_at 포함) 불변, API-ATT-004 history `workMinutes`=拘束(180), API-LEAVE balance 회귀(approvedDays 4·pendingDays 0.5), API-DASH-002 회귀(11/3 count ≥ 1)
- `frontend/src/app/(app)/attendance/AttendanceSheetView.test.tsx`: 승인 반차 행 흰색+배지만, 퇴근 누락 행 강조+툴팁(hover), 공휴일+수정 備考 `文化の日・管理者修正`, 공휴일+승인 年休 勤務パターン=휴가 종류명, API가 WEEKDAY로 주면 11/3도 회색 아님, 행 수=days 길이(30), 자정 넘김 퇴근 `2026/11/05 02:00`, 요약 `休日労働時間(土日・祝日)` 및 「祝日は考慮していません」 없음, 월 전환 중 요약 흐림(`aria-busy`·`opacity-60`)과 이전 값 유지, 표시 중 자정 경과 후 今日 강조 이동(60초 갱신, 실제 interval은 fake timers로 제어)
- `frontend/src/app/(app)/attendance/CurrentDateTimeCard.test.tsx`: unmount 시 타이머 정리(`vi.getTimerCount()` 0)
- `frontend/src/components/attendance/WorkTimeline.test.tsx`: 9:00~18:00 + 휴게 13:00~14:00 세그먼트 %(work 37.5/16.67, break 54.17/4.17, work 58.33/16.67), 세그먼트·마커 없을 때 눈금 13개만
- `frontend/src/lib/attendance-sheet.test.ts`: TZ(UTC, Asia/Tokyo, America/Los_Angeles)를 바꿔도 같은 표시 결과

### 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| Backend unit (전체) | `npx vitest run` | 290 / 290 통과 (20 파일) |
| Backend e2e (전체) | `npm run test:e2e` | 385 / 385 통과 (14 파일, attendance-monthly 24건 포함) |
| Frontend vitest (전체) | `npx vitest run` | 437 / 437 통과 (29 파일) |
| Backend 타입체크 | `npx tsc --noEmit` | 오류 없음 |
| Backend lint | `npm run lint` | 오류·경고 없음 |
| Frontend 타입체크 | `npx tsc --noEmit` | 오류 없음 |
| Frontend lint | `npm run lint` | 오류·경고 없음 |

### 실패 항목
없음.

### 실행 불가·미실행 항목
- **Playwright e2e (`frontend/e2e/attendance.spec.ts`)**: 미실행. `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD` 미설정 상태라 Run 1과 동일하게 실행하지 않음(개발 DB의 관리자 근태를 삭제하는 spec이라 자격 증명 확인 후 실행 필요).
- 화면 확인(데스크톱·375px): 미실행(로그인 자격 증명 없음).
- `npm run build`: 이번 Run에서 미실행(구현 단계 기록 있음).

### 검토 메모
- 워킹트리 브랜치 `feature/attendance-sheet` 확인 후 작업. 브랜치 전환·커밋 없음.
- Run 1 메모의 "현재 브랜치 main" 항목은 이번 Run 시작 시점에 feature/attendance-sheet로 확인되어 해소.
- review.md 중간 2건(테스트 누락)과 낮음 테스트 항목(공휴일 근무 집계, 2월 일수, 타이머 정리, TZ 독립)을 모두 추가. 2월 일수는 서비스 로직 특성상 unit이 아니라 e2e로 검증.
- Sidebar `出勤簿` 메뉴 테스트(test-plan §3)는 Run 2에서도 추가하지 않음. `AppShell.test.tsx`의 기존 링크 검증 범위에서만 간접 확인.
- 신규 테스트 파일에 `.skip`·`.only`·TODO 없음.

### 담당 요약
실패 없음. 담당 배정 대상 없음.

## Run 3 (추가 요구 1)

### 작성·보강한 테스트 파일
- 신규: `frontend/src/lib/useMediaQuery.test.ts` (5건: matches true/false, change 재렌더, unmount 시 removeEventListener, renderToString 시 null)
- 재작성: `frontend/src/app/(app)/attendance/AttendanceView.test.tsx` (기존 3건은 뷰를 mock하던 방식이라 실제 뷰를 마운트하도록 바꿈, 10건). LeaveDetailModal만 mock(AuthProvider 필요). 추가 항목: 데스크톱 API 2회(monthly·balance)·모바일 API 1회(`/attendance?`) 및 교차 호출 없음, 幅 증가·감소 전환 시 router 호출 없음, 전환 후 API 중복 없음, 서버 렌더 시 스피너만·API 미호출, 혼합 Query(`month=2026-10&status=DONE`)가 각 레이아웃에서 자기 키만 해석
- 복원 테스트(main 그대로, 코드 변경 없음): `AttendanceHistoryView.test.tsx`, `StatusFilterButtons.test.tsx`, `lib/date-range.test.ts`는 전체 스위트에 포함되어 통과. 기대값 수정 없음

### 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| Frontend vitest (전체) | `npx vitest run` | 482 / 482 통과 (33 파일) |
| Frontend 신규 대상 | `npx vitest run src/lib/useMediaQuery.test.ts` · `AttendanceView.test.tsx` | 5 + 10 = 15 / 15 통과 |
| Backend unit (전체) | `npx vitest run` | 294 / 294 통과 (20 파일) |
| Backend e2e (전체) | `npm run test:e2e` | 385 / 385 통과 (14 파일) |
| Frontend 타입체크 | `npx tsc --noEmit` | 오류 없음 |
| Frontend lint | `npm run lint` | 오류·경고 없음 |
| Backend 타입체크 | `npx tsc --noEmit` | 오류 없음 |
| Backend lint | `npm run lint` | 오류·경고 없음 |

### 실패 항목
없음. 최초 작성한 AttendanceView 테스트 7건은 LeaveDetailModal의 AuthProvider 의존으로 실패했으나 해당 모달을 mock하여 해결(테스트 측 원인, 담당 tester로 직접 수정, assertion 변경 없음).

### 실행 불가·미실행 항목
- **Playwright e2e (`attendance-status.spec.ts`, `attendance.spec.ts`)**: 미실행. `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD`가 환경에 설정되어 있지 않음(Run 1·2와 동일). 390px 뷰포트 시나리오와 360px 가로 스크롤 확인은 자격 증명 확보 후 실행 필요.
- **화면 확인(375px·768px 전후)**: 미실행. 로그인 자격 증명 없음. 개발 서버 프론트(:3000)는 응답 200.
- `npm run build`: 이번 Run에서 미실행(구현 단계 기록 있음).

### 검토 메모
- 브랜치 `feature/attendance-sheet` 확인 후 작업. 브랜치 전환·커밋 없음.
- 신규 테스트 파일에 `.skip`·`.only`·TODO 없음.
- test-plan A-2의 "matches=false → change로 true, router 변경 없음"은 幅 증가 방향으로, 반대 방향(축소)도 함께 검증.

### 담당 요약
실패 없음. 담당 배정 대상 없음.

## Run 4 (review Round 3 tester 담당 3건 수정)

### 수정한 테스트 파일
- `frontend/e2e/attendance-status.spec.ts` (review 높음 1건)
  - `openAttendance`의 `setViewportSize(1440)` 제거. 파일 상단 `test.use({ viewport: 390x844 })`가 그대로 적용된다.
  - 목록 확인을 md 미만 카드 목록(`ul.md:hidden > li`, `cardList` 헬퍼) 기준으로 변경: `expectRows`는 li 개수와 li 안의 날짜·상태 텍스트(`exact`)를 확인한다. 기존 `getByRole('table')`은 md 이상에서만 보이는 표라 이 폭에서는 접근성 트리에 없다.
  - **정정(Run 5에서 확인)**: Run 4 기재와 달리 제외 검증 7곳(`:135,136,147,148,158,159,171`)은 Run 4에서 `cardList`로 바뀌지 않고 `getByRole('table')`이 남아 있었다. 이 상태에서는 390px에서 항상 0건이 되어 빈 단언이었다. Run 5에서 `cardList(page).getByText(t.statuses.X, { exact: true })`로 수정했다. 주석 `:116`도 Run 4 시점에는 `一覧(表)`였으며 Run 5에서 `一覧(カード)`로 수정했다.
  - **M7 제한을 넘은 이유**: M7은 "勤怠管理→出勤簿만 기대값 수정 허용"이다. 이 파일은 旧 화면(勤怠管理, md 미만) 전용 spec이며, 1440 override와 `getByRole('table')` 셀렉터는 분할 레이아웃 도입 후 구조적으로 통과할 수 없는 상태였다(review 높음 1건). 이 변경은 출근부 기대값이 아니라 spec의 셀렉터·뷰포트 설정을 旧 화면 구조에 맞춘 것이므로 M7 범위 밖이다. 단언의 의미(상태별 필터 결과, 기간 밖 40일 전 제외, URL 유지)는 바꾸지 않았다. 사용자 승인 필요 여부는 review에서 판단할 것.
- `frontend/e2e/attendance.spec.ts` (review 중간 1건)
  - 신규 `shouldSwitchFromSheetToHistoryLayoutWhenWidthBecomesMobile`: 1440에서 `/attendance` → 月間表(`columnheader` 勤務パターン) 표시 → 390으로 변경 → 기간 검색 폼(`検索条件`) 표시, 月間表 없음, 카드 목록에 `勤務中` 1건 → 360으로 변경 후 `scrollWidth <= clientWidth`(가로 스크롤 없음).
  - 오늘 기록 전제: 직전 테스트(출근)가 만든 오늘 `勤務中` 기록에 의존하므로 출근 테스트 바로 뒤, 퇴근 수정 테스트 앞에 배치했다. 퇴근 수정 테스트는 기존대로 finally에서 `勤務中`으로 되돌린다.
- `frontend/src/app/(app)/attendance/AttendanceView.test.tsx` (review 낮음 1건)
  - 모바일 mock(`HISTORY`)을 1건 이상(`HISTORY_ITEM`, 勤務中, 2026-11-10)의 비어 있지 않은 목록으로 변경.
  - `shouldShowHistoryOnlyWhenWidthIsLessThanMd`: `listitem` 1건 표시 확인 후, 月間表 고유 신호(`columnheader` 勤務パターン, `月間集計`, `前月` 버튼) 부재로 "출근부 없음"을 단언. 목록이 비어 있지 않으므로 旧 표의 부재가 아니라 출근부 부재를 확인한다.
  - `shouldShowHistoryOnlyWhenWidthIsLessThanMd` 외 `shouldShowSheetOnlyWhenWidthIsMdOrMore` 등은 변경 없음.
  - 같은 파일 `shouldSwitchToHistoryWithoutRouterChangeWhenWidthShrinks`의 `queryByRole('table')` 부재 단언도 같은 이유로 틀리므로 `columnheader` 勤務パターン 부재로 바꿨다. jsdom은 `hidden md:table`의 CSS를 적용하지 않아 비어 있지 않은 목록에서 표가 접근 가능하게 보인다. 이 수정은 테스트 측 근거 보강이며 기대 의미는 같다(출근부가 나오지 않음).

### 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| Frontend vitest (전체) | `npx vitest run` | 482 / 482 통과 (33 파일) |
| Frontend 타입체크 | `npx tsc --noEmit` | 오류 없음 |
| Frontend lint (e2e 포함, attendance 폴더) | `npx eslint e2e "src/app/(app)/attendance"` | 오류·경고 없음 |
| Playwright 목록 | `npx playwright test --list` | 45 tests / 9 files, 수정한 spec 전부 나열(문법·파싱 정상) |
| Prettier 검사 | `npx prettier --check` (수정 3파일) | 통과 (`--write` 후 재확인) |

### 실패 항목
없음. vitest 중 1건(`shouldSwitchToHistoryWithoutRouterChangeWhenWidthShrinks`)이 작성 직후 실패했으나 위 단언 수정 후 통과. 테스트 측 원인(담당 tester)으로 직접 고쳤고 기대 의미는 유지.

### 실행 불가·미실행 항목
- **Playwright 실행 (`attendance-status.spec.ts`, `attendance.spec.ts`)**: 미실행. `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD`가 설정되어 있지 않아 beforeAll이 실패하도록 되어 있다(Run 1~3과 동일). 목록 확인(`--list`)만 수행했고 실제 DOM 셀렉터(`ul.md:hidden > li`, `columnheader`, 360px 가로 스크롤)는 실행으로 검증되지 않았다. 자격 증명 확보 후 `npx playwright test e2e/attendance-status.spec.ts e2e/attendance.spec.ts` 실행이 필요하다.
- 화면 확인(390·360px): 미실행(자격 증명 없음).
- `npm run build`: 이번 Run에서 미실행.

### 검토 메모
- 브랜치 `feature/attendance-sheet` 확인. 브랜치 전환·커밋 없음. `docs/` 미수정.
- 수정 파일에 `.skip`·`.only`·TODO 없음. assertion 약화 없음(셀렉터·뷰포트·모바일 목록 근거만 조정).

### 담당 요약
실패 없음(vitest 기준). 담당 배정 대상 없음. Playwright 미실행은 환경 사유.

## Run 5 (review Round 4 tester 2건 수정)

RESULT: PASS (정적·단위 검증 기준. Playwright 실제 실행은 미실행, 아래 참고)

### 수정한 테스트 파일
- `frontend/e2e/attendance-status.spec.ts`
  - (중간) 제외 검증 7곳(`:135,136,147,148,158,159,171`)의 `page.getByRole('table').getByText(t.statuses.X)`를 `cardList(page).getByText(t.statuses.X, { exact: true })`로 변경. 390px에서 표가 접근성 트리에 없어 기존 단언은 항상 0건이 되는 빈 단언이었다.
  - (낮음) 주석 `:116`을 `一覧(表)` → `一覧(カード)`로 수정.
  - 확인: `grep "getByRole('table')" frontend/e2e/attendance-status.spec.ts` 0건. 같은 폴더 다른 spec(`approvals.spec.ts:92`, `leaves.spec.ts:59`)의 `getByRole('table')`은 해당 화면 범위 밖이라 이번 수정 대상이 아니다.
  - assertion 강도·기대 행 목록(`WORKING_ROWS` 등)은 바꾸지 않았다. 빈 단언 방지를 위해 각 테스트는 `pressStatus` 후 `expectRows`로 카드 개수를 먼저 확인한다.
  - prettier `--write` 적용(긴 줄 래핑).

### 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| Frontend 타입체크 | `npx tsc --noEmit` | 종료 코드 0, 오류 없음 |
| Frontend lint (e2e 대상) | `npx eslint e2e/attendance-status.spec.ts` | 오류·경고 없음 |
| Prettier 검사 | `npx prettier --check e2e/attendance-status.spec.ts` | 통과 |
| Playwright 목록 | `npx playwright test --list e2e/attendance-status.spec.ts` | 6 tests / 1 file, 나열 정상 |
| Frontend vitest (전체) | `npx vitest run` | 482 / 482 통과 (33 파일) |

### 실패 항목
없음.

### 실행 불가·미실행 항목
- **Playwright 실행 (`attendance-status.spec.ts`)**: 미실행. E2E 자격 증명(`E2E_ADMIN_PASSWORD`) 확인 명령이 권한 거부되어 환경 확인을 하지 못했고, 실행도 하지 않았다. 자격 증명 확보 후 `npx playwright test e2e/attendance-status.spec.ts` 실행이 필요하다. 변경된 셀렉터가 실제 DOM에서 매칭되는지는 이 실행으로만 검증된다.
- `npm run build`: 이번 Run 미실행.

### 검토 메모
- 브랜치 `feature/attendance-sheet` 확인 후 작업. 브랜치 전환·커밋·push 없음. `docs/`·구현 코드 미수정.
- `.skip`·`.only`·TODO 없음.

### 담당 요약
실패 없음. 담당 배정 대상 없음.
