# 부서 관리 — 프론트엔드 구현 결과

## 생성·수정한 파일 (frontend/)
생성
- `src/app/(app)/admin/departments/` page.tsx, DepartmentsView.tsx(+test), DepartmentFormModal.tsx(+test), DepartmentDeleteModal.tsx
- `e2e/departments.spec.ts` (사이드바 진입·未所属 행 확인·등록→수정→삭제 흐름)
수정
- `src/components/layout/Sidebar.tsx` (ADMIN_MENU: 社員管理 → 部署管理 → 全体勤怠), `AppShell.test.tsx`(메뉴 7개 순서)
- `src/messages/ja.ts` (`nav.adminDepartments`, `departments` 섹션), `src/lib/api/types.ts` (`DepartmentDetail`)

## 구현한 화면
- SCR-010 부서 관리(部署管理) `/admin/departments`: 검색(코드·이름, URL Query `code`/`name`/`page`, `useSyncedState`), 표(md 이상)/카드형 목록(md 미만), 페이지네이션 20건, Loading/Empty/Error, 등록·수정 모달, 삭제 확인 모달
- 사용한 시스템 컴포넌트: Card, Modal, Badge(neutral), Pagination, SectionError, SkeletonLines, Spinner, Toast, form.tsx(inputClass, labelClass, FieldError, primary/secondary/textButtonClass), table.ts, useApiQuery, useSyncedState, format.ts
- 삭제: `memberCount > 0`은 API 미호출 + 에러 토스트, `inactiveMemberCount > 0`이면 확인 모달에 이동 안내. 409/404는 서버 message 토스트 + 모달 닫기 + 재조회. 현재 페이지의 마지막 1건 삭제 시 이전 페이지로 이동
- 未所属(`isSystem`): 「システム」배지, [編集][削除] 미표시
- 라우트 가드는 AppShell 기존 `/admin/*` 가드를 그대로 사용

## 새로 만든 시스템 컴포넌트
- 없음 (화면 전용 모달 2개만 화면 폴더에 둠)

## 화면 리스트와 다른 점
- 없음. 단, 검색 버튼 문구는 설계대로 「検索」(`departments.search`)이며 기존 화면의 「照会」와 다르다

## 문서 갱신 예정
- `docs/03_SCREEN_LIST.md`: SCR-010 부서 관리(`/admin/departments`, 관리자) 추가, 전역 내비게이션 관리자 메뉴에 部署管理(社員管理와 全体勤怠 사이) 추가
- `docs/04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md` 신규: design-frontend.md 「SCR-010 구성」「모달」을 명세화
- `docs/04_SCREEN_SPECIFICATIONS/SCR-006`·`SCR-007`: 부서 Select 필수화(구현은 사원 관리 작업에서). `docs/09_DESIGN_SYSTEM.md` §4 화면 대응에 SCR-010 행 추가(SCR-006 ○와 동일 구성). §6 추가 항목 없음
- `docs/10_DEVELOPMENT_ROADMAP.md`: 부서 관리 프론트 구현 완료(E2E 미실행 명시)

## impeccable 점검
- 디자인 훅 지적 없음. 토큰·시스템 클래스만 사용(hex/px 하드코딩 없음). 모달 submit은 `form` 속성으로 Enter 제출 가능, 편집·삭제 버튼에 대상 이름이 들어간 aria-label 부여, 숫자 열 `tabular-nums`·우측 정렬
- 수정: 미사용 변수 제거(lint 경고), 테스트 내 부자연스러운 코드 정리

## 검증
- `tsc --noEmit`, `npm run lint`, `npm run build` 통과. vitest 전체 24파일 379건 통과(신규 16건 + AppShell 메뉴 순서 갱신)
- Playwright E2E(`departments.spec.ts`): **미실행**. 개발 DB에 이 브랜치 마이그레이션이 적용되지 않았음(backend.md 환경 주의)

## 화면 확인
- 생략 (개발 DB 미마이그레이션으로 실제 API 연동 불가, 브라우저 도구 없음). 스크린샷 없음. 레이아웃은 SCR-008과 동일 패턴이나 실제 폭별 확인은 미실시

## 임시 처리·백엔드 요청
- 없음. SCR-006/007의 부서 필수화는 설계대로 이번 범위 밖

## Fix 1 (review Round 1, frontend 담당)
- [중간] 403 FORBIDDEN 처리: `DepartmentFormModal.tsx` handleError, `DepartmentDeleteModal.tsx` submit에서 403이면 서버 message 토스트 + `onClose()` + `onDone()`(재조회). AttendanceEditModal과 동일 방식(03 공통 UI 규칙 "모달 발생 시 닫고 토스트")
- 테스트 추가: `DepartmentFormModal.test.tsx`(shouldCloseAndRefetchWhenPermissionIsRevoked), `DepartmentsView.test.tsx` 삭제 실패 it.each에 FORBIDDEN(403) 케이스
- [낮음] Playwright 미실행 건: 환경 사유(개발 DB 마이그레이션 미적용)로 변경 없음. 병합 전 마이그레이션 적용 후 1회 실행 필요
- 검증: vitest departments 2파일 26건 통과, tsc, lint 통과

### 문서 갱신 예정 (Fix 1 추가분)
- `docs/03_SCREEN_LIST.md` 공통 UI 규칙: "기간 조회 = 照会 / 키워드 조건 검색 = 検索" 한 줄 추가
- `docs/04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md`(신규): 검색 버튼 문구를 「検索」로 명시
