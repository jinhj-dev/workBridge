FRONTEND: REQUIRED
SECURITY_REVIEW: REQUIRED
DOC_ISSUES: docs/08_TEST_PLAN.md §3의 시드 데이터는 테스트 DB(통합 테스트)용이고, Playwright가 쓰는 개발 DB의 E2E 전용 계정은 문서에 없음 → 계정 2개 구성을 새로 정함(구현 후 08 §3에 추가 제안)
SUMMARY: 개발 DB에 Playwright 전용 계정 2개(변경 필요/변경 완료)를 매번 같은 상태로 되돌리는 스크립트를 추가하고, 3개 spec이 00001 대신 전용 계정을 쓰게 한다

## 승인용 설계 요약
- 범위: E2E 계정 초기화 스크립트(backend), Playwright globalSetup에서 실행, login/password/dashboard spec 계정 교체, password.spec에서 실제 비밀번호 변경까지 검증 / 하지 않음: seed.ts 동작 변경, DB 스키마 변경, 앱 화면·API 변경, E2E-01~05 여정 추가
- 핵심 결정
  1. 스크립트는 seed와 분리: `backend/prisma/e2e-accounts.ts` + `npm run db:e2e-accounts`. 실행할 때마다 두 계정을 "생성 또는 덮어쓰기"로 초기 상태로 되돌리고 refresh token 삭제(멱등)
  2. 계정: `900001` E2E 관리자(ADMIN, mustChangePassword=false) / `900002` E2E 초회 로그인(EMPLOYEE, mustChangePassword=true). 00001(seed 초기 관리자)은 건드리지 않음. E2E 사번만 6자리이고 시스템 사원번호 규칙(숫자만, 최대 50자리)은 그대로. 사번은 비밀이 아니므로 코드 상수, 비밀번호는 환경변수 `E2E_ADMIN_PASSWORD`(기존 이름 유지, 의미만 전용 계정으로) / `E2E_INITIAL_PASSWORD`
  3. Playwright `globalSetup`이 매 실행 전에 스크립트를 호출 → password.spec이 비밀번호를 바꿔도 다음 실행 때 원상 복구. 새 비밀번호는 실행 시 랜덤 생성(하드코딩 없음)
  4. 안전장치: NODE_ENV=production이면 중단 / 같은 사번의 일반 사용자가 있으면 아무것도 바꾸지 않고 중단 / E2E 계정 외 활성 ADMIN이 없으면 중단(seed 전에 돌려 초기 ADMIN 생성이 막히는 것 방지)
  5. login·dashboard spec은 E2E 관리자, password spec은 E2E 초회 로그인 계정을 사용(분기 없이 기대 경로 고정)
- API: 없음(신규·변경 없음)
- 화면: 없음(SCR-001·002·009의 Playwright spec만 수정)
- 변경 파일 수: 백엔드 7개(신규 4) / 프론트 3개(신규 2) + tester가 spec 3개 수정
- 프로젝트 문서 갱신 예정: 08_TEST_PLAN(§3), 10_DEVELOPMENT_ROADMAP
