# 근태 관리 — 백엔드 구현 결과

## 생성·수정한 파일
신규 (`backend/src/modules/`)
- `attendance/admin-attendance.controller.ts` (`@AdminOnly()`, GET / PATCH :id)
- `attendance/attendance-rules.ts` (`resolveDateRange`, `assertValidTimeRange`, `MAX_RANGE_DAYS`)
- `attendance/dto/attendance-history-query.dto.ts`, `admin-attendance-query.dto.ts`, `update-attendance.dto.ts`
- `departments/departments.{controller,service,repository,module}.ts`

수정
- `attendance/attendance.{repository,mapper,service,controller,module}.ts` (`findPageByUser`, `findPage`, `findById`, `updateTimes`, `listMine`, `listAll`, `update`, `GET /attendance`)
- `attendance/attendance.mapper.spec.ts` (`modifiedAt` 추가로 기존 기대값 갱신 + 케이스 1건)
- `app.module.ts` (DepartmentsModule)
- `backend/test/e2e-helpers.ts` (`insertAttendance`에 `modifiedBy`·`modifiedAt` 선택 인자, 타입 호환 유지)

미작성: `attendance-rules.spec.ts`, `attendance.e2e-spec.ts` 추가분, `admin-attendance.e2e-spec.ts`, `departments.e2e-spec.ts` — 에이전트 규칙상 테스트 코드는 tester 담당이라 작성하지 않음(설계의 파일 목록에는 있음).

## 검증
- `npx tsc --noEmit` OK / `npm run lint` OK / `npm test` 157건 통과 / prettier 적용
- 기존 e2e 회귀(`npm run test:e2e`)는 백그라운드 실행 중이었음. 결과는 tester 단계에서 확인 필요

## API 요약
공통: `Attendance` 응답에 `modifiedAt`(도쿄 오프셋 일시 또는 null) 추가. ATT-001~006 모두 해당. 수정자 ID는 비노출.
- `GET /api/v1/attendance` (USER) — Query `startDate`, `endDate`(YYYY-MM-DD), `page`, `limit`. 기본 기간: 이번 달 1일(도쿄)~오늘(도쿄). 대상은 항상 토큰의 본인. `workDate desc`. 200 `Page<Attendance>`. 400 VALIDATION_ERROR(날짜 형식, page·limit), 400 INVALID_DATE_RANGE(`開始日は終了日より後にできません。` / `照会期間は最大1年です。` 366일 초과)
- `GET /api/v1/admin/attendance` (ADMIN) — 위 + `name`(trim, 최대 100, 부분일치·대소문자 무시), `departmentId`(UUID), `status`(WORKING/DONE/MISSING_CLOCK_OUT). 비활성 사용자 포함. 정렬 `workDate desc, user.name asc, id asc`. 에러: 400 VALIDATION_ERROR / INVALID_DATE_RANGE, 401, 403 FORBIDDEN, 403 PASSWORD_CHANGE_REQUIRED
- `PATCH /api/v1/admin/attendance/:id` (ADMIN) — Body `{ clockIn: ISO(오프셋 필수), clockOut: ISO|null }`(두 키 모두 필수). 200 수정 후 `Attendance`(modifiedBy=관리자, modifiedAt=Clock.now()). 400 VALIDATION_ERROR, 400 INVALID_TIME_RANGE(`出退勤時刻を確認してください。`: clockIn의 도쿄 날짜 ≠ workDate / clockOut ≤ clockIn / 24시간 초과), 404 NOT_FOUND(UUID 아님·없음), 401, 403
- `GET /api/v1/departments` (USER) — 200 `[{id, name}]` name asc, 페이지네이션 없음
- 쿠키/토큰: 기존 Bearer Access Token 그대로. 신규 쿠키 없음

## API 문서와 다른 점
없음 (설계의 DOC_ISSUES 확정분 반영).

## 문서 갱신 예정
- `docs/06_API_SPECIFICATION.md` §0 `Attendance`: `modifiedAt`(string|null, 관리자 수정 시각) 추가
- 같은 문서 §3 API-ATT-004: 기본 기간(이번 달 1일~오늘, 도쿄, 각각 따로 적용), 400 VALIDATION_ERROR(날짜 형식·page/limit), INVALID_DATE_RANGE 두 사유(시작>종료, 양끝 포함 366일 초과)
- §3 API-ATT-005: `name` trim·최대 100·부분일치, 비활성 사용자 포함, 정렬, 에러 목록
- §3 API-ATT-006: `clockOut: null` 허용(키는 필수), INVALID_TIME_RANGE 3조건, 404 조건(UUID 아님/없음)
- §5 API-DEPT-001: 구현 확정(name asc, USER 권한)

## 프론트엔드가 알아야 할 것
- 환경변수·CORS 변경 없음. 신규 엔드포인트 4종, `Attendance` 타입에 `modifiedAt: string | null` 추가
- `GET /departments`는 인증 필요(401 시 기존 refresh 흐름)

## 참고
- 설계 외 파일 열람: `modules/dashboard/dashboard.module.ts`, `test/attendance.e2e-spec.ts`(패턴 확인용)
- context.md 정정: 없음
