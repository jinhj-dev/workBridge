VERDICT: APPROVE

# review — 부서 관리 화면 재구성 (SCR-010) / Round 1

## 확인 요약 (문제 없음)
- 데이터 정합성: 사원 1부서 소속(users.department_id 단일 FK 유지), 계층 컬럼 없음, 활성 소속 사원 있는 부서 삭제 409(기존 트랜잭션 그대로), 책임자 FK `ON DELETE RESTRICT`·일반 인덱스·UNIQUE 없음(겸임), 마이그레이션 SQL에 기존 FK 재생성 없음, `TestDataTracker.cleanup()`이 users 삭제 전에 `managerId` NULL 처리. 그 밖에 users 물리 삭제 경로는 없음(schema.e2e-spec의 RESTRICT 검증만)
- 未所属 보호: update 트랜잭션에서 부서 `FOR UPDATE` → protected 판정 → 사원 `FOR NO KEY UPDATE` 순서(05 §8과 같음). 409가 INVALID_MANAGER보다 먼저(e2e 확인)
- 정렬 raw SQL: `sort`는 zod enum, `ORDER BY` 방향은 `Prisma.sql` 고정 조각(ASC/DESC)만, ILIKE 값·LIMIT·OFFSET은 바인딩, LIKE 와일드카드는 Service에서 escape. 사용자 문자열 보간 없음
- 요약: departmentCount = `code <> UNASSIGNED`, memberCount = 전체 활성 사원(未所属 포함) — 설계·사용자 확정과 일치
- 응답 최소화: manager는 id·empId·name, 후보는 UserSummary, members는 id·empId·name
- 라우트 순서(summary·manager-candidates·`:id/members`가 `:id`보다 먼저) 정상
- 디자인 시스템: 변경 파일에 hex·rgb·임의 값(`text-[…]` 등)·인라인 style 없음. PageHeader·StatCard·Card·SearchInput·DetailTable·Badge·Modal·Pagination·table.ts·form.tsx 재사용. 새 공용 컴포넌트 없음(화면 로컬 SortableTh·DetailPanel·MembersModal·icons), ApproverSelect는 선택 prop(`texts`·`onSearch`)만 추가해 기본 동작 불변. `docs/` 변경 없음
- 서버 keyword 검색 전환(메인 지시)은 `useApiQuery` `keepPreviousData`로 입력란 유지, 수정 시 책임자 미변경이면 managerId 미전송 — 타당

## 이슈

[중간] [담당: tester] [분류: 테스트] backend/test/admin-departments.e2e-spec.ts:581 — test-plan B4·B5·B6 누락: raw SQL 경로의 `memberCount` 정렬 + name 검색 + page 2(LIMIT/OFFSET)·totalCount 일치, 동률 시 code 오름차순, `sort=updatedAt` 정렬이 검증되지 않음 / memberCount 동률 부서 2개 이상 + `limit=1&page=2` 케이스와 updatedAt desc 케이스 추가
[중간] [담당: tester] [분류: 테스트] backend/test/admin-departments.e2e-spec.ts:542 — B18a·B20 "실패 시 부작용 없음" 미검증(INVALID_MANAGER 후 부서 미생성, PATCH 실패 후 기존 책임자 유지), B19 요청자 본인(ADMIN) 지정, B19a A 책임자 유지 assert 없음 / 실패 후 GET으로 상태 확인 assert 추가
[중간] [담당: tester] [분류: 테스트] backend/test/admin-departments.e2e-spec.ts:662 — B13 신규 엔드포인트 비로그인 401, EMPLOYEE의 managerId 포함 POST/PATCH 403, B28 사원번호 부분 일치·공백 keyword(전체), B9 summary+name Query, M2(책임자 사원 DELETE 시 FK RESTRICT 위반·`departments_manager_id_idx` 존재) 누락 / 각 1건씩 추가
[중간] [담당: tester] [분류: 테스트] frontend/src/app/(app)/admin/departments/DepartmentFormModal.test.tsx:230 — F18 누락: 후보 조회 로딩(Skeleton)·실패(loadError 문구+재시도) 및 **실패 시 PATCH에 managerId가 빠지는지**, 결과 100건일 때 상한 힌트 / 테스트 추가
[중간] [담당: tester] [분류: 테스트] frontend/src/app/(app)/admin/departments/DepartmentsView.test.tsx:186 — F9(상세 카드 [この部署を編集] → 그 부서의 説明·責任者가 채워진 모달), F15(책임자·설명 없을 때 표 noValue / 상세 「未設定」), F12 중 未所属 선택 시 [この部署を編集] 미표시 검증 누락 / 테스트 추가

[낮음] [담당: backend] [분류: 버그] backend/src/modules/departments/departments.repository.ts:135 — memberCount 정렬 경로만 id 조회와 count를 `Promise.all`(트랜잭션 밖)로 실행해 다른 정렬(`$transaction`)과 스냅샷 일관성이 다름 / `$transaction([$queryRaw, count])`로 맞추는 것을 제안
[낮음] [담당: frontend] [분류: 컨벤션] frontend/src/app/(app)/admin/departments/icons.tsx:52,70 — `PersonIcon`·`CalendarIcon` 미사용 export / 삭제
[낮음] [담당: frontend] [분류: 버그] frontend/src/components/leave/ApproverSelect.tsx:169 — 수정 모달에서 책임자 입력란에 글자를 치면 즉시 선택이 해제되고, 고르지 않고 포커스를 벗어나면 저장 시 `managerId:null`로 의도치 않은 해제가 될 수 있음(frontend.md에 기존 동작으로 기재). 힌트 문구로 안내 중이라 낮음 / 필요 시 blur 때 원래 값 복원 검토
[낮음] [담당: tester] [분류: 테스트] frontend/e2e/departments-manager.spec.ts:127-129 — 같은 `not.toContainText(managerName)` assert 중복 / 1개 삭제
[낮음] [담당: frontend] [분류: 컨벤션] .claude/work/department-redesign/frontend.md — 본문이 일본어(작업 문서는 한국어 컨벤션) / 다음 갱신 시 한국어로
[낮음] [담당: backend] [분류: 문서갱신] backend.md·frontend.md "문서 갱신 예정"에 plan.md의 `docs/10_DEVELOPMENT_ROADMAP.md` 항목이 없음 / 문서 반영 단계에서 함께 갱신

---

# Round 2 (수정 루프 B 재리뷰)

대상: backend.md "Fix 1", frontend.md "Fix 2", test-report.md "Run 3"(PASS)에서 수정된 파일만.

## Round 1 지적 해소 확인
- [중간] B4·B5·B6 → 해소. `shouldOrderTiedMemberCountByCodeAscInBothDirections`(동률 code 오름차순 양방향 + `limit=1&page=2`·totalCount), `shouldSortByUpdatedAtDescendingSoRecentlyUpdatedComesFirst`, `shouldPaginateMemberCountSortWithNameSearchAndIncludeDescriptionAndManager`(name 검색 + page 2 + totalCount 3 + description·manager 포함). 기대값이 raw SQL의 `ORDER BY COUNT DESC/ASC, code ASC`와 맞음
- [중간] B18a·B20·B19·B19a → 해소. 실패 후 `department.count({code})=0`, PATCH 실패 후 GET으로 기존 책임자 유지, 요청자 본인(adminId) 지정, 겸임 후 A 책임자 유지 assert 추가
- [중간] B13·B28·B9·M2 → 해소. 비로그인 401(신규 3개 + managerId 포함 POST/PATCH), EMPLOYEE managerId 포함 POST/PATCH 403 + 부작용 없음, 사원번호 부분 일치·공백 keyword, summary+name 동일 응답, M2(P2003·SQLSTATE 23001, `departments_manager_id_idx` 존재)
- [중간] F18 → 해소. Skeleton / loadError+재시도 / 실패 시 PATCH 본문에 managerId 없음(`toEqual`로 정확 비교) / 0건 시 입력 유지 / 100건 상한 힌트
- [중간] F9·F15·F12 → 해소(DepartmentsView.test.tsx, test-report 기재 내용 확인)
- [낮음] repository memberCount `$transaction` 통일 → 해소(departments.repository.ts:135)
- [낮음] icons.tsx 미사용 export → 해소(`PersonIcon` 사용처 없음, `CalendarIcon`은 `@/components/CalendarIcon` 별개 파일만 남음)
- [낮음] ApproverSelect blur 해제 → 해소. `onSearch` 지정 시에만 `previousValueRef`로 복원, 빈 입력은 의도적 해제로 유지, `select` 시 ref 초기화, blur 마지막에 ref 초기화. `onSearch` 미지정(휴가 승인자)은 동작 불변이며 테스트로 고정. 폼의 미변경 판정은 id 비교라 복원 후 PATCH에 managerId가 빠지는 기존 동작과도 맞음
- [낮음] e2e assert 중복 → 해소
- [낮음] frontend.md 한국어 → 해소
- [낮음] 로드맵 문서 갱신 예정 → backend.md Fix 1에 추가됨(해소)

## tester 참고 사항 판단
- F18 "0명 empty 문구" → noMatch 검증은 타당. 책임자 후보는 서버 검색(메인 지시, frontend.md "설계와 다른 점"에 기재)이라 `onSearch` 지정 시 0건이어도 입력란을 유지하고 noMatch를 띄우는 것이 구현 의도. test-plan의 "empty" 문구는 설계 변경 전 기술이므로 이슈 아님
- B29 100건 상한 → 낮음으로 남김(아래). 상한은 Service가 아니라 Repository 상수(`MANAGER_CANDIDATE_LIMIT`)에서 적용되므로 test-plan이 제시한 "Service 단위에서 take:100 전달 검증" 대안은 그대로는 적용할 수 없음. 현재 `shouldMatchCandidatesByEmpIdPartialAndTreatBlankKeywordAsNoCondition`의 `Math.min(100, activeCount)` assert는 테스트 DB 활성 사원이 100명 이하면 상한을 실제로 검증하지 못함. 상수 1개로 단순하고 프론트 상한 힌트는 단위 테스트로 커버돼 위험이 낮음

## 새 문제
- 없음. Fix로 인한 회귀는 보이지 않음(tsc·lint·단위·e2e·Playwright 31건 통과 기록 확인)

## 이슈 (Round 2)
[낮음] [담당: tester] [분류: 테스트] backend/test/admin-departments.e2e-spec.ts:831 — B29 상한 100건이 테스트 DB 활성 사원 수에 따라 실제로 검증되지 않음 / 필요 시 101명 이상 활성 사원을 만드는 e2e 1건 또는 repository 단위 테스트로 `take: MANAGER_CANDIDATE_LIMIT` 전달 확인 (제안)
[낮음] [담당: frontend] [분류: 버그] frontend/src/components/leave/ApproverSelect.tsx:138-141 — `onSearch` 지정 시 글자 입력 후 Escape를 누르면 입력란이 비고 선택도 해제된 채 남음(blur 복원은 `editing`이 null이 돼 동작하지 않음). 화면상 빈 칸이라 해제로 보여 혼란은 적음 / 필요 시 Escape에서도 `previousValueRef` 복원 검토 (제안)

---

# Round 3 (사용자 요청 추가 수정: frontend.md "Fix 3"·"Fix 4")

대상: DepartmentsView.tsx, DepartmentDetailModal.tsx, DepartmentMembersModal.tsx, components/Modal.tsx, components/form.tsx, messages/ja.ts, DepartmentsView.test.tsx, DepartmentMembersModal.test.tsx, e2e(departments-list-modal / departments-members-modal 등).
사용자 결정 사항(3열·백엔드 변경 없음·모바일 카드 내부 스크롤 미적용·danger-100 사용)은 지적 대상에서 제외.

## 확인 요약 (문제 없음)
- 공통 컴포넌트 영향: `Modal`의 `subtitle?`는 선택 prop이고 값이 없으면 렌더하지 않음. 제목을 `div.min-w-0`로 감싼 것 외 기존 모달 레이아웃 변화 없음. `dangerOutlineButtonClass`는 신규 추가만이며 기존 클래스 불변, 토큰은 기존 `danger-100/30`만 사용, focus ring·disabled 패턴이 primaryOutline과 같음
- 토큰: `max-h-76`은 Tailwind 기본 spacing 스케일(304px = 헤더 44 + 행 52x5, `thClass h-11`·`tdClass h-13`와 일치). `max-h-[50dvh]`는 뷰포트 상대값이라 대응 토큰이 없고 `Modal`의 `max-h-[calc(100dvh-2rem)]` 선례와 같은 성격 → 허용. hex·rgb·`text-[…]`·인라인 style 없음, 문구는 전부 `messages`
- 목록 sticky 헤더: `border-separate border-spacing-0` + `[&_th]:sticky top-0 z-10 bg-white`로 SortableTh 포함 전 th에 적용, 헤더 하단선 유지. 표는 md 이상에서만 렌더되므로 모바일 카드에 영향 없음
- 상세 모달: 목록 행 데이터 재사용(추가 API 없음), 시스템 부서는 `この部署を編集` 미표시, 편집 전환 시 상세를 닫고 폼을 엶. `key`로 부서마다 재생성
- 所属社員 전체 수집 경쟁 상태: 부모가 `key={viewingMembers?.id ?? 'members-closed'}`로 부서 전환·닫힘 시 언마운트/재생성하고, effect의 `ignore` 플래그로 늦은 응답의 setState·오류 통지를 막음. `reload`는 nonce로 재실행, 404는 `notFoundHandled`로 1회만 처리. 어느 페이지든 실패하면 `Promise.all`이 전체 error로 떨어져 부분 목록이 표시되지 않음(정합성 측면에서 타당)
- 접근성: Esc·X·포커스 트랩은 기존 `<dialog>` 그대로, 검색은 `SearchInput` label 연결, 표 `aria-label`, `scope="col"`, 아바타 `aria-hidden`. 로딩·에러·빈·결과 없음 모두 헤더 유지
- 테스트: DepartmentsView는 상세 모달(대상 부서만)·시스템 부서 편집 미표시·편집 전환·Danger 스타일·確認 버튼 갱신. MembersModal은 전체 페이지 수집·공백 무시 검색·총수 유지·결과 없음·빈 부서·로딩 중 헤더 유지. e2e는 API 기준 기대값과 비교, 임시 부서는 finally에서 삭제

## 이슈 (Round 3)
[중간] [담당: tester] [분류: 테스트] frontend/src/app/(app)/admin/departments/DepartmentMembersModal.test.tsx:127-131 — 새로 들어간 전체 페이지 병렬 수집의 실패 경로가 검증되지 않음: (1) page=1 성공·page=2 실패 시 부분 목록 없이 error(재시도) 표시, (2) `shouldShowRetryWhenLoadFails`가 버튼 존재만 확인하고 클릭 후 재조회→성공 표시를 확인하지 않음 / 두 케이스 추가(재시도 후 apiFetch 재호출과 행 표시까지 assert). 필요하면 언마운트 후 늦게 도착한 응답이 setState·토스트를 일으키지 않는 케이스도 추가
[낮음] [담당: frontend] [분류: 디자인시스템] frontend/src/app/(app)/admin/departments/DepartmentMembersModal.tsx:203 — 모달 표는 `border-collapse` + sticky th라, Fix 3에서 목록 표로 고친 것과 같은 문제(스크롤 시 헤더 하단 2px 선이 따라 올라가 사라짐)가 남아 있음 / 목록과 같이 `border-separate border-spacing-0`, th에 `z-10` 적용해 일관화
[낮음] [담당: frontend] [분류: 버그] frontend/src/app/(app)/admin/departments/DepartmentMembersModal.tsx:172 — subtitle의 `Badge`는 `whitespace-nowrap`이라 부서명(최대 100자)이 길면 375px에서 헤더가 다이얼로그 밖으로 넘침(행의 部署 Badge는 표 내부 스크롤이라 무방) / 서브타이틀 쪽만 줄바꿈·말줄임 가능한 표시로 바꾸거나 이름 부분에 `truncate`+`title` 적용
[낮음] [담당: frontend] [분류: 버그] frontend/src/app/(app)/admin/departments/DepartmentMembersModal.tsx:55-60 — 페이지를 나눠 병렬 조회하므로 조회 사이에 소속 변경이 있으면 같은 사원이 두 페이지에 나와 `key={member.id}` 중복 경고·중복 행이 생길 수 있음(frontend.md에 스냅샷 한계로 기재) / `flatMap` 후 id로 중복 제거 1줄 추가 제안
[낮음] [담당: frontend] [분류: 디자인시스템] frontend/src/app/(app)/admin/departments/DepartmentMembersModal.tsx:202 — Modal 본문(`overflow-y-auto`) 안에 `max-h-[50dvh]` 내부 스크롤이 겹쳐, 세로가 짧은 화면(모바일 가로 등)에서 스크롤 영역이 이중이 됨. 현재 375x667에서는 수용 확인됨 / 필요 시 짧은 화면에서 내부 max-h를 해제하는 등 검토 (제안)
[낮음] [담당: tester] [분류: 테스트] frontend/e2e/departments-members-modal.spec.ts:126-129 — 주석은 "一覧領域が内部スクロールする"이나 실제로는 다이얼로그 bounding box만 확인하고 내부 스크롤(scrollHeight > clientHeight)·헤더 고정은 검증하지 않음 / assert 추가 또는 주석 정정

## 문서 갱신 예정 확인
- Fix 3: 09 §6 `dangerOutlineButtonClass`·`DepartmentDetailPanel`→`DepartmentDetailModal`, SCR-010 목록 5행 내부 스크롤·確認·詳細/編集/削除·部署詳細 모달·選択中の部署情報 삭제 — 코드와 일치
- Fix 4: SCR-010 所属社員確認 모달 구성, 09 §6 Modal `subtitle?`·DepartmentMembersModal 설명(Pagination 제거) — 코드와 일치. 현재 09 §6(266행)에는 아직 `DepartmentDetailPanel`·`Pagination` 기술이 남아 있으므로 문서 반영 단계에서 함께 갱신 필요

---

# Round 4 (수정 루프 재리뷰: frontend.md "Fix 5", test-report.md "Run 4")

대상: `frontend/src/app/(app)/admin/departments/DepartmentMembersModal.tsx`, `DepartmentMembersModal.test.tsx`, `frontend/e2e/departments-members-modal.spec.ts`(주석만), 캡처 `screenshots/run4-*.png`.
Round 3에 명시한 사용자 결정 사항은 지적 대상에서 제외.

## Round 3 지적 해소 확인
- [중간] 병렬 수집 실패 경로 테스트 → 해소. `shouldShowErrorWithoutPartialListWhenSecondPageFails`(page=2만 실패 → 재시도 표시, 「社員0」·noResult 미표시), `shouldReloadAllPagesWhenRetryClicked`(재시도 클릭 → 행 표시·재시도 소멸·apiFetch 2회·마지막 page=1), `shouldIgnoreLateNotFoundResponseAfterUnmount`(언마운트 후 404에서 onClose·onNotFound 미호출) 추가. 마이크로태스크 순서상 두 번의 `await Promise.resolve()` 후 거부 핸들러가 이미 실행된 시점에 assert하므로 `ignore` 가드를 실제로 검증함
- [낮음] 모달 표 sticky 헤더 하단선 → 해소(`border-separate border-spacing-0` + th `z-10`, 목록 표와 동일). run4-members-375/1440 캡처에서 헤더 하단선 확인
- [낮음] subtitle 오버플로 → 해소. Badge 내부 `span.truncate`+`title`, 래퍼 `[&>span]:max-w-full`로 공용 Badge 미변경. run4-members-375-longname.png에서 1행 말줄임·다이얼로그 내 수용 확인. 말줄임 시 서브타이틀의 인원수가 가려지지만 본문 「対象社員 N名」에 같은 값이 있고 `title`로 전체 문구 확인 가능 → 문제 없음
- [낮음] 중복 제거 → 해소(`flatMap` 후 id 기준 첫 항목 유지, 순서 보존)
- [낮음] 이중 스크롤 → 해소. `[@media(min-height:40rem)]:max-h-[50dvh]`로 짧은 화면에서는 모달 본문 스크롤만 사용. 임의 미디어 쿼리 값은 뷰포트 조건이라 대응 토큰이 없고 Round 3에서 허용한 `max-h-[50dvh]`와 같은 성격 → 허용. 1366x600 캡처에서 헤더·푸터 보임
- [낮음] e2e 주석 → 해소(실제 검증 범위로 정정, 선택지 중 하나)

## 새 문제
- 없음. 수정은 DepartmentMembersModal 1파일과 테스트에 한정, 공용 컴포넌트·토큰·백엔드 변경 없음. hex·rgb·인라인 style 없음, 문구는 `messages`. Run 4 전체(backend 단위 320·e2e 408, frontend 단위 642, tsc·lint·build, Playwright 37건) PASS 기록 확인

## 이슈 (Round 4)
- 없음. Round 2의 낮음 제안 2건(B29 상한 실검증, ApproverSelect Escape 복원)은 제안으로 유지

## 문서 갱신 예정 확인
- Fix 5는 화면 구성·컴포넌트 API 변경이 없어 추가 문서 갱신 항목 불필요. Round 3에 적은 09 §6(`DepartmentDetailPanel`·`Pagination` 기술 잔존) 갱신은 문서 반영 단계에서 함께 처리
