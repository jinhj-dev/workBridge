RESULT: PASS

## Run 1 (C1)

- 대상: C1 공통 Button 추가 (`frontend/src/components/Button.tsx`)
- 작성한 테스트: `frontend/src/components/Button.test.tsx` (신규, T1 항목 전체)
- 실행 명령 (PowerShell, `frontend/`):
  - `npx vitest run src/components/Button.test.tsx` → 38 passed / 0 failed
  - `npx vitest run` (전체) → 52 files passed, 779 tests passed / 0 failed
  - `npx tsc --noEmit` → exit 0 (`@ts-expect-error` 2건 포함 통과)
  - `npm run lint` → exit 0
- 실패: 없음
- 참고: 전체 Vitest 실행 중 jsdom의 `Not implemented: navigation to another Document` 콘솔 메시지가 stderr에 출력됨. 테스트는 모두 통과. 어느 테스트에서 나는지는 확인하지 않음 (C1 변경과 무관으로 추정, 기존 파일 기준).
- 미실행: `npm run build`, Playwright e2e (C1은 사용처 0이라 화면 변화 없음, 계획상 C1 e2e 대상 없음)

## Run 2 (C2)

- 대상: C2 버튼 크기·radius 토큰 치환 (`globals.css` `@theme`, `Button.tsx` 맵 클래스)
- 갱신한 테스트: `frontend/src/components/Button.test.tsx`
  - 높이 `h-9/10/12` → `h-btn-sm/md/lg`, 정사각 `size-9/10/12` → `size-btn-sm/md/lg`, 제외 단언 `px-3/4/6` → `px-btn-x-*`
  - primary 채움 variant에 `rounded-btn` 단언 추가
  - 테스트 수 변화 없음(38)
- 실행 명령 (PowerShell, `frontend/`):
  - `npx vitest run src/components/Button.test.tsx` → 38 passed / 0 failed (Run 2 갱신 후 기준, 전체 실행에 포함)
  - `npx vitest run` (전체) → 52 files passed, 779 tests passed / 0 failed (exit 0)
  - `npx tsc --noEmit` → exit 0
  - `npm run lint` → exit 0
- 실패: 없음
- 미실행: `npm run build`, Playwright e2e. C2 계산값(36/40/48px, radius 8px) 단언은 C4 e2e `toHaveCSS`에서 추가 예정
