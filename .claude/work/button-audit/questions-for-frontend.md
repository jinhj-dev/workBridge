# 버튼 표준화 — frontend 검토 질문

> 대상 문서: `docs/UI_BUTTON_AUDIT.md`(BT01~BT80), `docs/UI_BUTTON_PATTERNS.md`(B1~B14 권장안 적용 상태), `docs/UI_BUTTON_REFACTOR_PLAN.md`.
> 답변 형식: 각 Q에 "가능/불가/조건부" + 난이도(소·중·대) + 위험 + 대안(있으면). 코드 수정은 하지 않는다(분석 단계).

| ID | 질문 | 관점 |
|---|---|---|
| Q1 | `buttonClass()`를 단계 1에서 기존 `form.tsx` 상수 8개와 **출력 클래스 집합이 동일**하게 만들 수 있는가? 특히 `modalDangerButtonClass`(P를 확장하지 않고 전체 재작성, Fd 포커스)와 `textButtonClass`(`rounded` 4, 크기 없음)를 같은 함수로 표현할 때 어긋나는 클래스가 있는지. B6(토큰 도입) 시 `h-10` → `h-btn-md`로 바뀌면 "동일 출력" 기준을 어떻게 둘지(계산값 동일로 볼지) | 재사용·위험 |
| Q2 | `Button` 아이콘 전용 판정을 `children` 생략 + 판별 유니온(`icon`·`aria-label` 필수)으로 할 때 TypeScript 타입이 `ButtonHTMLAttributes`와 충돌 없이 깔끔하게 나오는가? 별도 `iconOnly` prop이 더 단순한가 | 난이도 |
| Q3 | `Modal` footer D4 배치는 CSS `:has()`로 **footer 직계 자식 수**를 센다(09 §6 Modal). `Button`이 `<button>` 단일 요소만 렌더하면 판정이 그대로 유지되는가? `icon`·`Spinner`를 감싸는 `span`은 button 안쪽이라 영향 없다고 보는데 맞는가 | 위험 |
| Q4 | `ApprovalsView.tsx:53`의 `disabled:hover:bg-primary-60`이 Tailwind 4에서 실제로 필요한가(변형 출력 순서상 `disabled:bg-primary-60`이 `hover:bg-primary-90`보다 뒤라면 불필요). 반대로 다른 Primary 버튼(BT01·02·07)에서 disabled 상태 hover 시 색이 바뀌는 버그가 있는가 | 위험 |
| Q5 | B3 권장(44 폐지): ① 「休暇申請」을 모바일에서도 lg 48·px 24로 했을 때 360 폭 `PageHeader` 한 줄(제목 말줄임) 유지 여부 ② 「部署を追加」 40→48 시 SCR-010 헤더 높이 ③ 「条件をクリア」 44→40 시 `SearchInput`(44)·정렬 select(44)와 같은 줄 정렬이 어색하지 않은지 | 위험·디자인 |
| Q6 | B10 권장으로 勤怠 「修正」(SCR-008)에 `PencilIcon`을 쓰려면 `app/(app)/admin/departments/icons.tsx`를 勤怠 화면에서 import하게 된다. 그대로 cross import할지, 아이콘을 공용 위치(`components/…`)로 옮길지. 옮기면 `departments/icons.tsx` 사용처 수정 범위 | 재사용 |
| Q7 | B8 권장(월 이동 40)으로 출근부 헤더(前月·월 라벨·翌月·今月)가 36→40이 될 때 `attendance-sheet-layout.spec.ts` 등 레이아웃 단언이 깨지는가. 출근부의 로컬 `Chevron`(`AttendanceSheetView.tsx:43`)을 `leaveIcons`의 `ChevronLeftIcon`·`ChevronRightIcon`으로 바꿔도 모양(선 굵기 2 vs 1.75)이 수용 가능한가 | 위험 |
| Q8 | 텍스트 버튼(BT04·32·33·38, 높이 20)의 히트 영역 24 확보(B7) 방법: `text` variant에 세로 padding(`py-0.5`)을 넣으면 Card 헤더(`Card` 헤더 최소 높이 28)·표 행 높이에 영향이 있는가. 대안: 의사 요소로 히트 영역만 확장 | 난이도 |
| Q9 | `loading` 시 앞 아이콘을 Spinner로 바꾸는 규칙이 현재 사용처(아이콘 + loading 동시 사용 0건)에 문제 없는가. 현행처럼 Spinner를 문구 앞에 추가만 하는 편이 단순한가 | 단순성 |
| Q10 | 단계 3(모달)과 단계 4~6을 나누는 순서가 적절한가. `SectionError`(사용 22곳)를 단계 4에 넣었는데, 모달 안에서도 쓰이므로(`LeaveDetailModal`, `DepartmentMembersModal`) 단계 3으로 당기는 편이 회귀 확인에 유리한가 | 계획 |
| Q11 | 대상 외로 둔 V8~V11 중 같은 PR에서 함께 정리해야 회귀가 줄어드는 것이 있는가(예: `TopBar.tsx` `iconButtonClass`는 벨만 쓰므로 단계 6에서 제거 가능) | 범위 |
| Q12 | 단계별 예상 변경 파일(계획서 §2)에서 빠진 파일이 있는가(특히 테스트 파일 중 버튼 클래스를 단언하는 것: 현재 확인된 것은 `DepartmentsView.test.tsx:365-371`, `ConfirmDialog.test.tsx:61,64`) | 누락 |
