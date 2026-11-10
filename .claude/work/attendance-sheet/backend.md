# backend: 出勤簿 월간 조회 (API-ATT-007)

## 생성·수정 파일 (모두 backend/)
- 신규 `src/common/time/japanese-holiday.ts` + `.spec.ts` — `japaneseHolidaysInRange(start,end)`: Map<'YYYY-MM-DD', 공휴일명>
- 신규 `src/modules/attendance/attendance-sheet-rules.ts` + `.spec.ts` — 순수 함수(`legalBreakMinutes`, `placeBreak`, `overlapMs`, `nightMinutes`, `buildSheetDay`, `summarizeSheet`)와 응답 타입 `AttendanceSheetResponse`
- 신규 `src/modules/attendance/attendance-sheet.service.ts`(조립 전용, 모듈 providers 등록)
- 신규 `src/modules/attendance/dto/attendance-monthly-query.dto.ts` — `leaveCalendarQuerySchema` 재사용(규칙 동일)
- 수정 `attendance.controller.ts`(`@Get('monthly')`), `attendance.module.ts`, `attendance.repository.ts`(`findByUserInRange`, `findActiveLeavesInRange`, `findHireDate`)
- 수정 `package.json`, `package-lock.json` (`npm install`로 추가)
- 신규 `test/attendance-monthly.e2e-spec.ts`
- DB 변경·마이그레이션 없음. 기존 핸들러·mapper 변경 없음.

## API 요약
- `GET /api/v1/attendance/monthly?month=YYYY-MM` — USER(토큰 본인 한정), month 생략 시 도쿄 이번 달
- 200: 설계 문서(design-backend.md)의 `{month, days[], summary}` 형식 그대로. 에러: 400 `VALIDATION_ERROR`(`details[].field=month`), 401 공통
- 쿠키/토큰 처리는 기존 Access Token(Bearer)과 동일. 신규 에러 코드 없음
- 구현 메모: `leaves`는 PENDING·APPROVED만, 요일 기준 토·일 행 제외(평일 공휴일 포함). 休憩 0분이면 start/end null

## API 문서와 다른 점
- 없음.

## 공휴일 라이브러리 확인 결과 (`@holiday-jp/holiday_jp`)
1. 버전 2.5.2(npm 최신), 라이선스 MIT(LICENSE 파일 확인). package.json 관례에 맞춰 `^2.5.2`로 dependencies에 추가(lock으로 2.5.2 고정)
2. 수록 범위 1970-01-01 ~ 2050-11-23(문서에 "2050년까지"로 기재 가능). 실제 값 확인: 2026-11-03 文化の日, 2026-11-23 勤労感謝の日, 2027-01-01 元日, 2027-05-03 憲法記念日, 2026-05-06 `こどもの日 振替休日`(※ 振替休日은 이름이 합쳐져 나옴), 2026-09-22 `休日`(国民の休日). 2100년은 공휴일 없음(에러 아님). 릴리스 이력·생성 시점의 정밀 확인은 하지 않음(데이터는 내각부 CSV 기반 생성이라 정부 발표 반영이 지연될 수 있음)
3. 타입 제공(`lib/holiday_jp.d.ts`), CommonJS 패키지이나 `esModuleInterop`으로 `import holidayJp from ...` 동작. build·vitest(unit/e2e) 통과 확인
4. 전이 의존성 0개(lock 추가분 1건), install·postinstall 스크립트 없음. `npm audit`: 중등도 10건이나 추가 전과 동일(이번 변경 무관, 기존분). 라이브러리 `holidays` 표가 `'YYYY-MM-DD'` 문자열 키라 Date/TZ를 거치지 않음 → `TZ=UTC/Asia/Tokyo/America/Los_Angeles` 단위 테스트에서 동일 결과 확인
- 래퍼는 `holidays` 표를 직접 일자별 조회(라이브러리의 `between`은 Date 기반이라 사용하지 않음)

## 검증
- `tsc --noEmit`, `eslint .`, `nest build` 통과. unit 281건, e2e 375건(신규 14건 포함) 모두 통과
- 주의: `test/admin-attendance.e2e-spec.ts`는 기존부터 prettier check 경고(이번 변경 무관)

## 문서 갱신 예정
- `docs/06_API_SPECIFICATION.md` §3 근태: API-ATT-007 신설(위 API 요약 + design-backend.md 응답 예·`dayType`(HOLIDAY>WEEKEND>WEEKDAY)·`holidayName`·집계 규칙·休憩 법정 최소 계산표·`breakTime.source=LEGAL_MINIMUM`). 공휴일 출처는 라이브러리, 수록 1970~2050, 범위 밖은 공휴일 없음, 갱신은 라이브러리 버전 업데이트로만(정부 발표 반영 지연 가능)
- `docs/02_REQUIREMENTS.md`: 출근부 요구사항 신설 + 불일치 명시 — "출근부(SCR-003)는 일본 공휴일을 휴일로 취급하나 FR-LEAVE-001(휴가 일수)·FR-DASH-001(대시보드)은 공휴일을 평일로 취급한다. 따라서 평일 공휴일의 휴가는 잔여에서 차감되고 출근부에도 휴가로 표시된다. 통일은 후속 과제."
- `.claude/work/context.md` 기술 스택: `@holiday-jp/holiday_jp` 2.5.2 추가, 공용 모듈에 `common/time/japanese-holiday.ts`·`attendance-sheet-rules.ts` 추가
- `docs/08_TEST_PLAN.md`: API-ATT-007 TC 추가(필요 시 tester)

## 프론트엔드가 알아야 할 것
- 환경변수·CORS 변경 없음. `dayType`/`holidayName`을 그대로 사용(프론트에서 공휴일 판정 금지)
- 휴가 일수 표시는 `summary.paidLeaveDays`(APPROVED의 ANNUAL·半休만), `leaves[]`는 id·leaveType·status만 제공
- `holidayName` 예: `こどもの日 振替休日`처럼 합쳐진 문자열이 올 수 있음

## context.md 정정
- 없음.

## Fix 1 (review.md backend 담당 항목)
- 삭제: `backend/prisma/e2e-attendance-fixture.ts`, package.json의 `db:e2e-attendance-fixture` 스크립트
- 수정 `backend/prisma/e2e-account-data.ts`: `E2E_ATTENDANCE_FIXTURE`·`E2eAttendanceFixtureRow`·`buildE2eAttendanceFixture`·`seedE2eAdminAttendance`와 관련 주석 제거 (`resetE2eAdminAttendance`·`db:e2e-attendance-reset` 유지. `toDbDate` import는 다른 곳에서 사용 중이라 유지)
- 수정 `backend/prisma/e2e-account-data.spec.ts`: `buildE2eAttendanceFixture`·`seedE2eAdminAttendance` describe 2개와 import 제거 (describe 제거만, 테스트 추가 없음)
- 검증: `tsc --noEmit`, `eslint prisma` 통과, `e2e-account-data.spec.ts` 19건 통과. 잔존 참조는 context.md 명령어 설명뿐.
- 문서 갱신 예정 추가: `.claude/work/context.md` 명령어 목록에서 `db:e2e-attendance-fixture` 설명 삭제 (`db:e2e-attendance-reset`은 유지)

## 追加要求 1: 開発スクリプト復元(モバイル旧レイアウト対応 / decisions.md M7)

main 基準で、先に削除した状態確認用 E2E 勤怠フィクスチャを復元した。他の変更(@holiday-jp 依存など)は維持。

- 復元: backend/prisma/e2e-attendance-fixture.ts(`git show main:` の内容そのまま)
- 復元: backend/package.json の `db:e2e-attendance-fixture` スクリプト(`db:e2e-attendance-reset` の直後、main と同位置)
- 復元: backend/prisma/e2e-account-data.ts の E2E_ATTENDANCE_FIXTURE / E2eAttendanceFixtureRow / buildE2eAttendanceFixture / seedE2eAdminAttendance
- 復元: backend/prisma/e2e-account-data.spec.ts の import 2件と describe 2件(buildE2eAttendanceFixture / seedE2eAdminAttendance)
- 確認: `git diff main` で backend/package.json は @holiday-jp 追加のみ、backend/prisma は差分なし。tsc --noEmit / eslint prisma / e2e-account-data.spec(23件)すべて成功。
- API・DB スキーマへの影響なし。

### 文書更新予定
- 対象: .claude/work/context.md(コマンド一覧)
- 内容: `npm run db:e2e-attendance-fixture`(E2E 管理者の勤怠を状態確認用6件に入れ替え)を復元。削除済みとした記載があれば取り消す。
