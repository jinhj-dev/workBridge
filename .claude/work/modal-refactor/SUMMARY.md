# 모달 리팩터링 — 아침 확인용 요약 (2026-11-13)

> 사용자 부재 중 feature-dev 파이프라인으로 진행. **설계 승인 게이트 없이 진행**했고, 미결 사항은 모두 권장안으로 처리.
> 브랜치 `feature/modal-refactor` (기준: `docs/modal-audit` = PR #28). **커밋·푸시 안 함.**

## 결과
| 단계 | 결과 |
|---|---|
| 설계 (architect) | plan.md / design-frontend.md / test-plan.md — C1~C6 청크로 분할 |
| 구현 (frontend) | C1 공통 기반 → C2 ConfirmDialog → C3 외형 ①'·footer·제목 아이콘 → C4 FormModal(M05·M01·M08) → C5 Detail/List → C6 중복 정리(FormRow 삭제) |
| 테스트 (tester) | Run 1 FAIL(取消 확정 단계 포커스) → 수정 → Run 2·3 **PASS**: tsc·lint 0, Vitest 50파일 **724건** 통과, Playwright `modal-a11y` 1건 통과 |
| 리뷰 (reviewer) | Round 1 CHANGES_REQUESTED(중간 2) → 수정 → Round 2 **APPROVE** (선택 낮음 2건 남음) |
| 보안 | plan에서 SKIP (UI만 변경) |
| 문서 반영 (architect) | 09, SCR-010/004/008/002, 03, UI_MODAL_PATTERNS/REFACTOR_PLAN, 10 로드맵, context.md — docs-update.md |

변경: 수정 33파일(+785/−472), 신규 9파일(ConfirmDialog, FormModal, ReadOnlySummary, 각 테스트, form.test, e2e modal-a11y). backend 변경 없음.

## 권장안으로 정한 것 (plan.md "사용자 부재로 권장안 적용" 표)
- U1 部署詳細 제목 아이콘 + 히어로 아이콘 둘 다 유지
- U2 申請日数는 회색 박스 없이 일반 텍스트
- U3 입력칸 장식 아이콘(IconField)은 표준화하지 않음 (部署登録만 유지)
- U4 등록 모달 제목은 코드의 「部署登録」 기준 (명세 갱신)
- 새 일본어 문구: 「新しい休暇を申請します。」「休暇の理由を入力してください」「出勤・退勤時刻を修正します。」, 글자 수 표기 「n/max」로 통일
- 勤怠修正 모달 420px → 640px (FormTable 적용 때문)
- 그 외 A1~A10 (plan.md)

## 사용자 확인 필요
1. **브라우저에서 포커스 왕복 확인**: 休暇詳細 承認·却下·取消 단계 진입/복귀, 勤怠修正 확인 단계 [戻る]. 단위 테스트(jsdom)로만 검증됨.
2. **`npm run build`**: 3000 dev 서버가 `.next` 사용 중이라 미실행.
3. **기존 Playwright 회귀**(dashboard, departments, leaves, approvals, attendance 등): 개발 DB에 쓰기 때문에 미실행.
4. **dashboard-renewal.spec.ts 실패 8건**: E2E 계정·픽스처 초기화가 필요 (Run 1에서 실수로 실행됨).
5. **개발 DB 정리 여부**: Run 1 실행으로 E2E 계정의 오늘자 attendance 1건(출근·퇴근 약 4초 간격)이 생긴 것으로 추정. 휴가 신청은 0건. 정리하려면 `npm run db:e2e-attendance-reset`.
6. **미촬영 스크린샷**: M06 承認·却下, M07 날짜별 휴가자, M09 退勤確認 (개발 DB에 데이터 없음). 전후 스크린샷 비교(`screenshots/before` ↔ `after`, 48장)는 일부만 육안 확인.
7. **접근성 수동 점검**(Tab 순환, 스크린 리더).
8. 선택 낮음 2건: DepartmentFormModal 100건 조건 중복, 해당 음성 테스트 약함 (review.md Round 2).
9. 범위 밖: U5(部署コード 편집 불가 여부), L1(글자 수 계산 방식 차이), 却下 사유 라벨 위 배치와 PATTERNS §5.2 충돌.

## 문서 위치
- 작업 기록: `.claude/work/modal-refactor/` (plan, design-frontend, frontend, test-report, review, docs-update)
- 스크린샷: `.claude/work/modal-refactor/screenshots/before`, `after` (git 무시 대상)

## 브랜치
- 변경 확인: `git diff docs/modal-audit` (작업 트리, 미커밋)
- 되돌리기: `git checkout -- . && git clean -fd frontend/src frontend/e2e .claude/work/modal-refactor` 후 `git checkout docs/modal-audit && git branch -D feature/modal-refactor`
- PR #28(설계 문서)을 먼저 머지한 뒤 이 브랜치를 커밋·PR 하는 순서를 권장.
