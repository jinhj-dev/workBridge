# frontend — leave-application-modal-ui

## 생성·수정 파일 (frontend/)
- 신규: `src/components/FormTable.tsx`, `Select.tsx`, `CalendarIcon.tsx`, `FormTable.test.tsx`, `Select.test.tsx`
- 수정: `components/leave/LeaveApplyModal.tsx`(표 레이아웃·Select·필수 *·footer 교체), `leave/LeaveDetailModal.tsx`(버튼 상수·CalendarIcon import만), `leave/ApproverSelect.tsx`(`required`→aria-required), `components/DetailTable.tsx`(`tableFrameClass` export만, 출력 동일), `components/form.tsx`(`RequiredMark`, `modalPrimaryButtonClass`, `modalSecondaryButtonClass`), `messages/ja.ts`(`leaves.apply.title`='休暇申請', `common.selectPlaceholder`)
- 테스트 갱신: `LeaveApplyModal.test.tsx`, `DashboardView.test.tsx`, `e2e/leaves.spec.ts`(radio→select 선택, 단언 의미 유지. 라디오 5종 테스트는 옵션 5종+placeholder 미선택 단언으로 치환)

## 구현 화면
- SCR-004 §3.2 공통 휴가 신청 모달(SCR-002·004 공용, 사용처 코드 변경 없음)
- 사용 시스템 컴포넌트: Modal(icon, size=lg), FormTable/FormTableRow, Select, ApproverSelect, FieldError, RequiredMark, inputClass/textareaClass, modal 버튼 상수, Spinner, Toast
- * 기준: 種別·開始日·終了日·理由 항상, 承認者는 `approverRequired`(=validate 조건과 같은 변수)일 때만. 申請日数·자동승인 안내 행은 * 없음. 필수 컨트롤에 aria-required. 기간 오류는 終了日 행 안에 표시.

## 새 시스템 컴포넌트
- `components/FormTable.tsx`, `components/Select.tsx`, `components/CalendarIcon.tsx`

## 화면 리스트와 다른 점
- 없음(decisions D1~D6 추천안대로). 申請日数 표시 박스는 `aria-live`+`aria-labelledby`.

## 문서 갱신 예정
- `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md` §3.2: 휴가 종류 Radio→Select(placeholder `選択してください`), 제목 `休暇申請`, 2열 표(sm 이상)·모바일 세로 배치, 필수 * 기준, footer [キャンセル] 아웃라인 h-40
- `docs/09_DESIGN_SYSTEM.md` §3 Modal 행: 취소 버튼 아웃라인
- 같은 문서 §6 신규: FormTable·FormTableRow(label/htmlFor/labelId/required), Select(props: id,value,onChange,options,placeholder,invalid,describedBy,required,disabled), RequiredMark, modalPrimary/SecondaryButtonClass, CalendarIcon, `tableFrameClass`; 갱신: LeaveApplyModal·ApproverSelect(`required`) 행
- D6(PR #18 누락): DetailTable·DetailTableRow, LeaveStatusBadge, Modal `icon`·`size('md'|'lg')`

## impeccable 점검
- 승인자 행(자동승인) 항목명이 값 셀 하단에 치우쳐 보여 `min-h-12 items-center`로 정렬. 다른 행은 입력 높이 48 기준 세로 중앙 확인.

## 화면 확인
- Playwright(관리자 계정)로 PC 1440×900·모바일 360×640 기본·검증 에러 상태 확인, 신청 제출은 하지 않음. 모바일은 모달 본문이 스크롤되어 하단 행은 스크린샷 밖(스크롤 영역)
- screenshots/: apply-pc.png, apply-pc-error.png, apply-mobile.png, apply-mobile-error.png
- 승인 필요 사용자(ApproverSelect 표시) 화면은 단위 테스트로만 확인

## 검증
- tsc·eslint 오류 없음, vitest 38파일 529건 통과. e2e/leaves.spec.ts 전체는 실행하지 않음(제출이 데이터를 만듦, 변경은 셀렉터만)
- 참고: prettier --check 경고는 기존 파일의 CRLF 때문(기존 상태), 임시 shot spec은 삭제함
