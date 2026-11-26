# docs-update — button-unify (문서 반영 모드)

근거: frontend.md "문서 갱신 예정"(초회~Fix 4), review.md Round 1·2 문서 관련 지적, plan.md DOC_ISSUES (1)~(4), decisions.md Q1~Q7. 코드 확인: `components/ActionButtons.tsx`, `DepartmentDetailModal.tsx`, `eslint.config.mjs`.

## 반영한 문서·섹션
- `docs/UI_BUTTON_PATTERNS.md`
  - 머리 상태 줄: v4(B18·B19)
  - §2.1 Variant 선택 규칙: 상세 열기 = secondary + Eye(`DetailButton`), 수정 입구 = primaryOutline + Pencil(`EditButton`), 문구 「編集」(DOC_ISSUES 2·3)
  - §4.6: ESLint 대상 요소 Button·DetailButton·EditButton
  - §4.7 신설: 역할 프리셋 `DetailButton`·`EditButton`(props, size 규칙, `children` 문구 대체는 예외적으로만 — review R1 낮음)
  - §6.2 접근 이름: 보이는 문구 ⊂ 접근 이름(B19에 따른 aria-label 동시 변경)
  - §9.1 사용 예시, §9.3 체크리스트 2번
  - §11: B18, B19, Q1~Q7 행 추가
  - §12: v4 행
- `docs/09_DESIGN_SYSTEM.md`
  - §5 11: 제목 B1~B19, 상세 Eye, 詳細·編集 공통 버튼과 「修正」→「編集」 범위(버튼 문구·aria-label·sr-only 열 제목만, [修正する] 등 대상 외) (DOC_ISSUES 1)
  - §6: `components/ActionButtons.tsx` 행 신설, `components/leave/leaveIcons.tsx` 행(PencilIcon 사용처 갱신 "SCR-008 修正" 제거, EyeIcon 추가) (DOC_ISSUES 4)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md` §신청 이력 표 操作: [詳細] DetailButton
- `docs/04_SCREEN_SPECIFICATIONS/SCR-005_LEAVE_APPROVAL.md` 표 操作: [詳細] DetailButton / 좁은 폭 카드 전환 `md`→`xl`(Q7, 사유)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-006_USER_LIST.md` §3 표 操作([詳細] DetailButton, [編集] EditButton secondary→primaryOutline), §4.1 役職確認(EditButton iconOnly, Q2), §4.3 社員詳細 footer(EditButton md)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-008_ADMIN_ATTENDANCE.md` §4 목록 구성 편집 열(sr-only 「編集」, Q3), §5 근태 수정 1번([修正]→[編集], 접근 이름, Q1 유지 범위) (DOC_ISSUES 4)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md` §3 並び替え(`xl` 미만), §4 목록 구성 전환점 `md`→`xl`(Q6, 「SCR-008と同じ」 삭제), 操作 열(DetailButton·EditButton), 표 5행 `xl` 이상·카드 `xl` 미만, 部署詳細 footer [編集](Q4·Q5), 등록·수정 모달 1번 진입 문구 (review R1 중간)
- `docs/08_TEST_PLAN.md` §7: SCR-005(xl 카드·approvals locator·button-unify P8), SCR-008([編集]·「修正」 버튼 0개·sr-only), SCR-010(xl 기준 3곳, 部署詳細 footer [編集]), "공통 버튼 詳細·編集" 행 신설(U1~U10, 화면 테스트, P1~P11, 미검사 SCR-005 1279/1280)
- `docs/10_DEVELOPMENT_ROADMAP.md` §2 #10: 詳細·編集 버튼 통일 [x] 항목 + 후속 과제(① SCR-005 1279/1280 경계 E2E 미검사 — review R2 낮음 ② candidates-report.md 추가 공통화 후보 요약 ③ format:check CRLF), §3 갱신 이력 행
- `.claude/work/context.md`: 공용 모듈(버튼 행 ESLint 대상, ActionButtons 행 신설, leaveIcons EyeIcon), 문서 맵 UI_BUTTON_PATTERNS v4

## 반영하지 않은 것
- `docs/UI_BUTTON_AUDIT.md`·`UI_MODAL_AUDIT.md`·`UI_BUTTON_REFACTOR_PLAN.md`의 「この部署を編集」 표기: 리팩터링 전 기준 조사·과거 계획 기록이라 그대로 둠
- UI_BUTTON_PATTERNS §3.1의 sm nowrap 이유 문구 속 「修正」: 기존 설명문이라 정리하지 않음
- 새 문서 없음(문서 맵 추가 없음)
