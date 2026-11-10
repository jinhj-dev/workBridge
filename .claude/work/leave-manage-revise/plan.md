FRONTEND: REQUIRED
SECURITY_REVIEW: SKIP
DOC_ISSUES:
- (사용자 지시) 이력 "상태" 필터: SCR-004 §3.3의 `<select>` → SCR-003식 복수 선택 토글 버튼으로 변경. 06 API-LEAVE-003 `status`도 단일 → 쉼표 구분 복수(API-ATT-003 `status` 규칙과 동일: OR, 중복 무시, 빈 값·미지 값 400)
- 휴가 종류 필터(06·SCR-004에 없음, 신규): 상태와 일관되게 **같은 복수 선택 토글 버튼**으로 결정. API Query `leaveType` 쉼표 구분 복수(5종, 규칙은 status와 동일). 상태×종류는 AND, 각 그룹 안은 OR. 05 DB 변경 없음
- 토글 컴포넌트: 기존 `components/attendance/StatusFilterButtons`는 근태 전용(배지·문구 고정) → 휴가용 `components/leave/LeaveFilterButtons`(값 목록·라벨을 props로 받는 1개, 상태·종류 2곳 사용) 신규. 스타일 클래스는 StatusFilterButtons와 동일하게 맞추고, 근태 쪽은 수정·공통화하지 않음. 종류는 배지 색이 없으므로 `neutral` 색
- 기존 링크 `/leaves?tab=apply`(SCR-002 §3-4, 03 "화면 이동", 북마크) → 탭 폐지로 `tab`은 무시하고 이력 표시(모달 자동 오픈 안 함). 대시보드 버튼은 링크 → 모달 열기 버튼
- 신청 성공 후: SCR-004 §4.1 "이력 탭 이동" 대체. 휴가 관리 = 모달 닫고 요약 reload + `/leaves?year=<시작일 연도>`(상태·종류 필터 초기화) / 대시보드 = 모달 닫고 휴가 현황만 reload(이동 없음)
- 휴가 종류 라디오는 초기 선택 없음(기존 필수 검증 문구 유지). Radio는 09 §3에 있으나 §6 구현 없음 → 모달 안 네이티브 radio, 공용 컴포넌트로 만들지 않음
- 공용 `Modal`은 폭 최대 420px 고정 → 폼 1열(시작·종료일만 `sm` 2열), Modal 수정 안 함
SUMMARY: 휴가 신청을 탭에서 공통 신청 모달로 옮기고(휴가 관리·대시보드), 종류는 라디오, 이력 상태·종류 필터를 복수 선택 토글 버튼으로

## 승인용 설계 요약
- 범위: 신청 탭 삭제 + 헤더 [休暇申請] 버튼 / 공통 `LeaveApplyModal`(대시보드·휴가 관리) / 종류 라디오 / 이력 필터 = 연도 select + 상태 토글 + 종류 토글(복수 선택). 하지 않는 것: 신청 규칙·검증·응답 형식 변경, 근태 토글 컴포넌트 수정, Modal 폭 변경
- 핵심 결정: (1) `LeaveApplyForm` 로직을 `components/leave/LeaveApplyModal.tsx`로 이동(검증·에러 매핑 그대로) (2) `?tab=` 폐지, 남은 `tab=apply`는 무시 (3) 신청 성공 후 사용처 콜백으로 재조회 (4) `GET /leaves/me`의 `status`·`leaveType`을 쉼표 구분 복수(그룹 내 OR, 그룹 간 AND), URL도 `status=A,B&leaveType=C` (5) 휴가용 토글 `LeaveFilterButtons` 신규 1개를 상태·종류에 공용
- API: GET /leaves/me (기존, `status` 복수화 + `leaveType` 복수 추가) / POST /leaves·GET /leaves/approvers·GET /leaves/balance 재사용
- 화면: SCR-004 휴가 관리(/leaves), SCR-002 대시보드(/dashboard, 휴가 현황 버튼), 공통 휴가 신청 모달(신규)
- 변경 파일 수: 백엔드 3개+테스트 1 / 프론트 약 10개+테스트 (신규 4, 삭제 2)
- 프로젝트 문서 갱신 예정: SCR-004, SCR-002, 03_SCREEN_LIST, 06_API_SPECIFICATION, 09_DESIGN_SYSTEM, 08_TEST_PLAN, 10_DEVELOPMENT_ROADMAP
