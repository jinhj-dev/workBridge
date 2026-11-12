# docs-update: dashboard-renewal (1단계 + 디자인 재현 1차, 2차 반영: 미반영분·디자인 재현 2·3차·사용자 결정)

> 근거: frontend.md 「문서 갱신 예정」(1단계)·「디자인 재현 1차」, design-frontend.md 「문서 갱신 예정」, decisions.md D3·D8·D10~D17. 모든 항목은 실제 코드(globals.css, components/*, app/(app)/dashboard/*, lib/*, messages/ja.ts)와 대조 후 반영.
> 주의: 호출 시 "SCR-002는 이미 갱신된 부분이 있다"는 전제였으나, 확인 결과 1단계 문서 갱신은 어디에도 반영되지 않은 상태였다(SCR-002에 휴가 캘린더 §3-6 그대로, 09에 MonthCalendar 행 그대로). 그래서 SCR-002·09·03은 1단계 + 디자인 재현 1차를 함께 반영했다.

## 반영한 문서·섹션

### docs/09_DESIGN_SYSTEM.md
- §2.1: 페이지 배경 행에 구현 대체(그라데이션) 주석. 「추가 토큰」 표 신설: `success-30/110`, `warning-30/110`, `violet-100/80`, `page-from/to`
- §2.3: 카드 행에 구현 스타일(radius 16·테두리·`shadow-card-soft`·padding 20/24) 추가, 「그림자 토큰」 행 신설(`shadow-card`, `shadow-card-soft`), 표 행에 SCR-002 카드 내 표 스타일(헤더 띠) 추가, 「진행 막대」 행 신설
- §4 SCR-002 행: 통계 3개 + 카드 7종, 도넛 예외 명시
- §5-4: 「차트 미사용」의 예외(SCR-002 정적 SVG 도넛, D15) 추가
- §5-6 신설: SCR-002 참조 디자인 재현이 §5-3 "새 색상·스타일 추가 금지"의 예외임과 공용 영향(Card·body 배경) 명시
- §6 표: `Card`(icon prop·radius 16·테두리·soft 그림자·제목 18/28) 갱신, `Badge`(warning·info·positive·caution) 갱신, `LeaveStatusBadge`(soft 포함) 신규 행, `StatCard`(unit·icon·tone, 아이콘 카드 그라데이션) 갱신, `DonutChart` 신규 행, `MonthCalendar` 행 삭제, `AppShell` 본문 배경 갱신, `LeaveDetailModal` export에서 `LEAVE_STATUS_BADGE` 제거
- §6 하단: 달력 유틸에서 `buildMonthWeeks` 삭제, 대시보드 유틸(`greeting`·`work-progress`·`attendance-rate`·`formatHours`) 추가, 대시보드 전용(`icons`·`CardLink`·`MetricValue`) 추가, 타이포 토큰에 `text-greeting`·`text-stat` 추가, 서문에 "추가 토큰 포함·tailwind.config 없음" 명시

### docs/04_SCREEN_SPECIFICATIONS/SCR-002_DASHBOARD.md (전면 갱신)
- §1 관련 요구사항(FR-ATT-006·FR-LEAVE-005 추가), §2 목적, §3 전면(3-0 배치: 디자인 재현 1차의 ADMIN·EMPLOYEE 행 구성과 1열 순서, 3-1~3-9 카드별 구성. 休暇 카드 [休暇履歴を見る]는 ADMIN 비표시), §4(단일 출퇴근 버튼, 승인 대기 모달 처리·재조회, 원 요청과 달라진 점·캘린더 삭제), §5 권한별 표시(EMPLOYEE / 승인자 / ADMIN), §6 API(API-DASH-004·ATT-007·LEAVE-003·005 추가, DASH-002·003 삭제), §7 상태, §8 완료 조건

### docs/03_SCREEN_LIST.md
- Screen List SCR-002 행(기능 설명·관련 요구사항)
- 공휴일 취급: SCR-002 캘린더 문장 삭제, 대시보드 집계는 출근부와 같은 비근무일 기준(D5)으로 교체
- Screen Flow: 승인 대기 [すべて見る](ADMIN `?scope=all`), 승인 대기 항목(승인자·ADMIN), 최근 신청 항목 → 상세 모달(취소) 추가

### .claude/work/context.md
- 공용 모듈: calendar 컴포넌트 삭제·Card 변경, DonutChart 등 신규 공용과 추가 토큰 한 줄, LeaveStatusBadge 09 기록 반영, backend.md 「context.md 정정」(dashboard.controller·calendar-rules·today-status-rules·japaneseHolidaysInRange 사용처)

## 기존 토큰·공용 스타일 변경과 사용처 영향
기존 토큰 값은 바뀌지 않았다(primary·general·success-100/40·warning-100/40·danger·input-border·shadow-card·text-h4~h6 모두 09 §2 값 그대로). 바뀐 것은 공용 스타일이다.

| 변경 | 영향 사용처 |
|---|---|
| `body` 배경: `general-30` 단색 → `page-from`→`page-to` 그라데이션 | 전 화면. 로그인 후 셸 본문(AppShell은 자체 배경 없음), SCR-001 로그인(`LoginForm`), SCR-009 비밀번호 변경(`PasswordChangeForm`) |
| `Card`: radius 6→16, `shadow-card`→1px `general-40` 테두리 + `shadow-card-soft`, 제목 16/24→18/28, padding 28→24(`sm` 이상) | `attendance/AttendanceSheetView`·`AttendanceHistoryView`·`MonthlySummarySection`(SCR-003), `admin/attendance/AdminAttendanceView`(SCR-008), `admin/departments/DepartmentsView`(SCR-010), `leaves/LeaveHistoryList`(SCR-004), `leaves/approvals/ApprovalsView`(SCR-005), 대시보드 전 카드 |
| `StatCard` | 아이콘 없는 형태(SCR-004 `LeavesView`)는 스타일 동일. 신규 prop만 추가 |
| `Badge` | 기존 variant 불변, variant 추가만 |
| `LeaveStatusBadge` | 기본 동작 불변, `soft`는 대시보드만 사용 |

## 코드와 문서 대조에서 고친 불일치 (기존부터 있던 것 포함)
- 09 §6 Badge: 코드의 `warning` variant(LEAVE_STATUS_BADGE PENDING)가 문서에 없었음 → 추가
- 09 §6 StatCard: "href일 때 우측 화살표" → 코드에 화살표 없음, 정정
- 09 §6 LeaveDetailModal: `LEAVE_STATUS_BADGE` export는 `LeaveStatusBadge.tsx`에 있음 → 정정
- 09 §6 AppShell: "본문 `general-30` 배경" → 본문 자체 배경 없음(body 그라데이션), 정정
- frontend.md 19행 "StatCard 3열은 `sm` 미만에서 아이콘·화살표 숨김"은 디자인 재현 1차 이후 코드와 다름(아이콘은 24px로 표시, 화살표 없음). 문서는 현재 코드 기준으로 작성

## 2차 반영 (2026-11-12, 마무리: 미반영분 + 디자인 재현 2·3차 + 사용자 결정)

> 근거: backend.md 「문서 갱신 예정」, frontend.md 디자인 재현 2·3차 「문서 갱신 예정」, 사용자 결정(D16 변경, D12 변경, アラート 열 없음, 4지표, 休日出勤 시간, 사원 모바일 部署 카드). 코드 대조: `dashboard.service/repository/controller.ts`, `today-status-rules.ts`, `attendance-monthly-query.dto.ts`, `LeaveBalanceSection`·`DepartmentStatusSection`·`PendingApprovalsSection`·`MonthlyWorkSection`, `layout/TopBar`·`Sidebar`·`MobileTabBar`·`AppShell`·`navIcons`, `messages/ja.ts`, `e2e/dashboard-renewal.spec.ts`, backend dashboard e2e 2파일.

### docs/06_API_SPECIFICATION.md §2·§3
- API-DASH-001: 응답 8필드(`isWorkday`·`totalEmployeeCount`·`attendanceRate` 추가), 대상자·배타 3분류·비근무일·출근율·`pendingLeaveCount` 정의
- API-DASH-004 신규(`GET /dashboard/department-status`, USER, 숫자만, 0명 부서 제외, 未所属 `departmentId null` 마지막)
- API-DASH-002·003 본문 삭제, 제거(404)·번호 비재사용 주석
- API-ATT-007 `month`: API-DASH-002 참조 → 규칙 직접 기술(위반 시 400 field=month)

### docs/02_REQUIREMENTS.md
- FR-DASH-001 전면 교체: 개인 카드, 目安 규칙(9시간, 표시 전용), 승인 대기(승인자·ADMIN, 상세에서 승인·반려, 원 요청과 달라진 점), 오늘 출근 현황 집계 규칙, ADMIN 전사 현황, 부서별 현황(숫자만), 캘린더 삭제 기록
- FR-ATT-006: 所定労働時間 미취급 문장에 대시보드 目安 예외(집계 미사용), 공휴일 후속 과제에서 대시보드를 출근부 기준으로 정정
- FR-LEAVE-005: 대시보드 휴가 캘린더 공개 범위 문장 삭제(기능 삭제)

### docs/08_TEST_PLAN.md
- §5.2 IT-ATT-19: API-DASH-002 집계 부분 삭제
- §5.5: IT-DASH-02·03 재정의, IT-DASH-04~16 삭제(번호 비재사용 주석), IT-DASH-17~26 신규(대상자·비근무일·도쿄 날짜·API-DASH-004 권한·정렬·합계·최소 공개·TZ·제거 API 404). IT-DASH-25(세션 TZ)는 e2e에 없어 "미구현" 표기
- §6 권한 매트릭스: 캘린더 행 → API-DASH-004 행
- §7 SCR-002 행 전면 교체(컴포넌트 검증 항목 + `e2e/dashboard-renewal.spec.ts` P-01~P-10, P-03 수동·P-06 배지 미구현, 실행 전제). SCR-004 행의 "SCR-002에서도 같은 모달" 삭제

### docs/04_SCREEN_SPECIFICATIONS/SCR-002_DASHBOARD.md
- §3 서문: 셸 미변경 문장 → 벨·사용자 메뉴·하단 탭(03·09 §3 참조)
- §3-3 `md` 미만 목록: 이름·부서 말줄임, 배지·기간 줄바꿈 없음
- §3-6: 4칸·休日出勤 시간 단위 유지(사용자 결정)
- §3-7: 라벨 「承認済み日数」, [休暇を申請] 행 삭제 + 버튼 없음 명시
- §3-8: 헤더·숫자 셀 nowrap(「出勤（率）」 1줄), アラート 열 없음
- §4 원 요청과 달라진 점: 신청 모달 진입 삭제
- §5: 사원 모바일에서도 部署 카드 표시
- §8: "대시보드에서 휴가 신청 가능" → 신청 버튼 없음

### docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md
- §3.2 서문: SCR-002 공용 문장 정정(SCR-004만 사용)

### docs/03_SCREEN_LIST.md
- SCR-002 행 기능 설명에서 「신청」 삭제
- 모달: 휴가 신청은 SCR-004에서만
- 전역 내비게이션: 사이드바 아이콘·상단바 벨, 벨 규칙(승인 대기 링크·빨간 점), `lg` 미만 하단 5탭·「メニュー」 드로어·햄버거 없음
- Screen Flow: `/dashboard ──[휴가 신청]` 삭제

### docs/09_DESIGN_SYSTEM.md
- §2.1 사이드바 활성·카운터 배지 행에 구현 값(`primary-30`+`primary-100`, `danger-100`)
- §2.3 표 행: 各部署 셀 좌우 `sm` 미만 6·nowrap / 사이드바 메뉴 행: 구현 radius 8·아이콘 20·간격 12
- §3 App Shell: 구현(벨·아바타·아이콘·하단 탭·햄버거 없음) 줄 추가
- §5 6: 셸 미변경 문장 → D16 변경(색·셸을 참조 이미지 기준, 3항·2.1절 예외 명시), 재현하지 않는 것 목록
- §6: `AppShell`(하단 탭·드로어·본문 하단 여백), `Sidebar`(아이콘·활성·카운터 색), `TopBar`(시그니처 `{userName,pendingApprovalCount,onLogout}`, 벨·아바타) 갱신, `MobileTabBar`·`navIcons` 신규 행, `LeaveApplyModal` 사용처 SCR-004만

### docs/10_DEVELOPMENT_ROADMAP.md
- 구현 직접 확인 후 갱신. §1 대시보드 행: 백엔드 완료 / 프론트 진행 중 / 진행 중
- §2 #9: 캘린더 항목 삭제, API-DASH-001 개편·004 신규·002/003 제거 [x], SCR-002 개편(1·2차)·셸 [x](test-report Run 4 수치), 3차 반영분 테스트 최종 확인 [ ], 확인 대기 [ ] 5건(참조 이미지 차이, 社員情報·各種設定 탭 대체, 휴가 카드 라벨, `approvedDays` 정의, 미구현 테스트 P-06 배지·IT-DASH-25)
- §2 #5 공휴일 후속 과제 문장, #6 SCR-004 공용 문장, #10 SCR-002 화면 테스트 문장 정정, §3 이력 2026-11-12 행, 최종 갱신일

### 작업 폴더
- `decisions.md`: 머리말 상태, D12(承認済み日数·신청 버튼 제거·approvedDays 확인 대기), D16(색·셸 참조 이미지 기준, 함께 확정된 표시 결정 4건)를 변경 확정으로 갱신(이전 결정은 취소선)
- `context.md`: 셸 모듈 한 줄 추가, LeaveApplyModal 사용처 정정

## 3차 정정 (2026-11-12, 리뷰 Round 2 문서 누락)

> 근거: 리뷰 Round 2 지적, 사용자 결정("현재 구현 유지, D1 문서를 맞춤"). 코드 대조: `CompanyAttendanceSection.tsx` `colorClass`(出勤 `text-primary-100` / 未出勤 `text-general-50` / 休暇 `text-violet-100`), `components/DonutChart.tsx` 트랙 `stroke-general-40`, `DashboardView.tsx` 행 구성(ADMIN `[1fr_1.04fr]`·`[1fr_1.24fr]`·`[1fr_1.17fr_1.17fr]`, EMPLOYEE `[1fr_1.18fr]`×2 + 今月·休暇 세로 묶음, `ADMIN_ORDER`). 모두 일치.

- `docs/04_SCREEN_SPECIFICATIONS/SCR-002_DASHBOARD.md` §3 全社の出勤状況 도넛 행: 休暇 `general-40` → `violet-100`, 트랙 `general-40` 명시. §3-0 배치 표는 이미 구현과 일치(변경 없음).
- `docs/09_DESIGN_SYSTEM.md` §2.1 추가 토큰 표 `violet-100` 용도: 「全社の出勤状況 도넛 休暇 구간(흰 배경 대비 4.5:1, 비텍스트 3:1 충족)」 추가. `violet-80`은 진행 막대 그라데이션 끝색만(도넛 기술 없음, 변경 없음).
- `docs/09_DESIGN_SYSTEM.md` §6 `DonutChart` 행: SCR-002 색 休暇 `general-40` → `violet-100`(트랙 `general-40`·出勤 `primary-100`·未出勤 `general-50`은 그대로).
- `decisions.md` 머리말·D1·D19: 구현 기준 배치로 변경 확정(이전 결정 취소선), 사용자 결정 문구 기록, D19에 행별 열 구성·1열 순서 기록.

## 4차 정정 (2026-11-12, 로드맵 배치 표현)
- `docs/10_DEVELOPMENT_ROADMAP.md` §2 #9 프론트엔드 SCR-002 개편 항목(154행): 옛 D19 표현 「`xl` 2열 / 미만 1열」 → 「`xl` 이상 행 단위 그리드(ADMIN ① 今日|承認待ち ② 全社|今月 ③ 休暇|部署|直近 3열, 사원은 今月·休暇 세로 묶음) / 미만 1열(SCR-002 §3-0·D19)」. decisions.md D19 확정(변경)·SCR-002 §3-0 표와 대조해 일치. 다른 줄 변경 없음.

## 퇴근시각 변경 (2026-11-12, UI 수정 5종, 사용자 요청)

> 근거: frontend.md 「UI 수정 5종」 문서 갱신 예정. 코드 대조: `lib/work-progress.ts`(`EXPECTED_WORK_MINUTES` 540은 `workProgressPercent`에서만 사용, `expectedClockOut` 없음), `AttendanceSection.tsx`(라벨 `messages.dashboard.attendance.clockOutTime` 「退勤時刻」, `clockOut` 없으면 `noTime` 「--:--」, 진행률 기준 시각 = clockOut 또는 현재), `Card.tsx`(`px-5 py-4 sm:px-6 sm:py-5`, 본문 `mt-3 flex flex-1 flex-col`), `RecentRequestsSection.tsx`(`border-t border-general-40`, 행 버튼 `w-full cursor-pointer`), `PendingApprovalsSection.tsx`(0건 행 `h-30`·`承認待ちの申請はありません。`), `e2e/dashboard-renewal.spec.ts` P-08(퇴근 전 退勤時刻 `--:--`). 모두 일치.

- `docs/02_REQUIREMENTS.md` FR-ATT-006 월간 집계: 예외 문구에서 退勤予定 삭제(근무 진행률 目安만 예외). FR-DASH-001: 目安 대상을 진행률로 한정, 退勤予定（目安） 규칙 → 退勤時刻(실제, 퇴근 전 「--:--」) + 목안 규칙 폐기 명시.
- `docs/04_SCREEN_SPECIFICATIONS/SCR-002_DASHBOARD.md` §3-3 0건 행 추가(헤더 유지·빈 문구·`md` 미만도 표), §3-4 표 退勤予定（目安） → 退勤時刻·하단 주석(진행률만 目安, 목안 폐기), §3-9 구분선 행 추가·행 클릭(행 전체·포인터), §4 출근/퇴근 4단계(出勤時刻·退勤時刻 즉시 갱신), §8 완료 조건.
- `docs/08_TEST_PLAN.md` §7 SCR-002 행: 退勤予定 = 출근 + 9시간 → 退勤時刻 실제값 기준, P-08 설명 `退勤予定 = 출근 + 9h` → `退勤時刻 「--:--」`.
- `docs/09_DESIGN_SYSTEM.md` §2.3 카드 행·§6 `Card` 행: padding 좌우 20·상하 16(`sm` 이상 24·20), 본문 간격 12·`flex-1 flex-col`. §6 하단 대시보드 유틸: `expectedClockOut` 삭제, `EXPECTED_WORK_MINUTES`는 진행률 계산 전용으로 기술. 대시보드 전용 항목에 直近 상단 구분선 = `general-40`(Divider 컴포넌트 없음).
- `docs/10_DEVELOPMENT_ROADMAP.md` §2 #9 프론트엔드 SCR-002 항목(154행) 退勤予定 目安 → 退勤時刻. §3 이력 2026-11-12 기존 행(207행)은 기록 시점 사실로 유지, 이번 변경을 새 이력 행으로 추가(frontend 자체 검증 수치만, Playwright 미실행).
- `.claude/work/context.md` 52행 `work-progress.ts` 설명 정정.
- `decisions.md` D10: 退勤予定（目安） 규칙 취소선 + 폐기 사유(퇴근 시각 실제값 표시로 변경, 사용자 요청)와 현 규칙.
- 반영하지 않은 것: SCR-002 §7 상태 표 「承認待ち Empty (ADMIN)」 행은 기존 그대로(§3-3에 0건 표시 방식 추가). 03 SCREEN_LIST SCR-002 행 「근무 진행(目安)」은 진행률 目安이 유지되므로 변경 없음.

## 반영하지 않은 것 (후속 필요, 2차 기준)
- 테스트 수치: 지시대로 test-report 최종 Run(Run 4) 값만 사용. Run 4 이후의 디자인 재현 3차 변경은 tester 재실행 전(frontend 자체 Vitest 554만 있음)이라 로드맵에 [ ]로 둠.
- `backend/test/admin-dashboard.e2e-spec.ts`에 같은 이름의 테스트 블록이 중복(240~294행과 296~351행: `shouldExcludeUsersWhoseHireDateIsAfterToday`, `shouldReturnAttendanceRateWithOneDecimalPlace`, `shouldCountOnlyClockedInUsersWhenNotWorkday`, `shouldReturnNullAttendanceRateWhenNoOneClockedInOnNotWorkday`). 코드 수정 금지라 그대로 둠 → backend/tester 정리 필요.
- 08 IT-DASH-25(세션 TZ)·P-06 사이드바 배지: 테스트 미구현.
- 로드맵 대시보드 상태: 지시는 "본 기능 완료 상태"였으나, 10 §0 규칙(하나라도 [ ]이면 진행 중, 미실행 항목은 [x] 금지)에 따라 진행 중으로 둠.
- 로드맵 §2 #6 SCR-004의 "Playwright 8건 미실행" 문구: Run 4에서 leaves 8건 통과했으나, 이후 3차에서 spec이 바뀌어 재실행 전이고 이번 기능 범위 밖이라 상태는 바꾸지 않음.
- 09 §6 `Modal`(`icon?`·`size?`)·`DetailTable`(PR #18), 09 머리말 "분석 초안" 문구: 1차와 같이 범위 밖.
## 반영하지 않은 것 (1차 기준, 기록용)
- **docs/06_API_SPECIFICATION.md**(API-DASH-001 응답 필드 추가·의미 변경, API-DASH-004 신규, API-DASH-002·003 삭제, API-ATT-007 `month` 규칙의 API-DASH-002 참조 정정), **docs/02_REQUIREMENTS.md**(FR-DASH-001, FR-ATT-006), **docs/08_TEST_PLAN.md**(IT-DASH-04~16 삭제·신규 IT-DASH, IT-ATT-19, 권한 매트릭스), **docs/10_DEVELOPMENT_ROADMAP.md**: backend.md·frontend.md 「문서 갱신 예정」에 있으나 이번 호출 범위(09·SCR-002·03) 밖이라 미반영. 현재 SCR-002 §6은 API-DASH-004를 참조하지만 06에는 아직 정의가 없다.
- 09 §6 `Modal`(`icon?`·`size?`)·`DetailTable`: PR #18 미기록분, 이번 범위 밖.
- 09 머리말 "상태: 분석 초안(구현 전)"은 오래된 문구지만 갱신 예정에 없어 그대로 둠.
- decisions.md D16("보라·그라데이션 미적용")은 디자인 재현 1차(violet·그라데이션 토큰 추가)와 어긋난다. 문서는 실제 코드와 호출 지시 기준으로 반영했으며, D16 갱신 여부는 메인 판단 필요.
- SCR-002 §8 "360px 가로 넘침 없음"은 09 §5-3 기준 요구사항으로 적었으나, 실측은 375·390·1024·1440만 했다(frontend.md).
