
## C1 (공통 Button 추가)
- 변경 파일: 신규 `frontend/src/components/Button.tsx`, 수정 `frontend/eslint.config.mjs`. `form.tsx`·`globals.css`·테스트 미변경. 사용처 0(화면 변화 없음).
- Button.tsx: export `Button`·`buttonClass`·`ButtonVariant`·`ButtonSize`. 맵 3종(BASE/VARIANT/SIZE·ICON_ONLY)은 리터럴, 크기는 Tailwind 기본(h-9/10/12, px-3/4/6, size-9/10/12). `iconOnly: true` 판별 유니온, `loading ? <Spinner/> : icon`을 `<span aria-hidden>` 슬롯(sm 16·md/lg 20·ghost iconOnly 24, `[&>svg]:size-full`)에, `loading`이면 disabled, 기본 type=button, `<button>` 1개만 렌더. text는 BASE·size 미적용, 아이콘 있을 때만 `inline-flex items-center gap-1`. ghost radius는 rounded-lg(B9), text는 rounded.
- ESLint: `no-restricted-syntax` 3 selector(Button className의 Literal/TemplateElement, `buttonClass()` 포함 TemplateLiteral의 quasi)를 `files: ['src/**/*.tsx']` 별도 객체로 `eslintConfigPrettier` 앞에 추가. 정규식은 상수 `BUTTON_FORBIDDEN_CLASS`. 임시 파일로 검증: 허용(mt-1·w-full·sm:w-auto·sm:flex-1·-m-2·relative) 오탐 0, 금지(h-10·sm:px-4·단독 flex·gap-0.5) 4건 검출 후 임시 파일 삭제.
- 검증: `npx eslint .` exit 0 / `npx tsc --noEmit` exit 0. vitest·build·e2e 미실행(PowerShell 전용·tester 담당).
- 기존 테스트 깨짐: 없음(사용처 0, 미실행이라 미확인). 
- 문서 갱신 예정: 설계 문서의 "문서 갱신 예정" 1~4와 동일(09 §6 Button 행 등). 구현 차이 없음.
- impeccable: 시각 변화 없는 가산이라 화면 확인 생략(사용처 0). 훅 점검 이슈 0.
- tester 전달: `Button.test.tsx`(T1) — 높이/px/radius는 기본 spacing 클래스(h-9/10/12 등) 기대. sm Spinner 슬롯 크기(`[&>svg]:size-full`이 Spinner `size-5`를 이김), disabled·loading, iconOnly, text withIcon 확인. 빌드 CSS에서 채움 variant의 `disabled:bg-*` 우선 확인(§4.3).
