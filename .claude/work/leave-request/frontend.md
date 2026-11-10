# frontend 구현 기록: 휴가 관리 SCR-004

## 생성·수정 파일 (모두 `frontend/` 하위)
신규
- `src/app/(app)/leaves/page.tsx`, `LeavesView.tsx`, `LeaveApplyForm.tsx`, `LeaveHistoryList.tsx`
- `src/components/leave/ApproverSelect.tsx`
- `src/lib/leave-days.ts` (`countLeaveDays`, `parseLeavesQuery`, `yearOptions`, `LEAVE_STATUSES`, `isHalfDay`)
- 테스트: `LeavesView.test.tsx`(10), `LeaveApplyForm.test.tsx`(14), `components/leave/ApproverSelect.test.tsx`(8), `lib/leave-days.test.ts`, `e2e/leaves.spec.ts`(4)
수정
- `src/components/leave/LeaveDetailModal.tsx`(+ `.test.tsx` 취소 9건 추가), `src/components/form.tsx`(`textareaClass`), `src/messages/ja.ts`(`leaves` 신규, `leave.cancel`, `leave.detail.cancel`)

## 구현한 화면
- SCR-004 휴가 관리 `/leaves` (`?tab=apply` / 기본 history, `year`·`status`·`page`는 URL Query, 기본값은 URL에 쓰지 않음)
- 공통 휴가 상세 모달에 [취소] 단계 추가(SCR-004 §4.3/§4.4)
- 사용한 시스템 컴포넌트: Tabs, StatCard, Card, Badge(+`LEAVE_STATUS_BADGE`), Pagination, Skeleton/SkeletonLines, SectionError, Toast, Modal, Spinner, `table.ts`, `form.tsx`(inputClass/selectClass/labelClass/primary·secondaryButtonClass/FieldError/textareaClass), LeaveDetailModal, `useApiQuery`

## 새로 만든 시스템 컴포넌트
- `components/leave/ApproverSelect.tsx` (ARIA combobox, ↑↓/Enter/Esc/바깥 포커스 닫기, 이름·사원번호 부분 일치, 로딩 Skeleton, 후보 0건·조회 실패+[再試行] 처리)
- `components/form.tsx` `textareaClass` (반려 사유 textarea와 같은 클래스를 공용화, 모달도 이를 사용)

## 화면 리스트와 다른 점
- SCR-004 §4.1은 "내 신청 이력 탭으로 이동"만 규정. 구현은 `/leaves?year=<시작일의 연도>`(올해면 year 생략)로 이동하고 필터(status/page)는 초기화 (design-frontend 결정대로)
- 표시 문구는 SCR-004 한국어 문구를 일본어로 옮김(`messages.leaves`). 사유 라벨은 기존 모달과 맞춰 「理由」

## 문서 갱신 예정
- `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md`: §4.3 취소 조건에 `status=APPROVED`(자동 승인 건) 명시 / 취소 확인 단계 버튼 [戻る][取り消す]와 성공 토스트 "休暇申請を取り消しました。" / 연도 선택지 범위(올해+1 ~ 올해−4) / 409 LEAVE_CONFLICT·422 INSUFFICIENT_LEAVE_BALANCE는 토스트(422는 요약 재조회) / 신청 후 이동 URL / 좁은 폭(md 미만) 카드 목록 / 승인자 후보는 화면 내 필터(이름·사원번호 부분 일치) / 승인자 필드 오류 "承認者を選び直してください。"
- `docs/09_DESIGN_SYSTEM.md` §6: `ApproverSelect`(props `{id,value,onChange,error,candidates,status,onRetry}`, 토큰 `inputClass`·`shadow-card`·`primary-30` 선택 항목, ARIA combobox), `form.tsx` `textareaClass`, `LeaveDetailModal`의 취소 단계(본인 신청이 PENDING 또는 자동 승인+시작일>오늘일 때 [取消 표시], `initialStep`에는 노출 안 함)
- `docs/10_DEVELOPMENT_ROADMAP.md` §6 프론트엔드·§9 화면 테스트 체크 갱신

## impeccable 점검
- 디자인 훅 검출 0건. 토큰만 사용(하드코딩 색·px 없음), 상태(로딩/에러/빈/비활성/오류)·키보드·`aria-*` 확인
- 점검 중 고친 점: 반차 선택 시 종료일을 별도 state 대신 파생값으로 고정(시작일과 항상 동기), 기간 오류 1개 FieldError를 시작·종료 입력 둘 다에 연결, 사유 글자 수는 코드 포인트 기준으로 초과 시 danger 색

## 화면 확인: 생략 (도구 없음)
- 브라우저/스크린샷 도구가 없어 데스크톱·375px 시각 확인은 하지 못함. 반응형은 클래스(`sm`/`md`/`lg` 분기, 표↔카드 목록)로만 구현 — 리뷰어 육안 확인 필요

## 검증
- `npx tsc --noEmit`, `npm run lint`, `npm run build` 통과 / `npx vitest run` 21파일 325건 통과
- `e2e/leaves.spec.ts`는 작성만 하고 실행하지 않음(E2E_ADMIN_PASSWORD 등 환경·실 백엔드 필요). 미검증
- `prettier --check`는 저장소 전체가 CRLF 때문에 이미 경고(기존 상태). 새 파일은 prettier로 정리함

## 임시 처리·백엔드 요청
- 없음. `/leaves/approvers`는 keyword 없이 1회 조회 후 화면에서 필터(후보가 매우 많아지면 서버 keyword 검색 전환 검토)
- 참고: SCR-005 scope=all에서 본인 신청이 열리면 [取消]가 보임(design-frontend 결정대로 공통 모달 규칙)

## Fix 1 (review.md Round 1, frontend 담당)
- `frontend/src/components/leave/ApproverSelect.tsx`
  - error/후보 0건 상태에서도 `error` prop을 `FieldError`(id `${id}-error`)로 표시
  - 활성/선택 배경 클래스 중복 해소: 선택 항목이면 `bg-primary-30`, 아니면 활성 항목만 `bg-general-30`(둘 중 하나만 부착)
  - 미해결(낮음): 위 상태에서는 input이 없어 `<label htmlFor>`·focusFirst 대상이 없음. 기존 안내 문구가 있어 현행 유지
- 문서 갱신 예정 추가: `docs/09_DESIGN_SYSTEM.md` §6 및 `.claude/work/context.md` "공용 모듈"에 `frontend/src/lib/leave-days.ts`(`countLeaveDays`, `parseLeavesQuery`, `yearOptions`, `LEAVE_STATUSES`, `isHalfDay`) 추가
- approvals/ 배하 및 SCR-006 docs의 기존 변경은 건드리지 않음. 테스트·화면 확인 미실행
