# dashboard-renewal 결정 항목

> 참고 이미지(첨부): 8.png = 관리자 데스크톱, 9.png = 관리자 모바일, 10.png = 일반 사원 데스크톱, 11.png = 일반 사원 모바일(표시 내용으로 식별).
> 이전 설계 폴더 `.claude/work/dashboard-redesign/`은 존재하지 않아(파일 0건) D1~D25를 참조하지 못했다. 이 문서의 번호는 새로 매긴다.
> 상태: **D1~D19 확정**(사용자 결정, 승인 피드백 1회차). D1·D12·D16·D19는 2026-11-12 사용자 결정으로 변경 확정(취소선 = 이전 결정). D20은 A(제거)로 구현·문서 반영됨. 각 항목의 "확정" 줄이 기준이며, 아래 분석은 기록용으로 남긴다.

## A. 레이아웃·범위

### D1. 관리자 데스크톱 배치 기준 충돌 (8.png vs 요청 문구)
- 8.png: 1행 왼쪽 今日の出勤状況 / 오른쪽 承認待ち, 3행은 3열(休暇 | 各部署 | 直近の申請), 하단 お知らせ 전폭.
- 요청 문구: 1행 왼쪽 承認待ち / 오른쪽 본인 출퇴근, 3행 休暇 | 部署, 하단 最近の申請 | お知らせ.
- ~~확정(1회차): 요청 문구 배치. 통계 3개 → 承認待ち 목록 | 今日の出勤状況 → 全社の出勤状況(도넛) | 今月の勤務状況 → 休暇の残り日数 | 各部署の状況 → 直近の申請履歴(전폭, D14로 お知らせ 없음). 카드 내부 구성은 8.png 참고.~~
- **확정(변경, 2026-11-12 사용자 결정: "현재 구현 유지, D1 문서를 맞춤")**: 구현(`DashboardView.tsx`) 기준. SCR-002 §3-0과 같다.
  - ADMIN `xl` 이상: 통계 3개 → ① 今日の出勤状況 | 承認待ちの申請 ② 全社の出勤状況 | 今月の勤務状況 ③ 休暇の残り日数 | 各部署の状況 | 直近の申請履歴(3열). お知らせ 없음(D14).
  - EMPLOYEE `xl` 이상: (승인자만) 承認待ちの申請(전폭) → ① 今日の出勤状況 | (今月の勤務状況 위 / 休暇の残り日数 아래 세로 묶음) ② 各部署の状況 | 直近の申請履歴.
  - 카드 내부 구성은 8.png 참고.

### D2. 단계 분할
- **확정**: 3단계. 1단계 = 대시보드 교체·공통 카드(이번). 2단계 = 승인 관리 화면 일괄 처리(D9). 3단계 = 공지 기능·셸(하단 내비·알림·사이드바 아이콘 등, D14·D16). 2·3단계는 별도 요청.

### D3. 월간 휴가 캘린더(SCR-002 §3-6) 유지 여부
- 4개 이미지 어디에도 없다. 2026-11-10 사용자 결정으로 만든 기능(API-DASH-002·003, FR-DASH-001)이다.
- **확정**: 삭제. 프런트 캘린더 파일·테스트 제거(D18-2). 
- 영향 확인 결과(코드 grep):
  - 프런트: API-DASH-002·003 호출처는 `LeaveCalendarSection.tsx`·`LeaveCalendarDayModal.tsx`뿐(다른 화면 사용 없음). `MonthCalendar`는 `LeaveCalendarSection`만 사용. `lib/calendar.ts`는 출근부 `AttendanceSheetView`가 `shiftMonth`·`formatMonthLabel`을 쓰므로 유지(`buildMonthWeeks`만 미사용).
  - 백엔드: 출근부(SCR-003)가 `dashboard/leave-calendar-rules.ts`의 `isWeekend`(`attendance-sheet-rules.ts`)·`monthRange`(`attendance-sheet.service.ts`)와 `dashboard/dto/leave-calendar-query.dto.ts`의 `leaveCalendarQuerySchema`(`attendance-monthly-query.dto.ts`)를 import한다. API를 제거하면 이 3개를 옮겨야 한다. `attendance-monthly.e2e-spec.ts`의 `shouldKeepWeekdayHolidayCountedInDashboardCalendar`가 API-DASH-002를 호출한다.
  - 백엔드 API 제거 여부 → D20.

### D20. (신규, 결정 필요) API-DASH-002·003 백엔드 제거 여부
- A(**추천**): 제거. 호출하는 화면이 없어지고, API-DASH-003은 전 사용자에게 타인의 이름·부서·사원번호·휴가일을 공개하므로 쓰지 않는 공개 범위를 남기지 않는다. 출근부가 쓰는 `isWeekend`·`monthRange`는 `backend/src/common/time/calendar-rules.ts`(신규)로, `leaveCalendarQuerySchema`의 월 형식 검증은 `attendance-monthly-query.dto.ts` 안으로 옮긴다(동작 동일). `resolveHalfDay`·`countApprovedLeavesByDay`·`getLeaveCalendar(Day)`·DTO·e2e·spec 삭제. 06 API-DASH-002·003, 08 IT-DASH-04~16 삭제.
- B: 백엔드 유지(프런트만 삭제). 백엔드 변경 최소, 그러나 미사용 엔드포인트와 타인 정보 공개 범위가 남는다.

## B. 출근 집계 (全社の出勤状況·各部署の状況)

### D4. 근무 스케줄 개념 부재와 3분류 정의
- 근무 스케줄·교대 테이블이 없어 요일·공휴일·입사일·활성 여부만 근거로 판정한다.
- **확정**: 사원 1명은 정확히 1개 분류.
  - 대상자: `is_active = true` AND `hire_date <= 오늘(도쿄)`.
  - 出勤: 오늘 `work_date` 근태 기록 있음(근무 중·퇴근 완료 무관).
  - 休暇: 出勤이 아니고, 오늘을 포함하는 `APPROVED` 휴가 있음(종류 무관, 반차 포함).
  - 未出勤: 둘 다 아님. 우선순위 出勤 > 休暇 > 未出勤.
  - 出勤率 = 出勤 / (出勤 + 未出勤 + 休暇) × 100, 소수 1자리 반올림, 분모 0이면 `null`(화면 「—」).
- 기존 사양과의 차이(02 FR-DASH-001·API-DASH-001): 반차 출근자 중복 제거, 입사일 미도래 제외, 비근무일 처리(D5).

### D5. 비근무일(주말·공휴일) 처리
- **확정**: 토·일과 일본 공휴일(`japanese-holiday.ts`, SCR-003과 같은 데이터)은 비근무일. 未出勤·休暇 0, 出勤(휴일 출근자)만 집계. 응답 `isWorkday: false` → 화면 안내.
- D3 삭제로 대시보드 안의 공휴일 기준 불일치(캘린더는 공휴일=평일)는 없어진다. 02 FR-ATT-006 "공휴일 취급 통일(후속 과제)"에는 휴가 신청 일수(FR-LEAVE-001)와의 차이만 남기고 대시보드 집계는 출근부와 같은 기준이라고 기록한다.

### D6. 全社員数 정의
- **확정**: 활성 사원 중 입사일 도래한 사람(D4 대상자 수). 비근무일에도 같은 값.

### D7. 부서별 근무 현황의 공개 범위·컬럼
- **확정**: 신규 USER API(API-DASH-004). 모든 로그인 사용자(EMPLOYEE·ADMIN)에게 전체 부서의 숫자만(在籍人数·出勤·休暇·未出勤·出勤率). 사원 이름·ID 없음.
- 컬럼은 8.png 기준(部署·在籍人数·出勤(率)·休暇·未出勤). 10.png의 「休暇/欠勤」「アラート」 열은 만들지 않는다.
- 대상자 0명 부서 제외, 「未所属」은 대상자가 있으면 표시. 정렬 부서 코드 오름차순. [すべて見る]는 ADMIN → `/admin/attendance`, EMPLOYEE는 링크 없음.
- **security 점검 항목**: 소규모 부서(1~2명)는 숫자로 개인의 출근·휴가·未出勤 여부가 추정된다. "未出勤"은 새로 공개되는 정보다. 사용자가 공개를 결정했으므로 구현은 그대로 하되 security.md에 위험과 완화 대안(최소 인원 미만 부서 마스킹, EMPLOYEE 본인 부서 한정)을 기록한다.

## C. 승인 대기

### D8. 대시보드 승인 대기 미리보기의 범위·권한 (사용자 변경)
- 원래 요청은 "대시보드 내 승인·반려 금지(조회 전용)"였으나 **사용자가 변경**했다.
- **확정**:
  - 표시 대상: 승인자와 ADMIN. 승인자 = 본인에게 할당된 PENDING 건이 있는 사용자. 판정은 기존 사이드바 배지 로직(`PendingApprovalCountProvider`의 `count`, `GET /leaves/pending-approval?scope=mine&limit=1`의 `totalCount`)을 재사용한다.
  - ADMIN: `scope=all&limit=5`(기존 권한, 서버가 ADMIN 검증). 할당 건이 없어도 카드 표시(0건이면 Empty).
  - EMPLOYEE: 배지 `count > 0`일 때만 카드 표시, `scope=mine&limit=5`(서버는 본인 할당 건만 반환). `count`가 0·null(미취득·실패)이면 카드 자체를 렌더하지 않는다.
  - 행 클릭 → 기존 `LeaveDetailModal`(새 prop 없음). 모달 안의 [承認]·[却下] 노출은 기존 `canProcess`(PENDING, 본인 신청 아님, 할당 승인자 또는 ADMIN) 그대로. 승인·반려 처리는 기존 API-LEAVE 승인·반려 API와 서버 권한 검증(할당 승인자 또는 ADMIN, 본인 신청 불가, 409 ALREADY_PROCESSED) 재사용. 새 승인 로직 금지.
  - 처리 후: 목록 reload, 사이드바 배지 refresh, (ADMIN) 통계·3분류(API-DASH-001)와 부서별 현황 재조회.
  - [すべて見る]: ADMIN → `/leaves/approvals?scope=all`, EMPLOYEE → `/leaves/approvals`.
- 문서 변경 필요: 02 FR-DASH-001(표시 대상 = 승인자·ADMIN, ADMIN은 전체, 대시보드 모달에서 승인·반려 가능 — 원 요청과 달라진 점으로 명시), 03 Screen Flow, SCR-002 §3·§4·§5·§8.
- **security 점검 항목**: 프런트는 버튼·카드 노출만 제어하고, 승인·반려 권한은 서버(기존 승인 API)가 검증하는지. EMPLOYEE의 `scope=all` 요청이 403인지.

### D9. 승인 관리 화면(SCR-005) 일괄 처리
- **확정**: 2단계로 분리(체크박스·일괄 승인/반려·건별 반려 사유 필수·확인 모달·부분 실패 규칙). 이번 범위 외.

## D. 카드별 표시

### D10. 今日の出勤状況: 退勤予定時刻·勤務進捗
- **확정**(새 업무 규칙, 표시용 目安):
  - ~~退勤予定（目安） = 출근 시각 + 9시간(実労働 8시간 + 법정 휴게 60분). 출근 전이면 「--:--」.~~ **폐기**(2026-11-12, 사유: 퇴근 시각 실제값 표시로 변경, 사용자 요청). 현 규칙: 「退勤時刻」 = 실제 퇴근 시각, 퇴근 전 「--:--」.
  - 진행률 = (기준 시각 − 출근 시각) / 9시간, 0~100% 클램프, 정수 % 내림. 기준 시각: 근무 중 = 현재 시각(1분마다 갱신), 퇴근 완료 = 실제 퇴근 시각. 출근 전 0%.
  - 퇴근 완료 후에는 실제 「退勤時刻」도 표시한다.
  - 이 값은 화면 표시용이며 근태 기록·잔업 계산(FR-ATT-006)에는 쓰지 않는다. 02 FR-DASH-001에 규칙, FR-ATT-006에 "所定労働時間은 다루지 않는다(대시보드 目安 표시는 예외, 집계에 미사용)" 기록.
  - 버튼: 기존 출퇴근 로직(확인 모달·중복 방지·409 처리) 그대로, 「다음 동작」 1개로 통합(出勤する / 退勤する / 退勤済み 비활성).

### D11. 今月の勤務状況 항목
- **확정**: 勤務日数(`actualWorkDays`)·総労働時間(`actualWorkMinutes`)·残業時間(`overtimeMinutes`)·休日出勤(시간, `holidayWorkMinutes`) 4개. 휴일 일수 API는 추가하지 않는다.

### D12. 休暇の残り日数
- ~~확정(1회차): 残日数 + 承認済み. [休暇を申請] 버튼 유지.~~
- **확정(변경, 2026-11-12 사용자 결정)**: 残日数(`remainingDays`) + 「承認済み日数」(`approvedDays`, 값·계산 불변). 「今年の取得日数」 라벨은 쓰지 않는다(디자인 재현 2차에서 잠시 사용 후 3차에서 되돌림). 대시보드 [休暇を申請] 버튼 **제거**(신청은 SCR-004에서만).
- 남은 확인: `approvedDays`는 해당 연도 APPROVED 합계로 미래 날짜 승인분도 포함한다(test-report Run 4 §5). 라벨 최종 확인과 함께 사용자 확인 대기.

### D13. 最近の申請 (본인)
- **확정**: 본인 휴가 신청 3건(`GET /leaves/me?limit=3`). 클릭 시 `LeaveDetailModal`(본인 취소 가능, 기존 로직).

### D14. お知らせ
- **확정**: 이번 단계에서 표시하지 않음. 3단계에서 공지 기능과 함께.

## E. 디자인·용어

### D15. 도넛 차트
- **확정**: 허용. 정적 SVG, 라이브러리 없음(공용 `DonutChart`). 09 §4 SCR-002 행·§5-4의 「차트 미사용」 규칙에 예외로 명시.

### D16. 색상·셸 요소
- ~~확정(1회차): 기존 디자인 토큰 유지. 사이드바·햄버거 메뉴 유지(하단 내비 범위 밖). 이미지의 보라·그라데이션·일러스트·아바타 사진 미적용.~~
- **확정(변경, 2026-11-12 사용자 결정)**: 색·셸을 참조 이미지 기준으로 한다. 추가 토큰(淡い緑·橙·violet·페이지 그라데이션 등), 사이드바 아이콘·활성 스타일, 상단바 벨(승인 대기 링크·빨간 점)·아바타, `lg` 미만 하단 탭(ホーム·出勤簿·休暇管理·休暇承認·メニュー), 상단 햄버거 제거. 09 §5 6에 3항 규칙의 예외로 기록, 03 전역 내비게이션에 하단 탭·벨 반영. 일러스트·아바타 사진·참조 브랜드명은 미적용 유지. 참조 탭의 社員情報·各種設定 대체 구성은 사용자 확인 대기.
- 함께 확정된 표시 결정(2026-11-12): 部署 표 アラート 열 없음, 今月の勤務状況 4지표 유지, 休日出勤 시간 단위 유지, 사원 모바일에서도 部署 카드 표시.

### D17. 용어
- **확정**: 기존 확정 용어 유지(承認待ち, 年次休暇, workBridge, 休暇承認).
| 이미지 | 채택(기존) |
|---|---|
| WorkFlow 로고 | workBridge `Logo` |
| 有給休暇 | 年次休暇 |
| 申請中 | 承認待ち |
| 承認管理 | 休暇承認 |
| 未承認の休暇申請 | 承認待ちの申請 |
| 今月の勤務時間 / 本日の出勤状況 | 今月の勤務状況 / 今日の出勤状況 |
- 인사말: 도쿄 5:00–10:59 「おはようございます」, 11:00–17:59 「こんにちは」, 그 외 「こんばんは」 + 「、{이름}さん」. 부제 「今日も一日、よろしくお願いします。」.
- D8 변경으로 「承認・却下は休暇承認画面で行います。」 안내 문구는 쓰지 않는다.

### D18. 삭제 대상 목록
- **확정**:
  1. `frontend/src/app/(app)/dashboard/AdminSummarySection.tsx`, 대시보드에서 쓰지 않게 되는 컴포넌트·`messages.dashboard`의 미사용 키, `DashboardView.test.tsx`의 폐기 시나리오(캘린더 관련 등, 새 시나리오로 교체).
  2. D3 캘린더(프런트): `LeaveCalendarSection.tsx`(+test), `LeaveCalendarDayModal.tsx`, `components/calendar/MonthCalendar.tsx`(+test), `lib/calendar.ts`의 `buildMonthWeeks`(+해당 test), `lib/api/types.ts`의 `LeaveCalendarMonth`·`LeaveCalendarMember`·`LeaveCalendarDay`, `messages`의 캘린더 키, `e2e/dashboard-leave-calendar.spec.ts`.
  3. D20-A일 때(백엔드): `dashboard.controller.ts`의 API-DASH-002·003 핸들러(컨트롤러 파일은 API-DASH-004용으로 유지), `dto/leave-calendar-query.dto.ts`, `leave-calendar-rules.ts`(+spec, `isWeekend`·`monthRange`는 이동), service·repository의 캘린더 메서드, `test/dashboard-leave-calendar.e2e-spec.ts`, `attendance-monthly.e2e-spec.ts`의 캘린더 1건.
  4. 삭제하지 않음: `StatCard`(SCR-004 `LeavesView` 사용, 선택 prop만 추가), `PendingApprovalsSection`·`AttendanceSection`·`LeaveBalanceSection`(내용 교체), `lib/calendar.ts`의 `shiftMonth`·`formatMonthLabel`(출근부 사용), `.claude/work/dashboard/screenshots/`.

### D19. 반응형 배치
- ~~확정(1회차): 1280px(`xl`) 이상 2열, 미만 1열.~~
- **확정(변경, 2026-11-12 사용자 결정: "현재 구현 유지, D1 문서를 맞춤")**: 1280px(`xl`) 이상은 행 단위 그리드(행마다 열 수·폭 비율이 다름, ADMIN 3행은 3열), 미만 1열. PC·모바일은 같은 컴포넌트·같은 데이터 호출을 쓰고 CSS 그리드(`contents`)·`order`로만 배치 변경(`useMediaQuery` 분기·이중 마운트 금지).
  - `xl` 미만 1열 순서: ADMIN = 통계 → 全社 → 承認待ち → 今日 → 今月 → 休暇 → 部署 → 直近(`order`), EMPLOYEE = DOM 순서(承認待ち → 今日 → 今月 → 休暇 → 部署 → 直近).
