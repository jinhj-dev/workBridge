# frontend 검토 요청 (modal-audit)

대상 초안: `docs/UI_MODAL_AUDIT.md`, `docs/UI_MODAL_PATTERNS.md`, `docs/UI_MODAL_REFACTOR_PLAN.md`
결과는 `.claude/work/modal-audit/frontend-review.md`에 작성. 각 항목에 "동의 / 수정 제안 / 근거(파일:라인)" 형식이면 충분하다.
코드·docs 수정은 하지 않는다(분석 전용).

## A. 코드 대조 (AUDIT 정확성)
- A1. AUDIT §3 `Modal` 실측표와 §4 M01~M09 수치(클래스·라인)가 코드와 맞는지. 특히 M01 footer 버튼 높이(44→48), FormTable 라벨 셀 padding.
- A2. 모달 누락 여부. 판별 기준(AUDIT §1.1) 밖의 오버레이나 `<dialog>`가 있는지, 제외 판정(§1.3: 드로어·메뉴·listbox·tooltip·toast·모바일 캘린더 인라인 목록)에 이견이 있는지.
- A3. AUDIT §9 D5: 所属社員確認의 SCR-010 명세(5열·入社日 없음·내부 스크롤·페이지 없음)와 코드(7열·카드·5명 페이지) 중 어느 쪽이 최신 의도인지 커밋 이력(PR #24 등)으로 확인 가능한지.

## B. 공통화 가능성·구현 난이도
- Q1. `FormModal` 래퍼를 만들 가치가 있는가? 대상은 M01·M05(+ 향후 SCR-006 사원 등록). M08(입력→확인 단계)은 래퍼 밖에 두는 게 나은지, `footer` 덮어쓰기 prop을 두는 게 나은지.
- Q2. 외형 안 ①(form 계열: radius 16·soft 그림자·padding 32·제목 24)을 md(420) 확인 모달에 적용했을 때 시각적으로 과하지 않은지. size md만 제목 `text-h6` 고정하는 안의 구현 복잡도.
- Q3. 네이티브 `<dialog>` 동작 확인: (a) `showModal()` 직후 초기 포커스가 어디로 가는지(현재 DOM 순서상 X 버튼이 먼저), (b) 닫힌 뒤 여는 버튼으로 포커스가 복귀하는지, (c) `cancel` 이벤트 `preventDefault`로 Esc 차단이 Chrome·Safari·Firefox에서 연속 Esc까지 유지되는지(close watcher). 차단이 보장되지 않으면 `busy` 대안(onClose에서 상태 재동기화 등).
- Q4. ConfirmDialog에 `role="alertdialog"`를 `<dialog>`에 지정하는 것이 테스트(`getByRole('dialog')` 사용처)와 스크린 리더에 문제 없는지.
- Q5. `subtitle`(배지 슬롯)과 신규 `description`(설명문)을 분리할 때 prop 이름(`subtitle` 유지 vs `headerExtra` 등)과 기존 호출부(M01·M03) 이행 비용.
- Q6. `modalDangerButtonClass`(채움형) hover를 `hover:bg-danger-100/90`(투명도 변형)으로 구현 가능한지, disabled 표현 제안. 신규 토큰 없이 가능한지.
- Q7. 단계형 확인(M06 승인·취소, M08 확인)의 문장 요소를 `ConfirmMessage`로 export할 가치가 있는지, 아니면 클래스 상수로 충분한지.
- Q8. `FieldHint`·`CharCount` 추출 시 M01(UTF-16 `length`)과 M05·M06(코드포인트) 계산 차이를 호출부에 남기는 설계(`length`를 prop으로 받음)에 문제가 없는지.
- Q9. FormRow로 M05(FormTable)를 옮길 때 `labelId` 행(읽기 전용 「申請日数」, 자동 승인 안내 :273, :330)을 FormRow가 지원해야 한다. `FormRow`에 `htmlFor` 대신 `labelId`를 허용하는 확장이 필요한지.

## C. 리팩터링 계획
- C1. REFACTOR_PLAN §1 모달별 난이도·예상 변경 파일이 현실적인지, 누락된 테스트·호출부가 있는지.
- C2. 단계 1(Modal 외형 일괄 변경)을 먼저 하는 순서가 위험하다면 대안 순서(예: ConfirmDialog를 먼저) 제안.
- C3. `Modal.test.tsx` 등 클래스 단정 테스트를 역할·접근성 기반 단정으로 바꾸는 것이 좋을지.
