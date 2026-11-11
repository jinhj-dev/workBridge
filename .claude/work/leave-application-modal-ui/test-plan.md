# test-plan — leave-application-modal-ui

근거: `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md` §3.2·§5·§6, `decisions.md`(추천안 기준, 승인 결과에 맞춰 조정), `design-frontend.md`.
실행: `frontend/`에서 `npx vitest run <파일>`, 전체 `npm test`, `npx tsc --noEmit`, `npm run lint`, E2E `npm run test:e2e`(개발 서버 3000 + 백엔드 6000 필요).

## 1. 컴포넌트 단위 (Vitest + Testing Library)

### `src/components/Select.test.tsx` (신규)
- 옵션이 주어진 순서로 렌더되고 placeholder가 있으면 값 `''` 선택 상태 → 선택 시 `onChange(value)` 호출
- `invalid`면 `aria-invalid="true"`, `describedBy`가 `aria-describedby`로 연결
- `required`면 `aria-required="true"`, 없으면 속성 없음
- chevron 아이콘은 `aria-hidden`(접근 가능한 이름에 영향 없음)

### `src/components/FormTable.test.tsx` (신규)
- `htmlFor` 지정 시 `getByLabelText(label)`이 해당 컨트롤을 찾는다(정확 일치. * 가 이름에 섞이지 않음)
- `required`면 `*` 가 보이고 `aria-hidden`, 아니면 `*` 없음
- `htmlFor` 없으면 label 요소가 아닌 텍스트로 표시, `labelId` 부여

### `src/components/leave/LeaveApplyModal.test.tsx` (수정)
기존 시나리오는 radio 조작을 `ui.selectOptions(getByLabelText(t.leaveType), type)`로 바꿔 모두 유지. 추가·변경:
- 休暇種別이 `combobox`(select)이고 옵션 값이 `ANNUAL,HALF_AM,HALF_PM,SPECIAL,OTHER` 순, 라벨이 年次休暇/午前半休/午後半休/特別休暇/その他, 초기 값 `''`(placeholder) — 기존 `shouldRenderFiveLeaveTypeRadiosWithNoneSelected` 대체
- radio가 하나도 없다
- 빈 제출 시 오류 4종 표시 + 첫 포커스가 休暇種別 select, POST 없음(기존 시나리오)
- **필수 *와 검증 일치**(승인 필요 사용자): `aria-required="true"` 컨트롤 = 休暇種別·開始日·終了日·理由·承認者 정확히 5개. 각 행 옆에 * 표시, 申請日数 행에는 * 없음
- **승인 불필요 사용자**: 承認者 행에 안내 문구, * 없음, aria-required 컨트롤 4개. 승인자 없이 제출 성공(기존 시나리오 유지)
- 반차 선택 시 終了日 disabled·시작일 고정이지만 `aria-required` 유지, 0.5日 표시(기존)
- ステータス 문구(`messages.leave.detail.status`)가 모달 안에 없다
- 申請日数: 미입력 `—`, 연차 11/16~11/18 → `3日`, 주말만 → 제출 시 `noWorkingDays`
- footer: [キャンセル]이 `onClose` 호출(기존), [申請する] 요청 중 disabled + 중복 POST 없음(기존)
- 다이얼로그 이름이 `t.title`(D1 변경 후 값)
- 서버 에러 매핑(VALIDATION_ERROR→필드, INVALID_DATE_RANGE/NO_WORKING_DAYS→기간, INVALID_APPROVER→재선택+후보 재조회, 409→토스트, 422→토스트+onBalanceStale) 기존 시나리오 그대로 통과

### 회귀
- `src/components/leave/LeaveDetailModal.test.tsx`, `src/components/DetailTable.test.tsx`, `src/components/Modal.test.tsx`: 수정 없이 통과(버튼·표 클래스 상수화로 동작 변화 없음)
- `src/components/leave/ApproverSelect.test.tsx`: `required` 전달 시 `aria-required` 1건 추가
- `src/app/(app)/dashboard/DashboardView.test.tsx`: 424행 radio 클릭 → select 선택으로 수정 후 통과
- `src/app/(app)/leaves/LeavesView.test.tsx`: 모달을 mock하므로 변경 없음

## 2. E2E (Playwright, `frontend/e2e/leaves.spec.ts` 수정)
- radio `.check()` 4곳(71·102·110·163행)을 `page.getByLabel(t.apply.leaveType).selectOption('SPECIAL')` 등으로 교체, 102행은 select 표시 확인으로 교체
- 주의: 이 spec은 기존 결함으로 일부 실패 중이다. 수정 전 실패 목록을 먼저 기록하고, 이번 변경으로 **새로 실패하는 케이스가 없는지**로 판정한다(기존 실패는 원인만 보고)

## 3. 화면 확인 (Playwright 스크린샷, 수동 비교)
- 1440×900: `/leaves` [休暇申請] → 신청 모달 스크린샷. 같은 화면 이력 [詳細] → 상세 모달 스크린샷. 비교 항목: 모달 폭(640)·padding·radius·그림자, 아이콘+제목, 항목명 셀 배경·폭(10rem)·구분선·외곽 테두리, footer 구분선과 버튼 크기·스타일 동일
- 첨부 이미지(3.png)와 비교: 항목 순서(休暇種別/開始日/終了日/申請日数/理由/承認者), * 위치·색, Select chevron, 申請日数 회색 박스. 차이는 D4(자동 승인 안내)·날짜 아이콘 미재현 등 decisions.md에 적은 것만 허용
- 375×812: 모달이 화면 안에 들어오고 가로 스크롤 없음, 항목명 위·입력 아래 세로 배치(D3), 본문만 스크롤, 승인자 후보 목록이 잘리지 않음(승인 필요 계정 900002 사용 가능 시)
- 반차 선택 시 終了日 비활성 표시, 빈 제출 시 각 행 아래 오류 표시 확인
