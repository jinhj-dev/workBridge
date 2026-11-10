FRONTEND: SKIP
SECURITY_REVIEW: SKIP
DOC_ISSUES:
- (확정) 범위는 안 A: DB 컬럼 + 문서 계약만. API-USER-001~005·SCR-006/007 구현은 기능 8에서 입사일 포함해 진행
- (확정) hire_date NOT NULL. 사원 등록 시 선택한 입사일을 저장(기능 8). 기존 사용자 이관값은 고정 2026-01-01(created_at 기반 안은 미채택). 기존 데이터 변경이라 마이그레이션 적용 직전 재승인(DB 규칙 §12)
- (확정) SCR-006 해석: 등록 입사일 "기본: 필요"는 오기 → 기본값 없음 / 검색 = §3 기존 6항목 + 입사일 기간(hireDateFrom/To, 양끝 포함) / 정렬 입사일 오름차순 → 사원번호 오름차순 / SCR-007 상세에서 표시·수정 가능(필수) / 미래 날짜 허용
- (확정) seed 초기 ADMIN·E2E 계정·테스트 헬퍼의 입사일 = 고정 2026-01-01(seed 실행일 안은 미채택)
SUMMARY: users 테이블에 hire_date(DATE NOT NULL, 기존 행 2026-01-01) 추가 + 사원 관리 문서 계약에 입사일 반영(화면·API 구현은 기능 8)

## 승인용 설계 요약
- 범위(함): users.hire_date 컬럼·마이그레이션(기존 행 2026-01-01), 사용자 생성 3곳(seed·E2E 계정·테스트 헬퍼) 대응, DB 테스트, 관련 문서 계약 갱신
- 범위(안 함): API-USER-001~005·SCR-006/007 구현(기능 8), 프론트 변경
- 핵심 결정
  1. `hire_date DATE NOT NULL`, 기본값 없음(Prisma `hireDate DateTime @db.Date`). 날짜 처리는 05 §9(toDbDate/fromDbDate)
  2. 마이그레이션: nullable 추가 → `'2026-01-01'`로 채움 → NOT NULL(수작업 SQL)
  3. 인덱스 추가 안 함(정렬용 인덱스는 기능 8에서 판단)
  4. 문서 계약: 06 API-USER-001(응답 hireDate, 검색 hireDateFrom/To, 정렬), 002(필수·미래 허용), 003/004(표시·수정)
- API: 신규·변경 구현 없음(06 문서 계약만)
- 화면: 없음(SCR-006/007 문서만)
- 변경 파일 수: 백엔드 5개(신규 1: migration.sql) + 테스트 3개 / 프론트 0개
- 1파일씩 승인 대상(구현 순서): 1 schema.prisma → 2 migration.sql(신규) → 3 initial-data.ts → 4 e2e-account-data.ts → 5 db-helpers.ts → 6 schema.e2e-spec.ts → 7 seed.e2e-spec.ts → 8 e2e-accounts.e2e-spec.ts (요점은 design-backend §5, test-plan §3)
- 프로젝트 문서 갱신 예정: 05_DATABASE_DESIGN, 06_API_SPECIFICATION, 02_REQUIREMENTS, SCR-006, SCR-007, 08_TEST_PLAN, 10_DEVELOPMENT_ROADMAP
