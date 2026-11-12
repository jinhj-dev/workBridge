FRONTEND: REQUIRED
SECURITY_REVIEW: REQUIRED
DOC_ISSUES: NONE (D1~D6는 사용자 승인으로 해소. 신규 정한 내용은 아래 "프로젝트 문서 갱신 예정"으로 문서 반영 모드에서 기록)
SUMMARY: SCR-010 부서 관리를 이미지 레이아웃(헤더+요약+정렬 목록+선택 상세)으로 재구성하고, 부서에 설명·책임자(임의 활성 사원, 겸임 가능)를 추가하며 정렬·요약·소속 사원·책임자 후보 API를 추가한다.

## 확정 사항
- Q1 = C: `departments.description VARCHAR(500) NULL`, `manager_id UUID NULL FK users(RESTRICT)` + 일반 인덱스, 기존 부서는 NULL / 部署数 = 未所属 제외 / 今月の変更·状態는 범위 밖
- R1 자격: 임의의 활성 사원(소속 부서 무관, ADMIN·본인 포함). 등록(POST)·수정(PATCH) 모두 managerId 지정 가능
- R2 비활성화(퇴직): 책임자 자동 해제(NULL). 실행 지점 API-USER-004 미구현 → 문서 기록만
- R3 부서 이동: 자격이 소속과 무관해졌으므로 **해제 불필요(책임자 유지)**. 문서에도 "이동은 책임자에 영향 없음"으로 기록
- R4 겸임 허용: manager_id UNIQUE 없음. 05 §7 FK 인덱스 관례·R2 해제 조회용으로 일반 인덱스 `departments(manager_id)`
- R5 未所属에 지정 불가(기존 409 PROTECTED_DEPARTMENT)

## 승인용 설계 요약 (승인 완료)
- 범위(함): 화면 재구성, 부서명 검색, 정렬(部署名·所属社員数·更新日·코드), 요약 2개, 部署責任者·説明 열·상세·모바일 카드, 등록·수정 모달에 説明·部署責任者(검색 선택), 所属社員確認 모달
- 범위(안 함): 今月の変更, 状態, 계층, 코드 검색 UI, 책임자로 검색·정렬, 사원 관리 쪽 자동 해제 구현
- 핵심 결정: 정렬 화이트리스트+raw SQL(활성 수 기준) / 책임자 검증은 부서→사원 잠금 후 재조회(존재·활성만), 위반 400 INVALID_MANAGER / 책임자 후보는 신규 관리자 전용 API(UserSummary만, 상한 100). API-LEAVE-002는 본인 제외·USER 권한·휴가 용도라 재사용 안 함, API-USER-001은 미구현이고 반환 항목 과다 / 응답 manager는 id·empId·name만
- API: GET /admin/departments(sort·order) / GET·POST·PATCH /admin/departments[/:id](description·manager, POST·PATCH managerId) / 신규 GET /admin/departments/summary(007), /:id/members(008), /manager-candidates(009)
- 화면: SCR-010 部署管理(재구성), 所属社員 모달(신규), 등록·수정 모달(항목 추가), 삭제 모달(기존)
- 변경 파일 수: 백엔드 약 13개(신규 마이그레이션·DTO 1) / 프론트 약 14개(신규 4, 공통 `ApproverSelect` 문구 prop 추가)
- 프로젝트 문서 갱신 예정: 02(FR-DEPT-001·FR-USER-002), 04 SCR-010, 05(§1 departments·§7·§8), 06(DepartmentDetail·API-DEPT-002~009·API-USER-004 비고), 08(5.6), 09 §6, 10
