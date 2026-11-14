VERDICT: APPROVE

# review — 버튼 공통 UI 패턴 리팩터링 (C1~C9, C5 Fix 1)

> Round 2(커밋 d669a1d) 재리뷰 결과는 문서 끝 "Round 2"에 있다. 첫 줄 VERDICT는 Round 2 기준이다.

검토 범위: `components/Button.tsx`, `eslint.config.mjs`, `globals.css` 토큰 사용, C3~C7 이행 파일 전부(SectionError, Modal·ConfirmDialog·FormModal·LeaveDayModal·LeaveDetailModal·AttendanceEditModal·DepartmentDetailModal·DepartmentMembersModal, LoginForm·PasswordChangeForm·LeaveManagementLayout·DepartmentsView·AttendanceSection·AttendanceHistoryView·AdminAttendanceView·LeaveHistoryList·ApprovalsView·CardLink·TopBar·MonthNavigator·AttendanceSheetView·leaveIcons·departments/icons), `form.tsx`·`SearchInput.tsx`(C5 Fix 1), 테스트(`Button.test.tsx`, `form.test.tsx`, `e2e/button-visual.spec.ts`, `e2e/button-c8.spec.ts`), plan/design-frontend/test-plan/frontend.md/test-report.md, UI_BUTTON_PATTERNS v3, decisions B1~B17, 09 §6.
참고: 이 환경에서 git diff를 실행할 수 없어 현재 브랜치 코드와 보고서를 기준으로 검토했다.

## Round 1

VERDICT(Round 1): CHANGES_REQUESTED

### 확인 결과 (문제 없음)
- 동작 유지: onClick·`setStep`·`returnFocus` 기반 `autoFocus`·`data-autofocus`·단계 key(`Fragment key`) 재마운트·`canCancel`/`canProcess`/`!item.isSystem`/`department && !department.isSystem`/`leave.status === 'PENDING'` 조건부 렌더·`disabled={own}`·`!loaded`·`done`·`!hasConditions`·`month === currentMonth`가 글자 그대로 옮겨짐. 제출 버튼 5곳(로그인·비밀번호·照会 2·検索) `type="submit"`, FormModal `type="submit" form={formId}` 유지. 확정 버튼은 `loading`으로만, 취소 버튼은 `disabled={submitting}` 유지(PATTERNS §4.4 `loading ⊃ disabled`). SCR-009 キャンセル은 제출 중 활성 유지(범위 밖 동작 변경 없음).
- 접근 이름: 행 버튼 aria-label(`detailLabel`·`approveLabel`·`rejectLabel`·`editLabel`·`deleteLabel`·`viewMembersLabel`), 아이콘 전용 前月·翌月·X의 aria-label, 벨 Link aria-label(건수) 유지. 아이콘 슬롯 `aria-hidden`.
- className 배치 전용: 호출부 className은 `mt-1 w-full`, `w-full sm:flex-1`, `w-full`, `w-full sm:w-auto(sm:mt-6)`, `-m-2`, `mt-4`, 벨 `relative`뿐. ESLint 규칙 3 selector가 `<Button className>` 문자열·템플릿과 `buttonClass()` 덧붙임을 검사.
- 결정 일치: B1(Button+buttonClass), B2(variant 7종), B3(休暇申請·部署を追加·出勤·退勤 lg, 条件をクリア md), B4/B5(px 12/24), B6(토큰 별도 커밋, 맵은 완전 리터럴), B8(월 이동만 40, 라벨 서체·간격 유지), B9(ghost만 radius 8), B10(修正 primaryOutline+Pencil), B11(却下 secondary), B12(사원명 Link = text), B13(active 없음), B14(검색 lg·아이콘 없음·sm 미만 전폭), B15(C1~C8 form.tsx 무변경 → C9 삭제), B16(ESLint), B17(`fullWidth` 없음).
- 중복 잔존: `ButtonClass`·로컬 `iconButtonClass`·`rowButtonClass`·`detailButtonClass`·`smallButtonClass`·출근부 로컬 `Chevron` 0건. 남은 `<button>`은 대상 외(V8~V11, BT13~16·34·39~41·63·80)와 일치.
- C5 Fix 1의 동작: `inputClass` 문자열은 그대로라 다른 입력란 48 유지(e2e `shouldKeepLoginInputsAt48pxWhileSearchInputIs44px`), SearchInput 44는 09 §6 기재값과 일치. 휴가 캘린더 필터는 `[&_select]:h-11`로 select가 44였으므로 이번 수정으로 오히려 높이가 맞게 됨.

### 이슈 (Round 1)

1. [중간] [담당: frontend] [분류: 코드품질] frontend/src/components/SearchInput.tsx:34, frontend/src/components/form.tsx:7-10 — C5 Fix 1은 높이(`h-12` vs `h-11`)만 분리했고, 같은 원인의 충돌 `inputBaseClass`의 `px-4` vs `pl-10`, `text-base/6` vs `text-sm/5`는 그대로 남음. 지금 결과는 Tailwind CSS 출력 순서가 우연히 맞아서 나온 것이고, 이번 48px 버그와 같은 구조(PATTERNS §4.6이 "예측 불가"로 금지한 패턴) / 수정 방향: `inputBaseClass`에서 `px-4`·`text-base/6`도 빼고 `inputClass = 'h-12 px-4 text-base/6 ' + base`, SearchInput은 `h-11 pl-10 pr-4 text-sm/5` 직접 지정. 주석 수정.
2. [중간] [담당: frontend] [분류: 문서갱신] frontend.md "C5 Fix 1" — "문서 갱신 예정" 없음. 09 §6 `SearchInput` 행(docs/09_DESIGN_SYSTEM.md:270) "`inputClass` 재사용"이 실제와 다르고, `form.tsx` 행·context.md에 `inputBaseClass` 미기록 / 수정 방향: frontend.md에 갱신 예정 항목 추가.
3. [중간] [담당: tester] [분류: 테스트] frontend/src/components/Button.test.tsx:54, :90, :229 — 다중 인자 `not.toHaveClass(a, b, c)`는 하나만 빠져도 통과(:90은 항상 통과) / 수정 방향: 클래스별 개별 단언.
4. [중간] [담당: tester] [분류: 테스트] frontend/e2e/button-c8.spec.ts:235-242 — "BT04"로 상단바 사용자 메뉴의 로그아웃 항목(이행 대상 아님)을 측정. 실제 BT04는 PasswordChangeForm text 버튼. BT33 미측정 / 수정 방향: 실제 BT04·BT33 측정, test-report 정정.
5. [중간] [담당: tester] [분류: 테스트] DB 쓰기 e2e 회귀·전체 `npm run test:e2e`·E4·`npm run build` 미실행 / 수정 방향: 승인 후 실행 또는 머지 전 미검증 항목으로 명시.
6. [낮음] [담당: tester] [분류: 컨벤션] frontend/e2e/button-visual.spec.ts:292-319 — Prettier 형식 아님.
7. [낮음] [담당: tester] [분류: 중복구현] button-c8.spec.ts / button-visual.spec.ts — 헬퍼 중복, c8 jsonl 누적.
8. [낮음] [담당: tester] [분류: 테스트] SearchInput 단위 테스트 없음.
9. [낮음] [담당: frontend] [분류: 컨벤션] frontend/eslint.config.mjs:12 — `=defineConfig` 공백 누락.

### 문서 갱신 예정 확인 (Round 1)
- design-frontend.md의 1~4(09 §2.3·§3·§5·§6, context.md, UI_BUTTON_REFACTOR_PLAN 진행 상태, 10 로드맵)는 각 청크 frontend.md와 일치하며 누락 없음. 예외는 위 #2.
- 구현 에이전트의 docs/ 직접 수정 흔적 없음.

## Round 2 (커밋 d669a1d — Review Fix 1 / Run 11)

VERDICT(Round 2): APPROVE

검토 파일: `components/form.tsx`, `components/SearchInput.tsx`, `eslint.config.mjs`, `components/Button.test.tsx`, `components/SearchInput.test.tsx`(신규), `e2e/button-helpers.ts`(신규), `e2e/button-c8.spec.ts`, `e2e/button-visual.spec.ts`. 근거 frontend.md "Review Fix 1", test-report.md "Run 11".

### 이전 이슈 해결 여부
- #1 해결: `inputBaseClass`(form.tsx:7-8)에서 높이·`px-4`·`text-base/6`이 빠지고 `inputClass = \`h-12 px-4 text-base/6 ${inputBaseClass}\``(:10). SearchInput(:34)은 `h-11 pr-4 pl-10 text-sm/5`를 직접 지정해 같은 속성의 중복 지정이 없어짐. `inputClass` 클래스 집합은 이전과 같아 `selectClass` 등 다른 입력란 영향 없음. 주석(:6)도 "높이·좌우 여백·글자 크기 제외"로 실제와 일치. Run 11 `toHaveCSS`로 SearchInput 44/40/16/14·20, 로그인 입력 48/16/16·24 확인.
- #2 해결: frontend.md "Review Fix 1"에 문서 갱신 예정 ①09 §6 SearchInput 행 ②09 §6 form.tsx 행(`inputBaseClass` 신설·버튼 상수 삭제) ③context.md form.tsx 줄(`inputBaseClass` 추가·버튼 상수 제거·`Button`/`buttonClass`/`PencilIcon` 추가) 기록. 최종 정의와 일치.
- #3 해결: Button.test.tsx :54-56, :93-95(반복문 개별 단언), :234-235 모두 클래스별 `not.toHaveClass` 단언. `@ts-expect-error` 2건 위치 정리 후 tsc exit 0.
- #4 해결: `shouldMeasurePasswordScreenLogoutLinkAndCapture`가 로그인 응답의 `mustChangePassword`만 true로 바꿔(`button-helpers.ts:24-33`, DB 무변경) 실제 `/password`의 ログアウト text 버튼을 측정. BT04 높이 20·간격 26(간격 예외 성립)으로 `py-0.5` 불필요 결론이 올바른 대상으로 재확인됨. BT33(카드, md 미만)·BT32(표, md 이상) 키 분리. Run 9의 잘못된 행은 test-report에 정정 명시.
- #5 처리: 코디네이터 결정대로 코드 이슈가 아니라 미검증 항목으로 취급. PR 본문·완료 보고(및 10 로드맵 변경 이력)에 "DB 쓰기 e2e(test-report Run 11 미실행 목록)·전체 `npm run test:e2e`·E4 키보드·`npm run build` 미실행, 머지 전 확인 필요"를 반드시 명시할 것.
- #6 해결: button-visual.spec.ts Prettier 적용(else 블록 들여쓰기 정상).
- #7 해결: 공통 헬퍼 `e2e/button-helpers.ts`로 추출, 두 spec이 import. c8 측정 파일은 `beforeAll`에서 비움(c8 spec:50-52), button-visual은 `testInfo.outputPath`라 누적 없음.
- #8 해결: `SearchInput.test.tsx` 4건(`h-11` 있음·`h-12` 없음·`h-*`가 정확히 하나·`pl-10 text-sm/5`·onChange). 의미 있는 단언.
- #9 해결: `const eslintConfig = defineConfig([`(:12).

### 새로 생긴 문제
- 없음(높음·중간 0).
- 참고(이슈 아님): c8 spec의 `beforeAll` 비우기는 파일 단위라, 테스트 실패로 워커가 재시작되면 그 시점까지의 측정이 다시 비워질 수 있음(`workers: 1`이라 평소에는 영향 없음). 측정 전용 spec이므로 기록만 함.
- 참고(범위 밖, 기존): `iconInputClass`(`pl-11`)를 `inputClass`(`px-4`)와 함께 쓰는 기존 사용처에도 같은 유형의 padding 중복 지정이 있음. 이번 변경으로 생긴 것이 아니므로 이슈로 올리지 않음. 필요하면 별도 작업으로.

### 남은 이슈
- 없음. 단 위 #5 미검증 항목의 PR·완료 보고 명시가 머지 조건.

## 담당별 이슈 수 (Round 2 기준 미해결)
- frontend: 0
- tester: 0
- 합계: 높음 0 / 중간 0 / 낮음 0 (Round 1 이슈 9건 중 8건 해결, #5는 미검증 항목 명시로 처리)
