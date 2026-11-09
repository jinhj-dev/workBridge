# E2E 전용 계정 — 프론트엔드(Playwright 설정) 구현 결과

## 생성·수정 파일
- 신규 `frontend/e2e/accounts.ts` — `E2E_ADMIN`(900001, `E2E_ADMIN_PASSWORD`), `E2E_INITIAL_USER`(900002, `E2E_INITIAL_PASSWORD`). backend `E2E_ACCOUNTS`와 사번 일치 필요하다는 상호 참조 주석
- 신규 `frontend/e2e/global-setup.ts` — default export async 함수
  - 두 비밀번호 모두 비어 있으면 아무것도 안 하고 종료
  - `PLAYWRIGHT_BASE_URL` 설정 시 설계의 일본어 안내 문구를 출력하고 종료
  - 그 외 `path.resolve(__dirname, '../../backend')`에서 `execSync('npm run db:e2e-accounts', { stdio: 'inherit', env: process.env })`. 실패 시 예외 전파(try/catch 없음)로 테스트 전체 미시작
  - frontend package.json에 `"type": "module"`이 없어 Playwright가 CJS로 변환 → `__dirname` 사용
- 수정 `frontend/playwright.config.ts` — `globalSetup: './e2e/global-setup.ts'` 추가, 상단 주석에 초기화 동작과 필요한 환경변수 2개 추가

## 구현한 화면 / 사용한 시스템 컴포넌트
- 없음(앱 화면·컴포넌트·messages 변경 없음, Playwright 실행 기반만 변경)

## 새로 만든 시스템 컴포넌트
- 없음

## 화면 리스트와 다른 점
- 없음

## 문서 갱신 예정
- `.claude/work/context.md` 명령어 — `npm run test:e2e`는 globalSetup에서 개발 DB의 E2E 계정(900001/900002)을 자동 초기화함(`E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD` 필요, 둘 다 없으면 초기화 skip, `PLAYWRIGHT_BASE_URL` 지정 시 초기화 안 함)
- `docs/08_TEST_PLAN.md` §3 — backend.md의 갱신 내용에 "Playwright 실행 시 globalSetup이 자동으로 실행" 한 줄 추가

## impeccable 점검 후 고친 점
- UI 변경이 없어 해당 없음

## 화면 확인 결과
- 생략(UI 변경 없음)

## 검증
- `npx tsc --noEmit`, `npm run lint`, prettier check 통과
- `npx playwright test --list`로 config 로딩 확인(14 tests in 3 files). globalSetup 실제 실행·개발 DB 변경은 지시대로 하지 않음

## 임시 처리 / 남은 일
- spec 3개(login/password/dashboard)는 아직 `process.env.E2E_ADMIN_PASSWORD` 직접 참조 → `accounts.ts`로 교체는 tester 담당
