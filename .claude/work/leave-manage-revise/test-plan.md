# test-plan: 휴가 신청 공통 모달화 + 이력 상태·종류 토글 필터

근거: `docs/06_API_SPECIFICATION.md` API-LEAVE-003(`status` 복수화 + `leaveType`, design-backend.md), API-ATT-003 `status` 복수 규칙, SCR-004 §3.2·§3.3·§4.1·§5·§6, SCR-002 §3-4, 이전 `.claude/work/leave-request/test-plan.md`, 근태 토글 테스트(`StatusFilterButtons.test.tsx`, `AttendanceHistoryView.test.tsx`)

## 1. Backend e2e — `backend/test/leave-requests.e2e-spec.ts` (GET /leaves/me 블록)
| # | 시나리오 | 기대 |
|---|---|---|
| B1 | `leaveType=HALF_AM` (본인에 ANNUAL·HALF_AM·HALF_PM 건 존재) | HALF_AM 건만, totalCount 일치 |
| B2 | `leaveType=HALF_AM,HALF_PM` | 두 종류 모두(OR) |
| B3 | `status=PENDING,APPROVED` (REJECTED·CANCELLED 건도 존재) | PENDING·APPROVED만 |
| B4 | `status=APPROVED` 단일(기존 형식) | 기존과 같은 결과(하위 호환) |
| B5 | `year` + `status`(복수) + `leaveType`(복수) 조합 | 그룹 간 AND, 그룹 내 OR 결과만 |
| B6 | 중복 `status=APPROVED,APPROVED` | 400 아님, APPROVED 1회 지정과 같은 결과 |
| B7 | `status`·`leaveType` 생략 | 전체 |
| B8 | `leaveType=FOO` / `leaveType=` / `leaveType=ANNUAL,` | 400 VALIDATION_ERROR, details field `leaveType` |
| B9 | `status=FOO` / `status=` / `status=APPROVED,FOO` | 400 VALIDATION_ERROR, details field `status` |
| B10 | 다른 사용자의 같은 상태·종류 휴가 존재 | 본인 것만 반환 |
기존 /leaves/me 테스트는 회귀로 그대로 통과해야 함

## 2. Frontend 단위·컴포넌트 (Vitest)
`src/lib/leave-days.test.ts`
- `parseLeavesQuery`: `status=APPROVED,PENDING` → 표시 순서 `[PENDING, APPROVED]` / 미지 값·중복 제거 / 단일 `status=APPROVED` → `[APPROVED]` / 없음 → `[]` / `leaveType` 동일 규칙 / `tab` 값은 결과에 없음

`src/components/leave/LeaveFilterButtons.test.tsx` (`StatusFilterButtons.test.tsx`와 같은 관점)
- `role=group`에 라벨·`describedBy` 안내 문구 연결
- 선택된 값만 `aria-pressed=true`, 선택 표시 ✓
- 미선택 클릭 → 추가된 목록으로 onChange(options 순서), 선택 클릭 → 해제된 목록
- 모든 버튼 `type="button"`(폼 제출 안 함)

`src/components/leave/LeaveApplyModal.test.tsx` (기존 `LeaveApplyForm.test.tsx` 14건 이전 + 아래)
- 종류가 radio 5개(`getAllByRole('radio')`), 초기 미선택, 미선택 제출 시 「休暇の種類を選択してください」 계열 문구 + 첫 radio focus
- radio 반차 선택 → 종료일 비활성·시작일과 동일
- footer [申請する] 클릭으로 제출(POST 1회), 요청 중 disabled·연타 1회
- [キャンセル]·X → `onClose`
- 성공: 토스트(PENDING/APPROVED 구분) + `onApplied(leave)`
- 422 → 토스트 + `onBalanceStale`, 409 LEAVE_CONFLICT 토스트, APPROVER_* → 승인자 필드 오류·후보 reload (기존 케이스 유지)
- `open=false`면 `/leaves/approvers` 호출 안 함

`src/app/(app)/leaves/LeavesView.test.tsx`
- 탭(`role=tablist`)이 없고 [休暇申請] 버튼이 있음
- `?tab=apply`로 진입해도 이력 표시·`/leaves/me` 호출
- 버튼 → 모달 열림(dialog 제목) / 신청 성공 → 모달 닫힘, balance 재조회, 다른 연도 시작일이면 `year` 포함 URL push, 같은 URL이면 이력 재조회
- 상태 select(`leaves-status` combobox)가 없고 상태·종류 토글 그룹 2개가 있음
- 상태 토글 2개 선택 → URL `status=PENDING%2CAPPROVED`, page 1, API `/leaves/me?...status=PENDING%2CAPPROVED...`
- 종류 토글 선택 → URL `leaveType=..`, page 초기화, API에 `leaveType` 포함 / 상태와 함께 선택 시 둘 다 포함
- 선택 해제로 빈 목록 → URL·API에서 파라미터 사라짐
- URL `?status=APPROVED,REJECTED&leaveType=HALF_AM`에서 복원(aria-pressed), 미지 값 무시
- 신청 성공 후 상태·종류 선택이 초기화됨
- 기존 연도·페이지 테스트는 탭 없이 유지, 기존 상태 select 테스트는 토글 기준으로 변경

`src/app/(app)/dashboard/DashboardView.test.tsx`
- 휴가 현황의 신청 버튼이 링크가 아니라 버튼이고, 클릭 시 모달 열림
- 신청 성공 → 모달 닫힘 + `/leaves/balance` 재조회, 화면 이동 없음

## 3. Playwright — `frontend/e2e/leaves.spec.ts`
- `?tab=apply` 진입 테스트를 [休暇申請] 버튼 → 모달 신청으로 변경(정상 신청 → 이력에 표시, LEAVE_CONFLICT 토스트)
- 대시보드 신청 버튼 → 모달 표시, 신청 후 대시보드에 머무름(기존 `shouldOpenApplyTabFromDashboardButton` 대체)
- 이력 상태 토글 복수 선택 시 해당 상태만, 종류 토글 선택 시 해당 종류만 표시(기존 상태 select 사용 테스트가 있으면 토글로 변경)
- 375px: `/leaves` 가로 스크롤 없음(토글 줄바꿈), 모달이 화면 안에 표시
- 실행 환경(E2E_ADMIN_PASSWORD·백엔드)이 없으면 미검증으로 보고

## 4. 실행
- backend: `npx vitest run --config ./vitest.config.e2e.ts test/leave-requests.e2e-spec.ts` (사전 `npm run db:migrate:test`)
- frontend: `npx vitest run src/components/leave/LeaveApplyModal.test.tsx src/components/leave/LeaveFilterButtons.test.tsx` 등 + `npm test`, `npx tsc --noEmit`, `npm run lint`
