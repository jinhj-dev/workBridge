# design-frontend: 휴가 관리 SCR-004

## 참조 문서 (해당 섹션만 읽을 것)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md` 전체(짧음) — 화면 구성·동작·검증 문구·예외·상태
- `docs/03_SCREEN_LIST.md` → "Common UI Rules"(인증 및 권한 처리, 상태 처리, 목록, 모달), "화면 이동"(`/leaves?tab=apply`)
- `docs/09_DESIGN_SYSTEM.md` → §3 "컴포넌트", §4 SCR-004 행, §5-3(반응형), §6 표 전체
- `docs/06_API_SPECIFICATION.md` → §0 `Leave`, §4 API-LEAVE-001~006 (계약 상세는 `design-backend.md`)

## 화면
- **SCR-004 휴가 관리** · `/leaves` · 공통 · 탭 `?tab=apply`(휴가 신청) / `?tab=history`(내 신청 이력, 기본)
- 공통 휴가 상세 모달(SCR-004 §4.4)에 **[취소] 단계 추가**

## 구성 (`app/(app)/leaves/`)
페이지 제목(text-h5) → 상단 요약 → `Tabs` → 탭 내용 → `LeaveDetailModal`

1. **상단 요약**: `GET /leaves/balance`(올해). `StatCard` 4개(부여 / 승인 완료 / 승인 대기 / 잔여, `formatDays`). 로딩 `SkeletonLines`, 실패 `SectionError`. 신청 성공·취소 성공 후 `reload()`
2. **Tabs**: `Tabs`(label "휴가 관리 탭"). 신청 → `/leaves?tab=apply`, 이력 → `/leaves`(이력 필터 초기화). 알 수 없는 tab 값은 history
3. **휴가 신청 탭** (`Card` + 폼, `sm` 이상 2열)
   - 휴가 종류 `<select>`(`selectClass`, 첫 항목 "선택해주세요" 빈 값)
   - 시작일·종료일 `<input type="date">`(`inputClass`). 반차 선택 시 종료일 = 시작일로 고정·`disabled`, 시작일 바뀌면 같이 변경
   - 신청 일수 미리보기: `lib/leave-days.ts` `countLeaveDays` 결과(`formatDays`). 날짜 미입력·역순이면 `messages.common.noValue`. "최종 값은 서버가 계산" 보조 문구
   - 사유 `<textarea>` + 글자 수 `n/500`(코드 포인트 기준, `LeaveDetailModal` 반려 사유와 같은 방식)
   - 승인자: `user.approvalRequired === true`일 때만 `ApproverSelect`(필수). false면 "申請するとすぐに承認されます。" 안내
   - [휴가 신청] `primaryButtonClass` + 요청 중 `Spinner`·disabled, `submittingRef`로 중복 방지
4. **내 신청 이력 탭** (`Card`)
   - 필터: 연도 `<select>`(올해+1 ~ 올해−4, 기본 올해), 상태 `<select>`(전체 + 4종). 변경 즉시 URL 반영·1페이지
   - md 이상 표(`thClass`/`tdClass`): 신청일(`formatTokyoDate(createdAt)`) / 휴가 종류 / 기간(`formatPeriod`) / 일수 / 승인자(`approver?.name ?? 자동 승인`) / 상태(`Badge` + `LEAVE_STATUS_BADGE`) / [상세]
   - md 미만: `ApprovalsView`와 같은 카드 목록(`<ul>`)
   - `Pagination`, Empty "申請した休暇はありません。", 범위 밖 페이지 처리는 `ApprovalsView`와 동일
5. **모달**: 행 [상세] → `LeaveDetailModal leaveId`. `onProcessed` = 목록 reload + 요약 reload

## URL Query (03 "목록")
`/leaves?tab=apply` / `/leaves?year=2026&status=PENDING&page=2`
- `parseLeavesQuery(params, now)` → `{ tab, year, status, page }`. year가 선택지 밖·형식 오류면 올해, status가 4종 밖이면 전체, page는 `ApprovalsView`와 같은 규칙. 기본값은 URL에 쓰지 않음(`toQueryString`)
- API: `/leaves/me?year=..&status=..&page=..&limit=20`(status 전체면 생략)

## 시스템에 없는 컴포넌트 (신규)
- `components/leave/ApproverSelect.tsx` — Searchable Select(09 §3 Autocomplete 대응, §6에 없음). SCR-007 등 다른 화면에서 쓸 예정이 없으므로 `leave/` 아래에 둔다
  - props 예: `{ id, value: UserSummary | null, onChange, error, candidates, status, onRetry }` (조회는 부모가 `useApiQuery<UserSummary[]>('/leaves/approvers')`로 1회, 화면에서 이름·사원번호 부분 일치 필터)
  - ARIA combobox 패턴: `<input role="combobox" aria-expanded aria-controls aria-activedescendant>` + `role="listbox"`/`option`, ↑↓ 이동, Enter 선택, Esc 닫기, 바깥 클릭 닫기. 표시 `이름 (사원번호) / 부서`
  - 후보 0건: "選択できる承認者がいません。管理者にお問い合わせください。", 조회 실패: 필드 아래 `SectionError` 수준 문구 + [다시 시도]
  - 스타일은 `inputClass` + `shadow-card` 드롭다운, 선택 항목 `primary-30` 배경. 새 색상·토큰 추가 금지
- `components/form.tsx`에 `textareaClass` 추가 — `LeaveDetailModal`의 반려 사유 textarea 클래스와 동일한 문자열을 옮겨 두 곳에서 사용

## LeaveDetailModal 변경 (`components/leave/LeaveDetailModal.tsx`)
- `Step`에 `'cancel'` 추가(`initialStep`에는 노출하지 않음)
- `canCancel = leave.user.id === me.id && (status === 'PENDING' || (autoApproved && status === 'APPROVED' && startDate > tokyoToday(new Date())))` — 05 §6 기준(SCR-004 §4.3에는 `status=APPROVED` 누락, DOC_ISSUE)
- 상세 footer: `canCancel`이면 [닫기] 옆에 [취소]. 취소 단계: 제목 "休暇申請の取消", 본문 "休暇申請を取り消しますか？", footer [戻る](상세로) / [取り消す](PATCH `/leaves/:id/cancel`, 요청 중 Spinner)
- 성공: 토스트 "休暇申請を取り消しました。" + `finish()`. 409 `NOT_CANCELLABLE`: 토스트 "取り消せない状態です。一覧を更新します。" + `finish()`. 403/404는 기존 처리 그대로
- 기존 승인·반려 동작과 SCR-002·SCR-005 사용처는 바꾸지 않는다(본인 신청이 열리는 SCR-005 scope=all에서도 [취소]가 보이는 것은 SCR-004 §4.4 "공통 모달" 규칙대로)

## 상태 흐름·검증·에러
신청 제출 순서: 클라이언트 검증(SCR-004 §5 문구, 처음 오류 필드로 focus) → `POST /leaves` → 성공 분기
- 201 `PENDING`: 토스트 "休暇を申請しました。承認者の承認をお待ちください。" / `APPROVED`: "休暇が承認されました。"
- 성공 후: 폼 초기화, 요약 reload, `/leaves?year=<startDate의 연도>`로 이동(올해가 아니면 year 포함 → 새 신청이 목록에 보이도록)
- 클라이언트 검증: 종류 필수 / 기간 필수 / 종료일 ≥ 시작일 / 미리보기 0일 → "申請期間に勤務日がありません。" / 사유 trim 후 필수·500자 이내 / 승인자 필수
- 서버 에러 매핑(SCR-004 §6)
  | 응답 | 처리 |
  |---|---|
  | 400 VALIDATION_ERROR | `details[].field`(leaveType/startDate/endDate/reason/approverId) 아래 표시, 없으면 토스트 |
  | 400 INVALID_DATE_RANGE / NO_WORKING_DAYS | 기간 필드 아래 서버 message |
  | 400 APPROVER_REQUIRED / INVALID_APPROVER | 승인자 필드 "承認者を選び直してください。", 선택 해제, 후보 reload. 승인자 필드가 없는 경우(로그인 후 설정 변경)는 서버 message 토스트 |
  | 409 LEAVE_CONFLICT | 서버 message 토스트 |
  | 422 INSUFFICIENT_LEAVE_BALANCE | 서버 message(잔여 n일 포함) 토스트 + 요약 reload |
  | 네트워크 / 기타 | 03 공통 규칙(토스트) |
- 문구는 모두 `messages/ja.ts`에 추가(`leaves` 네임스페이스 신규 + `leave.cancel` 하위). 하드코딩 금지

## 호출 API
| API | 용도 |
|---|---|
| GET /leaves/balance | 상단 요약 |
| GET /leaves/approvers | 승인자 후보(keyword 없이 1회) |
| POST /leaves | 신청 |
| GET /leaves/me | 이력 |
| GET /leaves/:id | 상세(기존 모달) |
| PATCH /leaves/:id/cancel | 취소(모달) |

## 생성·수정 파일
신규
- `frontend/src/app/(app)/leaves/page.tsx`(metadata + Suspense, `approvals/page.tsx`와 동일 패턴)
- `frontend/src/app/(app)/leaves/LeavesView.tsx`(탭·요약·URL Query·모달)
- `frontend/src/app/(app)/leaves/LeaveApplyForm.tsx`, `LeaveHistoryList.tsx`
- `frontend/src/components/leave/ApproverSelect.tsx`
- `frontend/src/lib/leave-days.ts`(`countLeaveDays`, `parseLeavesQuery`, `yearOptions`)
- 테스트: `LeavesView.test.tsx`, `LeaveApplyForm.test.tsx`, `components/leave/ApproverSelect.test.tsx`, `lib/leave-days.test.ts`, `frontend/e2e/leaves.spec.ts`
수정
- `frontend/src/components/leave/LeaveDetailModal.tsx`(+ `.test.tsx`), `components/form.tsx`(`textareaClass`), `messages/ja.ts`

재사용: `components/Tabs.tsx`, `StatCard.tsx`, `Card.tsx`, `Badge.tsx`, `Pagination.tsx`, `Skeleton.tsx`, `SectionError.tsx`, `Toast.tsx`, `table.ts`, `form.tsx`, `lib/api/useApiQuery.ts`, `lib/api/client.ts`(`ApiError`, `NetworkError`), `lib/date-range.ts`(`tokyoToday`, `toQueryString`), `lib/format.ts`, `app/(app)/leaves/approvals/ApprovalsView.tsx`(목록·카드·페이지 구조 참고)

## 문서 갱신 예정
- SCR-004: §4.3 취소 조건에 `status=APPROVED`, 취소 성공 토스트·확인 단계 버튼, 연도 선택지 범위, 409/422 표시 위치(토스트), 신청 후 이동 URL, 좁은 폭 카드 목록, 승인자 후보 화면 필터
- 09 §6: `ApproverSelect`, `textareaClass`, `LeaveDetailModal`의 취소 단계
- 10_DEVELOPMENT_ROADMAP §6 프론트엔드·§9 화면 테스트
