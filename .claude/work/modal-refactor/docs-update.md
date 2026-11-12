# docs-update — modal-refactor (8단계 문서 반영)

근거: frontend.md "문서 갱신 예정"(C1~C6, 루프 A/B, :207-215 통합 목록), plan.md 문서 갱신 예정, REFACTOR_PLAN §7, test-report Run 3. 코드 대조: `Modal.tsx`, `ConfirmDialog.tsx`, `FormModal.tsx`, `ReadOnlySummary.tsx`, `FormTable.tsx`, `DetailTable.tsx`, `form.tsx`, `Select.tsx`, `ApproverSelect.tsx`, `LeaveApplyModal.tsx`, `DepartmentMembersModal.tsx`, `DepartmentFormModal.tsx`, `AttendanceEditModal.tsx`, `ja.ts`.

## 반영한 문서와 섹션

| 문서 | 섹션 | 내용 |
|---|---|---|
| `docs/09_DESIGN_SYSTEM.md` | §3 컴포넌트 Button 행 | Danger 아웃라인/채움 2종 구현, 모달 취소 = 아웃라인, disabled 대비 예외 1줄 |
| | §3 컴포넌트 Modal 행 | 제목 아이콘 필수, [취소(아웃라인)] [확인(채움, 위험 = 빨간 채움)] |
| | §5 신규 10 | 모달 공통 패턴 요약(유형·외형 ①'·폼·버튼·동작·금지·예외 절차·사용 예시) |
| | §6 form.tsx 행 추가 | `modalPrimary/Secondary/DangerButtonClass`, `confirmMessageClass`, `FieldHint`, `CharCount` |
| | §6 `Modal` 행 교체 | 시그니처(`icon` 필수, `description`·`busy`, `variant` 삭제), 외형 수치, footer 개수별 배치, 초기 포커스·단계 전환 포커스, 모달별 아이콘 자산 |
| | §6 신규 행 | `ConfirmDialog`, `FormModal`, `ReadOnlySummary`, `FormTable`, `DetailTable`, `Select`(`autoFocus`) |
| | §6 `ApproverSelect` 행 | `describedBy?` 추가 |
| | §6 `FormRow` 행 | 삭제 |
| | §6 `LeaveApplyModal` 행 | Radio·텍스트 취소 → FormModal·FormTable·Select·아웃라인, 힌트 연결·CharCount·placeholder |
| `docs/03_SCREEN_LIST.md` | 공통 UI 규칙 > 모달 | 모든 모달 제목 아이콘, 09 §5-10·PATTERNS 참조 1줄 (frontend.md C3 항목) |
| `docs/04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md` | §4 部署詳細 모달 | lg·건물 제목 아이콘, 히어로 중복 유지(U1) |
| | §5 등록·수정 1·2 | 제목 「部署登録」(U4), FormModal lg·설명문·FormTable·n/500·초기 포커스 部署コード·describedby, footer 아웃라인·제출 중 닫기 차단 |
| | §5 所属社員確認 | D10 코드 기준: lg 이상 6열+화살표 열(入社日 포함), lg 미만 카드, 5명 페이지(sm 미만 compact), 내부 스크롤·최소 폭 삭제, 入社日 범위 밖 문구 삭제 |
| | §5 삭제 | ConfirmDialog danger·휴지통 아이콘·Notice warning·빨간 채움·초기 포커스 キャンセル·제출 중 차단 |
| `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md` | §3.2 공통 휴가 신청 모달 | FormModal·설명문·FormTable·Select·申請日数 일반 값(U2)·힌트 연결(D13)·placeholder·n/500·초기 포커스·아웃라인 취소 |
| | §4.3 휴가 취소 2 | 取消 확정 빨간 채움, [돌아가기] 초기 포커스, 복귀 시 [취소] 포커스 |
| `docs/04_SCREEN_SPECIFICATIONS/SCR-008_ADMIN_ATTENDANCE.md` | §5 근태 수정 1·3 | lg·시계 아이콘·설명문·ReadOnlySummary·FormTable·出勤時刻 필수 표시·초기/복귀 포커스·제출 중 차단 |
| `docs/04_SCREEN_SPECIFICATIONS/SCR-002_DASHBOARD.md` | 출근/퇴근 2 | 들어가기/나가기 아이콘, 확정 버튼 초기 포커스, 요청 중 キャンセル·X 비활성·Esc 차단 |
| `docs/UI_MODAL_PATTERNS.md` | §2.1 I-6 | 아이콘 자산 정정(TrashIcon·ClockIcon 기존 재사용, stroke 1.75) |
| | §7 | 단계 전환 포커스 행 추가(루프 A/B) |
| | §9.2 | U1~U4 "사용자 부재로 권장안 적용" 표시 + 적용 내용 |
| `docs/UI_MODAL_REFACTOR_PLAN.md` | 머리 상태 / §0 0-2·0-3 / §7 머리 / §8 | 진행 상태(단계 1~6 완료, 단계 7 일부 미검증), U1~U4 적용, before 이미지 확보·미확보, §7 반영 완료, A1~A10 기록 |
| `docs/10_DEVELOPMENT_ROADMAP.md` | 최종 갱신일, §2 #10 신규 항목(`[ ]`), §3 갱신 이력 | test-report Run 3 실제 결과만 기록, 미검증 9항목 명시(사용자 확인 대기) |
| `.claude/work/context.md` | 공용 모듈 :39·:57 부근, 문서 맵 | Danger 미구현 정정, 모달 부품 추가, FormRow 삭제, Modal props 갱신, UI_MODAL_* 3문서를 문서 맵에 추가 |

## 반영하지 않은 것
- `docs/UI_MODAL_AUDIT.md` §9(문서 불일치 D1~D7): 해소는 위 09·SCR·context.md 갱신으로 이루어졌으나, AUDIT는 리팩터링 전 조사 기록이라 수정하지 않았다(지시 대상 밖).
- `messages` 키 추가·삭제(`leaves.apply.description` 등, `leaves.apply.count`·`leave.reject.count` 삭제): 문구 사전은 코드라 프로젝트 문서에 별도 반영처 없음. 문구는 SCR 명세 본문에 반영.
- 기존 DOC_ISSUES (3) M06 却下 사유 라벨 위 배치(A7)는 PATTERNS §5.2 금지와 충돌한 채 유지(범위 밖).
