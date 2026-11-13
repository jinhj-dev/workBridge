
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

## C3 (SectionError 이행)
- 변경 파일: `frontend/src/components/SectionError.tsx` 1개. BT77 [再試行] `<button className={secondaryButtonClass h-9 px-4 text-sm/5}>` → `<Button size="sm" onClick={onRetry}>`(secondary 기본, type=button). `form` 의 `secondaryButtonClass` import 제거, `Button` import 추가. `messages.common.retry`·Notice `action` 슬롯 위치·`onRetry` 그대로.
- 시각 변화: px 16→12(높이 36 동일).
- 검증: `npx eslint .` exit 0 / `npx tsc --noEmit` exit 0. `npm run build` 미실행(지시), vitest·e2e 미실행.
- 기존 테스트: SectionError 사용 테스트는 `getByRole('button', {name: 再試行})`·클릭 기반이라 영향 없을 것으로 판단(클래스 단언 없음, grep 확인). 미실행.
- 화면 확인: 생략(백엔드·로그인 필요한 조회 실패 상태 재현을 하지 않음).
- 문서 갱신 예정: 09 §6 SectionError 행에 Button 사용 기록(설계 문서 항목 1과 동일).

## C4 (모달 내부 버튼 BT42~62)
- 변경 파일(8): `components/Modal.tsx`(X만), `ConfirmDialog.tsx`, `FormModal.tsx`, `components/leave/LeaveDayModal.tsx`, `components/leave/LeaveDetailModal.tsx`, `app/(app)/admin/attendance/AttendanceEditModal.tsx`, `app/(app)/admin/departments/DepartmentDetailModal.tsx`, `DepartmentMembersModal.tsx`. 변경 파일 전부 prettier 적용.
- Modal X: `<Button variant="ghost" iconOnly aria-label disabled={busy} className="-m-2" icon={<svg…/>}>`(svg는 슬롯 size-6 + size-full). footer 래퍼(그리드) 무변경.
- ConfirmDialog: 취소 secondary(`disabled={submitting}`, danger일 때 data-autofocus 유지), 확정 `variant={danger?'danger':'primary'}` `loading={submitting}`(disabled 중복 제거, data-autofocus 위치 유지). FormModal: 취소 secondary, 제출 primary `type="submit" form={formId}` `loading`.
- LeaveDetailModal: 4단계 footer 전부 Button. 取消 확정 danger loading, 承認·却下する primary loading(`disabled={submitting}` 제거), 취소/戻る secondary `disabled={submitting}` 유지. 조건부 렌더(canCancel·canProcess)·`autoFocus`·`data-autofocus`·`setStep`·returnFocus·Fragment key 그대로. AttendanceEditModal: 확인 단계 저장 primary loading·autoFocus·data-autofocus 유지, 입력 단계 버튼은 현행대로 type=button. DepartmentDetailModal: `department && !department.isSystem` 조건 유지.
- 전 footer 버튼 size 기본(md), w-full 없음, Button은 `<button>` 1개라 footer 개수 판정(D4) 불변. `form.tsx` 무변경(modal* 상수는 이 모달들에서 import 제거만).
- 시각 변화: 모달 X radius 4→8(B9). 그 외 높이 40·px16·gap8 동일(토큰 계산값 동일).
- 검증: `npx eslint .` exit 0 / `npx tsc --noEmit` exit 0 / `npm run build` 금지로 미실행 / vitest·e2e 미실행. 
- 화면 확인: 생략(개발 서버 3000은 응답 200이나 로그인이 필요하고 E2E 계정 환경변수·개발 DB 접근을 쓰지 않음).
- tester 전달: ① `ConfirmDialog.test.tsx:61,64` `bg-danger-100` 클래스 단언은 Button danger variant(`bg-danger-100`)로 통과 예상. `animate-spin`(ConfirmDialog 80,85 / FormModal 67,72)은 loading 시 Spinner svg 유지로 통과 예상. ② `Modal.test.tsx:60` footer `sm:border-t` 불변. ③ X 버튼 `aria-label=閉じる`·busy 시 disabled 확인. ④ 기존 테스트 중 modal* 클래스(예: `form.test.tsx:46-47`)는 C9까지 form.tsx 무변경이라 영향 없음. ⑤ 단위 T3 + e2e E1(`modal-a11y`·`leaves`·`approvals`·`departments*`), E2 `toHaveCSS` 36/40/48·X radius 8px 단언 추가 필요.
- 문서 갱신 예정: 09 §6 Modal 행(X = ghost)·ConfirmDialog/FormModal 등(설계 문서 항목 1과 동일), 차이 없음.
