# 문서 반영 (leave-approval)

근거: frontend.md "문서 갱신 예정"(Fix 1 포함, Fix 1은 문서 갱신 항목 없음). backend.md 없음(백엔드 앱 변경 없음). 모든 항목을 실제 코드로 확인 후 반영.

## 반영한 문서·섹션
- `docs/09_DESIGN_SYSTEM.md` §6 구현된 공용 컴포넌트
  - 신규 행: `components/Tabs.tsx`(Pagination 다음), `components/layout/PendingApprovalCount.tsx`(Sidebar 다음)
  - 수정 행: `components/layout/Sidebar.tsx`(`pendingApprovalCount` prop, 카운터 배지 스타일·접근성), `components/leave/LeaveDetailModal.tsx`(`initialStep`, [취소] 분기, 409 문구)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-005_LEAVE_APPROVAL.md`
  - §3 보기 전환: URL Query 해석 규칙(비관리자 scope=all·잘못된 값 → mine, page 1 이상 정수 외 → 1, 보기 전환 시 1페이지)
  - §3 승인 대기 목록: 좁은 폭(md 미만) 카드 목록 + 하단 버튼 3개 (본인 신청 비활성은 기존 문서에 있어 변경 없음)
  - §5 상세보기: 행 [승인][반려]가 상세 조회 후 확인/사유 단계로 직접 열림, 처리 불가 시 상세 표시, [취소]는 닫기
- `docs/04_SCREEN_SPECIFICATIONS/SCR-002_DASHBOARD.md` §7 상태 처리: 409 ALREADY_PROCESSED 문구를 SCR-005와 통일
- `docs/03_SCREEN_LIST.md` Common UI Rules > 전역 내비게이션: 승인 대기 배지 갱신 시점·0건 숨김·99+·실패 시 숨김(토스트 없음)
- `docs/10_DEVELOPMENT_ROADMAP.md`
  - §1 요약표 7번 프론트엔드·상태 → 완료
  - §2 7. 휴가 승인 → 완료, SCR-005·사이드바 배지 `[x]`
  - §2 10. 화면 테스트 항목에 SCR-005·배지 추가(Vitest 화면 19·Tabs 3 외, Playwright 5건)
  - 최종 갱신일 2026-11-10, §3 갱신 이력 1행 추가
  - 근거: test-report.md Run 3(frontend unit 245, Playwright 23 전부 통과 — approvals.spec 5건 포함, backend unit 176, e2e 229). frontend.md의 "E2E 미실행"은 frontend 단계 기준이며 tester Run 1~3에서 실행됨

## .claude/work/context.md
- 공용 모듈: "아직 없음" 줄을 Tabs, PendingApprovalCountProvider/usePendingApprovalCount, LeaveDetailModal `initialStep`로 교체
- 명령어: backend `npm run db:e2e-attendance-reset` 추가(review.md Round 2 제안)
- 문서 맵 변경 없음(새 문서 없음)
