# docs-update — 부서 관리 화면 재구성 (SCR-010)

근거: backend.md(Fix 1 포함)·frontend.md(Fix 2 포함) "문서 갱신 예정", plan.md 확정 사항. 반영 전 실제 코드(controller·dto·repository·service·migration·db-helpers, frontend DepartmentsView·FormModal·DetailPanel·MembersModal·SortableTh·icons·ApproverSelect·ja.ts)와 test-report Run 3를 확인함.

## 갱신한 문서·섹션
- `docs/02_REQUIREMENTS.md`
  - FR-USER-002: 비활성화 시 부서 책임자 자동 해제(겸임 포함, API-USER-004 미구현), 부서 이동은 책임자에 영향 없음
  - FR-DEPT-001: 부서명 검색(코드 검색은 API만)·정렬, 설명(0~500자), 부서 책임자(R1 임의 활성 사원·R4 겸임·해제 가능, R3 이동 무관), 요약(未所属 제외)·소속 사원 확인, 未所属 설명·책임자 지정 불가(R5), 책임자 있어도 삭제 가능
- `docs/04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md` 전면 갱신(§2~§10): 화면 구성(헤더·요약·목록·선택 상세), 목록 열·정렬·선택, 選択中の部署情報, 조회(URL Query name·sort·order·page), 등록·수정 모달(説明·部署責任者 서버 검색·미변경 시 미전송·blur 복원), 所属社員確認 모달, 삭제, 검증(説明 500자), API, 예외(INVALID_MANAGER, 소속 사원 404), 상태 처리, 완료 조건
- `docs/05_DATABASE_DESIGN.md`: §1 departments(description·manager_id, FK, UNIQUE 없음, 마이그레이션 메모) / §7 Index `departments(manager_id)` / §8 부서 삭제에 책임자 무관 1줄, 신규 소절 "부서 등록·수정의 책임자 지정"(잠금 순서 부서→사원, 비활성화 시 해제 SQL 미구현, 테스트 cleanup)
- `docs/06_API_SPECIFICATION.md`: API-USER-004 비고(비활성화 시 책임자 해제·미구현, 부서 이동 영향 없음) / `DepartmentDetail`(description·manager)·입력 규칙(description·managerId·INVALID_MANAGER) / API-DEPT-002(sort·order) / `:id` 형식 오류 공통에 008 추가 / API-DEPT-004·005(managerId, INVALID_MANAGER, 판정 순서) / API-DEPT-006(책임자 있어도 삭제) / API-DEPT-007·008·009 신규(006 뒤)
- `docs/08_TEST_PLAN.md`: §5.6 IT-DEPT-21~36 추가 / §7 SCR-010 행 갱신(신규 E2E spec 3개 포함)
- `docs/09_DESIGN_SYSTEM.md` §6: `ApproverSelect` 행에 `texts?`·`onSearch?`·`ApproverSelectTexts` 기록 / "부서 관리 전용" 1줄(icons·SortableTh·DepartmentDetailPanel·DepartmentMembersModal). 토큰·디자인 규칙 변경 없음
- `docs/10_DEVELOPMENT_ROADMAP.md`: §2 #2 마이그레이션 목록, §2 #8 API-USER-004 항목 보충·부서 재설계 백엔드 [x]·SCR-010 재구성 [x], §2 #10 화면 테스트 SCR-010, §3 갱신 이력 1행
- `.claude/work/context.md`: 공용 모듈 departments 항목 보충(문서 맵 변경 없음, 새 문서 없음)

## 반영하지 않은 것
- `docs/09_DESIGN_SYSTEM.md` §4 SCR-010 대응 행("검색 조건 + 표 + 등록·수정 모달")은 Figma 대응 설명이라 사용자 원칙(디자인 시스템 문서 임의 변경 금지)에 따라 그대로 둠. 현재 화면 구성과 다르므로 필요 시 사용자 확인
- `docs/03_SCREEN_LIST.md` SCR-010 행은 "갱신 예정"에 없고 현행 설명과 모순되지 않아 변경 없음
- 리뷰 Round 2 낮음 2건(후보 100건 상한 실측 테스트, Escape 시 이전 책임자 미복원)은 로드맵 이력에 미반영 사실만 기록

## 추가 반영 (frontend.md Fix 3·Fix 4·Fix 5)

근거: frontend.md Fix 3·Fix 4 "문서 갱신 예정"(Fix 5는 갱신 항목 없음, review Round 4도 "추가 문서 갱신 불필요"), review Round 3·4, test-report Run 4. 반영 전 실제 코드(DepartmentsView·DepartmentDetailModal·DepartmentMembersModal·`components/Modal.tsx`·`components/form.tsx`·`messages/ja.ts`, e2e `departments*.spec.ts` 5개)를 확인함.

### 갱신한 문서·섹션
- `docs/04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md`
  - §3 화면 구성: 「選択中の部署情報」 행 삭제, 상세는 部署詳細 모달로 확인한다는 1줄
  - §4 목록 구성: 部署名 셀 선택 기능 삭제, 所属社員数 옆 [確認], 操作 [詳細][編集][削除](未所属은 [詳細]만, 削除 Danger), 버튼 높이 36·간격 8, 접근성 이름(詳細 추가), 표 5행(304px) 내부 스크롤·헤더 고정, 카드 목록은 내부 스크롤 미적용과 근거(스크롤 트랩·높이)
  - §4 「選択中の部署情報」 소절 → 「部署詳細 모달」(조회 전용, 행 데이터 재사용, footer [閉じる]/[この部署を編集], 편집 전환)
  - §5 등록·수정 진입점 문구, 소속 사원 확인 모달 전면 갱신(헤더·배지·検索·3열·내부 스크롤(높이 640px 이상)·`limit=100` 전 페이지 수집·클라이언트 검색·인원 수 전체 기준·상태 문구·入社日 제외·役職/連絡先 DB 미보유로 별도 작업)
  - §7 API-DEPT-008 Query `limit=100`, §10 완료 조건 1줄
- `docs/09_DESIGN_SYSTEM.md` §6: `form.tsx` 행에 `dangerOutlineButtonClass`(3절 Danger 구현, 기존 `danger-100`/`danger-30`) 추가 / `Modal` 행에 `subtitle?` / "부서 관리 전용"의 `DepartmentDetailPanel` → `DepartmentDetailModal`, `DepartmentMembersModal` 구성 갱신(Pagination 제거). 토큰·규칙 변경 없음, §4 SCR-010 Figma 대응 행은 그대로
- `docs/08_TEST_PLAN.md` §7 SCR-010 행: 행 액션·[確認]·내부 스크롤·選択中 영역 없음·部署詳細 모달·所属社員確認 모달(3열·전 페이지 수집·검색·인원 수) 기준으로 갱신, E2E `departments-list-modal.spec.ts`·`departments-members-modal.spec.ts` 추가
- `docs/10_DEVELOPMENT_ROADMAP.md`: §2 #8 프론트엔드 [x] 1행(test-report Run 4·리뷰 Round 4 APPROVE 확인) + 후속 과제 「役職·連絡先 DB 추가(별도 작업)」, §2 #10 SCR-010 Run 4 결과, §3 갱신 이력 1행
- `.claude/work/context.md`: 공용 모듈 departments 항목의 `DepartmentDetailPanel` → `DepartmentDetailModal`(문서 맵 변경 없음, 새 문서 없음)

### 반영하지 않은 것·참고
- `docs/09_DESIGN_SYSTEM.md` §6 `Modal` 행에는 코드에 이미 있는 `icon?`·`size?`(md 420 / lg 640)가 기록되어 있지 않음. 이번 "갱신 예정"에 없어 `subtitle?`만 추가함. 같은 이유로 `primaryOutlineButtonClass`도 미기록 상태. 필요 시 별도 반영
- `docs/09_DESIGN_SYSTEM.md` §4 SCR-010 Figma 대응 행은 이전과 같이 변경하지 않음
- 06 API 문서는 변경 없음(API-DEPT-008 `limit` 상한 100 범위 안의 사용)
- `security.md`가 일본어로 작성되어 있음(문서는 한국어 규칙). 지시에 따라 수정하지 않고 기록만 함
