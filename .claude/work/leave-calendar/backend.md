# backend 구현 결과: 월간 휴가 캘린더

## 생성·수정 파일 (backend/src 기준)
- 신규 `modules/dashboard/dashboard.controller.ts` (`@Controller('dashboard')`, AdminOnly 없음)
- 신규 `modules/dashboard/dto/leave-calendar-query.dto.ts` (`leaveCalendarQuerySchema`, `leaveCalendarDayQuerySchema`)
- 신규 `modules/dashboard/leave-calendar-rules.ts` + `leave-calendar-rules.spec.ts` (monthRange, isWeekend, resolveHalfDay)
- 신규 `common/validation/date-schema.ts` (`dateSchema` 이동·export)
- 수정 `modules/leaves/dto/create-leave.dto.ts` (공용 dateSchema import, 동작 변경 없음)
- 수정 `modules/dashboard/dashboard.module.ts`, `dashboard.service.ts`, `dashboard.repository.ts`
- DB 변경·마이그레이션 없음. 프론트·docs·테스트(e2e) 미수정

## API 요약 (권한 USER, 전역 Guard 그대로)
- `GET /api/v1/dashboard/leave-calendar?month=YYYY-MM` (month 선택, 생략 시 Clock 기준 도쿄 이번 달)
  - 200 `{ month, days: [{ date, count }] }` 인원 1명 이상인 날만, 날짜 오름차순
  - 집계: APPROVED, 활성 사원, 토·일 제외, 사원 DISTINCT. `$queryRaw` 1쿼리(바인딩만, generate_series를 `::date`로 변환해 세션 타임존 영향 제거)
- `GET /api/v1/dashboard/leave-calendar/day?date=YYYY-MM-DD` (date 필수)
  - 200 `{ date, items: [{ userId, name, departmentName, halfDay }] }` halfDay = "AM" | "PM" | null
  - 사원번호 → userId 오름차순. 토·일은 DB 미조회로 `items: []`. leaves는 leaveType만 select
  - halfDay: HALF_AM만 AM, HALF_PM만 PM, 둘 다/종일 휴가 포함 시 null
- 에러: 400 VALIDATION_ERROR(`details[].field` = month / date; 형식·범위·비실재 날짜·연도 2000~2100 밖), 401, 403 PASSWORD_CHANGE_REQUIRED

## API 문서와 다른 점
- 없음 (설계와 동일). 문서 06에는 아직 두 API가 없는 상태

## 검증
- `npx tsc --noEmit` OK, `npm run lint` OK, prettier OK
- unit(`src/modules/dashboard`, `src/modules/leaves`) 2파일 32건 통과
- **DB 접속 테스트(e2e)와 raw SQL의 실행 검증은 하지 않았음**(DB 사용 금지 지시). tester가 임시 DB로 `$queryRaw`를 반드시 검증할 것

## 문서 갱신 예정
- `docs/06_API_SPECIFICATION.md` §2: API-DASH-002, API-DASH-003 추가(권한 USER, 위 요청·응답·에러, 응답 필드 한정 명시: reason·leaveType·날짜 범위·status·empId 등 미포함)
- `docs/02_REQUIREMENTS.md` FR-DASH-001: 휴가 캘린더 규칙(APPROVED만, 토일 제외·공휴일은 평일, 활성만, 사원 DISTINCT, 전원에게 이름·부서·반차 구분만 공개, halfDay 판정 규칙). FR-LEAVE-005: "캘린더의 이름·부서 공개는 휴가 상세 열람이 아님" 보충
- `docs/08_TEST_PLAN.md` §5.5 IT-DASH-04~, §6 권한 매트릭스에 두 API(USER) 추가

## 프론트엔드가 알아야 할 것
- 환경변수·CORS 변경 없음. 기존 쿠키/Bearer 인증 그대로. 응답에 휴가 종류·사유는 없음, 반차는 halfDay로만 구분
- 월 API의 `count` = 같은 날 day API의 `items.length`

## context.md 정정
- 없음 (공용 모듈에 `common/validation/date-schema.ts`의 `dateSchema` 추가 권장)

## Fix 1 (review.md Round 1, 낮음 1건)
- 수정: `backend/src/modules/dashboard/leave-calendar-rules.ts` — 독자 정의 union `LeaveTypeName` 삭제, 생성된 Prisma `LeaveType`(`generated/prisma/client.js`, repository와 동일 import)을 재사용. 동작 변경 없음
- 검증: `tsc --noEmit` OK, eslint(src/modules/dashboard) OK, vitest dashboard 12건 통과. DB 접속 없음
