FRONTEND: REQUIRED
SECURITY_REVIEW: REQUIRED
DOC_ISSUES:
- 06 API-LEAVE-001에 없는 세부: 사유 trim 여부 → 반려 사유처럼 trim 후 1~500자 / approverId가 UUID 형식이 아니면 → INVALID_APPROVER / 잠금 후 신청자가 비활성이면 → 401 / 과거 시작일 → 허용(제한 규칙 없음)
- 06 API-LEAVE-002의 keyword 매칭·정렬 미정 → 이름·사원번호 부분 일치(trim 후 최대 100자), 사원번호 오름차순
- 06 API-LEAVE-003의 year·status 잘못된 값 처리 미정 → 400 VALIDATION_ERROR, year 생략 시 전체 연도 / API-LEAVE-005에 404 행 없음 → 다른 :id API처럼 404→403→409
- SCR-004 §4.3 즉시 승인 취소 조건에 `status=APPROVED` 빠짐(05 §6에는 있음) → 05 기준
- SCR-004에 없는 세부: 취소 성공 토스트·확인 문구, 연도 선택지(올해+1~올해−4), 409/422 표시 위치(토스트), 신청 후 `/leaves?year=시작일 연도`로 이동, 좁은 폭 카드 목록
- 승인자 Searchable Select가 09 §6에 없음 → `components/leave/ApproverSelect.tsx` 신규(combobox, 후보 1회 조회 후 화면에서 필터)
SUMMARY: 휴가 신청·내 이력·취소 API(API-LEAVE-001·002·003·005)와 휴가 관리 화면 SCR-004(/leaves)를 구현하고 공통 휴가 상세 모달에 취소 단계를 추가

## 승인용 설계 요약
- 범위(함): 백엔드 API 4개, SCR-004(상단 요약·신청 탭·이력 탭·필터·페이지네이션), `LeaveDetailModal` [취소], E2E용 900001 휴가 초기화 스크립트
- 범위(안 함): DB 스키마·마이그레이션 변경(이미 있음), 공휴일 제외, 신청 수정, 승인·반려 변경, 부여 연차 관리(API-USER-005)
- 핵심 결정
  1. 신청은 한 트랜잭션: 신청자 users 행 `FOR NO KEY UPDATE` → 잠근 행의 활성·승인 필요 여부로 판단 → 날짜 중복 → 잔여 연차 → INSERT(05 §8 그대로). 날짜·일수 검사는 트랜잭션 전 순수 함수
  2. 취소는 `user_id = 본인 AND (PENDING 또는 즉시 승인·시작일 > 도쿄 오늘)` 조건부 UPDATE, 0건이면 409 NOT_CANCELLABLE. 타인(ADMIN 포함) 403
  3. 승인 필요 여부는 서버가 잠근 행에서 다시 읽은 값만 기준. 화면은 로그인 응답의 `approvalRequired`로 승인자 필드만 표시/숨김
  4. 탭·연도·상태·페이지는 URL Query 유지. 일수 미리보기는 화면에서 계산하되 저장 값은 서버 계산
- API: POST /leaves, GET /leaves/approvers, GET /leaves/me, PATCH /leaves/:id/cancel — 모두 06에 있음(신규 없음). 기존 GET /leaves/balance, GET /leaves/:id 재사용
- 화면: SCR-004 휴가 관리(/leaves, ?tab=apply|history), 공통 휴가 상세 모달(취소 단계)
- 변경 파일 수: 백엔드 약 13개(신규 5) / 프론트 약 15개(신규 11, 테스트 포함)
- 프로젝트 문서 갱신 예정: 06_API_SPECIFICATION, SCR-004_LEAVE, 09_DESIGN_SYSTEM §6, 10_DEVELOPMENT_ROADMAP, context.md(명령어)
