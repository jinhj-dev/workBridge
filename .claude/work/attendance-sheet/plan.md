FRONTEND: REQUIRED
SECURITY_REVIEW: SKIP
DOC_ISSUES: 04 SCR-003 §4 "좁은 폭에서도 카드 목록으로 바꾸지 않고 같은 표를 가로 스크롤"이 이번 요구와 정면 충돌 → 문서 변경 / md 미만 구 화면 명세는 현 docs에 없음(main의 SCR-003 명세에서 복원 필요) / 복원할 `e2e/attendance-status.spec.ts` 6건은 E2E 하네스 문제로 실패 이력 있음(로드맵 2026-11-10 이력) / `backend/prisma/e2e-account-data.ts`도 이번 브랜치에서 수정됨 → fixture 복원 시 의존 여부 확인 필요
SUMMARY: (추가 요구 1) SCR-003에서 md(768px) 미만이면 main의 구 근태 이력 화면(기간 검색·상태 필터·카드 목록·페이지네이션, API-ATT-004)을, md 이상이면 현 出勤簿를 미디어쿼리 훅으로 한쪽만 마운트해 표시한다

## 승인용 설계 요약 — 추가 요구 1: 모바일 구버전 레이아웃
- 범위: 삭제했던 구 화면·컴포넌트·테스트·문구를 main에서 복원 + 뷰포트 분기 래퍼 / 하지 않는 것: 구 화면 기능 변경, 데스크톱 出勤簿 변경, 뷰 전환 시 URL 변환, API·DB 변경
- 결정 필요(추천안, 상세 decisions.md M1~M7):
  - M1 분기: `useMediaQuery('(min-width: 768px)')`(useSyncExternalStore, 서버·hydration 시 "미판정" → 스피너) 결과로 한쪽만 마운트. CSS 숨김 병행 렌더는 API 이중 호출이라 채택 안 함
  - M2 경계: md(768) — 메인 고지대로
  - M3 URL·리사이즈: 각 뷰가 자기 Query만 해석(`month` / `startDate·endDate·status·page`), 전환 시 변환 없음. 경계를 넘으면 즉시 교체(선택 행·열린 모달 상태는 사라짐)
  - M4 명칭: 모바일도 「出勤簿」(h1·메뉴·title 공통)
  - M5 가로 스크롤: 유지(md~lg, lg+사이드바 폭에서 표가 여전히 넘침)
  - M7 e2e: `attendance-status.spec.ts` + 백엔드 개발 스크립트 `e2e-attendance-fixture` 복원, 모바일 뷰포트 지정
- API: 신규 없음. md 미만 `GET /attendance`(API-ATT-004, 기존), md 이상 기존 API-ATT-007·LEAVE-006
- 화면: SCR-003 出勤簿(/attendance) — 폭별 표시 분기
- 변경 파일 수: 프론트 신규 4 / 복원 5 / 수정 5(page, ja.ts, date-range(.test), e2e/attendance.spec) · 백엔드 개발 스크립트 2(복원 1, package.json)
- 프로젝트 문서 갱신 예정: 04 SCR-003, 03_SCREEN_LIST, 09_DESIGN_SYSTEM, 08_TEST_PLAN, 10_DEVELOPMENT_ROADMAP, (02 FR-ATT-003 화면 표기), context.md

---

## 본 기능(완료) 원래 플래그
FRONTEND: REQUIRED / SECURITY_REVIEW: REQUIRED
DOC_ISSUES: attendance 테이블에 휴게 기록·근무 패턴·비고 컬럼 없음, 회사 근무규칙·근태 신청 데이터 없음 → 요청 항목 일부를 계산값·도출값으로 대체(decisions.md D1~D11, 승인 완료) / 공휴일: 출근부만 `@holiday-jp/holiday_jp`로 판정, 02 FR-LEAVE-001·FR-DASH-001("공휴일=평일 취급")은 이번에 변경하지 않아 화면 간 불일치 발생 → 02에 명시·후속 과제(D5) / 기존 `Attendance.workMinutes`(拘束)와 출근부 実働 정의 차이(D14) / 출근부·법정 휴게·월간 집계 규칙이 02·04·06에 없음 → 신규 정의 / Breadcrumb 컴포넌트는 앱에 없음
SUMMARY: SCR-003 「勤怠管理」를 「出勤簿」로 개명하고, 월별 출근부(현재 일시 카드·일별 표+24시간 막대·월간 요약, 일본 공휴일 표시)와 본인 월간 조회 API 1개를 추가한다(DB 변경 없음, 백엔드 의존성 1개 추가, 출퇴근 버튼 없음)

## 승인용 설계 요약 (사용자 승인 완료 — D5만 추천안과 다름)
- 범위: 월 이동(`?month=YYYY-MM`), 현재 일시 카드(도쿄, 매분 갱신), 일별 행(日付/勤務パターン/出勤/退勤/休憩/実働/備考/申請/時間帯), 토·일·공휴일·승인 종일휴가 회색, 선택 행 강조, 월간 요약, 재사용 `WorkTimeline` / 하지 않는 것: 출퇴근 버튼·기록 생성, 휴게 입력, holidays 테이블·관리 화면, 휴가 일수·대시보드의 공휴일 반영, 신청 [+], 인쇄·提出, DB 변경
- 확정 결정(상세 decisions.md):
  - D1~D4 휴게: 법정 최저 휴게 "計算値"(정밀식·구간 중앙 배치), 미달 판정 미구현
  - D5 공휴일(기본값 포함): **백엔드에서만** `@holiday-jp/holiday_jp`로 판정 → API `dayType: HOLIDAY` + `holidayName`. 프론트는 응답만 사용(라이브러리 미추가). 勤務パターン `祝日`, 備考에 공휴일명, 회색 행
  - D5 집계 영향: 所定労働日数 = 평일 − 공휴일(입사일 이후) / 時間外 = WEEKDAY 행만 / 休日労働 = 토·일+공휴일 実働 / 휴가 표시·有給取得日数는 기존 휴가 규칙대로 토·일만 제외(평일 공휴일 휴가는 표시·집계)
  - D5 범위 밖: FR-LEAVE-001·FR-DASH-001은 "공휴일=평일" 유지(불일치를 02에 명시). 라이브러리 수록 연도 밖 월은 공휴일 없이 계산
  - D6~D17: 추천안대로(勤務パターン 도출, 본인 휴가 배지, 반차는 배지만, 所定時間·欠勤 비표시, 기존 기능 삭제, SCR-003만 개명, 기존 workMinutes 유지)
- API: `GET /attendance/monthly?month=YYYY-MM`(신규 API-ATT-007, USER, 본인만) / `GET /leaves/balance?year=`(기존 API-LEAVE-006)
- 화면: SCR-003 出勤簿(/attendance, 명칭·구성 변경) / 사이드바 메뉴명
- 변경 파일 수: 백엔드 10개(신규 6, package.json·lock 포함) / 프론트 약 14개(신규 7, 삭제 4) + e2e 2개
- 프로젝트 문서 갱신 예정: 02_REQUIREMENTS, 03_SCREEN_LIST, 04 SCR-003, 06_API_SPECIFICATION, 08_TEST_PLAN, 09_DESIGN_SYSTEM, 10_DEVELOPMENT_ROADMAP, (context.md 기술 스택에 공휴일 라이브러리)
