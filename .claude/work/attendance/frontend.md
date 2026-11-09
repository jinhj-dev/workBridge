# 근태 관리 — 프론트엔드 구현 결과

## 생성·수정한 파일
신규 (`frontend/src/`)
- `app/(app)/attendance/{page,AttendanceHistoryView}.tsx`
- `app/(app)/admin/attendance/{page,AdminAttendanceView,AttendanceEditModal}.tsx`
- `components/Pagination.tsx`, `components/Tooltip.tsx`, `components/table.ts`
- `components/attendance/{attendanceStatus.ts,DateRangeFields.tsx}`
- `lib/date-range.ts`(`tokyoToday`, `defaultDateRange`, `validateDateRange`, `parseHistoryQuery`, `parseAdminQuery`, `toQueryString`), `lib/useSyncedState.ts`
수정
- `components/layout/AppShell.tsx`(관리자 가드), `components/form.tsx`(`selectClass`), `lib/format.ts`(`formatWorkDate`, `formatWorkMinutes`, `formatClockOut`, `toTokyoDateTimeInput`), `lib/api/types.ts`(`Attendance.modifiedAt`, `Department`), `messages/ja.ts`(`common.forbidden/all`, `pagination`, `dateRange`, `attendance`, `adminAttendance`)

## 구현한 화면
- SCR-003 근태 관리(`/attendance`), SCR-008 전체 근태 관리(`/admin/attendance`) + 근태 수정 모달(입력→확인 단계 전환, 중첩 dialog 없음)
- 비관리자 `/admin/*` 가드: 이동 전까지 children 미렌더(Spinner), 토스트 1회 + `/dashboard`로 replace
- 사용한 시스템 컴포넌트: Card, Badge, Modal, Skeleton(SkeletonLines), SectionError, Spinner, Toast, form.tsx(inputClass/labelClass/primary·secondary·textButtonClass/FieldError), useApiQuery, apiFetch

## 새로 만든 시스템 컴포넌트
- `components/Pagination.tsx`, `components/Tooltip.tsx`, `components/table.ts`(thClass/tdClass), `components/attendance/attendanceStatus.ts`, `components/attendance/DateRangeFields.tsx`, `form.tsx`의 `selectClass`

## 화면 리스트와 다른 점
- 퇴근 없음 표시는 spec의 `-` 대신 기존 `messages.common.noValue`(`—`)로 통일
- 설계에 있던 `AttendanceQueryStatus` 타입은 만들지 않고 `AttendanceStatus` 재사용(Fix 1에서 중복 정의 제거)
- SCR-008 근무일도 `formatWorkDate`(요일 포함)로 표시. design-frontend.md는 `formatDate`로 지정했음
- URL의 기간이 형식은 맞지만 순서/366일 규칙 위반이면 기본값으로 바꾸지 않고 오류를 표시(API 미호출, 목록 카드 숨김)

## 문서 갱신 예정
- `docs/09_DESIGN_SYSTEM.md` §6: Pagination(`{page,totalPages,totalCount,onChange}`, `<nav aria-label>`, 현재 `aria-current="page"`, 셀 36, 총 건수 표시), Tooltip(`{content,children}`, hover+focus, Esc, `role="tooltip"`, `bg-general-100` 12px), `selectClass`, `table.ts`, `ATTENDANCE_STATUS_BADGE`(WORKING=success/DONE=neutral/MISSING_CLOCK_OUT=danger), `DateRangeFields`, AppShell 관리자 가드. 퇴근 누락 행 강조는 `bg-danger-30/40`
- `docs/04.../SCR-003`, `SCR-008`: md 미만 카드 목록(툴팁 문구는 직접 표시), SCR-008 기간 필수·출근 미입력 문구, 부서 조회 실패 시 「すべて」만 표시
- `docs/04.../SCR-003`, `SCR-008` 추가(Fix 1): (1) 퇴근 없음·근무 시간 없음은 `-` 대신 `—`(`messages.common.noValue`) 표시 (2) URL 기간이 순서·366일 규칙 위반이면 기본값으로 바꾸지 않고 오류를 표시하며 목록 카드를 숨김(API 미호출) (3) SCR-008 근무일도 요일 포함(`formatWorkDate`)
- `docs/10_DEVELOPMENT_ROADMAP.md`: reviewer 통과 후 갱신

## impeccable 점검
- 퇴근 누락 행 배경과 danger 배지가 같은 색이라 묻히는 문제 → 행은 `danger-30/40`으로 낮춤
- 포커스 가능한 툴팁 트리거, 숫자 열 `tabular-nums`, 날짜 오류 하나로 통합(`aria-invalid`/`aria-describedby`)
- eyebrow/중첩 카드 없음. 카드는 검색·목록 2개로 병렬 배치

## 검증
- lint OK, prettier OK. `tsc --noEmit`와 `npm run build`는 **기존 테스트 파일** 1건 때문에 실패(아래). 신규 코드 자체의 타입 오류 없음. `npm run build`가 타입 검사 단계에서 멈춰 Suspense/cacheComponents 빌드는 미확인
- `npm test`: 13건 실패(전부 AppShell.test.tsx)

## tester에게 필요한 수정 (테스트 코드는 건드리지 않음)
1. `DashboardView.test.tsx:46` Attendance 목 데이터에 `modifiedAt: null` 추가 필요(타입 오류, build 차단)
2. `AppShell.test.tsx`: AppShell이 `useToast()`를 쓰게 되어 `ToastProvider` 래핑 또는 `@/components/Toast` 모킹 필요. 가드 테스트(비관리자 /admin → `/dashboard` replace + 토스트 1회, 관리자는 통과) 추가
3. 신규 테스트: `date-range`, `format` 추가분, `Pagination`, `Tooltip`, 두 View, `AttendanceEditModal`, e2e(`frontend/e2e/attendance.spec.ts`)

## 화면 확인
생략 (브라우저 도구 없음). 레이아웃·모바일 폭은 미확인이므로 reviewer/tester 단계에서 확인 필요.

## 임시 처리·백엔드 요청
- `/admin/users/:id` 링크는 사원 상세(SCR-007) 미구현으로 현재 404
- 백엔드 수정 요청 없음

## Fix 1 (review.md Round 1, frontend 담당)
- [중간] 문서 갱신 예정 누락 3건 보완 완료(위 "문서 갱신 예정"·"화면 리스트와 다른 점")
- [낮음] 처리: 부서 조건 소실 — 부서 목록이 success가 되기 전에는 form의 `departmentId`를 유지(AdminAttendanceView)
- [낮음] 처리: `AttendanceFilterStatus` 삭제 후 `AttendanceStatus` 재사용(`lib/date-range.ts`), `MISSING_ROW_CLASS`를 `attendanceStatus.ts`로 이동해 두 View에서 import
- [낮음] 처리: 범위 밖 `page`(items 0건, totalCount>0)에서도 Pagination 표시(두 View)
- 미처리: 없음(backend/tester 담당 항목은 범위 밖). 단, 부서 로딩 중 Select의 표시는 「すべて」 그대로이며 조회 조건만 유지됨
- 검증: tsc, eslint 오류 없음, prettier 적용, vitest src/app·lib·components 13파일 195건 통과. 화면 확인: 생략 (도구 없음)
- 신규 컴포넌트 문서 갱신 예정: `MISSING_ROW_CLASS`(attendanceStatus.ts export)를 09_DESIGN_SYSTEM.md 항목에 함께 기재
