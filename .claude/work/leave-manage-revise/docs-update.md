# 문서 반영 결과: leave-manage-revise

## docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md
- §1 기본 정보 URL: 탭 삭제, 이전 `?tab=` 무시
- §3 화면 구성: Page Header [休暇申請] 버튼 → 요약 → 이력 순서 추가
- §3.2 "탭 1: 휴가 신청" → "공통 휴가 신청 모달"(SCR-002·004 공용, 종류 Radio·초기 미선택, footer [キャンセル][申請する])
- §3.3 "탭 2" 제목 삭제, 필터: 상태 토글 복수 선택·휴가 종류 토글 추가·URL Query 쉼표 구분
- §4.1 신청 흐름: 모달 열기, 성공 후 모달 닫기·요약·이력 재조회, 종류 필터 초기화, 조회 조건 불변 시 재조회
- §4.2 "탭 진입 시" → "화면 진입 시"

## docs/04_SCREEN_SPECIFICATIONS/SCR-002_DASHBOARD.md
- §3-4 휴가 신청 버튼: 공통 휴가 신청 모달, 성공 시 휴가 현황 재조회(이동 없음)

## docs/03_SCREEN_LIST.md
- Screen List SCR-004 행 설명
- Common UI Rules "모달": 공통 휴가 신청 모달 항목 추가
- Screen Flow: `/dashboard ──[휴가 신청]──>` 모달로 변경, `/leaves ──[休暇申請]──>` 추가

## docs/06_API_SPECIFICATION.md
- API-LEAVE-003: `status` 쉼표 복수, `leaveType` 신규, 조건 결합·예시, 400 대상과 `details[].field` `status.N`·`leaveType.N` 형식

## docs/08_TEST_PLAN.md
- §7 화면 테스트 SCR-004 행: 모달 신청·Radio 검증·상태/종류 토글 필터·성공 후 재조회 추가

## docs/09_DESIGN_SYSTEM.md
- §4 화면 매핑 SCR-004 행: 탭 언급 삭제
- §6 표: `LeaveApplyModal`, `LeaveFilterButtons` 행 추가
- §6 휴가 관리 유틸: `parseLeavesQuery` 반환값·쉼표 구분(`tab` 삭제), `LEAVE_TYPES` 추가

## docs/10_DEVELOPMENT_ROADMAP.md
- §2-6 API-LEAVE-003 설명, SCR-004 항목 설명(미체크 유지 — Playwright 8건 미실행, §0 규칙)
- §2-10 화면 테스트 SCR-004 부분(Playwright 8건 미실행)
- §3 갱신 이력 1행 추가

## .claude/work/context.md
- 공용 모듈: leave-days(`LEAVE_TYPES`, 반환값, `LeavesTab` 삭제), LeaveApplyModal·LeaveFilterButtons 추가

## 반영하지 않은 것
- `docs/04_SCREEN_SPECIFICATIONS/SCR-006_USER_LIST.md`: 무관한 미커밋 변경이 있어 건드리지 않음
