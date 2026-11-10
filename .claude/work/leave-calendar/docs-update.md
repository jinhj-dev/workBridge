# docs-update: 월간 휴가 캘린더

근거: backend.md / frontend.md "문서 갱신 예정"(Fix 1·Fix 2 포함. frontend Fix 1의 "SCR-002 좁은 폭 헤더" 항목은 Fix 2의 Card 줄바꿈으로 대체), plan.md 갱신 예정 목록, decisions.md D1~D9. 반영 전 실제 코드(dashboard.service/dto, date-schema, LeaveCalendarSection, LeaveCalendarDayModal, MonthCalendar, Card, DashboardView, lib/calendar, ja.ts)와 test-report.md Run 1~3을 대조함.

## 반영한 문서와 섹션
| 문서 | 섹션 | 내용 |
|---|---|---|
| docs/02_REQUIREMENTS.md | FR-LEAVE-005 | "휴가 상세" 범위 정의, 캘린더의 이름·부서·날짜·반차 구분 공개는 상세 열람이 아니며 예외가 아님 |
| docs/02_REQUIREMENTS.md | FR-DASH-001 | 월간 휴가 캘린더 규칙(전원 동일, APPROVED만, 사용자 DISTINCT, 토·일 제외·공휴일 평일, 활성만, 공개 항목, halfDay 판정), 원 요청 8-3과 달라진 점(사유·상태 미표시) |
| docs/03_SCREEN_LIST.md | 화면 목록 SCR-002 행 | 기능 칸에 "월간 휴가 캘린더(공통)" |
| docs/04_SCREEN_SPECIFICATIONS/SCR-002_DASHBOARD.md | §2, §3 좁은 폭 배치, §3-6(신규), §4 승인 대기 처리·휴가 캘린더(신규), §5, §6, §7, §8 | 화면 구성·문구(일본어 원문)·원 요청과 달라진 점·동작·권한·API·상태 처리·완료 조건("본인 데이터만"의 예외) |
| docs/06_API_SPECIFICATION.md | §2 API-DASH-002, API-DASH-003(신규) | 권한 USER, Query·Response·에러, 응답 필드 한정(사유·종류·기간·상태·empId 등 미포함), halfDay 판정, 정렬 |
| docs/08_TEST_PLAN.md | §5.5 IT-DASH-04~16 | 집계·경계·DISTINCT·상태/활성 필터·기본 월(TZ)·400·목록·halfDay·주말·최소 공개·count 일치·세션 TZ·권한 |
| docs/08_TEST_PLAN.md | §6 권한 매트릭스 | 휴가 캘린더 API 행 추가 |
| docs/08_TEST_PLAN.md | §7 SCR-002 | 休暇カレンダー FS-01~09(FS-06a), FU-01·02, FC-01~04, FD-01~03 |
| docs/09_DESIGN_SYSTEM.md | §6 표 | `components/calendar/MonthCalendar.tsx` 행 추가, `Card` 행에 헤더 flex-wrap 동작 추가 |
| docs/09_DESIGN_SYSTEM.md | §6 표 아래 유틸 목록 | `lib/calendar.ts` 설명 추가 |
| docs/10_DEVELOPMENT_ROADMAP.md | §2 #9 대시보드, §2 #10 화면 테스트, §3 갱신 이력 | API-DASH-002·003 / SCR-002 §3-6 [x](e2e 40건·Playwright 3건 임시 DB 통과 기준), 이력 1행. §1 요약표 상태는 변화 없음(대시보드 완료 유지) |
| .claude/work/context.md | 공용 모듈 | MonthCalendar, lib/calendar, Card 헤더, common/validation/date-schema, dashboard.controller, leave-calendar-rules |

## 반영하지 않은 것 / 참고
- frontend.md "문구: messages.calendar, messages.dashboard.calendar 추가"는 코드 사항이라 문서에는 SCR-002 문구(일본어 원문)로만 반영.
- 날짜 상세 모달 좁은 폭 목록: frontend.md는 "2줄"이라 했으나 코드는 `flex-col`(이름·부서·반차 라벨 세로 쌓기)이므로 코드 기준으로 기술.
- 10 로드맵 수치: backend unit 242·e2e 361은 Run 2(Fix 2는 frontend만 변경), frontend 412·Playwright 3건은 Run 3 결과.
- 새 문서 없음(문서 맵 변경 없음).
