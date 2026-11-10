VERDICT: CHANGES_REQUESTED

# review — 出勤簿 UI/UX 수정 (attendance-sheet-ui) Round 1

범위: frontend.md·test-report.md에 적힌 변경 파일 + 포트 표준 변경 5개 파일·context.md:61. 코드는 수정하지 않음.

## 이슈

[중간] [담당: tester] [분류: 테스트] frontend/e2e/attendance-sheet-layout.spec.ts:10-13,136-139,231-234 — 스크린샷을 `testInfo.outputPath`가 아니라 `.claude/work/attendance-sheet-ui/screenshots`에 고정 경로로 저장한다. 저장소에 남는 E2E가 실행될 때마다(이 작업 폴더가 정리된 뒤에도) 작업 폴더에 파일을 만들고 덮어쓴다. test-plan E12(`testInfo.outputPath`, `dashboard-leave-calendar.spec.ts` 패턴)와도 다르다 / `testInfo.outputPath(...)`로 저장하고, 리뷰용 사본은 실행할 때 수동으로 복사하거나 환경변수(예: 지정됐을 때만 복사)로 분리한다.

[중간] [담당: tester] [분류: 테스트] .claude/work/attendance-sheet-ui/screenshots/sheet-768.png — 768 스크린샷에 표가 없고 SkeletonLines(로딩 상태)만 찍혀 있다(페이지 높이는 30행 기준 약 1937px로 찍힘). 그래서 768에서 U2 안전망 레이아웃을 눈으로 확인한 근거가 없고, frontend.md "768에서는 안전망 스크롤로 그래프 영역이 오른쪽으로 밀려 좁아짐" 확인 내용도 뒷받침되지 않는다. 행 정렬 assertion은 통과했으므로 assertion 뒤 screenshot 시점에 다시 로딩 상태가 된 것으로 보인다(원인 불명: 재마운트 또는 재조회) / 스크린샷 직전에 `expect(left).toBeVisible()`·tbody 행 수를 다시 확인하고 다시 캡처한다. 재마운트가 재현되면 원인(md 경계 `useMediaQuery` 전환 등)을 test-report에 적고, 구현 쪽 문제면 frontend에 넘긴다.

[낮음] [담당: frontend] [분류: 문서불일치] frontend/src/app/(app)/attendance/AttendanceSheetView.tsx:175,178,187 — design-frontend §1 "왼쪽 모든 셀 `whitespace-nowrap`"인데 出勤時刻·退勤時刻·実働時間 셀에는 없다. 退勤時刻 자정 넘김 `2026/11/05 02:00`에 공백이 있어 줄바꿈 후보가 된다. 지금은 왼쪽 영역이 `shrink-0`(max-content 폭)이라 줄바꿈이 생기지 않지만, 행 높이가 `h-9` 최소값에 기대는 구조라 래퍼가 바뀌면 바로 좌우 행이 어긋난다 / 세 셀에 `whitespace-nowrap`을 붙인다(가능하면 왼쪽 셀 공통 클래스로).

[낮음] [담당: tester] [분류: 테스트] frontend/e2e/attendance-sheet-layout.spec.ts:91-124 — E3 "스크롤 후 왼쪽 불변"은 region이 실제로 스크롤됐다는 확인이 없어, 넘침이 없으면 의미 없이 통과한다(1366·1440 스크린샷으로는 실제 스크롤됨을 확인함) / 1366에서 `regionOverflow > 0`, 스크롤 후 `scrollLeft > 0`을 확인한다. 156-159행 토요일 색도 "빨강 아님"이 아니라 primary-100 rgb로 확인한다(test-plan E7). 66-69행은 `pageHorizontalOverflow` 헬퍼를 쓴다. 224행 주석 "安全網はグラフ側のみ"은 실제(바깥 래퍼 안전망)와 다르다.

[낮음] [담당: frontend] [분류: 컨벤션] frontend/src/lib/attendance-sheet.ts:58 — `workPatternOf` 반환 타입 `{ kind; leaveType? }` 때문에 `LEAVE`인데 leaveType이 없는 상태가 타입상 가능하다. 그래서 AttendanceSheetView.tsx:69에 `''` 대체 분기가 생겼다 / `{ kind: 'LEAVE'; leaveType: LeaveType } | { kind: Exclude<WorkPatternKind,'LEAVE'> }` 판별 유니온으로 바꾸는 것을 제안. 확장성은 문제없다: 새 kind를 추가하면 `WORK_PATTERN_BADGE`(Record)와 문구 객체 인덱싱 양쪽에서 타입 오류가 나서 빠뜨리지 않는다. `requestKinds`(ja.ts:342)는 `SheetRequestKind`와 타입으로 연결돼 있지 않다(`satisfies Record<SheetRequestKind,string>` 제안).

[낮음] [담당: frontend] [분류: 컨벤션] AttendanceSheetView.tsx:375 — `max-w-7xl`을 없앤 뒤 `mx-auto`가 의미 없이 남아 있다. 346행 region은 넘침이 없는 1920에서도 `tabIndex=0`이라 빈 탭 순서가 하나 생긴다(설계대로라 수정은 선택).

[낮음] [담당: frontend] [분류: 버그(UX 참고)] screenshots/sheet-1024.png — 1024(사이드바 있음)에서는 왼쪽 영역(약 624px)이 본문을 거의 다 차지해 그래프가 처음 화면에 약 14px만 보인다. 바깥 안전망을 가로 스크롤한 다음 다시 그래프 영역을 스크롤해야 하는 2단 스크롤이다. U2 승인 설계대로라 이슈는 아니지만 04 문서 갱신 때 이 동작을 명시해 둘 것.

[낮음] [담당: tester] [분류: 테스트] frontend/e2e/attendance.spec.ts:66-73 — `saveClockOut`의 `waitForResponse`는 submit 클릭 전에 등록했고 PATCH·경로를 정규식으로 한정하며 `ok()`를 확인하므로 올바르다. 기존 성공 문구 assertion도 그대로라 약화가 없다. 다만 test-plan §0에서 "변경 금지"로 적은 파일을 바꾼 범위 밖 변경이므로 test-report에 남긴 것으로 충분하다(되돌릴 필요 없음). Run 1 실패 증상("확인 단계에 머무름")은 응답 대기 부재만으로는 설명되지 않아 원인 미확정 상태로 남는다.

## 점검 결과 (이슈 아님)

- 사용자 요구(plan.md SUMMARY·U1~U11 기준)
  - ① 좌우 분리 + 그래프 영역만 가로 스크롤: 충족
  - ② 진한 회색 구분선 `border-r-2 border-general-60`: 충족(E2E rgb 확인)
  - ③ 勤務パターン Pill(`Badge shape="pill"`, 休日·祝日 danger / 通常 neutral / 휴가 success): 충족
  - ④ 申請 `休暇 {상태}`(종류명은 勤務パターン에만): 충족
  - ⑤ 행 36px(`compactTdClass` h-9, 헤더 h-11): 충족
  - ⑥ 日付 `1日（日）` 전각 괄호, 일·공휴일 빨강/토 파랑: 충족
  - ⑦ 폭이 충분하면 스크롤 없음(`max-w-7xl` 제거, 1920에서 그래프 ≥480 무스크롤): 충족
  - 백엔드·API·types.ts 무변경도 확인
- 좌우 행 정렬: 두 표가 같은 `compactTdClass`·`thClass`·`border-collapse`·`items-start`를 쓴다. 높이는 rem 기준이라 글꼴 크기 설정에도 함께 늘어난다. 헤더 Tooltip·축(h-5)은 44px 안에 들어가고, E2E가 첫 행 top 일치로 헤더 정렬까지 간접 확인한다. 남은 위험은 `h-9`가 최소 높이라 왼쪽 셀이 줄바꿈되면 어긋난다는 점뿐이다(위 낮음 이슈).
- 일요일 색 버그 수정: `tdClass`의 `text-general-100`과 `text-danger-100`이 같은 셀에 겹쳐 CSS 생성 순서상 general이 이기던 문제다. 색이 없는 `compactTdBaseClass` + `dateColorClass`로 겹침을 없앴다. 원인에 맞는 수정이고 공용 `tdClass`는 건드리지 않았다. jsdom 클래스 테스트로는 이 회귀를 못 잡지만 E2E가 computed color `rgb(240, 20, 47)`로 잡는다. 다른 화면에 `tdClass` + 글자색을 겹쳐 쓴 곳은 없다(Grep).
- 접근성: 왼쪽 표 `aria-label=出勤簿`, 오른쪽 `role=region aria-label=時間帯 tabIndex=0` + sr-only 열 머리글이 있다. 그래프 `role=img` 이름은 `2日（月） 09:00〜…`로 날짜가 앞에 붙는다(C12 테스트). 키보드 선택은 왼쪽 행만 담당한다(설계대로).
- 디자인 시스템: 변경 파일에 hex·rgb·임의값(`[..px]`)·inline style이 없다. `min-w-40`/`min-w-120`은 spacing 스케일(160/480)이다. Badge 기본 shape는 `rounded px-2` 그대로라 기존 사용처 회귀가 없다.
- 범위를 넘은 테스트 변경: `AttendanceView.test.tsx`의 `findByRole('table', {name})` 한정은 표가 2개가 된 데 따른 필수 변경이고 약화가 아니다. 타당하다.
- 프로젝트 문서: 이번 작업 문구(`1日（`, `compactTd`, pill 등)가 docs/에 없음 → 구현 에이전트가 직접 수정하지 않았다. frontend.md "문서 갱신 예정"(04 §4, 09 §2.3·§6, 08, 10)은 실제 변경과 맞다.
- 포트 표준 4000→6000(별도 사용자 요청)
  - `backend/.env.example`·`.env.test.example` `PORT=6000`, `env.ts` default 6000, `frontend/.env.example` `BACKEND_URL=http://127.0.0.1:6000`, `playwright.config.ts` 주석, context.md:61이 모두 일관된다.
  - 참고 1: `.github/workflows/ci.yml:23` `BACKEND_URL: http://127.0.0.1:4000`(빌드용 더미)이 남아 있다. 동작 영향은 없지만 표준에 맞추려면 6000으로 바꾼다.
  - 참고 2: 6000은 Fetch 표준의 "bad port"(X11)다. 브라우저에서 `http://localhost:6000`에 직접 접속하면 ERR_UNSAFE_PORT로 막히고, Node 내장 `fetch`(undici)로 BACKEND_URL을 직접 호출해도 거부된다. 지금은 Next rewrite 프록시만 거치고 E2E도 통과했으므로 문제없다. 다만 API를 브라우저에서 직접 확인하거나 나중에 서버 쪽 `fetch`로 백엔드를 호출하면 막힌다. 사용자에게 알려 둘 것.
