VERDICT: CHANGES_REQUESTED

# review — 버튼 공통 UI 패턴 리팩터링 (C1~C9, C5 Fix 1)

검토 범위: `components/Button.tsx`, `eslint.config.mjs`, `globals.css` 토큰 사용, C3~C7 이행 파일 전부(SectionError, Modal·ConfirmDialog·FormModal·LeaveDayModal·LeaveDetailModal·AttendanceEditModal·DepartmentDetailModal·DepartmentMembersModal, LoginForm·PasswordChangeForm·LeaveManagementLayout·DepartmentsView·AttendanceSection·AttendanceHistoryView·AdminAttendanceView·LeaveHistoryList·ApprovalsView·CardLink·TopBar·MonthNavigator·AttendanceSheetView·leaveIcons·departments/icons), `form.tsx`·`SearchInput.tsx`(C5 Fix 1), 테스트(`Button.test.tsx`, `form.test.tsx`, `e2e/button-visual.spec.ts`, `e2e/button-c8.spec.ts`), plan/design-frontend/test-plan/frontend.md/test-report.md, UI_BUTTON_PATTERNS v3, decisions B1~B17, 09 §6.
참고: 이 환경에서 git diff를 실행할 수 없어 현재 브랜치 코드와 보고서를 기준으로 검토했다.

## 확인 결과 (문제 없음)
- 동작 유지: onClick·`setStep`·`returnFocus` 기반 `autoFocus`·`data-autofocus`·단계 key(`Fragment key`) 재마운트·`canCancel`/`canProcess`/`!item.isSystem`/`department && !department.isSystem`/`leave.status === 'PENDING'` 조건부 렌더·`disabled={own}`·`!loaded`·`done`·`!hasConditions`·`month === currentMonth`가 글자 그대로 옮겨짐. 제출 버튼 5곳(로그인·비밀번호·照会 2·検索) `type="submit"`, FormModal `type="submit" form={formId}` 유지. 확정 버튼은 `loading`으로만, 취소 버튼은 `disabled={submitting}` 유지(PATTERNS §4.4 `loading ⊃ disabled`). SCR-009 キャンセル은 제출 중 활성 유지(범위 밖 동작 변경 없음).
- 접근 이름: 행 버튼 aria-label(`detailLabel`·`approveLabel`·`rejectLabel`·`editLabel`·`deleteLabel`·`viewMembersLabel`), 아이콘 전용 前月·翌月·X의 aria-label, 벨 Link aria-label(건수) 유지. 아이콘 슬롯 `aria-hidden`.
- className 배치 전용: 호출부 className은 `mt-1 w-full`, `w-full sm:flex-1`, `w-full`, `w-full sm:w-auto(sm:mt-6)`, `-m-2`, `mt-4`, 벨 `relative`뿐. ESLint 규칙 3 selector가 `<Button className>` 문자열·템플릿과 `buttonClass()` 덧붙임을 검사.
- 결정 일치: B1(Button+buttonClass), B2(variant 7종), B3(休暇申請·部署を追加·出勤·退勤 lg, 条件をクリア md), B4/B5(px 12/24), B6(토큰 별도 커밋, 맵은 완전 리터럴), B8(월 이동만 40, 라벨 서체·간격 유지), B9(ghost만 radius 8), B10(修正 primaryOutline+Pencil), B11(却下 secondary), B12(사원명 Link = text), B13(active 없음), B14(검색 lg·아이콘 없음·sm 미만 전폭), B15(C1~C8 form.tsx 무변경 → C9 삭제), B16(ESLint), B17(`fullWidth` 없음).
- 중복 잔존: `ButtonClass`·로컬 `iconButtonClass`·`rowButtonClass`·`detailButtonClass`·`smallButtonClass`·출근부 로컬 `Chevron` 0건. 남은 `<button>`은 대상 외(V8~V11, BT13~16·34·39~41·63·80)와 일치.
- C5 Fix 1의 동작: `inputClass` 문자열은 그대로라 다른 입력란 48 유지(e2e `shouldKeepLoginInputsAt48pxWhileSearchInputIs44px`), SearchInput 44는 09 §6 기재값과 일치. 휴가 캘린더 필터는 `[&_select]:h-11`로 select가 44였으므로 이번 수정으로 오히려 높이가 맞게 됨.

## 이슈

[중간] [담당: frontend] [분류: 코드품질] frontend/src/components/SearchInput.tsx:34, frontend/src/components/form.tsx:7-10 — C5 Fix 1은 높이(`h-12` vs `h-11`)만 분리했고, 같은 원인의 충돌 `inputBaseClass`의 `px-4` vs `pl-10`, `text-base/6` vs `text-sm/5`는 그대로 남음. 지금 결과(왼쪽 40·14/20)는 Tailwind CSS 출력 순서가 우연히 맞아서 나온 것이고, 이번 48px 버그와 같은 구조(PATTERNS §4.6이 "예측 불가"로 금지한 패턴)임. 또 `inputBaseClass`라는 이름과 주석("高さを除いた")은 "높이만 빼면 덮어써도 된다"고 읽혀 같은 실수를 부를 수 있음 / 수정 방향: `inputBaseClass`에서 `px-4`·`text-base/6`도 빼고(테두리·색·포커스·aria-invalid만) `inputClass = 'h-12 px-4 text-base/6 ' + base`로 정의, SearchInput은 `h-11 pl-10 pr-4 text-sm/5`를 직접 지정. `inputClass` 최종 문자열의 클래스 집합은 그대로 유지(48px e2e 단언으로 확인), 주석을 "높이·좌우 padding·글자 크기를 제외한 공통 틀"로 수정.

[중간] [담당: frontend] [분류: 문서갱신] frontend.md "C5 Fix 1" 절 — "문서 갱신 예정"이 없음. 09 §6 `SearchInput` 행(docs/09_DESIGN_SYSTEM.md:270)은 "`inputClass` 재사용"이라 적혀 있어 실제(`inputBaseClass` + `h-11`)와 다르고, `form.tsx` 행에 새 export `inputBaseClass`가 기록되지 않음. context.md 공용 모듈(form.tsx 목록)도 같음 / 수정 방향: frontend.md C5 Fix 1에 "문서 갱신 예정: 09 §6 form.tsx 행에 `inputBaseClass`(높이 등 제외 공통 틀) 추가, SearchInput 행 '`inputBaseClass` 재사용, 높이 44' 로 갱신, context.md form.tsx 목록에 `inputBaseClass` 추가"를 적는다(위 이슈 수정 시 최종 정의 기준으로).

[중간] [담당: tester] [분류: 테스트] frontend/src/components/Button.test.tsx:54, :90, :229 — `expect(el).not.toHaveClass(a, b, c)`는 "모두 가진 경우가 아님"만 검사하므로 하나만 빠져도 통과함. :90(`px-btn-x-sm/md/lg` 3개)은 셋을 동시에 가질 수 없어 항상 통과하는 무의미한 단언이고, :229(text에 `inline-flex`·`whitespace-nowrap` 없음, test-plan T1 명시 항목)와 :54(text에 `border`·`bg-white`·`bg-primary-100` 없음)도 한쪽이 추가되는 회귀를 잡지 못함 / 수정 방향: 클래스마다 `not.toHaveClass('x')`를 따로 단언(예: `for (const c of [...]) expect(button).not.toHaveClass(c)`).

[중간] [담당: tester] [분류: 테스트] frontend/e2e/button-c8.spec.ts:235-242 — "BT04 ログアウト"로 상단바 사용자 메뉴의 로그아웃 항목(`#user-menu`, `menuItemClass` h-10, 이행 대상 아님)을 측정함. BT04는 `PasswordChangeForm`의 text 버튼(UI_BUTTON_AUDIT:129, `mustChangePassword`일 때만, 높이 20)임. 그래서 test-report Run 9의 "BT04 통과(높이 40)"와 "py-0.5 적용 불필요" 결론은 근거가 없음(frontend C8가 미충족 의심으로 넘긴 대상). BT33(카드 사원명)도 미측정 / 수정 방향: `mustChangePassword` 상태의 `/password` 화면은 라우트 mock(GET `/auth/me` 등 고정 응답)으로 띄워 실제 BT04의 높이·간격 예외를 측정하고, 키 이름과 test-report 표를 정정. BT33은 360 카드에서 측정하고 BT32(표)와 따로 기록.

[중간] [담당: tester] [분류: 테스트] test-report.md Run 4~10 "미실행" — test-plan E1의 핵심 회귀(C4 `leaves`·`approvals`·`departments*`, C5 `login`·`password`·`dashboard*`·`attendance*`, C6 `approvals`·`departments-responsive`·`attendance`, C7 `leave-calendar-mobile`·`leave-management`)와 C9 전체 `npm run test:e2e`, 키보드 도달 E4, 그리고 C3 이후 `npm run build`(design-frontend 공통 검증)가 한 번도 실행되지 않음. 승인·却下·부서 CRUD·로그인·비밀번호 변경 등 버튼 교체가 실제로 일어난 화면의 실제 클릭·제출 흐름이 브라우저에서 확인되지 않은 상태 / 수정 방향: 사용자 승인을 받아 DB 쓰기 spec 포함 `npm run test:e2e` 전체와 `npm run build`를 실행해 결과(통과·skip 수)를 test-report에 추가. 승인이 없으면 머지 전 미검증 항목으로 PR·로드맵에 명시.

[낮음] [담당: tester] [분류: 컨벤션] frontend/e2e/button-visual.spec.ts:292-319 — `else` 블록 안이 들여쓰기되지 않아 Prettier 형식이 아님(:42도 한 줄 초과). `npm run format:check` 실패 가능 / 수정 방향: `npx prettier --write`.

[낮음] [담당: tester] [분류: 중복구현] frontend/e2e/button-c8.spec.ts:50-90, button-visual.spec.ts:15-74 — `login`·`blockWrites`·`navigateInApp`·`capture`·`record`가 두 spec에 거의 그대로 중복. 또 c8 spec은 `.claude/work/button-refactor/screenshots/c8/measurements.jsonl`에 append만 하므로 다시 실행할 때마다 이전 측정이 누적되고, 측정값 대부분은 단언 없이 기록만 함(`expect.soft` 일부) / 수정 방향: 공통 헬퍼를 `e2e/` 공용 파일로 옮기거나 c8 측정을 button-visual에 합침. jsonl은 실행 시작 시 비우거나 `testInfo.outputPath`를 사용. 측정 전용 spec을 상시 e2e 묶음에 둘지 결정.

[낮음] [담당: tester] [분류: 테스트] SearchInput 단위 테스트 없음 — Fix 1 회귀(`h-12`가 다시 섞이는 것)는 실제 백엔드 로그인이 필요한 e2e(`button-visual` departments)에서만 확인됨 / 수정 방향: `SearchInput.test.tsx`에서 input이 `h-11`을 갖고 `h-12`를 갖지 않음을 단언(가벼운 보조 안전장치).

[낮음] [담당: frontend] [분류: 컨벤션] frontend/eslint.config.mjs:12 — `const eslintConfig =defineConfig([` 공백 누락. 이번 변경으로 생긴 것이면 Prettier 적용 / 수정 방향: `npx prettier --write eslint.config.mjs`(기존부터였다면 무시).

## 문서 갱신 예정 확인
- design-frontend.md의 1~4(09 §2.3·§3·§5·§6, context.md, UI_BUTTON_REFACTOR_PLAN 진행 상태, 10 로드맵)는 각 청크 frontend.md와 일치하며 누락 없음(PencilIcon 이동, Modal X = ghost, TopBar 벨, MonthNavigator, SectionError, form.tsx 버튼 상수 행 삭제 포함). 예외는 위 C5 Fix 1 항목.
- 10 로드맵 변경 이력에는 미실행 e2e·build와 BT04 재측정 결과를 미검증 항목으로 함께 기록할 것.
- 구현 에이전트의 docs/ 직접 수정 흔적 없음(09에 `Button.tsx`·`inputBaseClass` 미기재 상태).

## 담당별 이슈 수
- frontend: 중간 2 / 낮음 1
- tester: 중간 3 / 낮음 3
- 합계: 높음 0 / 중간 5 / 낮음 4
