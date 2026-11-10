# design-backend: 사원 입사일(hire_date) 추가

전제: 안 A 승인(이번엔 DB + 문서 계약만). 화면·API 구현은 기능 8.
작업 방식: **아래 §5 순서대로 1파일씩, 수정 전에 사용자 승인**을 받고 진행한다.

## 1. 참조 문서
- `docs/05_DATABASE_DESIGN.md#2. Table: users`, `#0. 공통 규칙`(키와 공통 컬럼), `#9. 날짜·시간과 타입 처리`
- `docs/04_SCREEN_SPECIFICATIONS/SCR-006_USER_LIST.md#4. 목록 구성`, `#신규 사원 등록`(사용자 초안, 해석 승인됨)
- `docs/06_API_SPECIFICATION.md#5. 사원 관리 (Admin Users)` (문서 계약만, 구현 없음)
- `.claude/rules/database-rules.md` §9 Migration, §12 승인 규칙

## 2. 데이터 모델
`users`에 1컬럼 추가.

| 컬럼 | 타입 | NULL | 설명 |
|---|---|---|---|
| hire_date | DATE | NO | 입사일(도쿄 기준 날짜). 기본값 없음. 사원 등록 시 선택한 값(필수, 미래 날짜 허용) |

- Prisma: `hireDate DateTime @map("hire_date") @db.Date` (`mustChangePassword` 뒤 등 기존 정렬 스타일 유지)
- 애플리케이션 입출력은 05 §9대로 `'YYYY-MM-DD'` 문자열 ↔ `toDbDate`/`fromDbDate`(`backend/src/common/time/tokyo-date.ts`)
- 인덱스·CHECK 추가 없음

## 3. 마이그레이션
경로: `backend/prisma/migrations/<timestamp>_add_users_hire_date/migration.sql`
생성: `npx prisma migrate dev --create-only --name add_users_hire_date` 후 SQL 수작업 편집(`ADD COLUMN ... NOT NULL` 단독 문은 기존 행이 있으면 실패하므로).

```sql
-- 既存ユーザーの入社日は固定日付(2026-01-01)で埋める
ALTER TABLE "users" ADD COLUMN "hire_date" DATE;
UPDATE "users" SET "hire_date" = DATE '2026-01-01';
ALTER TABLE "users" ALTER COLUMN "hire_date" SET NOT NULL;
```
- 이관값은 사용자 확정: 고정 `2026-01-01`(E2E 계정 고정일과 동일). created_at 기반은 미채택
- 최종 상태가 Prisma 스키마(NOT NULL, default 없음)와 같아야 한다 → 적용 후 `npx prisma migrate dev`가 추가 diff를 만들지 않는지 확인
- 기존 데이터 변경을 포함하므로 개발 DB 적용 직전 사용자 승인(DB 규칙 §12). 적용 전후 users 건수 비교, `hire_date IS NULL` 0건, 전 행 `2026-01-01` 확인
- 롤백: `ALTER TABLE "users" DROP COLUMN "hire_date";` (기존 마이그레이션 파일은 수정하지 않음)
- 테스트 DB: `npm run db:migrate:test`

## 4. API 계약 (문서만 갱신, 이번 구현 없음)
06 §5에 반영할 계약(사용자 승인된 해석).
- API-USER-001: 항목에 `"hireDate": "2026-04-01"`. Query 기존 6항목에 `hireDateFrom`, `hireDateTo` 추가(YYYY-MM-DD, 양끝 포함, 한쪽만 지정 가능, from > to는 400 VALIDATION_ERROR). 정렬 `hire_date ASC, emp_id ASC`
- API-USER-002: Request에 `hireDate` 필수(YYYY-MM-DD, 실재 날짜, 미래 날짜 허용, 기본값 없음). 누락·형식 오류는 400 VALIDATION_ERROR
- API-USER-003: 응답에 `hireDate` 포함
- API-USER-004: 변경 가능 필드에 `hireDate` 추가(지정 시 필수 규칙 동일, null 불가)

## 5. 변경 파일 (구현 순서, 1파일씩 승인)
1. `backend/prisma/schema.prisma` (수정) — User 모델에 `hireDate DateTime @map("hire_date") @db.Date` 1줄 추가. 파일 상단 주석 변경 없음
2. `backend/prisma/migrations/<timestamp>_add_users_hire_date/migration.sql` (신규) — §3 SQL(기존 행 2026-01-01). 작성 후 승인 받고 `npm run db:migrate`(개발 DB) → Prisma Client 재생성(`src/generated/prisma`) 확인
3. `backend/prisma/initial-data.ts` (수정) — 초기 ADMIN `user.create`에 상수 `INITIAL_ADMIN_HIRE_DATE = '2026-01-01'`, `hireDate: toDbDate(INITIAL_ADMIN_HIRE_DATE)`(고정값, 사용자 확정. seed 실행일 안은 미채택). `toDbDate` import 추가
4. `backend/prisma/e2e-account-data.ts` (수정) — 상수 `E2E_HIRE_DATE = '2026-01-01'`, `resetE2eAccounts`의 `data`에 `hireDate: toDbDate(E2E_HIRE_DATE)`(create·update 모두 고정값으로 초기화). `E2eAccountSpec`·config에는 넣지 않음
5. `backend/test/db/db-helpers.ts` (수정) — `TestDataTracker.createUser` 기본값에 `hireDate: toDbDate('2026-01-01')`(overrides로 덮어쓰기 가능)

테스트 파일(6~8)은 test-plan.md §3 참조.

- 영향 없음 확인: 사용자 생성은 위 3곳뿐(`prisma.user.create/upsert` 검색 결과). raw INSERT 없음. `auth.repository.ts` 등은 select 지정이라 변경 불필요
- 참고 파일: `backend/prisma/migrations/20261108081453_split_leaves_rejected_check/migration.sql`(수작업 SQL 스타일), `backend/src/common/time/tokyo-date.ts`

## 6. 보안
신규 엔드포인트·권한 변경 없음. 입사일은 기존 ADMIN 전용 API(기능 8)에서만 노출 예정.

## 문서 갱신 예정 (문서 반영 모드용 초안)
- 05 §2 users 컬럼 표에 hire_date 행 추가(기존 행·seed 초기 ADMIN·E2E 계정 = 고정 2026-01-01 메모)
- 02 FR-USER-001(등록 입력 필수·검색 조건에 입사일 기간), FR-USER-002(수정 가능 항목에 입사일)
- 06 §5 API-USER-001~004(§4 계약)
- SCR-006: 입사일 "기본: 필요" → "기본값 없음(직접 선택)", 검색 조건 = 기존 6항목 + 입사일 기간, 정렬 입사일↑·사원번호↑, 미래 날짜 허용
- SCR-007 §3.1·§6에 입사일(표시·수정 가능·필수)
- 08 TEST_PLAN(SCR-006 입사일 필수 검증), 10 로드맵 변경 이력
