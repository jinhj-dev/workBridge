# design-backend: 出勤簿 월간 조회 (API-ATT-007 신규)

> 전제: decisions.md의 확정안(사용자 승인 완료, D5는 B = 공휴일 라이브러리).

## 참조 문서
- `docs/05_DATABASE_DESIGN.md` §4 attendance, §6 leaves, §9 날짜·시간 처리
- `docs/06_API_SPECIFICATION.md` §0 공통 객체 `Attendance`, §3 API-ATT-004(본인 한정·기간 규칙 형식), §2 API-DASH-002(`month` 파라미터 규칙)
- `docs/02_REQUIREMENTS.md` FR-ATT-003, FR-LEAVE-001(휴가 종류·주말 제외·공휴일 평일 취급)
- `.claude/work/attendance-sheet/decisions.md`

## 데이터 모델
- **DB 변경 없음. 마이그레이션 없음.** 조회 전용(INSERT/UPDATE/DELETE 없음).
- 공휴일 데이터는 DB가 아니라 npm 의존성 `@holiday-jp/holiday_jp`(backend `dependencies`)에서 얻는다(D5).
- 사용 인덱스: `attendance(user_id, work_date)` UNIQUE, `leaves(user_id, status)`.

## API 계약 — `GET /api/v1/attendance/monthly` (신규, API-ATT-007)
- 권한 USER. 대상은 항상 토큰 본인(userId 파라미터 없음, API-ATT-004와 같음).
- Query: `month`(선택, `YYYY-MM`, 연도 2000~2100, 월 01~12. 생략 시 Asia/Tokyo 이번 달). 규칙은 API-DASH-002 `month`와 동일.
- 400 `VALIDATION_ERROR`(`details[].field = month`). 그 외 공통 에러만.

Response 200 (그 달 1일~말일 전 일자, 날짜 오름차순)
```json
{
  "month": "2026-11",
  "days": [
    {
      "date": "2026-11-02",
      "dayType": "WEEKDAY",
      "holidayName": null,
      "attendance": { "id": "uuid", "clockIn": "2026-11-02T09:00:00+09:00", "clockOut": "2026-11-02T18:30:00+09:00", "status": "DONE", "modifiedAt": null },
      "breakTime": { "minutes": 60, "source": "LEGAL_MINIMUM", "start": "2026-11-02T13:15:00+09:00", "end": "2026-11-02T14:15:00+09:00" },
      "actualWorkMinutes": 510,
      "overtimeMinutes": 30,
      "nightMinutes": 0,
      "leaves": [ { "id": "uuid", "leaveType": "HALF_PM", "status": "PENDING" } ]
    },
    { "date": "2026-11-03", "dayType": "HOLIDAY", "holidayName": "文化の日", "attendance": null, "breakTime": null, "actualWorkMinutes": null, "overtimeMinutes": 0, "nightMinutes": 0, "leaves": [] },
    { "date": "2026-11-07", "dayType": "WEEKEND", "holidayName": null, "attendance": null, "breakTime": null, "actualWorkMinutes": null, "overtimeMinutes": 0, "nightMinutes": 0, "leaves": [] }
  ],
  "summary": {
    "scheduledWorkDays": 19,
    "actualWorkDays": 18,
    "actualWorkMinutes": 8640,
    "overtimeMinutes": 120,
    "nightMinutes": 0,
    "holidayWorkMinutes": 0,
    "paidLeaveDays": 1.5
  }
}
```
- `dayType`(D5): 공휴일이면 `HOLIDAY`(토·일과 겹쳐도 HOLIDAY) > 토·일이면 `WEEKEND` > `WEEKDAY`. 공휴일 판정은 이 API에서만 하며 프론트는 이 값을 그대로 쓴다.
- `holidayName`: `HOLIDAY`일 때 라이브러리의 일본어 공휴일명(예 `文化の日`, `振替休日`), 그 외 `null`.
- `attendance`: 기존 `Attendance`에서 `user`·`workDate`·`workMinutes`를 뺀 부분. `status`는 기존 `calculateAttendanceStatus` 그대로.
- `breakTime`: `status = DONE`일 때만. `source`는 현재 `"LEGAL_MINIMUM"`(계산값) 한 값뿐이며, 실제 기록과 구분하기 위한 필드다(D1). 휴게가 0분이면 `{minutes:0, source, start:null, end:null}`. DONE 아니면 `null`.
- `actualWorkMinutes` = 拘束(기존 `calculateWorkMinutes`, 분 내림) − 휴게. DONE 아니면 `null`.
- `overtimeMinutes`: `WEEKDAY` 행만 `max(0, actualWorkMinutes − 480)`, `WEEKEND`·`HOLIDAY`는 0(D10·D5).
- `nightMinutes`: 근무 구간 중 22:00~05:00(도쿄) 겹침 − 휴게 구간과의 겹침. 자정 넘김 포함(D15).
- `leaves`: 본인 휴가 중 `status ∈ {PENDING, APPROVED}`이고 그 날짜를 포함하는 것. **토·일(요일 기준) 행에는 넣지 않는다**(휴가 일수 계산이 주말 제외이므로). 평일 공휴일(`HOLIDAY`이면서 월~금) 행에는 넣는다 — 기존 FR-LEAVE-001이 공휴일을 평일로 세어 잔여를 차감하므로 그와 맞춘다(D5). 토요일 공휴일은 토요일이므로 넣지 않는다. REJECTED·CANCELLED 제외. `reason` 등 다른 필드는 넣지 않는다(상세는 기존 API-LEAVE-004).
- `summary`(모두 이 달의 days 기준):
  - `scheduledWorkDays`: `WEEKDAY` 행(공휴일 제외 평일) 중 입사일(`users.hire_date`) 이후(D9·D5)
  - `actualWorkDays`: `status = DONE`인 날 수(dayType 무관)
  - `actualWorkMinutes` / `overtimeMinutes` / `nightMinutes`: days 합
  - `holidayWorkMinutes`: `WEEKEND`·`HOLIDAY` 행의 `actualWorkMinutes` 합
  - `paidLeaveDays`: `leaves`가 들어간 행(월~금, 공휴일 포함)의 APPROVED 휴가 중 ANNUAL=1, HALF_AM·HALF_PM=0.5 합(같은 날 AM+PM이면 1). SPECIAL·OTHER 제외(차감 대상 아님, FR-LEAVE-001)
  - 所定労働時間·欠勤日数·잔여 연차는 응답에 넣지 않는다(D9·D11·D17).

## 처리 로직
1. `month` 해석 → `monthRange(month)`(재사용: `modules/dashboard/leave-calendar-rules.ts`)로 start/end.
2. Repository 3개 조회(`Promise.all`): 본인 attendance(work_date ∈ 월), 본인 leaves(PENDING·APPROVED, `start_date <= end AND end_date >= start`), 본인 `hire_date`.
3. 공휴일: `japaneseHolidaysInRange(start, end)` → `Map<'YYYY-MM-DD', 공휴일명>`. 규칙 함수에는 이 Map을 인자로 넘긴다(규칙 모듈이 라이브러리에 직접 의존하지 않게 → 단위 테스트에서 가짜 Map 주입 가능).
4. 순수 함수 모듈 `attendance-sheet-rules.ts`에서 일별 계산 → 합계. 서비스는 조립만.
5. 일시는 `formatTokyoDateTime`, 날짜는 `fromDbDate`/`toDbDate`(05 §9). 오늘은 `Clock` + `toTokyoDate`.

### 법정 휴게 계산 `legalBreakMinutes(boundMinutes)` (D2-A, 労基法 제34조)
| 拘束 D(분) | 휴게 |
|---|---|
| D ≤ 360 | 0 |
| 360 < D ≤ 405 | D − 360 |
| 405 < D ≤ 525 | 45 |
| 525 < D ≤ 540 | D − 480 |
| D > 540 | 60 |
- 휴게 후 実働이 6h·8h 기준을 넘는 경우에만 45·60분이 필요하다는 해석. 경계값을 모두 단위 테스트한다.
- 휴게 위치(D3-A): `start = clockIn + floor((D − 휴게)/2)분`, `end = start + 휴게`.

### 공휴일 라이브러리 `@holiday-jp/holiday_jp` (D5)
- 래퍼 `common/time/japanese-holiday.ts`에 `japaneseHolidaysInRange(start: string, end: string): Map<string, string>` 하나만 둔다. 다른 코드는 라이브러리를 직접 import하지 않는다(향후 FR-LEAVE·대시보드 반영 시 재사용 지점).
- **타임존**: 라이브러리가 반환하는 `Date`는 로컬 TZ 해석일 수 있다. 서버 TZ에 의존하지 않도록 키는 라이브러리 원본 날짜 문자열(있으면) 또는 검증된 방식으로 `YYYY-MM-DD`를 만든다. `TZ=UTC`와 `TZ=Asia/Tokyo`에서 같은 결과인지 단위 테스트로 확인.
- **구현자 확인 사항(backend.md에 결과 기록)**:
  1. 설치 버전(정확한 버전 고정 여부는 기존 package.json 관례를 따름)과 라이선스(`npm view @holiday-jp/holiday_jp version license`, 패키지 LICENSE 파일). MIT 등 허용 라이선스가 아니면 구현을 멈추고 보고.
  2. 수록 데이터 범위(최소·최대 연도)와 데이터 최종 갱신 시점(패키지 데이터 파일·릴리스 이력으로 확인). 2026~2027년 공휴일이 포함돼 있는지 실제 값으로 확인.
  3. TypeScript 타입 제공 여부(없으면 최소 선언 파일 추가), CommonJS/ESM 호환(backend 빌드·Jest에서 import 가능한지).
  4. `npm audit` 결과와 추가 전이 의존성 수.
- 수록 범위 밖 연도(`month`는 2000~2100 허용): 공휴일 없음으로 계산하고 에러로 만들지 않는다. 범위는 06 API-ATT-007 설명에 적는다.
- 공휴일 데이터 갱신은 라이브러리 버전 업데이트로만 한다(정부 발표 반영 지연 가능 — 문서에 명시).

### 보안
- 대상 사용자는 `@CurrentUser()`의 id만. 다른 사용자 데이터가 섞이지 않게 모든 쿼리에 `userId` 조건.
- leaves 응답은 `id`·`leaveType`·`status`만(본인 데이터지만 최소 필드).
- 신규 의존성은 런타임 데이터 조회만 하는 패키지여야 한다(설치 스크립트·네트워크 접근 없음 확인, 보안 점검 대상).

## 생성·수정 파일
- 신규 `backend/src/modules/attendance/attendance-sheet-rules.ts` — `legalBreakMinutes`, `placeBreak`, `overlapMinutes`(구간 겹침), `nightMinutes`, `buildSheetDay`, `summarizeSheet`
- 신규 `backend/src/modules/attendance/attendance-sheet-rules.spec.ts`
- 신규 `backend/src/common/time/japanese-holiday.ts` + `.spec.ts`
- 수정 `backend/package.json`, `backend/package-lock.json` — `@holiday-jp/holiday_jp` 추가(`npm install`로만, lock 수동 편집 금지)
- 신규 `backend/src/modules/attendance/dto/attendance-monthly-query.dto.ts` — `month` 스키마(`modules/dashboard/dto/leave-calendar-query.dto.ts`와 같은 규칙)
- 신규 `backend/test/attendance-monthly.e2e-spec.ts`
- 수정 `attendance.controller.ts` — `@Get('monthly')` 추가(기존 핸들러 변경 없음)
- 수정 `attendance.service.ts` — `getMonthly(userId, month?)` 추가(또는 신규 `attendance-sheet.service.ts`로 분리해도 됨, 모듈 providers 등록)
- 수정 `attendance.repository.ts` — `findByUserInRange(userId, start, end)`(select: id, workDate, clockIn, clockOut, modifiedAt만, workDate asc), `findActiveLeavesInRange(userId, start, end)`, `findHireDate(userId)`
- 응답 타입은 `attendance.mapper.ts` 옆 또는 rules 파일에 `AttendanceSheetResponse` 정의

## 참고할 기존 파일
- `attendance.mapper.ts`(`calculateAttendanceStatus`, `calculateWorkMinutes`) — 그대로 재사용, 변경하지 않음
- `modules/dashboard/leave-calendar-rules.ts`(`monthRange`, `isWeekend`), `dashboard.controller.ts`(month 쿼리 사용 예)
- `common/time/tokyo-date.ts`, `common/time/clock.ts`
- `backend/test/e2e-helpers.ts`(FixedClock, attendance·leaves INSERT 헬퍼), `test/db/db-helpers.ts`

## 하지 않는 것
- API-ATT-001~006 동작·응답 변경 없음(`workMinutes`는 拘束 그대로, D14). 근태·휴가 데이터 쓰기 없음.
- **휴가 일수 계산(FR-LEAVE-001, `leaves` 모듈)·대시보드(FR-DASH-001, API-DASH-002/003, `leave-calendar-rules.ts`)의 공휴일 처리는 바꾸지 않는다**("공휴일=평일" 유지). 공휴일 래퍼를 그 모듈에서 import하지 않는다.

## 문서 갱신 예정 (backend.md에 이어서 기록)
- 06 API-ATT-007 신설: `dayType`(HOLIDAY 포함)·`holidayName`, 집계 규칙, 공휴일 데이터 출처·수록 범위.
- 02: 출근부 요구사항 신설 + **불일치 명시** — "출근부(SCR-003)는 일본 공휴일을 휴일로 취급하나, FR-LEAVE-001(휴가 일수)·FR-DASH-001(대시보드)은 공휴일을 평일로 취급한다. 따라서 평일 공휴일의 휴가는 잔여에서 차감되고 출근부에도 휴가로 표시된다. 통일은 후속 과제."
- context.md 기술 스택: `@holiday-jp/holiday_jp`(버전) 추가.
