# frontend: 休暇管理タブ → サイドバーサブメニュー

## 変更ファイル (frontend/)
- 신규 `src/components/layout/SidebarSubmenu.tsx` — 재사용 가능한 개폐 서브메뉴(props: label, icon, basePath, items, onNavigate, badge)
- 신규 `src/components/layout/ApprovalsAccess.tsx` — 承認 메뉴 표시 판정(관리자 true / 그 외는 기존과 같은 API 판정)을 AppShell에서 1회만 조회해 Context로 공유. 사이드바(데스크톱+드로어)와 `LeaveManagementLayout`이 같은 판정을 씀
- 수정 `Sidebar.tsx`(休暇管理을 SidebarSubmenu로, 件数 배지는 부모 행), `AppShell.tsx`(Provider 추가), `app/(app)/leaves/LeaveManagementLayout.tsx`(NavTabs·자체 판정 제거. 헤더·신청 버튼·모달·承認 직접 접근 가드는 그대로), `messages/ja.ts`(미사용 `leaveManagement.tabsLabel` 삭제)
- 테스트 갱신: `LeaveNavigation.test.tsx`, `AppShell.test.tsx`, `LeaveManagementLayout.test.tsx`, `e2e/leave-management.spec.ts`, `e2e/approvals.spec.ts` (탭 → 사이드바 서브메뉴 기준. assertion 약화 없음, 승인자 판정·가드 테스트 유지)
- 신규 `e2e/leave-sidebar-submenu.spec.ts` (데스크톱 열기/닫기·이동·Active·뒤로/앞으로/새로고침/직접접근, 모바일 드로어)

## 구현
- 休暇管理 행은 링크가 아니라 토글 버튼(`aria-expanded`/`aria-controls`). 하위: 自分の休暇(/leaves)·休暇カレンダー(/leaves/calendar)·承認(/leaves/approvals, 기존과 동일 조건: 관리자 또는 승인 의뢰가 있는 사원). 명칭은 기존 「承認」 그대로
- `/leaves*` 진입(직접/뒤로가기/타 메뉴에서 이동) 시 자동 펼침. 경로는 URL이 단일 기준이라 새로고침·뒤로/앞으로와 항상 일치. 열려 있는 중 사용자가 접으면 화면 이동 전까지 유지. 접힌 상태에서 하위 화면에 있으면 부모 행이 primary-30 배경으로 현재 위치 표시
- 디자인: 기존 행과 동일 높이/여백, 하위는 `pl-12` 들여쓰기·h-10, Active는 기존 `bg-primary-30 text-primary-100`(Primary 변경 없음), 화살표는 기존 `ChevronDownIcon`(열림 시 180도 회전). 애니메이션은 grid-rows 0fr↔1fr + opacity(200ms), `motion-reduce` 대응. 닫힘 중 `inert`+`invisible`로 포커스·읽기 제외
- 모바일: 드로어가 같은 `SidebarNav`를 쓰므로 자동 대응. 하단 탭바 休暇管理은 변경 없음(자신의 휴가 링크, /leaves* 에서 활성) — 드로어에서 서브메뉴를 쓰므로 바꿀 이유 없음
- 사용한 시스템 컴포넌트: 기존 `SidebarNav`, `navIcons`(ChevronDownIcon), `PageHeader`, 토큰 `primary-30/100`·`general-*`·`danger-100`

## 검증
- `npx tsc --noEmit` 통과 / `npm run lint` 오류 없음 / `npm test` 44 files 612 tests 전부 통과
- Playwright: 신규 2건 + 기존 `leave-management`·`approvals`·`leaves` 합 22건 통과(개발 DB: 기존 reset·fixture 스크립트 실행분만. 최종 `db:e2e-leaves-reset`로 원복됨)
- 화면 확인: 데스크톱 1440, 모바일 375 드로어. 스크린샷 `screenshots/desktop-open.png`, `desktop-calendar-active.png`, `mobile-drawer-open.png`, `mobile-drawer-active.png`. 초기 시 닫힌 항목이 Playwright에서 visible로 판정 → `invisible` 추가로 수정
- 미검증: 비승인자 사원의 사이드바(Playwright는 단위 테스트 + 기존 e2e의 2링크 확인으로 대체)

## 문서 갱신 예정
- `docs/03_SCREEN_LIST.md` 전역 내비게이션: 休暇管理은 개폐 서브메뉴(自分の休暇/休暇カレンダー/承認[승인자만]), 件数 배지는 부모 행, 하단 탭바 휴가관리는 `/leaves` 링크
- `docs/04_SCREEN_SPECIFICATIONS/SCR-004` §3.0: 경로 탭 UI 삭제 → 사이드바 서브메뉴로 이동(라우트·권한·가드 동일)
- `docs/09_DESIGN_SYSTEM.md` §2.3/§6: `SidebarSubmenu`(props·상태·애니메이션) 추가, `ApprovalsAccessProvider`/`useApprovalsVisible` 추가, docs/09 §6에서 NavTabs 행 삭제, `messages.leaveManagement.tabsLabel` 삭제
- `.claude/work/context.md`의 SCR-004 설명(경로 탭 3개)도 같은 내용으로 갱신

## 남은 점

## NavTabs 삭제 (사용자 결정)
- 삭제: `frontend/src/components/NavTabs.tsx` (grep 결과 자기 파일 외 참조 없음, 전용 테스트·메시지·스타일 없음. `NavTabItem` 타입도 함께 소멸)
- 검증: `npx tsc --noEmit` 통과 / `npm run lint` 오류 없음 / `npm test` 44 files 612 tests 통과
- 화면 리스트와 다른 점 없음. 백엔드 수정 없음
