# E2E 전용 계정 — 프론트엔드(Playwright 설정) 설계

앱 화면·컴포넌트 변경은 없다. Playwright 실행 기반만 바꾼다. spec 3개 수정은 tester 담당(test-plan.md).

## 참조 문서
- `docs/08_TEST_PLAN.md#3. 테스트 환경과 데이터`(DOC_ISSUES 참고)
- 백엔드 계정 정의: `.claude/work/e2e-accounts/design-backend.md#데이터 모델`
- 기존 코드: `frontend/playwright.config.ts`, `frontend/e2e/*.spec.ts`

## 결정
- 계정 정보는 `frontend/e2e/accounts.ts` 한 곳에서 export하고 spec은 이것만 참조
  ```ts
  export const E2E_ADMIN = { empId: '900001', password: process.env.E2E_ADMIN_PASSWORD ?? '' };
  export const E2E_INITIAL_USER = { empId: '900002', password: process.env.E2E_INITIAL_PASSWORD ?? '' };
  ```
  사번은 backend `E2E_ACCOUNTS`와 같은 값이어야 한다(주석으로 상호 참조 명시. 패키지가 분리돼 있어 import 공유는 하지 않음)
- `frontend/e2e/global-setup.ts`(default export async 함수)
  - `E2E_ADMIN_PASSWORD`와 `E2E_INITIAL_PASSWORD`가 **둘 다 비어 있으면** 초기화를 건너뛴다(로그인 필요한 테스트는 각 spec에서 skip)
  - `PLAYWRIGHT_BASE_URL`이 설정돼 있으면 로컬 `backend/.env`의 DB가 대상 환경과 다를 수 있으므로 건너뛰고 「PLAYWRIGHT_BASE_URL 指定時は E2E アカウントを初期化しません。対象環境で npm run db:e2e-accounts を実行してください。」를 출력
  - 그 외에는 `backend` 디렉터리(`path.resolve(__dirname, '../../backend')` 상당, ESM/CJS 여부는 config 파일과 맞출 것)에서 `npm run db:e2e-accounts`를 동기 실행(`execSync`, `stdio: 'inherit'`, 환경변수 상속). 실패하면 예외가 그대로 전파되어 테스트 전체가 시작되지 않아야 한다
- `playwright.config.ts`에 `globalSetup: './e2e/global-setup.ts'` 추가. 상단 주석에 "실행 전에 E2E 계정을 초기화한다, 필요한 환경변수 2개" 추가
- 환경변수는 `npm run test:e2e` 실행 셸에서 넘긴다. 스크립트는 셸 값을 상속받고, 없으면 backend/.env(dotenv)를 본다. Playwright 쪽은 셸 값만 본다(별도 dotenv 로딩 추가 안 함)

## 생성·수정 파일
- 신규 `frontend/e2e/accounts.ts`
- 신규 `frontend/e2e/global-setup.ts`
- 수정 `frontend/playwright.config.ts`
- 표시 문구 변경 없음(`messages` 수정 불필요). 콘솔 로그·주석은 일본어
