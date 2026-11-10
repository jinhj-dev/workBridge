# docs-update: 휴가 신청·조회·취소

근거: backend.md / frontend.md "문서 갱신 예정"(Fix 1 포함). 반영 전 해당 코드(DTO·service·repository·LeaveDetailModal·ApproverSelect·form.tsx·leave-days.ts·ja.ts·e2e-leaves-reset.ts)로 내용 확인.

## docs/06_API_SPECIFICATION.md
- §4 API-LEAVE-001: Validation에 시작일 과거 허용, reason trim 후 1~500자(trim 값 저장). 에러 표 INVALID_APPROVER 설명에 UUID 형식 오류 추가, 401 UNAUTHORIZED 행(잠근 신청자 행 없음·비활성) 추가
- §4 API-LEAVE-002: keyword 규칙(trim 후 최대 100자, 이름 대소문자 무시·사원번호 부분 일치, 빈 값은 조건 없음), 사원번호 오름차순, 100자 초과 400
- §4 API-LEAVE-003: year 2000~2100·생략 시 전체 연도, status 허용 값 4종, 400 VALIDATION_ERROR
- §4 API-LEAVE-005: 404 NOT_FOUND 행 추가, 403 설명에 "ADMIN 포함"

## docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md
- §3.2 승인자: 후보 1회 조회 후 화면 안 이름·사원번호 부분 일치 필터
- §3.3: 연도 선택지(올해+1 ~ 올해−4), md 미만 카드 목록
- §4.1: 신청 후 이동 URL `/leaves?year=<시작일 연도>`(올해면 생략), 상태·페이지 초기화
- §4.3: 확인 단계 버튼 [돌아가기][취소하기], 성공 토스트, 즉시 승인 취소 조건에 `status = APPROVED` 명시
- §6: 409 LEAVE_CONFLICT·422 INSUFFICIENT_LEAVE_BALANCE는 토스트, 422는 상단 요약 재조회
- 승인자 필드 오류 문구는 기존 §6 "승인자를 다시 선택해주세요."가 구현(「承認者を選び直してください。」)과 같은 의미라 변경 없음

## docs/09_DESIGN_SYSTEM.md
- §6 표: `form.tsx` `textareaClass` 행 추가, `components/leave/ApproverSelect.tsx` 행 추가, `LeaveDetailModal` 행에 취소 단계 설명 추가
- §6 표 아래: `lib/leave-days.ts` 유틸 항목 추가

## docs/10_DEVELOPMENT_ROADMAP.md
- §1 요약표 6번 백엔드 → 완료
- §2-6 백엔드 API-LEAVE-001·002·003·005 → [x]
- §2-6 프론트엔드 SCR-004는 [ ] 유지(Playwright 7건 미실행, 관리 규칙 §0), 진행 상황 주석 추가
- §2-10 화면 테스트 항목에 SCR-004 진행 상황 추가
- §3 갱신 이력 행 추가

## .claude/work/context.md
- 명령어: `db:e2e-leaves-reset` 추가
- 공용 모듈: `frontend/src/lib/leave-days.ts` 추가

## 반영하지 않은 것
- docs/04_SCREEN_SPECIFICATIONS/SCR-006_USER_LIST.md: 본 기능과 무관한 기존 미커밋 변경이 있어 건드리지 않음
