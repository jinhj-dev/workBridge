# frontend 구현 결과: SCR-002 §3-6 休暇カレンダー

## 생성·수정 파일 (frontend/src 기준)
- 신규 `components/calendar/MonthCalendar.tsx` (+ `.test.tsx`), `lib/calendar.ts` (+ `.test.ts`)
- 신규 `app/(app)/dashboard/LeaveCalendarSection.tsx` (+ `.test.tsx`), `LeaveCalendarDayModal.tsx`
- 수정 `DashboardView.tsx`(calendarSignal, PendingApprovals 아래 배치. onProcessed는 ADMIN 여부와 무관하게 전달), `LeaveBalanceSection.tsx`(선택 prop `onApplied`), `DashboardView.test.tsx`(캘린더 API 기본 응답 추가, ADMIN·EMPLOYEE 표시 테스트, 승인대기 표 조회를 섹션 범위로 한정)
- 수정 `lib/api/types.ts`, `messages/ja.ts`

## 구현한 화면
- SCR-002 §3-6 休暇カレンダー (ADMIN·EMPLOYEE 동일)
- 사용 시스템 컴포넌트: Card, Modal, Badge(dark/neutral), Skeleton, SkeletonLines, SectionError, `secondaryButtonClass`, `useApiQuery`
- 새 시스템 컴포넌트: `components/calendar/MonthCalendar.tsx`

## 화면 리스트와 다른 점
- `monthLabel`은 `messages.calendar`(공용, 요일과 함께)에 둠. `dashboard.calendar`에는 없음(MonthCalendar·lib/calendar가 공용으로 사용하기 위해)
- 일 상세 모달은 날짜가 있을 때만 내부 목록 컴포넌트를 만들어 열 때마다 새로 조회(같은 날을 다시 열어도 이전 결과가 잠깐 보이지 않음)

## 문서 갱신 예정
- `docs/09_DESIGN_SYSTEM.md` §6: `components/calendar/MonthCalendar.tsx` 행 추가 — `MonthCalendar({month,today,onSelectDate,renderDay?,getDayDescription?})`, 일요일 시작 table, 날짜 칸 전체가 button(과거도 클릭 가능, 배경 general-30·숫자 general-60), 오늘 `primary-100` 원형 숫자+링+`aria-current="date"`, 일 `danger-100`/토 `primary-100`, 높이 `md` 이상 96/미만 56, table `aria-label`=`2026年11月`, 월 이동 UI는 사용처 책임. 유틸 `lib/calendar.ts`(`shiftMonth`, `buildMonthWeeks`, `formatMonthLabel`, UTC 연산만)
- SCR-002 명세 / 03 Screen List: design-frontend.md 마지막 절의 항목 그대로(§2·§3-6·§4·§5·§6·§7·§8, 03 기능 칸). 좁은 폭: 칸 높이 56, 배지 그대로, 모달 목록은 2줄
- 문구: `messages.calendar`, `messages.dashboard.calendar` 추가

## impeccable 점검
- 디자인 훅 검출 없음. 과거일 숫자·내용 흐림은 클릭 가능 유지, 키보드 focus는 outline offset 음수로 칸 안에 표시. 모달 목록은 `max-h-80` 스크롤(Modal에 스크롤 기능 없어 목록에 부여)

## 검증
- `npx tsc --noEmit`, eslint, prettier OK. vitest 전체 27파일 408건 통과(신규: calendar 유틸, MonthCalendar, Section 6건, DashboardView 2건)
- 테스트에서 `next/navigation` mock은 `useRouter`가 같은 참조를 반환해야 함(useApiQuery effect 의존성 때문에 새 객체면 재조회 루프)

## 화면 확인: 생략
- 백엔드 raw SQL이 DB 실행 미검증이고 개발 DB 쓰기 금지 지시가 있어 브라우저 확인은 하지 않음. 모바일 375px 레이아웃은 미확인(table-fixed, 칸 56px 설계만)

## 기타
- 임시 처리 없음. backend.md 보완 필요 없음

## Fix 1 (review Round 1, frontend 담당)
- 수정: `LeaveCalendarSection.tsx` 헤더 — 월 이동 컨트롤 `gap-1 sm:gap-2`, 월 라벨 `sm:min-w-24`(sm 미만은 내용 폭) + `whitespace-nowrap`. 공용 Card는 수정하지 않음(영향 범위 없음). 계산상 360px 컨트롤 폭 약 150px로 제목(약 112px)+gap 16 포함 본문 약 288px에 수납
- 수정: `types.ts` `LeaveCalendarMember.departmentName: string`, `LeaveCalendarDayModal.tsx`의 「—」 분기 제거. 위 "다른 점"의 null 가정 항목 삭제
- 수정: `ja.ts` `dashboard.calendar.employeeName`/`department` 삭제
- 되돌림: `git checkout --`로 AdminSummarySection, AttendanceSection, PendingApprovalsSection, page.tsx 원복(git status에서 사라짐). `backend/prisma/e2e-attendance-reset.ts`는 건드리지 않음
- 검증: tsc, eslint, prettier OK. vitest(src/app, components, lib) 27파일 412건 통과
- 화면 확인: 생략 (도구 없음). tester가 375px/360px 스크린샷을 다시 찍어 제목 「休暇カレンダー」 한 줄 유지 확인 필요(개발 DB 쓰기 금지)

### 문서 갱신 예정 (추가분)
- `docs/08_TEST_PLAN.md` §7 화면 테스트: SCR-002 休暇カレンダー 항목 추가(FS: 월 표시·월 이동·배지·일 클릭 모달·빈 상태·반차 라벨, FC: 컴포넌트 MonthCalendar·lib/calendar, FD: ADMIN·EMPLOYEE 모두 표시). ID는 test-plan.md의 FS/FC/FD 번호 그대로
- `docs/10_DEVELOPMENT_ROADMAP.md`: 월간 휴가 캘린더(API-DASH-002/003, SCR-002 §3-6) 구현 완료로 갱신(검증 후)
- `.claude/work/context.md` 공용 모듈: `frontend/src/components/calendar/MonthCalendar.tsx`, `frontend/src/lib/calendar.ts`(shiftMonth, buildMonthWeeks, formatMonthLabel) 추가
- SCR-002 명세 좁은 폭: 헤더 월 이동 컨트롤은 sm 미만에서 gap 4px·라벨 내용 폭으로 축소해 360px에서도 제목 한 줄 유지

## Fix 2 (test-report Run 2, 360px 제목 2줄)
- 원인: Fix 1의 폭 계산이 실측과 불일치. 계산 의존 방식을 폐기
- 수정: `frontend/src/components/Card.tsx` 헤더 div에 `flex-wrap` + `gap-x-4 gap-y-2`. 제목+action이 한 줄에 들어가면 기존과 동일(데스크톱 불변), 넘치면 제목을 줄이지 않고 action(월 이동 컨트롤)이 다음 줄로 내려감. 폭 계산 불필요
- 영향 범위: Card를 쓰는 다른 카드도 action이 넘칠 때만 줄바꿈(기존엔 제목이 줄어듦). 넘치지 않는 경우 렌더 동일
- `LeaveCalendarSection.tsx`는 Fix 1 그대로(변경 없음)
- 검증: tsc, eslint 오류 없음. vitest src/app, src/components 21파일 313건 통과
- 화면 확인: 생략 (도구 없음). tester가 360px/375px/데스크톱 재촬영 필요(제목 1줄, 컨트롤 2행째 표시)
- 문서 갱신 예정: 09_DESIGN_SYSTEM.md Card — 헤더는 action이 넘치면 다음 줄로 wrap(제목은 축소하지 않음). Fix 1의 "SCR-002 좁은 폭" 항목은 이 내용으로 대체
