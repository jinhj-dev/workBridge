VERDICT: APPROVE

# review: 월간 휴가 캘린더 (Round 1)

## 요약
- 백엔드: 설계(API-DASH-002/003, 최소 노출, APPROVED만·활성만·토일 제외·DISTINCT, halfDay 판정) 그대로 구현됨. raw SQL은 바인딩만 사용, `::date` 변환으로 세션 TZ 영향 없음(test-report에서 3개 TZ 검증). 계층 분리·zod Query 검증·`dateSchema` 공용화 문제 없음.
- 프론트: Card·Modal·Badge·Skeleton·SectionError·secondaryButtonClass 재사용, 하드코딩 색상·임의값 없음(Grep 확인), 문구는 ja.ts 참조. `MonthCalendar`는 `components/calendar/`에 시스템 컴포넌트 규칙대로 추가됨.
- docs/ 직접 수정 없음(git status 기준).
- 주요 지적: 360~375px 카드 제목 줄바꿈(반응형), Playwright 스펙이 저장소에 없는 데이터·계정 상태에 의존해 표준 실행에서 실패함, 문서 갱신 예정 일부 누락.

## 이슈

[중간] [담당: frontend] [분류: 디자인시스템] frontend/src/app/(app)/dashboard/LeaveCalendarSection.tsx:89-113 — 375px 스크린샷에서 제목이 「休暇カレンダ / ー」로 장음 부호만 다음 줄로 떨어진다. 09 §5-3은 360px부터 지원하므로 결함으로 본다(360px에서는 본문 폭이 약 288px이고 제목 약 112px + gap 16 + 컨트롤 약 184px라 더 심해진다). / 좁은 폭에서 월 이동 컨트롤 폭을 줄이거나(`min-w-24`는 `sm:` 이상에만 적용, gap 축소 등) 헤더를 2행으로 배치해 360px에서 제목이 한 줄을 유지하게 한다. 공용 `Card`를 고치면 다른 카드에도 영향이 가므로 범위를 확인하고, 좁은 폭 배치는 SCR-002 문서 갱신 예정에 적는다.

[중간] [담당: tester] [분류: 테스트] frontend/e2e/dashboard-leave-calendar.spec.ts:59-103 — 관리자 테스트 3건이 「이번 달 2·3번째 평일에 休暇太郎·休暇花子·休暇次郎의 승인 휴가가 있다」는 전제에 의존한다. 이 데이터는 임시 DB에 수동으로 넣은 것이라 저장소에는 없어서, 표준 `npm run test:e2e`(개발 DB)를 돌리면 실패한다. test-plan §4의 "데이터 값은 DB 상태에 의존하므로 구조만 확인"과도 맞지 않는다. / 구조만 확인하도록 바꾼다(아무 평일 칸 클릭 → 모달 제목 표시, 목록 또는 빈 상태 문구 중 하나 표시, 반차 라벨은 단위 테스트 FS-06a로 대체). 데이터 검증이 꼭 필요하면 fixture 스크립트를 따로 추가해야 하는데, 이는 범위 확장이므로 승인을 받는다.

[중간] [담당: tester] [분류: 테스트] frontend/e2e/dashboard-leave-calendar.spec.ts:121-129 — 900002는 globalSetup이 매 실행마다 `mustChangePassword = true`로 초기화하는 계정이다(password.spec.ts:7-8). 로그인하면 `/password`로 이동하므로 `toHaveURL(/\/dashboard$/)`가 실패한다. 게다가 password.spec이 같은 계정의 비밀번호를 실제로 바꾸므로 병렬 실행 시 서로 간섭한다. / EMPLOYEE 표시는 단위 테스트 FD-01이 이미 다루므로 이 테스트를 삭제하거나, 변경 불필요한 별도 사원 계정이 마련될 때까지 skip한다.

[중간] [담당: frontend] [분류: 문서갱신] .claude/work/leave-calendar/frontend.md:19-22 — plan.md의 문서 갱신 예정 중 `08_TEST_PLAN` §7(화면 테스트: FS/FC/FD 항목)과 `10_DEVELOPMENT_ROADMAP`이 backend.md와 frontend.md 어디에도 없다. / frontend.md에 08 §7 추가 항목과 10 로드맵 갱신 항목을 적는다.

[낮음] [담당: frontend] [분류: 문서불일치] frontend/src/lib/api/types.ts:99, frontend/src/app/(app)/dashboard/LeaveCalendarDayModal.tsx:37 — `departmentName: string | null`과 「—」 분기는 필요 없다. `users.department_id`는 NOT NULL(schema.prisma:89), 06 §0도 non-null로 명시하고 있고(06:59), 백엔드 응답 타입도 `string`이다. frontend.md "다른 점"의 null 가정은 근거가 없다. / `departmentName: string`으로 바꾸고 `?? messages.common.noValue`를 제거하며, frontend.md의 해당 항목도 삭제한다. 기존 `UserSummary`의 nullable 타입은 이번 범위가 아니다.

[낮음] [담당: frontend] [분류: 컨벤션] frontend/src/messages/ja.ts:103-104 — `dashboard.calendar.employeeName`, `department`가 어디에서도 쓰이지 않는다(열 헤더 없이 구현됨). / 삭제한다.

[낮음] [담당: frontend] [분류: 문서갱신] .claude/work/leave-calendar/frontend.md — context.md 공용 모듈에 `components/calendar/MonthCalendar.tsx`·`lib/calendar.ts`를 추가해야 한다는 제안이 없다(backend.md는 `dateSchema`를 제안함). / "context.md 정정" 항목에 추가한다.

[낮음] [담당: backend] [분류: 컨벤션] backend/src/modules/dashboard/leave-calendar-rules.ts:3 — Prisma `LeaveType`과 같은 union을 `LeaveTypeName`으로 따로 정의했다(설계는 `LeaveType[]`). / `import type { LeaveType } from '../../generated/prisma/client.js'`로 바꾼다.

[낮음] [담당: tester] [분류: 테스트] backend/test/dashboard-leave-calendar.e2e-spec.ts:482-489 — day API의 연도 범위 밖 날짜(`1999-12-31`, `2101-01-01`)가 400이 되는지는 테스트하지 않는다(설계 에러 표에 있음). LeaveCalendarSection.test.tsx의 FS-01 "데이터 없는 날짜는 배지 없음"도 단언이 없다. / 각각 케이스 1~2개씩 추가한다.

[낮음] [담당: tester] [분류: 테스트] frontend/src/app/(app)/dashboard/DashboardView.test.tsx:273 — 간헐 실패는 기존 테스트 문제다. `Modal`은 `useEffect`에서 `dialog.close()`를 호출하므로, 268행 `waitFor`가 "勤務中" 텍스트로 끝난 직후 passive effect가 돌기 전에 273행을 동기로 단언하면 경합이 생긴다. 이번 변경으로 생긴 원인은 아니다(새 모달은 닫힌 상태라 role 조회에 걸리지 않음). 다만 섹션과 조회가 늘어 렌더 부하가 커져 경합이 더 자주 드러났을 수는 있다. / `await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())`로 바꾼다. 범위 밖이므로 별도로 처리해도 된다.

## 추가 확인 요청에 대한 판단
1. 부서 「—」 표시: 필요 없는 분기다. 위 [낮음] 문서불일치 항목 참고.
2. 375px 카드 제목 줄바꿈: 디자인 시스템(09 §5-3, 360px 지원) 기준 문제로 본다([중간]). 장음 부호만 떨어지는 줄바꿈이고 360px에서는 더 좁아진다. 우하단 "1 Insight" 배지는 Next.js dev 전용 표시라 결함이 아니다.
3. DashboardView 간헐 실패: 이번 변경이 원인이 아닌 기존 경합이다. 위 [낮음] 테스트 항목 참고.

## 확인 필요 (리뷰어가 diff를 볼 수 없음)
- git status상 수정됐지만 backend.md·frontend.md에 없는 파일: `backend/prisma/e2e-attendance-reset.ts`, `frontend/src/app/(app)/dashboard/AdminSummarySection.tsx`, `AttendanceSection.tsx`, `PendingApprovalsSection.tsx`, `page.tsx`. 현재 내용에는 캘린더 관련 변경이 보이지 않는다. 오케스트레이터가 `git diff`로 줄바꿈·포맷 변경뿐인지, 이번 작업 이전의 변경인지 확인할 것. 이번 작업에서 생긴 실질 변경이라면 승인 범위를 벗어난 것이므로 [높음]으로 다룬다.

## 담당별 이슈 수
- backend: 낮음 1
- frontend: 중간 2, 낮음 3
- tester: 중간 2, 낮음 2

---

# Round 2

대상: backend.md Fix 1, frontend.md Fix 1·Fix 2, test-report.md Run 2·Run 3, `screenshots/card-impact/`, `screenshots/calendar-mobile-360.png`.

## Round 1 지적 처리 결과
| Round 1 이슈 | 결과 |
|---|---|
| [중간] frontend 360~375px 제목 줄바꿈 | 해결. 공용 Card 헤더를 `flex-wrap gap-x-4 gap-y-2`로 바꿈. 360px 스크린샷에서 제목 1행, 월 이동 컨트롤 2행째. Playwright에서 360·375 줄 수 1 단언 통과(Run 3) |
| [중간] tester E2E 데이터 의존 | 해결. 오늘 칸 기준 구조만 확인하고(모달 제목, 목록 또는 빈 문구 `.or()`), 반차 라벨은 FS-06a로 대체 |
| [중간] tester 900002 테스트 | 해결. 삭제하고 FD-01로 대체. `E2E_INITIAL_USER` import도 정리됨 |
| [중간] frontend 문서 갱신 예정 누락(08 §7, 10) | 해결. frontend.md Fix 1 "추가분"에 적힘 |
| [낮음] departmentName non-null | 해결. `types.ts:99` `string`, 모달 「—」 분기 제거 |
| [낮음] 미사용 ja.ts 키 | 해결. `employeeName`·`department` 삭제(ja.ts:95-103) |
| [낮음] context.md 공용 모듈 제안 | 해결. frontend.md 추가분에 적힘 |
| [낮음] backend `LeaveTypeName` 중복 | 해결. 생성된 Prisma `LeaveType`을 import(repository와 같은 경로) |
| [낮음] tester day API 연도 범위 400, FS-01 단언 | 해결. e2e-spec:484에 `1999-12-31`·`2101-01-01` 추가, LeaveCalendarSection.test:53에 11/09 칸 「名」 없음 단언 추가 |
| [낮음] DashboardView 모달 닫힘 경합 | 해결. 274행 `waitFor`로 변경 |
| 확인 필요: 줄바꿈만 바뀐 4개 파일 | 해결. frontend.md Fix 1에 `git checkout --`로 원복했다고 적혀 있고, 현재 git status에도 없음. `backend/prisma/e2e-attendance-reset.ts`는 이번 작업과 무관한 기존 변경으로 보고 대상에서 뺌(오케스트레이터 판단 사항) |

## 공용 Card 변경의 타당성
- 판단: 타당하다. 승인 범위를 벗어난 [높음]으로 보지 않는다.
  - Round 1에서 "공용 Card를 고치려면 범위를 확인하라"는 조건을 달았고, Run 3에서 그 조건을 충족했다. `action`을 넘기는 곳은 3곳(LeaveBalanceSection, LeaveCalendarSection, PendingApprovalsSection)뿐임을 Grep으로 다시 확인했다. 6화면 × 1280·360 before/after 12쌍 중 11쌍이 바이트 단위로 같고, 다른 1쌍(대시보드 360)도 캘린더 헤더만 바뀌었다(休暇状況·承認待ち 카드는 metrics 동일).
  - 09 §6 Card 행(09:191)은 "제목 + 우측 action"만 정의하고 좁은 폭 동작은 정하지 않았다. 넘치지 않으면 렌더가 그대로이므로 기존 규칙과 충돌하지 않는다. 오히려 제목이 장음 부호 하나만 떨어지는 문제를 섹션별 폭 계산 없이 막는 일반 해법이라서, 화면마다 따로 대응하는 것보다 시스템 컴포넌트 규칙에 맞다. 토큰 밖의 값(임의 px·색상)도 쓰지 않았다(`gap-x-4 gap-y-2`, `min-h-7`).
  - 줄바꿈되면 `justify-between` 때문에 action이 2행 왼쪽에 붙는다. 360px 스크린샷에서 확인했고, 제목과 왼쪽이 맞아 어색하지 않다.
  - 다만 plan.md·design-frontend.md는 Card를 "재사용"으로만 적었다. 공용 컴포넌트 동작이 바뀌었으므로 최종 보고에서 사용자에게 알려야 한다(오케스트레이터 몫). 09 Card 행 갱신은 frontend.md Fix 2 "문서 갱신 예정"에 들어 있다.
- `LeaveCalendarSection`에 남아 있는 Fix 1 조정(`gap-1 sm:gap-2`, `sm:min-w-24`, `whitespace-nowrap`)은 이제 꼭 필요하지는 않지만, 375px에서 한 줄을 유지하게 해 주므로 그대로 두어도 된다.

## 이슈 (Round 2)

[낮음] [담당: frontend] [분류: 컨벤션] frontend/src/components/Card.tsx:16 — 주석 「見出しは縮めず1行を保つ」는 과장이다. 제목 자체가 컨테이너보다 길면 여전히 줄바꿈된다. / 「action が収まらない場合は次の行へ折り返す(見出しの幅を action に譲らない)」처럼 실제 동작대로 고친다.

[낮음] [담당: tester] [분류: 테스트] frontend/e2e/dashboard-leave-calendar.spec.ts:8 — 주석의 「反車ラベル」는 「半休ラベル」의 오타다. backend/test/dashboard-leave-calendar.e2e-spec.ts:483의 「連年範囲」도 「年の範囲」로 보인다. / 오타를 고친다.

## 담당별 이슈 수 (Round 2)
- backend: 0
- frontend: 낮음 1
- tester: 낮음 1
