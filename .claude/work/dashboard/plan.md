FRONTEND: REQUIRED
SECURITY_REVIEW: REQUIRED
DOC_ISSUES:
- 범위: SCR-002가 쓰는 API 9개가 모두 미구현이고 그중 8개는 로드맵 §5·6·7 소속(Role Guard는 §4). 이번에 함께 구현하는 안으로 설계함. 분리하려면 승인 시 지정
- SCR-002 §3 "전역 헤더(메뉴)"는 03·09 §5의 좌측 사이드바 결정과 표현이 어긋남 → 03 기준(사이드바+상단바)으로 구현
- 좁은 폭(<lg) 사이드바 배치가 문서에 없음(09 §5-3: 구현 시 결정·기록) → 드로어+햄버거로 정하고 03에 기록
- SCR-002 §7 "부여 연차 미등록" 판별 불가(API-LEAVE-006은 미등록도 0) → grantedDays=0이면 안내 표시
- 06에 없는 세부: LEAVE-006 `year` 범위, 비UUID :id, ATT-003 `null` 본문, `Leave.processedBy` 형태(예시가 null뿐) → 2000~2100 외 400 / 404 NOT_FOUND / JSON `null` / `UserSummary` 객체(상세 모달에 처리자 이름 표시)로 정함
SUMMARY: /dashboard(SCR-002)와 앱 공통 셸(사이드바·상단바·로그아웃·라우트 가드), 대시보드가 호출하는 백엔드 API 9개와 Role Guard·도쿄 날짜 유틸을 구현

## 승인용 설계 요약
- 범위(함): SCR-002 전체, 휴가 상세 모달(승인·반려만), 공통 셸·라우트 가드(비로그인·mustChangePassword), 로그인 후 redirect//dashboard 이동(임시 팝업 제거), 백엔드 API 아래 9개 + Role Guard
- 범위(안 함): 휴가 신청·이력·취소, 근태 이력·관리자 근태, SCR-003~008 화면, 사이드바 승인 대기 배지, 비관리자 /admin/* 화면 가드(관리자 화면 없음), /password의 셸 적용
- 핵심 결정
  1. "오늘"은 주입 가능한 Clock + Asia/Tokyo 공통 유틸 하나로 계산(05 §9, 08 §3)
  2. Role Guard는 `@AdminOnly()` 데코레이터 + JwtAuthGuard 안에서 순서대로 검사(인증→비번변경→역할), 위반 시 403 FORBIDDEN
  3. 승인·반려·퇴근은 상태 조건부 UPDATE, 0건이면 409(05 §8). 출근 중복은 UNIQUE 위반을 409로 변환
  4. 대시보드 4영역은 독립 조회·독립 실패. 휴가 상세 모달은 하나의 Modal 안에서 상세→확인→반려 사유 단계 전환
  5. 사이드바는 03 메뉴 전부 표시(미구현 화면은 해당 기능 구현 전까지 404)
- API: GET /admin/dashboard/summary, GET /attendance/today, POST /attendance/clock-in, POST /attendance/clock-out, GET /leaves/balance, GET /leaves/pending-approval, GET /leaves/:id, PATCH /leaves/:id/approve, PATCH /leaves/:id/reject — 모두 06에 정의됨(신규 엔드포인트 없음)
- 화면: SCR-002 대시보드(/dashboard), 공통 셸, SCR-001 로그인(이동 처리만 수정)
- 변경 파일 수: 백엔드 약 32개(신규 28) / 프론트 약 27개(신규 22)
- 프로젝트 문서 갱신 예정: 10_DEVELOPMENT_ROADMAP, 09_DESIGN_SYSTEM §6, 03_SCREEN_LIST(전역 내비게이션), SCR-002, 06_API_SPECIFICATION(DOC_ISSUES 확정분)
