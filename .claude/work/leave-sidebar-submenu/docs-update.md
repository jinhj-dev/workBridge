# docs-update: leave-sidebar-submenu

확인한 코드: `frontend/src/components/layout/SidebarSubmenu.tsx`, `Sidebar.tsx`, `ApprovalsAccess.tsx`, `AppShell.tsx`(Provider), `navIcons.tsx`(ChevronDownIcon), `app/(app)/leaves/LeaveManagementLayout.tsx`

## docs/03_SCREEN_LIST.md
- Screen List SCR-004 행: 탭 전환은 사이드바 休暇管理 하위 메뉴, 페이지 안 탭 UI 없음
- Screen Access Rules 「承認 탭 표시 판정」: 사이드바 하위 메뉴 承認에 적용됨을 명시
- 전역 내비게이션 표 휴가 관리 행: 하위 메뉴 3개 URL, 承認은 표시 대상만, 배지는 부모 행
- 전역 내비게이션 목록: 휴가 관리 하위 메뉴 동작(개폐 버튼·자동 펼침·접힘 유지·활성 표시·드로어 동일) 추가, 「休暇承認」 삭제 항목의 「承認 탭」→「承認 하위 메뉴」
- 좁은 폭: 하단 탭 休暇管理는 `/leaves` 링크(하위 메뉴 없음)
- Screen Flow: `/leaves ──[탭]──>` → `사이드바 休暇管理 ──[하위 메뉴]──>`

## docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md
- §1 URL·접근 권한: 사이드바 하위 메뉴로 전환
- §3 도입문: 화면 안 탭 UI 없음
- §3.0 → 「탭 (사이드바 하위 메뉴)」: 페이지 안 탭 UI 삭제, 하위 메뉴 링크·`aria-current`, 라우트·판정·가드 동일

## docs/09_DESIGN_SYSTEM.md
- §2.3 사이드바 메뉴: 하위 메뉴 항목 높이 40·왼쪽 padding 48
- §6 `NavTabs` 행 삭제, `Tabs` 행의 `NavTabs` 참조 삭제
- §6 `Sidebar.tsx` 행 갱신(휴가 관리 = `SidebarSubmenu`, 承認 조건, 배지는 부모 행)
- §6 `SidebarSubmenu.tsx`·`ApprovalsAccess.tsx` 행 추가
- §6 `navIcons.tsx` export에 `ChevronDownIcon` 추가
- §6 하단 「휴가 관리 공용 구조」: `NavTabs` 제거, `useApprovalsVisible()` 사용

## docs/10_DEVELOPMENT_ROADMAP.md
- §2 #6 프론트엔드에 「휴가 관리 사이드바 하위 메뉴」 [x] 추가(도메인 상태·§1 요약 변경 없음)
- §3 갱신 이력 2026-11-12 행 추가

## .claude/work/context.md
- SCR-004 기술 갱신(탭 UI 없음, SidebarSubmenu·ApprovalsAccess, NavTabs 삭제). 새 문서 없음 → 문서 맵 변경 없음

비고: `messages.leaveManagement.tabsLabel`은 docs에 기재가 없어 삭제할 문서 항목 없음
