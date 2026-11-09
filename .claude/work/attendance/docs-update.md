# 근태 관리 — 프로젝트 문서 반영

근거: backend.md / frontend.md(Fix 1 포함) "문서 갱신 예정", 승인된 DOC_ISSUES(새로 정한 대로). 코드 대조 확인 후 반영.

## docs/06_API_SPECIFICATION.md
- §0 공통 객체 `Attendance`: `modifiedAt` 필드와 설명(수정자 ID 비노출) 추가
- §3 API-ATT-004: 날짜 형식, 기본 기간(이번 달 1일~오늘, 도쿄, 각각 적용), 본인 한정, 에러 표(VALIDATION_ERROR, INVALID_DATE_RANGE 두 사유·366일)
- §3 API-ATT-005: `name`(trim·최대 100·대소문자 무시 부분 일치), `departmentId` UUID, 기간 규칙 동일, 비활성 사용자 포함, 에러 표(VALIDATION_ERROR, INVALID_DATE_RANGE, FORBIDDEN)
- §3 API-ATT-006: clockIn 필수·clockOut 키 필수(null 허용), 응답 설명, 에러 표(VALIDATION_ERROR, INVALID_TIME_RANGE 3조건 정밀화, FORBIDDEN, NOT_FOUND의 UUID 아님 포함)
- §5 API-DEPT-001: 부서명 오름차순, 페이지네이션 없음

## docs/04_SCREEN_SPECIFICATIONS/SCR-003_ATTENDANCE.md
- §4 목록 구성: 퇴근·근무 시간 없음 `-` → `—`, 비고 판별 기준(`modifiedAt`), `md` 미만 카드 목록(툴팁 문구 직접 표시)
- §6 유효성 검증: URL 기간 규칙 위반 시 오류 표시·목록 숨김·API 미호출

## docs/04_SCREEN_SPECIFICATIONS/SCR-008_ADMIN_ATTENDANCE.md
- §3 검색 조건: 부서 조회 실패 시 "전체"만, 시작일·종료일 필수
- §4 목록 구성: 근무일 요일 포함, 퇴근·근무 시간 없음 `—`, `md` 미만 카드 목록
- §6 유효성 검증: 기간 필수, (수정) 출근 시간 필수 문구, URL 기간 규칙 위반 처리

## docs/09_DESIGN_SYSTEM.md
- §6 표: `form.tsx` `selectClass`, Pagination, Tooltip, `table.ts`, `attendance/attendanceStatus.ts`(ATTENDANCE_STATUS_BADGE, MISSING_ROW_CLASS), `attendance/DateRangeFields.tsx` 행 추가. AppShell 행에 비관리자 `/admin/*` 가드 추가

## docs/10_DEVELOPMENT_ROADMAP.md (test-report.md Run 3 통과 결과 확인 후)
- 최종 갱신일 2026-11-09
- §1 요약: 4 프론트 완료, 5 전체 완료, 8 백엔드·상태 진행 중
- §4 라우트 가드 [x], §5 API-ATT-004~006·SCR-003·SCR-008 [x] 및 도메인 완료, §8 API-DEPT-001 [x] 및 도메인 진행 중, §10 화면 테스트에 SCR-003·008 추가
- §3 갱신 이력 1행 추가

## .claude/work/context.md
- 공용 모듈: AppShell 가드 설명을 현재 구현(비관리자 `/admin/*` 포함)으로 갱신, 신규 공용 모듈 2줄 추가, "아직 없음"에서 `/admin/*` 가드 제거
