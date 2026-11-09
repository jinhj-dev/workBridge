# 근태 관리 — 프론트엔드 설계

## 참조 문서 (해당 섹션만 읽을 것)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-003_ATTENDANCE.md` 전체(짧음)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-008_ADMIN_ATTENDANCE.md` 전체(짧음)
- `docs/03_SCREEN_LIST.md` — Screen Access Rules, Common UI Rules(인증 및 권한 처리 / 상태 처리 / 목록 / 모달)
- `docs/09_DESIGN_SYSTEM.md` — §3 컴포넌트(Pagination·Table·Tooltip·Dropdown), §4 SCR-003·SCR-008 행, §5-3 반응형, §6 구현된 공용 컴포넌트
- API 계약은 `.claude/work/attendance/design-backend.md`
- Next.js 16: `useSearchParams` 사용 시 Suspense 경계 요구사항을 `frontend/node_modules/next/dist/docs/`에서 확인(cacheComponents 활성)

## 공통

### 관리자 화면 가드 (03 인증 및 권한 처리)
- `AppShell`에서 `pathname`이 `/admin`이거나 `/admin/`으로 시작하고 `user.role !== 'ADMIN'`이면 `router.replace('/dashboard')` + `showToast(messages.common.forbidden, 'error')`. 이동 전까지 children을 렌더링하지 않는다(로딩 Spinner 유지 → 관리자 API 호출 안 함)
- 토스트는 한 번만 띄운다(effect 재실행으로 중복 표시하지 않게)

### 기간 검증 (두 화면 공유) — `lib/date-range.ts`
- `tokyoToday(now: Date): string`, `defaultDateRange(now) → { startDate: 'YYYY-MM-01', endDate: today }`
- `validateDateRange(start, end): string | null` — 순서대로 첫 번째 오류 문구 반환
  1. 둘 중 하나라도 비어 있음 → 「照会期間を入力してください。」
  2. start > end → 「開始日は終了日より後にできません。」
  3. 양끝 포함 일수 > 366 → 「照会期間は最大1年です。」
- 오류는 기간 입력 아래 `FieldError` 하나로 표시, 두 입력 모두 `aria-invalid`·`aria-describedby` 연결. 오류가 있으면 API를 호출하지 않는다
- 서버 400 INVALID_DATE_RANGE는 응답 `message`(백엔드가 같은 문구를 반환)를 같은 위치에 표시

### URL Query 상태 (03 목록)
- 검색 조건과 `page`를 URL Query에 둔다. 화면은 URL을 파싱한 값으로 API path를 만들고 `useApiQuery(path)`로 조회
- [조회] 클릭 → 검증 통과 시 `page=1`로 `router.push`. 페이지 이동도 `router.push`(뒤로 가기로 복원)
- Query가 없거나 잘못된 값(날짜 형식 오류, page가 정수 아님 등)이면 기본값으로 대체. 입력 폼 값은 URL 값으로 초기화하고 URL이 바뀌면 다시 맞춘다
- 파싱은 순수 함수(`parseHistoryQuery`, `parseAdminQuery`)로 분리해 테스트

### 표시 형식 — `lib/format.ts`에 추가
- `formatWorkDate(ymd)` → `2026/11/07(土)`(SCR-003, 요일 포함). SCR-008은 기존 `formatDate`(요일 없음)
- `formatWorkMinutes(minutes | null)` → `8:05`(시:분, 분은 2자리), null이면 `messages.common.noValue`
- 출퇴근 시각은 기존 `formatTokyoTime`. 퇴근이 근무일 다음 날이면 `formatTokyoDateTime`으로 날짜까지 표시(자정 넘은 근무 구분)

### 상태 배지
- `components/attendance/attendanceStatus.ts` `ATTENDANCE_STATUS_BADGE`: WORKING → `success`, DONE → `neutral`, MISSING_CLOCK_OUT → `danger`. 문구는 ja.ts `attendance.statuses`

## SCR-003 근태 관리 (`/attendance`, 공통)
- 구성: Page Header(`text-h5` 「勤怠管理」) → 검색 영역(`Card`): 시작일·종료일 `<input type="date">`(`inputClass`·`labelClass`) + [照会](`primaryButtonClass`) → 목록 영역(`Card`) → `Pagination`
- 목록 컬럼: 근무일(요일 포함) / 출근 / 퇴근(없으면 `-`) / 근무 시간 / 상태(`Badge`) / 비고(`modifiedAt`이 있으면 「管理者修正」)
- 퇴근 누락 행: 행 배경 `danger-30` 계열 강조 + 상태 배지 옆 `Tooltip` 「管理者に退勤時刻の修正を依頼してください。」
- 반응형: `md` 이상 표, `md` 미만 같은 정보를 카드 목록으로(대시보드 `PendingApprovalsSection`과 같은 방식). 카드에서는 툴팁 문구를 배지 아래 텍스트로 직접 표시
- 상태: Loading → `SkeletonLines` / Empty → 「照会期間に勤怠記録がありません。」 / 조회 실패 → `SectionError`(다시 시도 = `reload`)
- API: `GET /attendance?startDate&endDate&page&limit=20`

## SCR-008 전체 근태 관리 (`/admin/attendance`, 관리자)
- 검색 영역(2줄 허용): 이름 Input / 부서 Select(「すべて」+ `GET /departments`) / 시작일 / 종료일 / 근무 상태 Select(すべて·勤務中·退勤済み·退勤漏れ) / [照会]
  - 부서 목록 조회 실패 시 Select는 「すべて」만 두고 목록 조회는 계속 가능(부서 영역만 실패). URL의 departmentId가 목록에 없으면 「すべて」로 표시
- 목록 컬럼: 근무일 / 사원명(`next/link` → `/admin/users/:id`) / 부서(null이면 `-`) / 출근 / 퇴근 / 근무 시간 / 상태 / 수정([修正] `secondaryButtonClass` 작은 크기)
- 반응형·Loading·Error는 SCR-003과 같음. Empty → 「条件に一致する勤怠記録がありません。」
- API: `GET /admin/attendance?name&departmentId&startDate&endDate&status&page&limit=20`, `GET /departments`

### 근태 수정 모달 — `AttendanceEditModal({ attendance | null, onClose, onSaved })`
- `Modal` 하나 안에서 단계 전환(`LeaveDetailModal`과 같은 방식, 중첩 dialog 없음)
  1. 입력 단계: 사원명·근무일 읽기 전용 / 출근 시간·퇴근 시간 `<input type="datetime-local">`(초기값은 기존 값을 도쿄 기준 `YYYY-MM-DDTHH:mm`으로). 퇴근은 비워 둘 수 있음 / [キャンセル] [保存]
  2. 확인 단계: 「勤怠を修正しますか？」 [戻る] [修正する]
- 입력 검증([保存] 시): 출근 미입력 → 「出勤時刻を入力してください。」 / 퇴근 ≤ 출근 → 「退勤時刻は出勤時刻より後にしてください。」. 근무일·24시간 규칙은 서버가 검증
- 전송 값: `'YYYY-MM-DDTHH:mm' + ':00+09:00'`, 퇴근 빈 값은 `null`
- 응답 처리
  - 200 → 모달 닫기, 토스트 「勤怠を修正しました。」, 목록 `reload`
  - 400 INVALID_TIME_RANGE → 입력 단계로 돌아가 모달 안에 「出退勤時刻を確認してください。」
  - 404 → 모달 닫기 + 토스트 「勤怠記録が見つかりません。」 + 목록 `reload`
  - 403 FORBIDDEN → 모달 닫기 + 서버 message 토스트 / 그 외 → 서버 message 토스트(모달 유지) / NetworkError → `messages.error.network` 토스트
  - 요청 중 버튼 비활성 + Spinner(중복 제출 방지)

## 신규 시스템 컴포넌트 (09 §3에 정의, §6에 아직 없음)
- `components/Pagination.tsx` `Pagination({ page, totalPages, totalCount, onChange })` — 이전/다음 + 번호 + `...` + 총 건수. `<nav aria-label>`, 현재 페이지 `aria-current="page"`. totalPages ≤ 1이면 총 건수만
- `components/Tooltip.tsx` `Tooltip({ content, children })` — 어두운 배경 12px. hover와 focus 모두에서 표시(트리거는 focus 가능), `role="tooltip"` + `aria-describedby`, Esc로 닫힘
- `components/form.tsx`에 `selectClass` 추가(Dropdown Regular, `inputClass`와 같은 높이·테두리)
- 표 스타일 클래스(`thClass`, `tdClass`)는 `components/table.ts`로 두 화면이 공유. 대시보드의 기존 표는 건드리지 않는다

## 문구 (`messages/ja.ts`)
- `common.forbidden`: 「アクセス権限がありません。」
- `attendance`(SCR-003), `adminAttendance`(SCR-008·수정 모달), `attendance.statuses`(勤務中/退勤済み/退勤漏れ), `pagination`, `dateRange`(검증 문구) 섹션 추가. 하드코딩 금지

## 파일
신규
- `frontend/src/app/(app)/attendance/page.tsx`(metadata + Suspense), `AttendanceHistoryView.tsx`, `AttendanceHistoryView.test.tsx`
- `frontend/src/app/(app)/admin/attendance/page.tsx`, `AdminAttendanceView.tsx`, `AttendanceEditModal.tsx`, `AdminAttendanceView.test.tsx`, `AttendanceEditModal.test.tsx`
- `frontend/src/components/Pagination.tsx`(+ test), `frontend/src/components/Tooltip.tsx`, `frontend/src/components/table.ts`, `frontend/src/components/attendance/attendanceStatus.ts`
- `frontend/src/lib/date-range.ts`(+ `date-range.test.ts`)
- `frontend/e2e/attendance.spec.ts`

수정
- `frontend/src/components/layout/AppShell.tsx`(+ `AppShell.test.tsx`) — 관리자 가드
- `frontend/src/components/form.tsx` — `selectClass`
- `frontend/src/lib/format.ts`(+ `format.test.ts`) — `formatWorkDate`, `formatWorkMinutes`
- `frontend/src/lib/api/types.ts` — `Attendance.modifiedAt`, `Department`, `AttendanceQueryStatus`
- `frontend/src/messages/ja.ts`

재사용
- `components/Card.tsx`, `Badge.tsx`, `Modal.tsx`, `Skeleton.tsx`(`SkeletonLines`), `SectionError.tsx`, `Spinner.tsx`, `Toast.tsx`, `form.tsx`
- `lib/api/useApiQuery.ts`, `lib/api/client.ts`(`apiFetch`, `ApiError`, `NetworkError`)
- 패턴 참고: `app/(app)/dashboard/PendingApprovalsSection.tsx`(표/카드 전환), `components/leave/LeaveDetailModal.tsx`(모달 단계 전환), `app/(app)/dashboard/AttendanceSection.tsx`(확인 후 처리)

## 문서 갱신 예정 (구현 후 frontend.md에 확정 내용 기록)
- SCR-003·SCR-008: 좁은 폭 카드 목록, SCR-008 기간 필수·출근 미입력 문구
- 09 §6: Pagination, Tooltip, selectClass, table.ts, ATTENDANCE_STATUS_BADGE, AppShell 관리자 가드
