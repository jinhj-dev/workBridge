# design-frontend — 버튼 공통 UI 패턴 리팩터링

## 참조 문서 (전체가 아니라 아래 절만 읽는다)
- `docs/UI_BUTTON_PATTERNS.md` v3 — §2(variant 7종 값), §3(size·토큰), §4.3~4.4(`buttonClass`·`Button` props), §4.6(`className` 허용·금지 목록), §6.2(접근 이름), §7(반응형·터치), §8(모달), §11(결정 B1~B17)
- `docs/UI_BUTTON_REFACTOR_PLAN.md` v3 — §0-3(유지 목록), §2 단계 1~8(파일·위험·테스트), §3(위험표)
- `docs/UI_BUTTON_AUDIT.md` — 버튼 ID(BT01~BT80)별 현행 클래스·라인(이행 대상 확인용)
- `docs/UI_MODAL_PATTERNS.md` §5.1(footer D4), §7(단계형 모달 포커스)
- `docs/09_DESIGN_SYSTEM.md` §2.3·§3 Button — 읽기만. **수정 금지**(문서 반영 모드에서 반영)
- 보조: `.claude/work/button-audit/frontend-review.md`(파일:라인 근거, Q1~Q12)

## 공통 규칙 (모든 청크)
- 화면 ID·라우트·문구 변경 없음. `messages/ja.ts` 수정 없음.
- **유지 조건**(PLAN §0-3을 청크마다 확인): 아래 각 청크 표의 "유지" 열에 적은 것 + 다음 일반 조건
  - `onClick` 핸들러·`stopPropagation`·`setStep` 그대로
  - 제출 버튼은 `type="submit"` 명시(Button 기본은 `button`), FormModal은 `form={formId}`
  - `<Link href>` 대상, `router.back()`, URL Query 갱신 그대로
  - 조건부 렌더(`{cond && <Button/>}`)와 disabled 조건식은 글자 그대로 옮긴다
  - `aria-label`·`aria-pressed`·`aria-expanded`·`autoFocus`·`data-autofocus`·단계 key는 Button에 그대로 전달
  - 배치 클래스(`mt-1`, `sm:flex-1`, `sm:mt-6`, `w-full sm:w-auto`, `-m-2`, `relative`, 래퍼 `lg:mt-6`)는 `className` 또는 래퍼에 유지
  - 호출부의 크기·색·정렬 클래스(`flex`, `h-*`, `px-*`, `text-*`, `rounded-*`, `font-*`, `gap-*`, `disabled:*`)는 제거(ESLint가 검출)
- `form.tsx` 버튼 상수는 C1~C8에서 수정하지 않는다(B15). 이행으로 import가 남지 않게 된 파일에서만 import 제거.
- Button은 `<button>` 1개만 렌더(Fragment·래퍼·Tooltip 금지, 모달 footer D4).
- 주석은 일본어. 커밋 문구 일본어(청크별 커밋 1개, 커밋은 메인이 진행).
- 청크 공통 검증(`frontend/`): `npx tsc --noEmit` → `npm run lint` → 청크의 단위 테스트 `npx vitest run <파일>` → `npm test` → `npm run build`. e2e는 청크에 적은 spec만(`npm run test:e2e -- <spec>`, 백엔드·E2E 계정 환경변수 필요. 못 돌리면 미실행으로 보고).
- 구현 중 기존 테스트가 깨지면 테스트를 고치지 말고 원인(어느 단언, 왜)을 frontend.md에 적는다(tester 소유).

## 신규 컴포넌트
- `frontend/src/components/Button.tsx` — 09 §3·§6에 없는 공용 컴포넌트. 근거 B1(PATTERNS §4). export `Button`, `buttonClass`, `ButtonVariant`, `ButtonSize`.
  - 시그니처: PATTERNS §4.3 `buttonClass(options?: { variant?, size?, iconOnly?, withIcon? }): string`, §4.4 props 표 그대로(`iconOnly: true` 리터럴 판별 유니온, `ComponentPropsWithRef<'button'>` 스프레드, 기본 `variant='secondary'`·`size='md'`·`type='button'`).
  - 맵 3개(`BASE_CLASS`·`VARIANT_CLASS`·`SIZE_CLASS`/`ICON_ONLY_CLASS`)는 완전한 리터럴. variant 색 값은 `form.tsx:52-79` 상수와 같은 토큰. `text`는 BASE·size 미적용, `withIcon`(Button은 `icon` 있으면 자동)일 때만 `inline-flex items-center gap-1`.
  - `loading ? <Spinner /> : icon`을 `<span aria-hidden>` 슬롯에(슬롯 크기 sm 16·md/lg 20·ghost iconOnly 24, `[&>svg]:size-full`). `loading`이면 disabled. 기존 `components/Spinner.tsx` 그대로 사용(`svg.animate-spin` 유지).

## 청크 목록

### C1. 공통 Button 추가 (PLAN 단계 1, 무변경 가산)
| 항목 | 내용 |
|---|---|
| 변경 파일 | 신규 `frontend/src/components/Button.tsx`, `frontend/eslint.config.mjs` |
| 내용 | 크기는 Tailwind 기본 spacing(`h-9`/`h-10`/`h-12`, `px-3`/`px-4`/`px-6`, iconOnly `size-9`/`size-10`)으로 구현. ESLint 규칙 추가(아래) |
| 유지 | 기존 화면 0곳 변경(사용처 0). `form.tsx`·`globals.css` 미수정 |
| 검증 | tsc·lint·`npm test`·build. lint가 기존 코드에 오류 0(규칙 오탐 없음). tester `Button.test.tsx`(test-plan T1) 통과 |

ESLint(`no-restricted-syntax`, `eslintConfigPrettier` 앞의 별도 config 객체로 `files: ['src/**/*.tsx']`):
- 대상 1: `JSXOpeningElement[name.name='Button'] > JSXAttribute[name.name='className']`의 문자열 `Literal`·`TemplateLiteral`(quasis) 값
- 대상 2: `TemplateLiteral`에 `CallExpression[callee.name='buttonClass']`가 있고 quasis에 문자열이 덧붙은 경우
- 금지 정규식: PATTERNS §4.6 금지 목록(`h-`·`size-`·`min-h-`·`p[xytblr]?-`·`text-`·`font-`·`leading-`·`bg-`·`border`·`rounded`·`gap-`·`flex`(단어 단위로만 금지. 허용 목록의 `flex-1`·`sm:flex-1`은 통과)·`inline-flex`·`grid`·`items-`·`justify-`·`whitespace-`·`outline`·`shadow`·`opacity-`·`cursor-`, 반응형·상태 접두사(`sm:`·`hover:`·`disabled:` 등) 포함)
- 메시지는 일본어(예: 「Button の className は配置用クラスのみ指定できます(UI_BUTTON_PATTERNS §4.6)」)
- esquery 정규식으로 표현이 어려우면 대상 1·2의 문자열에 대한 정규식 1개로 단순화해도 된다. 허용 목록(§4.6)의 `w-full sm:w-auto`, `sm:flex-1`, `-m-2`, `mt-1`, `relative`가 오탐되지 않는지 lint로 확인

### C2. 버튼 크기 토큰 치환 (PLAN 단계 2-a, B6 — **단독 커밋**)
| 항목 | 내용 |
|---|---|
| 변경 파일 | `frontend/src/app/globals.css`(`@theme`에 `--spacing-btn-sm/md/lg`, `--spacing-btn-x-sm/md/lg`, `--spacing-btn-gap-sm`, `--spacing-btn-gap`, `--radius-btn`, 값은 PATTERNS §3.3, `--spacing-notice-*` 옆에 같은 형식), `frontend/src/components/Button.tsx`(맵의 `h-10`→`h-btn-md`, `px-4`→`px-btn-x-md`, `rounded-lg`→`rounded-btn`, gap 등 같은 계산값의 리터럴로 치환) |
| 유지 | 계산값 동일(2.25/2.5/3rem 등). 동적 조합 금지. 다른 파일 변경 금지 |
| 검증 | tsc·lint·`npm test`·build. tester가 `Button.test.tsx` 높이·radius 클래스 기대값을 토큰 클래스로 갱신. 계산값(`toHaveCSS`)은 C4 e2e에서 확인 |

### C3. SectionError 이행 (PLAN 단계 2-b)
| 항목 | 내용 |
|---|---|
| 변경 파일 | `frontend/src/components/SectionError.tsx`(BT77 [再試行] → `<Button size="sm" onClick={…}>`) |
| 유지 | `onClick`(reload) 호출, 문구 `messages.common.retry`, Notice `action` 슬롯 위치. Notice 높이 불변 |
| 시각 변화 | px 16→12(사용처 22곳) |
| 검증 | 공통 + SectionError 사용 화면 단위 테스트(조회 실패 → 再試行 → 재조회, test-plan T2) |

### C4. 모달 내부 버튼 BT42~62 (PLAN 단계 3)
| 파일 | 변경 | 유지 |
|---|---|---|
| `components/Modal.tsx` | X만 `<Button variant="ghost" iconOnly icon={…} aria-label={…} className="-m-2" disabled={busy} onClick={…}>`. footer 래퍼(`:134` 그리드) 무변경 | `aria-label` 문구, `busy` 시 disabled, footer 클래스(`Modal.test.tsx:60`) |
| `components/ConfirmDialog.tsx` | 취소 `secondary`, 확정 `variant={tone==='danger'?'danger':'primary'}` `loading={submitting}` | 취소 `disabled={submitting}`, 확정의 `disabled={submitting}`은 제거(loading이 포함), `data-autofocus` 위치, `tone` API |
| `components/FormModal.tsx` | 취소 `secondary`, 제출 `primary` `type="submit" form={formId}` `loading` | Enter 제출, 취소 disabled 조건 |
| `components/leave/LeaveDayModal.tsx` | 閉じる `secondary` | onClose |
| `components/leave/LeaveDetailModal.tsx` | 단계(detail/approve/reject/cancel)별 footer 버튼 전부. 取消 확정 `danger` `loading`, 承認·却下する `primary` `loading` | `canCancel`·`canProcess` 조건, 단계 key 재마운트, `autoFocus={returnFocus === …}`, `data-autofocus`, `setStep` |
| `app/(app)/admin/attendance/AttendanceEditModal.tsx` | 확인 단계 포함 footer 4개. 저장 `primary` `loading` | 단계 전환, 제출 방식(`type`/`form`은 현행 그대로), 취소 disabled |
| `app/(app)/admin/departments/DepartmentDetailModal.tsx` | 閉じる `secondary`, この部署を編集 `primary` | `department && !department.isSystem` 조건부 렌더 |
| `app/(app)/admin/departments/DepartmentMembersModal.tsx` | 閉じる `secondary` | onClose |
- 모든 footer 버튼은 size 기본(md), `w-full` 주지 않음(그리드가 폭 결정).
- 시각 변화: 모달 X radius 4→8(B9). md 버튼에 `whitespace-nowrap` 없음 확인.
- 검증: 공통 + test-plan T3(단위)·E1(e2e `modal-a11y`·`leaves`·`approvals`·`departments*`) + E2(`toHaveCSS` 36/40/48 단언 추가).

### C5. 페이지 주 동작 BT01~03·05~12 (PLAN 단계 4)
| 파일 | 대상 → 변경 | 유지 |
|---|---|---|
| `app/login/LoginForm.tsx` | BT01 로그인 → `primary lg type="submit" loading className="mt-1 w-full"` | Enter 제출, 제출 중 disabled·Spinner, 문구 |
| `app/password/PasswordChangeForm.tsx` | BT02 변경 → `primary lg type="submit" loading className="w-full sm:flex-1"`, BT03 キャンセル → `secondary lg className="w-full sm:flex-1"` | `!mustChangePassword`일 때만 キャンセル, `router.back()`, キャンセル은 제출 중에도 활성(현행), `sm:flex-row-reverse` 래퍼 |
| `app/(app)/leaves/LeaveManagementLayout.tsx` | BT05 休暇申請 → `primary lg icon={<PlusIcon/>}`(반응형 크기 제거) | 신청 모달 열기, 표시 조건 |
| `app/(app)/admin/departments/DepartmentsView.tsx` | BT06 部署を追加 → `primary lg icon={<PlusIcon/>}`, BT12 条件をクリア → `secondary md` | `!hasConditions` disabled, 핸들러 |
| `app/(app)/dashboard/AttendanceSection.tsx` | BT07 出勤 `primary lg className="w-full"`, BT08 退勤 `primaryOutline lg className="w-full"`, 로컬 `base` 삭제, 아이콘은 `icon` prop | `disabled={!loaded}`·`disabled={done}`, 출근 카드 안 button 수 1(`DashboardView.test.tsx:337`) |
| `app/(app)/attendance/AttendanceHistoryView.tsx` | BT09 照会 → `primary lg type="submit" className="w-full sm:w-auto sm:mt-6"` | 폼 제출·Query 갱신 |
| `app/(app)/admin/attendance/AdminAttendanceView.tsx` | BT10 照会 → `primary lg type="submit" className="w-full sm:w-auto"` | 래퍼 `sm:col-span-2 lg:col-span-1 lg:mt-6` |
| `app/(app)/leaves/LeaveHistoryList.tsx` | BT11 検索 → `primary lg type="submit" className="w-full sm:w-auto"`, Search 아이콘 제거(B14, `SearchIcon` import가 남지 않으면 제거) | 폼 제출 |
- 시각 변화: BT05 모바일 44→48, BT06 40→48·글자 14→16, BT07·08 44→48, 검색 px 32→24·모바일 전폭, BT12 44→40.
- B3 확인(사용자 확인 대상): ① 360 PageHeader 한 줄(「休暇管理」+休暇申請, 「部署管理」+部署を追加) ② SCR-010 헤더 +8px ③ 条件をクリア(40)와 SearchInput·select(44) 2px 어긋남 ④ 出勤·退勤 카드 +4px. frontend는 개발 서버(`npm run dev:frontend`, http://localhost:3000)에서 360/768/1024/1440 화면 확인 결과를 frontend.md에 적고, tester가 E3 캡처 spec으로 남긴다.
- 검증: 공통 + T4(Enter 제출 5곳·disabled) + e2e `login`·`password`·`dashboard*`·`attendance*`·`leaves`·`departments*`.

### C6. 표 내부 액션·텍스트 링크 BT22~33·38·04 (PLAN 단계 5)
| 파일 | 변경 | 유지 |
|---|---|---|
| `app/(app)/leaves/LeaveHistoryList.tsx` | 로컬 `detailButtonClass` 삭제, 詳細 → `Button size="sm"` | `aria-label`(대상 이름), onClick |
| `app/(app)/leaves/approvals/ApprovalsView.tsx` | 로컬 `smallButtonClass`·`detailButtonClass`·`approveButtonClass` 삭제. 詳細 `secondary sm`, 承認 `primary sm`, 却下 `secondary sm`(B11) | `disabled={own}`, `leave.status === 'PENDING'` 조건, aria-label |
| `app/(app)/admin/attendance/AdminAttendanceView.tsx` | 로컬 `smallButtonClass` 삭제, 修正 → `primaryOutline sm icon={<PencilIcon/>}`(B10). 사원명 `<Link className={buttonClass({variant:'text'})}>`(2곳) | 修正 aria-label·onClick, 사원명 링크 href, 긴 이름 줄바꿈 |
| `app/(app)/admin/departments/DepartmentsView.tsx` | 로컬 `rowButtonClass` 삭제. 詳細·確認 `secondary sm`, 編集 `primaryOutline sm icon={<PencilIcon/>}`, 削除 `dangerOutline sm icon={<TrashIcon/>}` | `!item.isSystem` 조건, aria-label, `border-danger-100`·`text-danger-100` 클래스(테스트 단언) |
| `app/(app)/dashboard/CardLink.tsx` | `buttonClass({variant:'text', withIcon:true})`, `flex gap-0.5` 제거 | href, `isAdmin` 조건(호출부), › `aria-hidden` |
| `app/password/PasswordChangeForm.tsx` | BT04 ログアウト → `<Button variant="text" className="mt-4">` | `mustChangePassword`일 때만, `handleLogout` |
| `components/leave/leaveIcons.tsx` | `PencilIcon` 추가(`departments/icons.tsx`와 같은 path·strokeWidth 1.75, 기존 `IconProps` 형식) | 기존 export 불변 |
| `app/(app)/admin/departments/icons.tsx` | `PencilIcon` 삭제(사용처는 DepartmentsView 1곳뿐) | 나머지 아이콘 |
- Pencil 위치 결정: `leaveIcons.tsx`는 이미 `SearchInput`·`DepartmentsView`(PlusIcon)가 휴가 외 용도로 import하는 사실상 공용 파일 → 라우트 간 import(勤怠 → departments) 대신 여기로 이동. 파일 이름·헤더 주석 변경과 공용 `components/icons/` 신설은 이번 범위 밖.
- 시각 변화: sm px 16→12, 勤怠 修正 회색→Primary 아웃라인 + 아이콘(폭 약 +20px).
- B10 확인(사용자 확인 대상): SCR-008 勤怠 목록 360 카드형·1024 표에서 修正 한 줄·행 높이·표 폭. frontend 화면 확인 + tester E3.
- 검증: 공통 + T5 + e2e `approvals`·`departments-responsive`·`attendance`.

### C7. 아이콘 버튼 BT17~21·64 (PLAN 단계 6)
| 파일 | 변경 | 유지 |
|---|---|---|
| `components/layout/TopBar.tsx` | 벨 `<Link className={`${buttonClass({variant:'ghost', iconOnly:true})} relative`}>`, 로컬 `iconButtonClass` 삭제 | href `/leaves/approvals`, `aria-label`, 빨간 점 `absolute` 위치. `menuItemClass`·사용자 메뉴 손대지 않음 |
| `components/leave/MonthNavigator.tsx` | 前月·翌月 → `<Button iconOnly icon={<ChevronLeftIcon/>} aria-label={…}>` | `gap-3`, 라벨 서체, onChange(±1) |
| `app/(app)/attendance/AttendanceSheetView.tsx` | 前月·翌月 → `Button iconOnly`(36→40), 今月 → `Button` md(sm→md), 로컬 `iconButtonClass`·`textNavButtonClass`·`Chevron` 삭제, `leaveIcons`의 `ChevronLeftIcon`·`ChevronRightIcon` 사용 | `disabled={month === currentMonth}`, aria-label 前月/翌月, 헤더 `gap-1 sm:gap-2`·라벨 `text-base/6 font-medium`(B8) |
- 제외: `Notice.tsx` X(BT63).
- 시각 변화: 출근부 월 이동 36→40(헤더 +4px), 벨 radius 4→8, Chevron 굵기 2→1.75.
- 검증: 공통 + T6 + e2e `attendance-sheet-layout`·`leave-calendar-mobile`·`leave-visual`·`leave-management`·`leave-sidebar-submenu`.

### C8. 모바일 반응형 검증 (PLAN 단계 7)
- 변경 파일: 원칙적으로 없음. 문제 발견 시 해당 파일에서 배치 클래스만 수정(파일·이유를 frontend.md에 기록).
- 확인: 360/768/1024/1440(D15)에서 SCR-001~004·008~010 + 모달 9종. ① 모달 footer D4·긴 확정 문구 줄바꿈 ② PageHeader 한 줄 ③ 카드형 목록 행 동작 줄바꿈 ④ 검색 버튼 전폭 ⑤ 텍스트 링크 BT04·32·33·38의 24×24 또는 간격 예외 충족 — 미충족인 곳만 `className="py-0.5"`(§7.2. `py-*`는 금지 목록이므로 ESLint 예외가 필요하면 해당 줄에만 `eslint-disable-next-line`과 일본어 사유 주석) ⑥ `overflow-hidden` 안 포커스 링. 대상 외 BT16·34·40은 측정만.
- 결과는 `.claude/work/button-refactor/frontend.md`에 기록(PLAN은 `button-audit/`라 했으나 이번 작업 폴더로 통일).
- 검증: tester E3 전체 폭 캡처 + 키보드 도달(E4).

### C9. 중복 제거 (PLAN 단계 8 코드 부분)
| 항목 | 내용 |
|---|---|
| 변경 파일 | `frontend/src/components/form.tsx`(버튼 상수 8개 삭제: primary/secondary/primaryOutline/dangerOutline/modalPrimary/modalSecondary/modalDanger/textButtonClass) |
| 전제 | grep `ButtonClass` import 0건(Pagination·StatusFilterButtons 등 대상 외 로컬 이름 제외), 대상 버튼에 `h-9 px-4`·`h-12 px-8` 등 크기 조합 0건, `AttendanceSheetView` `Chevron` 삭제 확인 |
| 유지 | `form.tsx`의 입력 관련 export(inputClass 등) 불변 |
| 검증 | 공통 + tester가 `form.test.tsx:46-47` 단언을 `Button.test.tsx` danger variant 단언으로 이전 + 전체 `npm run test:e2e` |
- 문서는 이후 architect 문서 반영 모드에서(아래 "문서 갱신 예정").

## 상태·에러 처리
- 새 상태 없음. `loading`은 기존 `submitting` 상태를 그대로 넘긴다. 에러 표시(FieldError·Notice·토스트) 변경 없음.

## 테스트 근거 문구 (`messages/ja.ts`, 변경 없음)
- 공통 `再試行`, `閉じる` / 대시보드 `出勤する`·`退勤する`, `すべて見る` / 휴가 `休暇申請`, 검색 `検索`(휴가)·`照会`(勤怠) / 출근부 `前月`·`翌月`·`今月` / 勤怠 관리 `修正` / 부서 `編集`·`部署を追加` / `ログアウト`. 행 버튼 접근 이름은 각 화면 `detailLabel(name)` 등 기존 함수 결과.

## 문서 갱신 예정 (C9 후 문서 반영 모드)
1. `docs/09_DESIGN_SYSTEM.md` — `docs/UI_BUTTON_PATTERNS.md` §10 표 그대로: §2.3 버튼 높이 문구(44 삭제)·radius 예외(B9)·버튼 크기 토큰 행(B6), §3 Button 행(variant 7종·size), §5 신규 항목 11 "버튼 공통 패턴", §6 `components/Button.tsx` 행 신규·`form.tsx` 버튼 상수 행 삭제·`Modal`(footer 판정 표기, X = ghost)·`MonthNavigator`·`SectionError`·`TopBar`(벨) 갱신, `leaveIcons`에 `PencilIcon` 추가 기록(departments/icons에서 이동).
2. `.claude/work/context.md` 공용 모듈 — `Button`·`buttonClass` 추가, `form.tsx` 버튼 상수·`primaryOutlineButtonClass`(미기록) 표기 제거.
3. `docs/UI_BUTTON_REFACTOR_PLAN.md` — 단계별 진행 상태(완료·커밋), C8 측정 결과 요약.
4. `docs/10_DEVELOPMENT_ROADMAP.md` — 변경 이력 행 추가(테스트 결과·미검증 항목 포함).
- 실제 구현과 다르게 된 값이 있으면 frontend.md의 "문서 갱신 예정"에 최종값으로 적는다.
