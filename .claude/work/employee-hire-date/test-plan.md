# test-plan: 사원 입사일(hire_date) 추가

근거: `docs/05_DATABASE_DESIGN.md#2. Table: users`, `#9. 날짜·시간과 타입 처리`, design-backend.md §2~3
테스트 파일도 **1파일씩 수정 전 사용자 승인** 대상이다.

## 1. 시나리오

### DB 스키마 (API 통합 수준, 실제 테스트 DB)
| ID | 종류 | 시나리오 | 기대 결과 |
|---|---|---|---|
| DB-HD-01 | 정상 | information_schema로 users.hire_date 조회 | data_type `date`, is_nullable `NO`, column_default NULL |
| DB-HD-02 | 정상 | `hireDate: toDbDate('2026-04-01')`로 생성 후 조회 | `fromDbDate(user.hireDate) === '2026-04-01'` |
| DB-HD-03 | 실패 | raw SQL로 hire_date 없이 INSERT | NOT NULL 위반(SQLSTATE 23502) |
| DB-HD-04 | 엣지 | 윤년 `2028-02-29`, 월말 `2026-12-31`, 미래 날짜 `2030-04-01` 저장·조회 | 날짜가 하루 밀리지 않음, 미래 날짜도 저장됨(API 검증은 기능 8) |

### seed / E2E 계정
| ID | 종류 | 시나리오 | 기대 결과 |
|---|---|---|---|
| SEED-HD-01 | 정상 | 초기 ADMIN 생성 | hireDate = 고정 `2026-01-01`(사용자 확정, seed 실행일 안은 미채택) |
| E2E-HD-01 | 정상 | `resetE2eAccounts` 신규 생성 | 900001/900002의 hireDate = `2026-01-01` |
| E2E-HD-02 | 엣지 | hireDate를 다른 값으로 바꾼 뒤 재초기화 | `2026-01-01`로 되돌아감 |

### 마이그레이션 (수동 확인, 개발 DB)
| ID | 시나리오 | 기대 결과 |
|---|---|---|
| MIG-01 | 적용 전 users 건수·id 목록 기록 → 적용 | 건수 동일, `hire_date IS NULL` 0건 |
| MIG-02 | 기존 행 전체 | `SELECT count(*) FROM users WHERE hire_date <> DATE '2026-01-01'` = 0건 |
| MIG-03 | 적용 후 `npx prisma migrate dev` | 추가 마이그레이션 생성 안 됨(스키마와 일치) |

### 회귀
- backend `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run test:e2e` 전부 통과(TestDataTracker 기본값으로 기존 e2e 영향 없음)
- frontend는 변경 없음 → 실행 불필요

## 2. 테스트 종류
- DB·seed·E2E 계정: backend e2e(Vitest, `workbridge_test`, 실행 전 `npm run db:migrate:test`)
- 마이그레이션 이관: 수동(개발 DB, 결과를 test-report에 기록)

## 3. 테스트 파일 (승인 순서, design-backend §5의 1~5 다음)
6. `backend/test/db/schema.e2e-spec.ts` (수정) — DB-HD-01~04
7. `backend/test/db/seed.e2e-spec.ts` (수정) — SEED-HD-01 (기존 `toMatchObject` 검증 옆에 추가)
8. `backend/test/db/e2e-accounts.e2e-spec.ts` (수정) — E2E-HD-01~02
