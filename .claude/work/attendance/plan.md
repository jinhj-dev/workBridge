FRONTEND: REQUIRED
SECURITY_REVIEW: REQUIRED
DOC_ISSUES:
- 범위: 로드맵 §5 근태의 남은 항목 전부(API-ATT-004~006, SCR-003, SCR-008)에 SCR-008이 쓰는 API-DEPT-001(로드맵 §8 소속)과 비관리자 `/admin/*` 화면 가드(§4)를 더해 설계함. SCR-003만 먼저 하려면 승인할 때 말해 주면 됨
- SCR-003 비고 "관리자 수정"을 판별할 필드가 06 `Attendance`에 없음 → `modifiedAt: string | null` 추가(ATT-001~006 응답 공통)
- ATT-004 기본 기간: 06은 "이번 달", SCR-003은 "1일~오늘" → 서버 기본값은 이번 달 1일~오늘(도쿄). 기간은 양끝 포함 366일 이하(08 IT-ATT-10)
- 06에 없는 세부: 형식 오류(날짜·일시·departmentId·status) → 400 VALIDATION_ERROR / UUID가 아닌 :id → 404 / `name`은 대소문자 무시 부분 일치 / 비활성 사용자 기록도 전체 조회에 포함
- ATT-006 `clockOut`: `null` 허용(오늘 근무 중 기록은 출근 시간만 고칠 수 있게), `clockIn`은 필수 → 미입력 문구 "출근 시간을 입력해주세요."를 새로 정함. SCR-008 기간도 SCR-003처럼 필수로 검증
- 좁은 폭에서 표를 어떻게 보여줄지 문서에 없음(09 §5-3) → `md` 미만은 카드 목록(대시보드와 같은 방식)으로 하고 SCR-003·008에 기록. 사원명 링크 대상 SCR-007은 아직 없어 그 화면이 생길 때까지 404
SUMMARY: 개인 근태 이력(SCR-003), 관리자 전체 근태 조회·수정(SCR-008)과 이 화면들이 쓰는 API 4개, 비관리자 /admin/* 화면 가드를 구현

## 승인용 설계 요약
- 범위(함): API-ATT-004·005·006, API-DEPT-001, SCR-003, SCR-008(수정 모달 포함), 비관리자 `/admin/*` 화면 가드(→ `/dashboard` + 토스트)
- 범위(안 함): SCR-006·007, 사이드바 승인 대기 배지, 근태 신규 등록·삭제, 수정 이력 보관(마지막 수정자·수정 시각만 저장)
- 핵심 결정
  1. 상태는 계산값. 상태 필터는 도쿄 "오늘"을 넣은 WHERE로 바꿈(WORKING: 오늘·퇴근 없음 / DONE: 퇴근 있음 / MISSING: 오늘 이전·퇴근 없음)
  2. 본인 이력은 토큰의 사용자로만 조회(사용자 지정 파라미터 없음). 전체 조회·수정은 `@AdminOnly()`
  3. 수정 시각 검증(퇴근 > 출근, 출근이 근무일 안, 퇴근 ≤ 출근 + 24시간)은 서비스가 400 INVALID_TIME_RANGE로 처리하고 DB CHECK는 최종 방어. modified_by·modified_at 기록
  4. 검색 조건·페이지는 URL Query에 유지. 기간 검증은 두 화면이 공유. 동시 수정은 나중에 저장한 값이 남음(잠금 없음)
- API: GET /attendance, GET /admin/attendance, PATCH /admin/attendance/:id, GET /departments — 모두 06에 있음(신규 없음, `modifiedAt` 필드만 추가)
- 화면: SCR-003 근태 관리(/attendance), SCR-008 전체 근태 관리(/admin/attendance), 공통 셸(관리자 가드)
- 변경 파일 수: 백엔드 약 21개(신규 12) / 프론트 약 22개(신규 15)
- 프로젝트 문서 갱신 예정: 06_API_SPECIFICATION, SCR-003, SCR-008, 09_DESIGN_SYSTEM §6, 10_DEVELOPMENT_ROADMAP
