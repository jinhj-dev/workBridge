# frontend — 부서 관리 화면 재구성 (SCR-010)

## 생성·수정 파일 (frontend/)
- 수정: `src/app/(app)/admin/departments/DepartmentsView.tsx`(전면 재구성), `DepartmentFormModal.tsx`(설명·부서 책임자), 각 `.test.tsx`, `src/lib/api/types.ts`, `src/messages/ja.ts`, `src/components/leave/ApproverSelect.tsx`, `e2e/departments.spec.ts`
- 신규(화면 로컬): `DepartmentMembersModal.tsx`(+test), `DepartmentDetailPanel.tsx`, `SortableTh.tsx`, `icons.tsx`

## 구현한 화면과 사용한 공통 컴포넌트
- SCR-010 부서 관리 `/admin/departments`: `PageHeader`, `StatCard`(icon), `Card`, `SearchInput`, `Pagination`, `Badge`, `DetailTable`, `Modal`(size lg), `Skeleton/SkeletonLines`, `SectionError`, `table.ts`(thClass/tdClass), `form.tsx`(primary/secondary/primaryOutline/textButton/select/textarea/FieldError), `leaveIcons`(Plus/Info), `useApiQuery`, `useSyncedState`
- 범위 외(미구현): 이번 달 변경 카드, 상태 필터, 유효 배지

## 새 공통 컴포넌트
- 없음(`ApproverSelect`에 선택 prop 추가만). 기본 동작은 불변, LeaveApplyModal 측 테스트 전부 통과

## 설계와 다른 점
- **책임자 후보는 서버 검색**(메인 지시): 설계의 "keyword 없이 100건을 1회 조회해 클라이언트에서 필터링"을 폐기하고, 입력에 따라 API-DEPT-009 `?keyword=`를 300ms 디바운스로 호출. `ApproverSelect`에 `onSearch`(입력 중 문자를 알림, 확정·취소 시 빈 문자열)를 추가하고, 지정 시 candidates를 필터링 완료 상태로 취급하며 0건이어도 입력란을 유지(클라이언트 필터링과 "후보 없음"으로 입력란을 없애는 처리를 무효화). `useApiQuery`의 `keepPreviousData`로 재조회 중에도 입력란 유지
- 현재 책임자가 후보에 없어도 `department.manager`로 만든 값(부서명 없음)을 선택 상태로 표시. 편집에서 책임자를 바꾸지 않았으면 PATCH에 `managerId`를 보내지 않음(조회 상황이나 책임자 비활성화에 좌우되지 않도록. 변경·해제 시에는 id / null 전송)
- 100건 상한 힌트는 현재 결과가 100건일 때 표시
- 기본 정렬은 부서명 오름차순(URL 생략). API 기본인 code 순은 사용하지 않음. `sort/order`는 항상 API로 전송
- 책임자 입력은 문자 입력 시 선택이 일단 해제됨(기존 ApproverSelect 동작). 선택하지 않고 포커스를 벗어나면 미설정이 됨 -> Fix 2에서 개선

## 문서 갱신 예정
- `docs/04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md` §3·§4·§5·§6: 부서명 검색(디바운스)·열 정렬(기본 부서명 오름차순)·요약(미소속 제외)·책임자/설명 열·선택 중인 부서 정보·소속 사원 확인 모달·등록/편집 모달의 설명과 부서 책임자(등록·편집 공통, 유효 사원 서버 검색 선택, 미변경 시 전송 안 함)·검증(설명 500자)
- `docs/09_DESIGN_SYSTEM.md` §6: 화면 로컬 구성 1행(departments의 `SortableTh`·`DepartmentDetailPanel`·`DepartmentMembersModal`·`icons.tsx`), `ApproverSelect`의 `texts?`·`onSearch?` prop(토큰·규칙 변경 없음)

## impeccable 점검에서 고친 점
- 행 액션을 36px·nowrap·flex-wrap으로 하여 375px에서 수납. 날짜·건수는 tabular-nums, 설명은 truncate+title. 정렬 열은 aria-sort + 버튼, 선택 행은 aria-pressed. 조건 없을 때 [조건 초기화]는 disabled. 하드코딩 색상 없음(토큰만)

## 화면 확인
- 실시(Playwright 경유·개발 서버, dev DB): 1440 / 375 전체 화면 확인. 가로 스크롤 없음, 레이아웃 깨짐 없음(스크린샷 하단 탭·Next 배지는 fullPage 촬영 시 비친 것)
- `screenshots/departments-1440.png`, `screenshots/departments-375.png`
- 미확인: 등록/편집 모달 육안 확인(테스트만)

## 검증
- tsc / eslint 클린, vitest 45파일 624건 통과, Playwright departments 6건 통과

## 기타
- backend.md 보완 불필요. 백엔드 측 추가 수정 없음
- 개발 DB의 E2E 계정은 Playwright globalSetup으로 초기화됨(기본 동작)

## Fix 1
- 대상: DepartmentMembersModal.test.tsx > shouldCloseAndNotifyWithServerMessageWhenDepartmentNotFound (간헐 실패, 약 5/6회 재현)
- 사양 확인: design-frontend.md「404 → 모달 닫고 서버 message 토스트 + 목록 재조회」. 테스트 기대는 사양과 일치 -> 테스트 수정 없음.
- 원인: 테스트의 next/navigation mock이 렌더마다 새 router 객체를 반환 -> useApiQuery의 effect(deps에 router)가 재실행되어 404 응답이 반복 -> onError가 여러 번 호출, showToast가 토스트를 key 교체하여 findByText가 찾은 요소가 분리됨. (실서비스 useRouter는 안정 참조라 재현되지 않으나, 404 처리 중복 방어는 유효)
- 수정: `DepartmentMembersModal.tsx` 404 처리를 useRef 플래그로 1회만 실행(토스트·onClose·onNotFound 중복 방지).
- 확인: 해당 테스트 파일 8회 연속 5/5 통과, tsc·eslint·prettier 오류 없음.

## Fix 2
- 대상(review.md 낮음 3건, frontend 담당):
  1. `ApproverSelect.tsx` blur 시 책임자 의도치 않은 해제: `onSearch` 지정 시(부서 책임자 용도)에만, 입력으로 선택이 해제되기 직전 값을 ref에 보관하고, 입력 문자가 남은 채 선택 없이 포커스를 벗어나면 원래 값을 복원. 입력란을 비운 경우는 의도적 해제로 보고 유지. 확정(select) 시 ref 초기화. `onSearch` 미지정(LeaveApplyModal 승인자 선택)은 동작 불변.
  2. `icons.tsx`: 미사용 export `PersonIcon`, `CalendarIcon` 제거.
  3. 이 `frontend.md`를 한국어로 재작성(내용 변경 없음, 설계와 다른 점 마지막 항목에만 "Fix 2에서 개선" 주석 추가).
- 테스트 파일은 수정하지 않음.
- 확인: tsc 클린, eslint 클린, vitest(`src/components/leave`, `admin/departments`) 8파일 142건 통과.

## Fix 3 — 목록 스크롤·버튼·상세 모달
- 범위: SCR-010 UI 구조 변경만. DB·API·백엔드·Primary 색 변경 없음.

### 수정·생성 파일 (frontend/)
- 수정: `src/app/(app)/admin/departments/DepartmentsView.tsx`, `DepartmentsView.test.tsx`, `src/components/form.tsx`(Danger 버튼 클래스 추가), `src/messages/ja.ts`, `e2e/departments.spec.ts`, `e2e/departments-manager.spec.ts`, `e2e/departments-responsive.spec.ts`
- 신규: `DepartmentDetailModal.tsx`, `e2e/departments-list-modal.spec.ts`
- 삭제(이름 변경): `DepartmentDetailPanel.tsx` -> `DepartmentDetailModal.tsx`(내용·DetailTable 구성 재사용)

### 구현 내용
1. 목록 최대 5건 + 내부 스크롤(md 이상 표): 래퍼 `max-h-76`(304px = 헤더 44 + 행 52x5), `overflow-auto`, 표는 `border-separate border-spacing-0`, `thead`의 th를 `sticky top-0 bg-white`. 5건 이하는 스크롤바 없음. 페이지네이션(20건/페이지)·검색·정렬은 그대로, 높이만 제한
2. 삭제 버튼: `form.tsx`에 `dangerOutlineButtonClass`(border/text `danger-100`, hover `danger-30`, disabled은 primaryOutline과 동일) 추가. 새 색 토큰 없음(기존 `--color-danger-100/30`)
3. 소속 사원 수 옆 `確認` 버튼(`18名 [確認]`): 기존 DepartmentMembersModal을 부서 ID로 열기. 0명도 사용 가능
4. 액션 `[詳細][編集][削除]`: 旧 `所属社員確認` 버튼 제거. 시스템 부서(未所属)는 `詳細`만. 버튼 높이 36·간격 8로 통일
5. `部署詳細` 모달(Modal size lg): 部署名(아이콘+이름)·部署コード·部署責任者·所属社員数·(무효 사원 있을 때)無効の社員数·説明·更新日. 하단 `閉じる` / `この部署を編集`(시스템 부서는 후자 없음). 편집 클릭 시 상세 모달을 닫고 기존 편집 모달 열기. 표시 데이터는 목록 행 데이터 재사용(추가 API 없음)
6. 하단 `選択中の部署情報` 제거(selectedId·행 강조·SelectButton 제거). 이름 셀은 단순 표시(`DepartmentName`). 하단 여백은 gap-6 한 곳뿐이라 추가 조정 불필요

### 사용한 시스템 컴포넌트
Modal(size lg), DetailTable/DetailTableRow, Badge, Card, SearchInput, Pagination, `form.tsx`(secondary/primaryOutline/**dangerOutline**/modalPrimary/modalSecondary), `table.ts`

### 화면 리스트(SCR-010)와 다른 점 / 판단
- 상세 모달 본문은 요청의 5항목에 기존 패널에 있던 部署コード와 無効の社員数(0이면 숨김)를 유지(기존 구성 재사용 지시에 따름)
- 모바일 카드 목록은 내부 스크롤을 적용하지 않음: 카드 1장이 약 200px로 5장이면 1000px 가까워 내부 스크롤이 터치 스크롤과 충돌(스크롤 트랩)하고 화면이 좁아 비효율. 모바일은 기존처럼 페이지 스크롤 + 20건 페이지네이션. 확인 버튼·`詳細/編集/削除`·상세 모달은 카드에도 동일 적용
- 확인 버튼은 `secondary`(White) 스타일, `詳細`도 secondary(요청의 Secondary/Outline)

### 문서 갱신 예정
- `docs/09_DESIGN_SYSTEM.md` §6: `form.tsx`의 `dangerOutlineButtonClass`(09 §3 Danger 버튼 구현) 기록. departments 화면 로컬 구성에서 `DepartmentDetailPanel` -> `DepartmentDetailModal`로 변경
- `docs/04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md`: 목록 5행 높이 내부 스크롤·헤더 고정, 소속 사원 수 옆 確認, 액션 `詳細/編集/削除`(削除 Danger), `部署詳細` 모달, 「選択中の部署情報」 삭제
- 08 테스트 계획: 위 사양 TC 갱신(필요 시)

### impeccable 점검
- sticky 헤더의 하단 선이 스크롤 시 사라지는 문제 방지 위해 border-collapse -> border-separate. 모든 행 버튼을 같은 높이(36)·nowrap으로 통일. 상태(hover/focus/disabled)는 기존 버튼 패턴 유지, Danger focus ring도 danger-100
- 알려진 점: danger-100(#f0142f) 흰 배경 대비는 약 4.3:1로 AA 경계(굵은 14px 텍스트). 새 토큰 금지 규칙에 따라 기존 값 사용. 필요하면 디자인 측에서 danger 토큰 조정 검토

### 검증
- tsc 클린, eslint 클린, vitest 45파일 635건 통과(DepartmentsView 테스트: 選択中 패널 관련을 상세 모달 사양으로 갱신, 위험 스타일·시스템 부서 상세·編集 전환 추가. assertion 약화 없음)
- Playwright(개발 서버·dev DB): departments / departments-manager / departments-responsive / departments-list-modal 전부 통과. 신규 spec은 API로 임시 부서를 만들고 finally에서 API로 삭제(기존 부서 변경 없음)
  - 5건 스크롤 없음 / 7건 내부 스크롤(clientHeight<=304, 보이는 행 5) / 스크롤 시 헤더 고정·window.scrollY 불변 / 確認 정확한 부서 모달·닫은 뒤 스크롤 위치·검색어 유지 / 정렬 후 전체 8행 유지 / 削除 computed color·border = rgb(240,20,47) / 詳細 모달 -> 編集 전환 / 하단 패널 없음 / 375px 가로 스크롤 없음·버튼 화면 내
- 스크린샷: `screenshots/fix3-scroll-top-1440.png`, `fix3-scroll-bottom-1440.png`, `fix3-detail-modal-1440.png`, `fix3-cards-375.png`, `fix3-detail-modal-375.png`
- 참고: 개발 서버 콜드 상태에서 실행 첫 테스트가 로그인 5초 타임아웃으로 1회 실패한 적이 있음(재실행 시 통과, 이번 변경과 무관한 환경 요인)

## Fix 4 — 所属社員確認 모달

참조: refs/02-members-modal.png. 사용자 결정(백엔드·API·DB 변경 금지, 3열만)을 따름.

- 수정 파일: `frontend/src/app/(app)/admin/departments/DepartmentMembersModal.tsx`(재작성) / `components/Modal.tsx`(`subtitle?` prop 추가) / `messages/ja.ts`(membersModal) / 테스트 `DepartmentMembersModal.test.tsx`·`DepartmentsView.test.tsx`(제목 사양 변경 반영) / e2e `departments-list-modal.spec.ts`(heading 기대값), 신규 `e2e/departments-members-modal.spec.ts`
- 구현: 헤더(아이콘·「所属社員確認」·`部署名 / 所属社員 N名` info 배지·X) / 「対象社員 N名」 + 「社員名で検索」(SearchInput) / 표 3열(社員番号·氏名(아바타 아이콘)·部署(대상 부서명 Badge info)) / 「閉じる」. 입점일·役職·連絡先 열 없음(DB 컬럼 없음, 빈 열·placeholder 없음)
- 사용한 시스템 컴포넌트: Modal(icon·size lg·신규 subtitle), SearchInput, Badge(info), table.ts(thClass·tdClass), SkeletonLines, SectionError, modalSecondaryButtonClass, 기존 아이콘(PeopleIcon·UserCircleIcon). 새 색 토큰 없음
- 검색 대상 범위: API-DEPT-008에 이름 검색 파라미터가 없어 클라이언트 필터. `limit=100`(API 상한) 첫 페이지 후 `totalPages`만큼 나머지 페이지를 병렬 취득해 부서 전체 소속 활성 사원을 대상으로 함(예: 24명 부서는 1요청, 250명이면 3요청). 필터는 공백(半角·全角)·대소문자 무시 부분 일치(「山田太郎」→「山田 太郎」). 한계: 모달을 연 시점의 스냅샷(열린 동안 변경은 반영 안 됨), 수천 명 규모면 요청 수 증가(현재 규모에서는 문제 없음), 비활성 사원은 API가 제외
- 사원 수: 취득한 전체 목록 길이(검색과 무관). 취득 전에는 목록의 memberCount로 대체 표시
- 상태: 로딩·에러·빈 부서·검색 결과 없음 모두 표 헤더 유지(행 안에 표시). 직원 0명 부서도 열림. 404는 기존대로 토스트·닫기·목록 재취득
- 목록 영역: `max-h-[50dvh]` 내부 스크롤, 헤더 sticky. 모달은 Modal 기본(dialog 포커스 트랩·Esc·X·오버레이). 모달 닫힘 중에는 본문을 렌더하지 않음(다른 `table` 셀렉터 충돌 방지)
- 화면 리스트와 다른 점: 요청서의 6열 중 입사일·役職·連絡先 제외(사용자 결정). 제목이 「{部署名}の所属社員」에서 「所属社員確認」+서브타이틀로 변경
- 문서 갱신 예정: `docs/04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md` 所属社員確認 모달 구성(제목·배지·検索·3열·내부 스크롤·전 페이지 취득 후 클라이언트 검색) / `docs/09_DESIGN_SYSTEM.md` §6 Modal에 `subtitle?`(タイトル直下の補足) 추가, DepartmentMembersModal 설명 갱신(Pagination 제거) / 役職·連絡先 DB 추가 시 열 추가는 별도 작업
- impeccable 점검: 이미지의 淡色 배지·아바타를 기존 info 토큰으로 대응, 행은 기본 table 높이(52) 유지(컴팩트 요구는 내부 스크롤로 5~8행 노출), 검색창은 모바일에서 전폭. 점검 중 닫힌 dialog에 table이 남아 기존 e2e 셀렉터가 깨지는 문제를 발견해 본문을 열릴 때만 렌더하도록 수정
- 검증: tsc·eslint 클린, vitest 45파일 639건 통과(신규: 전 페이지 취득·검색 필터·총수 유지·결과 없음·로딩 중 헤더 유지), Playwright departments 5개 spec 25건 통과(신규 3건: 실데이터 開発部 24名 표시·검색·공백 무시·새로고침 없음(window 마커)·결과 없음·Esc·빈 부서(API로 생성 후 삭제)·375px 수용). 스크린샷 `screenshots/fix4-members-1440.png`, `fix4-search-1440.png`, `fix4-no-result-1440.png`, `fix4-empty-1440.png`, `fix4-members-375.png`, `fix4-no-result-375.png`
- 참고: 검색창(type=search)에 문자가 있을 때 첫 Esc는 브라우저가 입력을 지우고 두 번째 Esc로 모달이 닫힘(브라우저 기본 동작, 공용 SearchInput 미변경)

## Fix 5 (review Round 3 낮음 4건, 담당 frontend)

수정 파일: `frontend/src/app/(app)/admin/departments/DepartmentMembersModal.tsx` 만. 백엔드·테스트·토큰 변경 없음.
- 표 헤더: `border-collapse` -> `border-separate border-spacing-0`, th에 `z-10` 추가(목록 표와 동일, 스크롤 시 하단선 유지)
- subtitle 오버플로: Badge 안 텍스트를 `truncate`+`title` span으로 감싸고 래퍼에 `[&>span]:max-w-full` 적용(공용 Badge 미변경). 긴 부서명은 1행 말줄임
- 중복 제거: 병렬 수집 결과를 `flatMap` 후 id 기준 첫 항목만 남김(1줄 필터)
- 이중 스크롤: 내부 `max-h-[50dvh]`를 `[@media(min-height:40rem)]:max-h-[50dvh]`로 제한. 짧은 화면(가로 모바일 등)에서는 모달 본문 스크롤만 사용. 375x667 세로는 기존 동작 유지(높이 667 >= 640)
- 수정하지 않은 항목: 없음(tester 담당 2건은 범위 외)
- 검증: tsc 클린, eslint 클린(departments), vitest departments 3파일 58건 통과. 화면 확인: 생략(도구 없음)
