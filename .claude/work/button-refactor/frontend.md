
## C1 (공통 Button 추가)
- 변경 파일: 신규 `frontend/src/components/Button.tsx`, 수정 `frontend/eslint.config.mjs`. `form.tsx`·`globals.css`·테스트 미변경. 사용처 0(화면 변화 없음).
- Button.tsx: export `Button`·`buttonClass`·`ButtonVariant`·`ButtonSize`. 맵 3종(BASE/VARIANT/SIZE·ICON_ONLY)은 리터럴, 크기는 Tailwind 기본(h-9/10/12, px-3/4/6, size-9/10/12). `iconOnly: true` 판별 유니온, `loading ? <Spinner/> : icon`을 `<span aria-hidden>` 슬롯(sm 16·md/lg 20·ghost iconOnly 24, `[&>svg]:size-full`)에, `loading`이면 disabled, 기본 type=button, `<button>` 1개만 렌더. text는 BASE·size 미적용, 아이콘 있을 때만 `inline-flex items-center gap-1`. ghost radius는 rounded-lg(B9), text는 rounded.
- ESLint: `no-restricted-syntax` 3 selector(Button className의 Literal/TemplateElement, `buttonClass()` 포함 TemplateLiteral의 quasi)를 `files: ['src/**/*.tsx']` 별도 객체로 `eslintConfigPrettier` 앞에 추가. 정규식은 상수 `BUTTON_FORBIDDEN_CLASS`. 임시 파일로 검증: 허용(mt-1·w-full·sm:w-auto·sm:flex-1·-m-2·relative) 오탐 0, 금지(h-10·sm:px-4·단독 flex·gap-0.5) 4건 검출 후 임시 파일 삭제.
- 검증: `npx eslint .` exit 0 / `npx tsc --noEmit` exit 0. vitest·build·e2e 미실행(PowerShell 전용·tester 담당).
- 기존 테스트 깨짐: 없음(사용처 0, 미실행이라 미확인). 
- 문서 갱신 예정: 설계 문서의 "문서 갱신 예정" 1~4와 동일(09 §6 Button 행 등). 구현 차이 없음.
- impeccable: 시각 변화 없는 가산이라 화면 확인 생략(사용처 0). 훅 점검 이슈 0.
- tester 전달: `Button.test.tsx`(T1) — 높이/px/radius는 기본 spacing 클래스(h-9/10/12 등) 기대. sm Spinner 슬롯 크기(`[&>svg]:size-full`이 Spinner `size-5`를 이김), disabled·loading, iconOnly, text withIcon 확인. 빌드 CSS에서 채움 variant의 `disabled:bg-*` 우선 확인(§4.3).

## C2 (버튼 크기 토큰 치환, B6 단독 커밋 단위)
- 변경 파일: `frontend/src/app/globals.css`(`--spacing-notice-*` 아래 `@theme` 추가), `frontend/src/components/Button.tsx`(맵 클래스만 치환). 그 외 무변경.
- 토큰: `--spacing-btn-sm/md/lg`=2.25/2.5/3rem, `--spacing-btn-x-sm/md/lg`=0.75/1/1.5rem, `--spacing-btn-gap-sm`=0.25rem, `--spacing-btn-gap`=0.5rem, `--radius-btn`=0.5rem.
- 치환: h-9/10/12→`h-btn-sm/md/lg`, size-9/10/12→`size-btn-sm/md/lg`, px-3/4/6→`px-btn-x-sm/md/lg`, gap-1(sm)→`gap-btn-gap-sm`, gap-2(md·lg)→`gap-btn-gap`, 채움·아웃라인·ghost의 `rounded-lg`→`rounded-btn`. text의 `rounded`(4), `withIcon`의 `gap-1`, 슬롯 `size-4/5/6`은 토큰 대상 아님(PATTERNS §3.3 표 밖)이라 유지. 모두 완전 리터럴.
- 검증: `npx eslint .` exit 0 / `npx tsc --noEmit` exit 0 / `npm run build` exit 0. 빌드 CSS(.next/static/chunks)에 `.h-btn-*`·`.size-btn-*`·`.px-btn-x-*`·`.gap-btn-gap(-sm)`·`.rounded-btn` 생성 확인. vitest·e2e 미실행.
- tester 전달: `Button.test.tsx`의 크기·radius 기대값을 토큰 클래스로 갱신 필요(h-9/h-10/h-12→h-btn-sm/md/lg, px-3/4/6→px-btn-x-*, size-9/10/12→size-btn-*, gap-1/gap-2(버튼 gap)→gap-btn-gap-sm/gap-btn-gap, `rounded-lg`→`rounded-btn`). 계산값(36/40/48px, radius 8px)은 C4 e2e `toHaveCSS`.
- 문서 갱신 예정: 09 §2.3 버튼 크기 토큰 행(B6) — 설계 문서 "문서 갱신 예정" 1과 동일, 차이 없음.
