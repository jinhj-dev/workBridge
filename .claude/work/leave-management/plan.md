FRONTEND: REQUIRED
SECURITY_REVIEW: REQUIRED
DOC_ISSUES: NONE (승인 단계에서 전부 해소 → 아래 「확정 사항」, 구현 후 문서 반영)
SUMMARY: 휴가 메뉴를 /leaves 한 화면(自分の休暇·休暇カレンダー·承認 탭)으로 통합하고, 승인 완료 휴가 공유 캘린더 API·화면(PC/모바일)과 이미지 기준 디자인 개편(Primary 색은 기존 유지)을 구현한다

## 확정 사항 (사용자 승인, 이전 DOC_ISSUES 해소)
- Primary: 기존 색 유지(09 §2 그대로). 이미지 인디고 미사용, 그 외 이미지 요소는 최우선 적용
- 내비게이션: 社員情報·各種設定 미추가, 하단 탭 4개(ホーム·出勤簿·休暇管理·メニュー)
- 캘린더 공개 범위: 이름·사원번호·부서·기간·공개 종류(OTHER는 「休暇」)·반차 구분 공개, 문서(02·03·04)에 명문화
- 承認 탭 표시: ADMIN 또는 본인 할당 신청(PENDING·APPROVED·REJECTED) 1건 이상 / 다음 부여 예정일: 미표시
- 自分の休暇 필터: 申請日 범위(appliedFrom/To) 추가, year 필터 UI 폐지 / 캘린더 API: 월 단위 전체 반환(NFR-002 페이지네이션 예외로 문서화)

## 승인용 설계 요약
- 범위: 탭 3개(경로 /leaves, /leaves/calendar, /leaves/approvals), 공유 캘린더 신규 API, 승인 목록 상태 확장, 신청일 범위 필터, 디자인 토큰·공용 컴포넌트 개편, 사이드바·하단 탭 정리, Playwright 시각 검증 / 하지 않는 것: DB 변경, Primary 색 변경, 社員情報·各種設定 화면, 월·주·일 전환, 다른 화면 재구현, 다음 부여 예정일
- 결정1 탭 = 경로 기반(Next 공통 layout + Link). 기존 /leaves/approvals·?scope=all 링크 호환, 뒤로/앞으로 자연 지원
- 결정2 캘린더 공개 = APPROVED·활성 사원만, {name, empId, departmentName, startDate, endDate, category(PAID/SPECIAL/OTHER), halfDay}. 사유·일수·승인자·leave id 미포함
- 결정3 承認 탭 = API-LEAVE-007에 status 파라미터 추가(기본 PENDING, 호환). 건수는 limit=1 totalCount, 처리 권한·로직 변경 없음
- 결정4 디자인 = Primary 기존 유지, 컨트롤 radius 4→8, 휴가 분류 색·토/일 색 신규 토큰, PageHeader·NavTabs·SearchInput 등 공용화(09 갱신)
- 결정5 캘린더 막대 = 신청 기간(주말 포함) 그대로 연결 표시, 공휴일은 서버가 응답에 포함
- API: GET /leaves/calendar(신규 API-LEAVE-010) / GET /leaves/pending-approval(+status) / GET /leaves/me(+appliedFrom·appliedTo) / 기존 POST·GET·PATCH /leaves*, GET /leaves/balance, GET /departments 재사용
- 화면: SCR-004 휴가 관리(自分の休暇·休暇カレンダー 탭) / SCR-005 휴가 승인 → SCR-004의 承認 탭으로 통합
- 변경 파일 수: 백엔드 약 10개(신규 5) / 프론트 약 30개(신규 14, 테스트 포함 시 +10)
- 프로젝트 문서 갱신 예정: 02, 03, 04 SCR-004·SCR-005, 06, 08, 09, 10
