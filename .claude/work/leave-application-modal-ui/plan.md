FRONTEND: REQUIRED
SECURITY_REVIEW: SKIP
DOC_ISSUES: SCR-004 §3.2(Radio·footer 텍스트 버튼·필수 표시 규칙 없음)와 09 §3 Modal "[취소(텍스트)]"가 요청과 다름 / 공통 Select 컴포넌트가 코드에 없음(`selectClass`만 있음) / 09 §6에 PR #18의 DetailTable·LeaveStatusBadge·Modal `icon`·`size`가 기록되지 않음(문서-코드 불일치) / 첨부 이미지의 承認者 "自動承認" Select + * 는 기존 방식(자동 승인 안내 문구)과 충돌
SUMMARY: 공통 휴가 신청 모달을 휴가 상세 모달과 같은 2열 표 디자인(lg·아이콘)으로 바꾸고, 休暇種別을 Select로, 검증과 일치하는 필수 * 표시를 공통 컴포넌트(FormTable·RequiredMark·Select·모달 버튼 클래스)로 구현한다

## 승인용 설계 요약
- 범위: LeaveApplyModal UI 재구성, 공통 컴포넌트 추가(FormTable/FormTableRow, RequiredMark, Select, 모달 footer 버튼 클래스, CalendarIcon 공용화), 테스트 갱신 / 하지 않는 것: 백엔드·API·enum 변경, 신청·검증·승인자 로직 변경, 기존 다른 화면의 select를 Select로 교체
- 핵심 결정
  1. 休暇種別 값은 기존 enum 5종(ANNUAL/HALF_AM/HALF_PM/SPECIAL/OTHER) 그대로 → 요청 5개 라벨과 1:1 일치, 데이터 매핑 변경 없음
  2. 필수 *: 休暇種別·開始日·終了日·理由 항상, 承認者는 승인 필요 사용자에게만(표시될 때만 필수). 申請日数·자동 승인 안내 행은 * 없음. * 표시 행의 컨트롤에 `aria-required` 부여해 검증(validate())과 같은 기준
  3. 모달은 `Modal size="lg"` + 달력 아이콘, 본문은 DetailTable과 같은 테두리·항목명 배경·구분선을 공유하는 FormTable
  4. [결정 필요] 제목 "休暇を申請"→"休暇申請"(추천: 변경), footer 버튼 높이 상세 모달과 같은 h-10(추천), 모바일(<sm)은 항목명 위·입력 아래 세로 배치(추천), 자동 승인 사용자는 기존 안내 문구 유지·* 없음(추천) — 상세는 decisions.md
- API: 변경 없음(기존 POST /leaves, GET /leaves/approvers 그대로)
- 화면: SCR-004 §3.2 공통 휴가 신청 모달(SCR-002·SCR-004에서 사용)
- 변경 파일 수: 백엔드 0개 / 프론트 약 13개(신규 5개: FormTable.tsx, Select.tsx, CalendarIcon.tsx, FormTable.test.tsx, Select.test.tsx)
- 프로젝트 문서 갱신 예정: 04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md(§3.2), 09_DESIGN_SYSTEM.md(§3 Modal, §6)
