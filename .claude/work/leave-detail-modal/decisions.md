# leave-detail-modal 결정 항목 (★ = 추천안)

데이터 확인 결과(결정 불필요, 기존 필드로 충족):
- 申請者: `leave.user.{name, empId, departmentName}`. users.department_id는 NOT NULL이고 미소속은 시스템 부서 `未所属`(code `UNASSIGNED`)의 이름으로 이미 내려온다. 타입상 `departmentName: string | null`이므로 null일 때만 `messages`의 「未所属」로 대체.
- 承認者: `autoApproved`(백엔드 `leave.mapper.ts`에서 `approverId === null`로 계산) / `approver: UserSummary | null`. 자동 승인 = `autoApproved: true`, 수동 = `approver.name`. 임의 관리자명 대체 없음.
- 処理者·処理日時: `processedBy: UserSummary | null`, `processedAt: string | null`(+09:00). 자동 승인 건은 신청 시 `processedBy = 신청자`, 취소 건은 `processedBy = 취소한 본인`(leaves.service.ts·repository.ts). 표시는 `formatTokyoDateTime`(도쿄 기준 `YYYY/MM/DD HH:mm`).
- 日数: `leave.days`(서버 계산, 반차 0.5) → `formatDays` → `1日`/`0.5日`/`2日`.
- 取消 상태: `CANCELLED` 존재. 문구만 현재 `取消`.
- Modal: `components/Modal.tsx`(`<dialog>` showModal, Esc·X 닫기, 포커스 트랩). 배경 스크롤 잠금·내부 스크롤 없음.
- Badge: `components/Badge.tsx`(neutral/success/danger/dark, rounded/pill). 휴가 상태 매핑 `LEAVE_STATUS_BADGE`는 LeaveDetailModal.tsx에 있고 LeaveHistoryList(표·카드·필터)·AttendanceSheetView(申請 배지)가 import.
- 승인 목록(`ApprovalsView`)·대시보드 승인 대기(`PendingApprovalsSection`)는 PENDING만 다루며 상태 Badge 열이 없다 → 상태 Badge 변경 영향 없음, 모달만 공유.

| ID | 항목 | 선택지 | 추천 이유 |
|---|---|---|---|
| D1 | 承認待ち 주황 / 取消済み 회색 색 매핑 | ★A Badge에 `warning` variant 추가: 배경 Yellow 40 `#FFF4C9`(신규 토큰 `warning-40`) + 글자 `general-100`. 아이콘 색에 Yellow 100 `#F99600`(신규 토큰 `warning-100`). CANCELLED는 `dark`→`neutral`. `LEAVE_STATUS_BADGE`를 고쳐 모든 휴가 상태 표시(이력 표·카드·상태 필터 버튼·출근부 申請 배지·모달)에 동일 적용 / B 주황 글자(`#F99600`)·흰 배경 그대로 / C 모달에서만 새 색 | 09 §2.1에 Yellow 팔레트·"경고 배지 Yellow 100"이 이미 있어 새 색 창작이 아님(@theme에 옮기기만). B는 글자 대비 약 2.2:1로 09 §6 대비 결정(WCAG AA) 위반. C는 "같은 디자인 사용" 요구와 충돌. 현재 PENDING=neutral(회색)·CANCELLED=dark(진회색)이라 A 적용 시 SCR-004 이력·필터 색이 바뀜(의도된 변경) |
| D2 | 상태 Badge 형태·아이콘 | ★A 신규 `LeaveStatusBadge({status, children?})`가 `Badge shape="pill"` + 앞 아이콘(承認済み ✓ `success-100`, 承認待ち 시계 `warning-100`, 却下 ✕ `danger-100`, 取消済み 슬래시 원 `general-80`, 모두 `aria-hidden`)을 렌더. `LEAVE_STATUS_BADGE`는 이 파일로 이동. 사용처 전부 교체 / B 아이콘 없이 색만 / C 모달에서만 pill+아이콘 | 이미지가 pill+아이콘. 아이콘은 장식(문구가 의미 전달)이라 대비 요건 밖. 상태 Badge 중복 구현 금지 요구 → 한 컴포넌트로 통일. 출근부 申請 배지는 `children`으로 `休暇 承認済み` 문구 유지 |
| D3 | 取消 문구 | ★A `messages.leave.statuses.CANCELLED`를 `取消済み`로 변경(이력·필터·모달 모두) / B 모달에서만 `取消済み` | 요청 표기와 일치, 문구 사전 단일 관리. e2e는 `messages` 참조라 깨지지 않음 |
| D4 | 処理者·処理日時 행 | ★A 항상 표시, 미처리(processedAt null)는 둘 다 「—」(`messages.common.noValue`) / B 현행(처리된 건만 표시, SCR-004 §4.4) | 요청 명시. SCR-004 §4.4 문구를 갱신(DOC_ISSUE) |
| D5 | 却下理由 행 | ★A REJECTED일 때만 処理日時 다음(마지막)에 표시(현행 유지) / B 삭제(이미지·요청 목록에 없음) | SCR-004 §4.4 필수 항목이고 반려 사유를 볼 곳이 이 모달뿐. 이미지 예시는 APPROVED라 행이 없을 뿐 |
| D6 | 기간 구분자 | ★A `lib/format.ts` `formatPeriod`를 `2026/11/10 ～ 2026/11/12`(전각 U+FF5E, 앞뒤 공백)로 전역 변경(이력·승인 목록·대시보드 승인 대기도 같은 표기) / B 모달 전용 포맷 추가, 다른 화면은 "~" 유지 | 같은 값의 표기를 화면마다 다르게 두지 않음. 변경 1줄 + format.test·LeaveDetailModal.test 기대값 갱신 |
| D7 | 모달 폭 | ★A `Modal`에 선택 prop `size?: 'md' \| 'lg'`(기본 md = 현행 최대 420, lg = 최대 640). LeaveDetailModal만 lg / B 모든 모달 확대 | 2열 표는 420에서 값 열이 좁음(이미지 비율 약 660). 다른 모달은 폼·확인용이라 현행 유지 |
| D8 | Modal 공통 구조 변경 범위 | ★A 전 모달(7곳) 공통: 헤더(선택 `icon` prop) / 본문 `overflow-y-auto` 내부 스크롤(dialog 최대 높이 `100dvh - 2rem`, 헤더·푸터 고정) / 푸터 상단 1px `general-40` 구분선 / 좌우 padding `px-5 sm:px-7`(Card와 동일) / 배경 스크롤 잠금(`globals.css` `html:has(dialog:modal) { overflow: hidden }`). radius 6·`shadow-card`·backdrop `general-100/50`은 유지 / B 상세 모달에만 적용(prop으로 opt-in) | 요청이 Modal Header/Footer 공통화와 "같은 디자인". 스크롤 잠금·내부 스크롤은 모든 모달에 필요한 동작. 시각 변화는 푸터 구분선과 모바일 padding뿐 → 7곳 수동 확인 계획(test-plan T-REG) |
| D9 | 바깥(overlay) 클릭 | ★A 닫지 않음(현행 `<dialog>` 기본 동작 유지) / B 닫음 | 현재 모든 Modal이 바깥 클릭으로 닫히지 않음(문서 규칙은 없음). 승인·반려 입력 중 실수로 닫히는 것을 방지. 09 §6 Modal 행에 명시 |
| D10 | 항목명 열 배경 | ★A `general-30`(#F5F6FA, 페이지 배경 토큰) + 글자 `general-80` 14/20 Medium / B `primary-30`(#ECF2FF, 연파랑) | 이미지의 연보라는 브랜드 색 차이(보라 토큰 없음). A가 "연보라/회색" 중 회색 쪽이며 09 "표 첫 열 Medium" 규칙과 일치. B는 페이지네이션 활성·hover 의미와 겹침 |
| D11 | 이미지와 다르게 두는 것 | ★A 토큰 유지: radius 6(이미지 약 16), `shadow-card`(이미지는 짙은 그림자), primary 파랑(이미지 보라), 아이콘 박스 `primary-30` 배경 + `primary-100` 아이콘 / B 새 radius·그림자 토큰 추가 | 09 §5-4 "토큰만 사용", §6 "토큰은 @theme 값만". 새 토큰은 다른 화면과 불일치를 만듦 |
