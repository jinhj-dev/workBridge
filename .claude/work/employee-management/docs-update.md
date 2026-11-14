# docs-update — employee-management (문서 반영 모드)

근거: backend.md·frontend.md 「문서 갱신 예정」(Fix 1~4 / Fix 1~3 최신 기준), review.md Round 2 문서 반영 체크리스트, plan.md DOC_ISSUES·사용자 결정. 실제 코드(users·job-titles DTO·controller·repository, ja.ts, globals.css, 공용 컴포넌트 props)와 대조 후 반영.

## 반영한 문서·섹션
- `docs/02_REQUIREMENTS.md`
  - FR-USER-001: 통합 keyword·재직 상태(在籍中/入社予定/無効, 休職中 없음), 요약 3지표(管理者数 = 인증 Role), 초기 비밀번호 관리자 입력(메일·재발급 없음), 화면 등록 시 EMPLOYEE·승인 필요 고정, 사원번호 자동 채번(5자리 최댓값+1, 예정 번호 비예약)/직접 입력, 이름 제어 문자 불가, 役職·連絡先 등록 필수, 役職 ≠ 권한
  - FR-USER-002: 수정 시 役職·連絡先 해제 허용·비밀번호 수정 불가, 削除 = 비활성화(논리 삭제), 비활성화 시 Refresh Token 폐기·재활성화 규칙, 책임자 해제 「미구현」 문구 삭제
  - FR-JOB-001 신설(직책 관리: 이름 규칙·8색·정렬·사용 중 삭제 불가·Role 무관·항목별 즉시 저장)
  - FR-DEPT-001: 役職·連絡先 표시 범위에 SCR-006 추가
- `docs/03_SCREEN_LIST.md`: SCR-006·007 행, 목록 규칙(SCR-006 10건 예외), Screen Flow(모달 흐름, SCR-008 → `/admin/users/:id` 재결정 필요)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-006_USER_LIST.md`: 전면 재작성(헤더·요약·社員数 vs 「全 N 名」 기준 차이·검색·목록·모달 5종·검증·API·예외·반응형)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-007_USER_DETAIL.md`: 상단에 「페이지 미구현, SCR-006 모달로 대체」 상태 표기(부여 연차·승인 정책 안내 미구현)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md`: 所属社員確認 役職 배지를 공용 `JobTitleBadge`(8색)로 갱신
- `docs/05_DATABASE_DESIGN.md`: §0 ENUM job_title_tone 8값·마이그레이션 `extend_job_title_tone`·롤백 조건, §2 users 쓰기 경로·채번·재직 상태(비저장), §2-1 job_titles 이름 규칙(제어 문자 불가)·관리 API·정렬·삭제 규칙, §8 마지막 활성 ADMIN 선잠금 순서·「사원 비활성화」·「사원번호 자동 채번」 신설, 책임자 해제 「미구현」 문구 삭제
- `docs/06_API_SPECIFICATION.md`: §5 공통 객체 `JobTitleRef`·`UserListItem`·`UserDetail`, API-USER-001(Query 확장·400 메시지)·002(요청 변경·필드별 메시지·INVALID_JOB_TITLE·EMP_ID_EXHAUSTED)·003·004(개정), API-USER-006·007 신규, API-USER-005 미구현 표기, API-DEPT-008 tone 8값·공개 범위, §6 직책 관리 API-JOB-001~004 신규(제어 문자 400 「役職名に使用できない文字が含まれています。」 포함 — review Round 2 낮음 1건)
- `docs/07_ARCHITECTURE.md`: §3 권한 판단은 role만(役職 무관), §5 users repository 예상 밖 오류 요약 로그 + 500 정책
- `docs/08_TEST_PLAN.md`: §5.1 IT-USER-11~21·IT-JOB-01~05 추가(IT-USER-10 미구현 표기), IT-DEPT-38 ENUM 8값, §6 권한 매트릭스에 직책 API, §7 SCR-006 재작성·SCR-007 대체·SCR-010 배지, §8 E2E-04 커버 범위
- `docs/09_DESIGN_SYSTEM.md`: §2.1 토큰 7개(값·대비 실측), §4 SCR-006·007 행, §5 10항 승인 예외 1줄, §5 12항 신설(SCR-006 레퍼런스 재현 예외·적용 범위·유지 규칙), §6 `Modal`·`ConfirmDialog`·`FormModal` `iconVariant`, `FormTable` `FormStack`/`FormStackRow`, `Badge` `lavender`·`yellow`, `JobTitleBadge`(신규 행), `StatCard` `iconCircle`(tone violet은 추가하지 않음), `Pagination` `pageSize`·`variant='boxed'`(+compact), `Select` `size`, `PageHeader` `description`, 부서 관리 전용 항목의 배지 교체, 사원 관리 전용(users 폴더·`userFormRules`·`RadioCardGroup`)·`lib/password-policy.ts` 항목 신설
- `docs/UI_MODAL_PATTERNS.md`: §2.1 I-4·I-5, §3.1 배치(D2), §5.1 아이콘 박스, §5.2 금지 목록, §9.3 「승인된 예외」 E1 신설(SCR-006 5종 한정 `iconVariant='circle'`·`FormStack`·`RadioCardGroup`, 유지 규칙, 社員削除 LAST_ADMIN 토스트)
- `docs/10_DEVELOPMENT_ROADMAP.md`: §1 요약표(FR-JOB-001), §2 #8 API-USER-001~004·006·007·API-JOB·cleanup 스크립트·SCR-006·SCR-007(모달 대체) 완료 체크, API-USER-005 미구현 유지, 후속 과제(役職·連絡先 입력 경로 해소, 부여 연차, constraint-name 중복, users repository 오류 정책, SCR-008 링크 대상, 테스트 보강, cleanup 주의), §2 #5 출근부 1024·768 가로 overflow, §2 #10 dashboard-renewal 테스트 DB 전용 절차·password.spec 순서 의존·Playwright config `.env.local` 미로드·leave-visual 간헐 실패, §3 갱신 이력 1행
- `.claude/work/context.md`: 「미구현 주의」를 users·job-titles 모듈·SCR-006 구조로 교체, 役職·連絡先 반환 범위, Badge variant, Modal `iconVariant`, Pagination·Select·PageHeader 신규 prop, `db:e2e-users-cleanup`, Playwright 환경 변수 export 주의, 문서 맵 02 설명

## 반영하지 않은 것
- 새 문서 생성 없음(문서 맵 항목 추가 없음)
- 01_PRD: 갱신 예정에 없음
- 10 로드맵 과거 갱신 이력 행의 「관리 화면·목록 API 없음」 등 당시 기록은 이력이므로 수정하지 않음
- 08 §7의 테스트 미작성 항목은 로드맵 후속 과제에만 기록
