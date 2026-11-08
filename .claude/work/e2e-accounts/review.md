VERDICT: APPROVE

# E2E 전용 계정 — 코드 리뷰 (Round 1)

## 요약
- 백엔드 스크립트(`e2e-account-data.ts`, `e2e-accounts.ts`), `assertValidPassword` 추출, globalSetup·accounts.ts, spec 3개 수정 모두 plan.md 승인 범위와 design-backend/frontend 설계대로 구현됨
- 안전장치 3종(NODE_ENV=production 차단, 이름 다른 동일 사번 사용자 보호, 다른 활성 ADMIN 선행 조건)과 단일 트랜잭션, 해시 선계산, 로그에 비밀번호 미출력 확인
- `initial-data.ts`의 메시지 문자열은 기존과 동일(`SEED_ADMIN_PASSWORD` → envName 치환만). 회귀 테스트 통과 보고 확인
- test-plan의 U-E2E-01~05, I-E2E-01~06, P-PW-01~03, login/dashboard 계정 교체 모두 반영. 새 비밀번호는 실행할 때 생성되며 하드코딩 없음
- `docs/` 직접 수정 없음(git status 기준). API·화면·디자인 시스템 변경 없음

## 이슈

[중간] [담당: backend] [분류: 문서갱신] .claude/work/e2e-accounts/backend.md:25 — plan.md(17행)에서 승인한 "프로젝트 문서 갱신 예정: 08_TEST_PLAN(§3), 10_DEVELOPMENT_ROADMAP" 중 `docs/10_DEVELOPMENT_ROADMAP.md`가 backend.md·frontend.md 어디에도 없음. 로드맵 149행 Playwright 건수(SCR-009 2건 → 3건, 합계 14 → 15)와 변경 이력 행(E2E 전용 계정 900001/900002, globalSetup 자동 초기화, 170행의 "개발 DB 관리자 비밀번호 불일치" 환경 문제 해소) 갱신 내용을 "문서 갱신 예정"에 추가

## 제안 (낮음, 판정에 영향 없음)

[낮음] [담당: frontend] [분류: 버그] frontend/e2e/global-setup.ts:7 — 비밀번호 환경변수 중 하나만 설정하면 스크립트가 실패해 테스트 전체가 시작되지 않는다(spec은 계정별로 skip하는 구조). 설계대로이긴 하나, 안내가 backend 쪽 에러 메시지(「環境変数 E2E_xxx が設定されていません。backend/.env に設定してください。」)뿐이라 셸 환경변수로 넘기는 경우 헷갈릴 수 있음. playwright.config.ts 주석에 "둘 다 설정 또는 둘 다 미설정" 한 줄 추가 정도 제안
[낮음] [담당: tester] [분류: 테스트] frontend/e2e/login.spec.ts:10 — 파일 단위 `test.skip` 때문에 env가 없으면 비로그인 테스트(숫자 아닌 사번, 반응형 4건)도 skip됨. 기존 구조 유지라 이번 범위 밖. 필요하면 후속 작업에서 로그인 테스트에만 skip 적용(test-report 참고 항목과 같음)

---

# Round 2

## 확인 대상
- `.claude/work/e2e-accounts/backend.md` "문서 갱신 예정"(코드 변경 없음)

## Round 1 이슈 처리
- [중간] 문서갱신(10_DEVELOPMENT_ROADMAP 누락) — **해결**. backend.md:27-29에 149행 SCR-009 Playwright 2건 → 3건(합계 7+3+5=15건), 변경 이력 행(900001/900002 도입, globalSetup 자동 초기화, Run 2 환경 문제 해소)이 추가됨. 건수는 test-report.md의 Playwright 15건 통과 결과와 일치

## 남은 이슈
- 높음·중간 없음. Round 1의 낮음 제안 2건(frontend 1, tester 1)은 그대로 제안으로 둔다
