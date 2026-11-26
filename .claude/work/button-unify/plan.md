MODE: FULL
BACKEND: SKIP
FRONTEND: REQUIRED
SECURITY_REVIEW: SKIP
PARALLEL: YES
DOC_ISSUES: (1) 09 §5-11·UI_BUTTON_PATTERNS §2.1 "수정 입구 = primaryOutline+Pencil"과 코드 불일치 2건: SCR-006 행 [編集] secondary(employee-management Fix 2), SCR-010 部署詳細 footer [この部署を編集] primary·아이콘 없음 / (2) 문서에 "상세 = 눈 아이콘" 규칙 없음(§2.1은 secondary만) — 신규 규칙 / (3) 문서에 버튼 문구 「修正」/「編集」 통일 규칙 없음 — 신규 / (4) 04 SCR-008 §5 "[수정]", SCR-010 §3 "[詳細](secondary)", 09 §6 leaveIcons 행 "SCR-008 修正"이 변경 후와 달라짐
SUMMARY: 詳細(secondary+目)·編集(primaryOutline+Pencil) 버튼을 공통 `DetailButton`·`EditButton`(Button 프리셋)으로 통일하고 「修正」 버튼 문구를 「編集」으로 바꾼다. 추가 공통화 후보는 보고서만

## 승인용 설계 요약
- 범위: 詳細 버튼 5곳(SCR-004·005×2·006·010)·編集/修正 버튼 6곳(SCR-006 행·詳細 모달·役職確認, SCR-008, SCR-010 행·詳細 모달) 통일 + 「修正」→「編集」(버튼과 그 aria-label만) + 후보 보고서. 하지 않는 것: 버튼 외 「修正」(모달 제목·설명·확인문·토스트·備考 「管理者修正」·툴팁), 링크·행 버튼(대시보드 「詳細を見る」·신청 행·이름 버튼·출근부 배지), 삭제·등록 등 다른 버튼 수정, 백엔드
- 결정 1: 기준 외형 = 詳細 `secondary`+EyeIcon, 編集 `primaryOutline`+PencilIcon. 표·카드 행 sm(36), 모달 footer md(40, D3'). 색·hover·focus·disabled는 Button variant 그대로(새 스타일 없음)
- 결정 2: 공통화 = 신규 `components/ActionButtons.tsx`(`DetailButton`·`EditButton`, 내부는 기존 `Button`). variant·icon 고정, 기본 문구 `messages.common.detail/edit`, `children`으로 문구 대체 가능(「この部署を編集」), `EditButton iconOnly` 지원. 화면별 `detail`/`edit` 키 7개 삭제
- 결정 3: EyeIcon을 `admin/users/icons.tsx` → `components/leave/leaveIcons.tsx`(PencilIcon과 같은 공용 위치)로 이동
- 결정 4: SCR-008 「修正」→「編集」, aria-label 「…の勤怠を修正」→「…の勤怠を編集」(WCAG 2.5.3 보이는 문구 ⊂ 접근 이름 유지 위해 필수)
- 결정 5: 기존 onClick·disabled(`busy`·`editing`·`!user`)·표시 조건(isSystem·권한)·aria-label 그대로. ESLint className 규칙 대상에 두 컴포넌트 추가
- 사용자 확인 필요(Q1~Q4): Q1 근태 확인 단계 [修正する] 유지? / Q2 役職確認의 아이콘 전용 編集을 primaryOutline 아이콘 전용으로(문구 없음 유지)? / Q3 SCR-008 표 조작 열 sr-only 헤더 「修正」 유지? / Q4 部署詳細 [この部署を編集] primary→primaryOutline+Pencil? (권장: Q1 유지, Q2 예, Q3 유지, Q4 예 — design-frontend §5)
- API: 없음
- 화면: SCR-004 休暇管理(/leaves), SCR-005 承認(/leaves/approvals), SCR-006 社員管理, SCR-008 全体勤怠管理, SCR-010 部署管理
- 변경 파일 수: 백엔드 0 / 프론트 12(신규 1) + eslint 1 + 테스트(tester) 신규 2·수정 6 + 보고서 1
- 프로젝트 문서 갱신 예정: 09_DESIGN_SYSTEM(§5-11·§6), UI_BUTTON_PATTERNS(§2.1·§9·§11 B18~·§12), 04 SCR-004·005·006·008·010, 10_DEVELOPMENT_ROADMAP, context.md

## 파일 소유 (PARALLEL: YES)
- frontend: `components/ActionButtons.tsx`(신규), `components/leave/leaveIcons.tsx`, `app/(app)/admin/users/icons.tsx`, `messages/ja.ts`, `admin/users/{UsersView,UserDetailModal,JobTitlesModal}.tsx`, `admin/departments/{DepartmentsView,DepartmentDetailModal}.tsx`, `admin/attendance/AdminAttendanceView.tsx`, `leaves/LeaveHistoryList.tsx`, `leaves/approvals/ApprovalsView.tsx`, `frontend/eslint.config.mjs`, `.claude/work/button-unify/candidates-report.md`
- tester: `components/ActionButtons.test.tsx`(신규), `e2e/button-unify.spec.ts`(신규), 수정 `e2e/{attendance,departments,departments-list-modal,leaves,button-c8,button-visual}.spec.ts`, 기존 `*.test.tsx` 중 실패하는 것(문구·키 변경 반영만)
- 예외: 없음. 루트 공용 파일(package.json 등) 변경 없음
