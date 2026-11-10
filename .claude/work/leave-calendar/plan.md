FRONTEND: REQUIRED
SECURITY_REVIEW: REQUIRED
DOC_ISSUES: docs 전반(02 FR-DASH-001, 03 SCR-002 행, 04 SCR-002, 06 §2, 09 §6)에 휴가 캘린더 정의가 없음 → 신규 정의 / 02 FR-LEAVE-005(휴가 상세는 신청자·승인자·ADMIN만): 캘린더는 이름·부서·날짜만 공개하고 Leave 상세(사유·종류·승인 정보)는 내보내지 않으므로 "휴가 상세" 열람이 아니라고 해석 → FR-DASH-001에 공개 범위를 명문화하고 FR-LEAVE-005에 보충 문구 추가 / SCR-002 §2·§8 "본인 데이터만 표시"에 "휴가 캘린더는 전원에게 승인된 휴가자의 이름·부서 공개" 예외 문구 필요 / 요청 원문 8-3(申請理由·휴가 상태 표시)과 사용자 결정(이름·부서·반차 구분만, APPROVED만)이 다름 → decisions.md에 기록
SUMMARY: 대시보드 하단에 전 사용자 공용 월간 휴가 캘린더(날짜별 APPROVED 휴가 인원 배지 + 날짜 클릭 시 이름·부서(+반차 라벨) 목록 모달)와 집계·상세 API 2개를 추가한다

## 승인용 설계 요약
- 범위: 월간 캘린더(현재 월 기본, 전월/익월, 오늘 강조, 과거 회색·선택 가능), 날짜별 인원 배지, 날짜 상세 모달(社員名·所属部署 + 반차일 때만 「午前半休」「午後半休」), 재사용 가능한 `MonthCalendar` 시스템 컴포넌트 / 하지 않는 것: 신청 사유·반차 외 휴가 종류·기간·상태 표시, PENDING 표시, 캘린더에서 승인·반려, 공휴일 처리, 부서 필터, DB 변경
- 핵심 결정(사용자 확정):
  1. 공개 범위: ADMIN·EMPLOYEE 전원 동일(ADMIN도 사유 미표시). 상세는 이름·부서 + 반차 구분(`halfDay: 'AM'|'PM'|null`)만이며 API 응답에도 사유·종류 enum·기간·상태를 넣지 않음(최소 노출). 같은 날 AM+PM 또는 종일+반차는 라벨 없이 1행
  2. 집계: APPROVED만, 사원 단위 DISTINCT(같은 날 반차 2건도 1명). PENDING·REJECTED·CANCELLED 제외
  3. 토·일 제외, 공휴일은 데이터가 없어 평일 취급, 활성 사원만(DASH-001과 같은 기준)
  4. 월 집계는 DB `generate_series` + `COUNT(DISTINCT user_id)` 1쿼리, 상세는 클릭한 날 1일분만 별도 API(월 이동 시 집계만 재조회)
  5. 날짜는 Asia/Tokyo DATE, 월 경계는 `start_date <= 월말 AND end_date >= 월초` 겹침 조건
- API: `GET /dashboard/leave-calendar?month=YYYY-MM`(신규, API-DASH-002, USER) / `GET /dashboard/leave-calendar/day?date=YYYY-MM-DD`(신규, API-DASH-003, USER). 기존 API-LEAVE-*는 본인·승인자 범위라 재사용 불가
- 화면: SCR-002 대시보드에 §3-6 "휴가 캘린더" 영역 추가(공통)
- 변경 파일 수: 백엔드 8개(신규 4) / 프론트 8개(신규 4) + 테스트
- DB 변경: 없음(기존 인덱스 `leaves(start_date, end_date)` 사용)
- 사용자 승인 완료(D8: 반차만 표시, D9: 전원 동일)
- 프로젝트 문서 갱신 예정: 02_REQUIREMENTS(FR-DASH-001, FR-LEAVE-005 보충), 03_SCREEN_LIST(SCR-002 행), 04 SCR-002, 06_API_SPECIFICATION(§2), 08_TEST_PLAN(§5.5·§6·§7), 09_DESIGN_SYSTEM(§6), 10_DEVELOPMENT_ROADMAP
