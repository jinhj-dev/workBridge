FRONTEND: REQUIRED
SECURITY_REVIEW: REQUIRED
DOC_ISSUES:
- 409 ALREADY_PROCESSED 문구: SCR-002 §상태 처리는 "이미 처리된 요청입니다.", SCR-005 §10은 "...목록을 새로고침합니다."이고, 공통 모달은 현재 서버 message를 그대로 보여줌 → 두 화면 모두 목록을 다시 조회하므로 공통 모달에서 SCR-005 문구로 통일하고 SCR-002 문구도 맞춤
- 사이드바 배지(03 전역 내비게이션)의 갱신 시점·표시 규칙이 문서에 없음 → 셸 표시 시·화면 이동 시·승인/반려 성공 후 다시 조회, 0건이면 숨김, 100건 이상은 "99+", 조회 실패 시 숨김(토스트 없음)
- SCR-005에 없는 세부: 비관리자의 `?scope=all`과 잘못된 `scope`·`page` 값은 `mine`·1로 간주(API 403을 일부러 부르지 않음). 보기 전환 시 1페이지
- 좁은 폭(md 미만) 표시 방식 문서에 없음 → 대시보드·SCR-008처럼 카드 목록, SCR-005에 기록
- 보기 전환 UI(Tabs)가 09 §6에 아직 없음 → `components/Tabs.tsx` 신규(SCR-004 탭에서도 재사용 예정), 09 §6에 추가
SUMMARY: 휴가 승인 화면 SCR-005(/leaves/approvals)와 사이드바 승인 대기 배지를 프론트엔드에 구현(백엔드 API-LEAVE-007~009는 이미 완료, 변경 없음)

## 승인용 설계 요약
- 범위(함): SCR-005 휴가 승인 화면(보기 전환·목록·페이지네이션·행의 [상세][승인][반려]), 사이드바 "휴가 승인" 메뉴의 승인 대기 건수 배지
- 범위(안 함): 백엔드 변경, SCR-004 휴가 관리, 휴가 신청 API, 승인 대기 실시간 갱신(폴링)
- 핵심 결정
  1. 승인·반려는 기존 공통 `LeaveDetailModal`을 재사용하고 `initialStep`(detail/approve/reject)만 추가. 행의 [승인][반려]는 상세 조회 후 바로 확인/사유 입력 단계로 열림. 처리 불가 상태로 바뀌었으면 상세 단계로 표시
  2. 권한 판정은 서버가 최종 기준. 화면은 ADMIN에게만 보기 전환을 보이고, 본인 신청 행은 [승인][반려] 비활성. 403·404·409는 모달을 닫고 토스트 + 목록·배지 다시 조회
  3. `scope`·`page`는 URL Query에 유지(새로고침·뒤로 가기 복원). 비관리자는 항상 `scope=mine`으로 호출
  4. 배지는 `GET /leaves/pending-approval?scope=mine&limit=1`의 `totalCount`(03 기준). AppShell이 한 번 조회해 Context로 `refresh()`를 제공하고, SCR-005·대시보드 승인 대기 처리 후 호출
- API: GET /leaves/pending-approval, GET /leaves/:id, PATCH /leaves/:id/approve, PATCH /leaves/:id/reject — 모두 06에 있고 구현 완료(신규 없음)
- 화면: SCR-005 휴가 승인(/leaves/approvals), 공통 셸 사이드바(배지)
- 변경 파일 수: 백엔드 0개 / 프론트 약 13개(신규 7)
- 프로젝트 문서 갱신 예정: SCR-005, SCR-002(409 문구), 03_SCREEN_LIST(배지 규칙), 09_DESIGN_SYSTEM §6, 10_DEVELOPMENT_ROADMAP
