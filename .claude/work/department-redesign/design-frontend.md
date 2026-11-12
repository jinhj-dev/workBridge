# design-frontend — 부서 관리 화면 재구성 (SCR-010)

## 참조 문서
- `docs/04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md` 전체(§5 등록·수정·삭제 동작, §6 검증, §8 에러 처리는 **그대로 유지**)
- `docs/03_SCREEN_LIST.md` 공통 UI 규칙(상태 처리, 목록 URL Query 유지)
- `docs/09_DESIGN_SYSTEM.md` §2(토큰), §3(Button·Table), §6(구현 컴포넌트)
- 레이아웃 참고: `.claude/work/department-redesign/refs/01-department-management.png` — **배치만 참고**, 색·radius·그림자·글자 크기는 09 토큰과 기존 컴포넌트 기준. 이미지의 가상 데이터·로고·아바타 사진은 가져오지 않음

## 화면
- SCR-010 部署管理 · `/admin/departments` · 관리자 (라우트·page.tsx·사이드바 변경 없음)

## 구성 (위에서 아래, 확정 Q1-C: 説明·部署責任者 포함)
1. **헤더**: `PageHeader({title:'部署管理', icon, action})`. action = [部署を追加] `primaryButtonClass`(+ `PlusIcon`, 높이 40). 헤더 아래 설명 `<p>` 「部署情報の確認・追加・編集・削除を行います。」(14/20 `general-80`). `PageHeader`는 수정하지 않는다
2. **요약 카드**: `StatCard` icon 변형 2개(`sm` 이상 2열, 미만 1열 또는 2열 그리드) — 部署数 `unit='部署'`(**未所属 제외**, API 값 그대로 표시), 所属社員数 `unit='名'`. API-DEPT-007 별도 조회(`useApiQuery`). 로딩 `Skeleton`, 실패 시 수치 자리에 `messages.common.noValue`(카드 영역만 실패, 목록과 독립)
3. **部署一覧** `Card({title, icon, action})`
   - action 영역: `SearchInput`(placeholder 「部署名で検索」) + `md` 미만에서만 정렬 `<select>`(`selectClass`) + [条件をクリア] `secondaryButtonClass`(높이 44). 헤더가 넘치면 Card의 flex-wrap으로 다음 줄
   - `md` 이상 표: 열 部署名(이름 + 아래 줄 코드 12/16 `general-80`, 未所属은 `Badge neutral` 「システム」) / 部署責任者(이름, 없으면 `messages.common.noValue`) / 所属社員数(우측, 「N名」) / 説明(1줄 `truncate` + `max-w`, 전체는 `title` 속성, 없으면 noValue) / 更新日 / アクション(우측). 헤더는 `thClass`(또는 SCR-004와 같은 `bandThClass`/`bandTdClass` 중 하나로 통일), 셀 `tdClass`
   - 정렬 가능한 열(部署名·所属社員数·更新日): `<th aria-sort>` 안에 `<button>`(라벨 + ▲▼ 아이콘). 같은 열 재클릭 시 asc↔desc, 다른 열 클릭 시 기본 방향(部署名 asc, 所属社員数 desc, 更新日 desc). 화면 로컬 컴포넌트 `SortableTh`
   - 행 액션: [所属社員確認] `secondaryButtonClass` / [編集] `primaryOutlineButtonClass` / [削除] `secondaryButtonClass`(+휴지통 아이콘). 높이 32~36, `whitespace-nowrap`. 未所属 행은 [所属社員確認]만. 09 §3 Danger 버튼은 미구현이므로 새 클래스를 만들지 않는다
   - 행 선택: 部署名 셀의 `<button aria-pressed>`(클릭 시 선택), 선택 행 배경 `bg-primary-30`
   - `md` 미만: 기존과 같은 `<ul>` 카드 목록(이름·코드 / 部署責任者 / 인원·更新日 / 説明 `line-clamp-2`(없으면 행 생략) + 버튼 3개 `flex-wrap`). 카드 탭(이름 버튼)으로 선택. 긴 설명·이름은 `break-words`로 375px 안에 수용
   - 표 아래 안내 박스(`bg-general-30`, radius 8, `InfoIcon`): 「※ 社員は1つの部署にのみ所属します。」「※ 所属社員がいる部署は削除できません。」「※ 部署の階層（親子関係）は使用しません。」 + 기존 `memberCountNote`
   - `Pagination`(20건) 유지
4. **選択中の部署情報** `Card({title, icon, action})`: action = [この部署を編集] `textButtonClass`(未所属이면 숨김). 본문 `md` 이상 2열(왼쪽: 건물 아이콘 원형 `bg-primary-30` + 부서명 Bold + 未所属이면 「システム」 배지 / 오른쪽: `DetailTable`), 미만 세로
   - `DetailTable` 행: 部署コード / 部署責任者(「{name}（{empId}）」, 없으면 「未設定」) / 所属社員数(「N名」) / 無効の社員数(`inactiveMemberCount > 0`일 때만) / 説明(`whitespace-pre-line break-words`, 없으면 noValue) / 更新日
   - 목록 0건·로딩·에러면 카드 자체를 숨김

## 등록·수정 모달 (`DepartmentFormModal` 확장, 기존 동작·검증 유지)
- 공통: 部署コード·部署名 아래에 **説明** `<textarea>`(`textareaClass`, `labelClass`, 라벨 「説明（任意）」, `maxLength` 없이 클라이언트 검증 500자, 줄바꿈 허용). 에러는 `FieldError`(field `description`)
- 등록·수정 공통: **部署責任者（任意）** — 기존 `components/leave/ApproverSelect.tsx`(09 §3 Autocomplete 상당, 이름·사원번호 클라이언트 필터 combobox) 재사용. 후보는 소속 무관 전체 활성 사원(R1)이라 부서 선택 `Select`가 아니라 검색 선택이 맞다
  - 공통 컴포넌트 변경(최소): 선택 prop `texts?: { placeholder, listLabel, empty, noMatch, loadError }` 추가, 생략 시 기존 `messages.leaves.approverSelect` 그대로(LeaveApplyModal 영향 없음, 기존 테스트 통과 확인). 옵션 표시 「{name} ({empId}) / {departmentName}」는 그대로 사용
  - 후보: 모달이 열려 있는 동안 API-DEPT-009 `/admin/departments/manager-candidates`(keyword 없이 1회, `useApiQuery`). 로딩·실패(재시도 버튼)·0명 표시는 ApproverSelect 기존 동작 + 이 화면 문구. 실패해도 説明·이름 등 다른 항목 저장은 가능(책임자는 현재 값 유지 = 수정 시 managerId 미전송)
  - 응답이 100건(상한)이면 힌트 「社員番号順の先頭100名を表示しています。」(현재 규모에서는 표시되지 않음)
  - 초기값(수정): 후보 중 `manager.id` 일치 항목, 없으면 `manager`의 id·empId·name으로 만든 값(departmentName 빈 값 → 부서 표기 생략)
  - 해제: 입력란을 비우면 `null`(=未設定). 힌트 「入力欄を空にすると未設定になります。」
- 전송: POST `{code,name,description,managerId}`, PATCH `{code,name,description,managerId}`(description 빈 문자열 → null, 책임자 미선택 → null). 후보 조회 실패 시 PATCH는 managerId 생략, POST는 null
- 에러: `INVALID_MANAGER` → 책임자 `FieldError`(서버 message) + 후보 재조회. 그 외는 기존 처리
- 모달 폭: 항목이 늘어나므로 `Modal size='lg'` 검토(구현자 판단, 375px에서 가로 스크롤 없음)

## 하지 않는 것
- 今月の変更 카드, 状態 필터·有効 배지, 부서 코드 검색 입력, 책임자로 검색·정렬

## 상태 흐름
- URL Query: `name`, `sort`, `order`, `page`(기본값은 생략). 이전 `code` Query는 읽지 않는다(API에는 남아 있음)
- 검색: `SearchInput` 입력 → `LeaveCalendarView`와 같은 디바운스(`DEBOUNCE_MS`, `useSyncedState` + `router.replace`)로 `name` 반영, page 1로
- 정렬 변경: `router.push`, page 1로. [条件をクリア]: `name`·`sort`·`order`·`page` 모두 제거
- 선택: `selectedId` 로컬 state. 현재 페이지에 없으면 첫 행을 선택으로 간주(파생 계산, effect 불필요)
- 등록·수정 성공 → 목록·요약 재조회(`reload`), 삭제 성공 → 기존 `handleDeleted`(마지막 1건이면 이전 페이지) + 요약 재조회
- [編集] (행·상세 카드 공통) → 기존 `DepartmentFormModal`(key 증가). [削除] → 기존 `requestDelete`(memberCount > 0이면 토스트 「所属する社員が存在するため、部署を削除できません。」, API 호출 없음)
- [所属社員確認] → `DepartmentMembersModal`(신규)

## DepartmentMembersModal (신규, 화면 로컬)
- `Modal size='lg'`, 제목 「{部署名}の所属社員」, footer [閉じる] `modalSecondaryButtonClass`
- 열린 동안 API-DEPT-008 `?page&limit=20` 조회(`useApiQuery`, 닫히면 path null). 표 社員番号·氏名(`thClass`/`tdClass`), 모달 내부 `Pagination`
- 로딩 `SkeletonLines`, 실패 `SectionError`, 0건 「所属している社員はいません。」, 404 → 모달 닫고 서버 message 토스트 + 목록 재조회

## 입력 검증
- 검색어 `maxLength=100`, 앞뒤 공백 제거 후 반영. 정렬 Query는 허용 값 외이면 기본값으로 해석
- 등록·수정: 기존 code·name 검증 + 説明 앞뒤 공백 제거 후 500자 이하(「説明は 500 文字以内で入力してください。」). 책임자는 후보 선택(또는 비움)만 가능해 클라이언트 형식 검증 없음(서버 INVALID_MANAGER로 최종 판단)

## 로딩·에러
- 목록: `SkeletonLines` / `SectionError` / Empty 「条件に一致する部署がありません。」(기존)
- 요약: 영역별 독립(위 2번)

## 반응형
- `lg` 미만은 하단 탭이 있으므로 기존 AppShell 여백 사용. `md` 미만은 카드 목록 + 정렬 select, 버튼은 `flex-wrap`으로 화면 밖으로 나가지 않게. 375px에서 가로 스크롤 없음
- `md`~`lg`에서 표가 넘치면 표 래퍼에 `overflow-x-auto`(説明 열은 `truncate`+`max-w`로 폭 제한, 표 래퍼 안에서만 가로 스크롤 허용·페이지 가로 스크롤 금지)

## 호출 API
- GET `/admin/departments?name&sort&order&page&limit=20` (API-DEPT-002, sort·order 추가)
- GET `/admin/departments/summary` (API-DEPT-007 신규) → `{departmentCount, memberCount}`
- GET `/admin/departments/:id/members?page&limit=20` (API-DEPT-008 신규) → Page<`{id,empId,name}`>
- GET `/admin/departments/manager-candidates` (API-DEPT-009 신규) → `UserSummary[]`(최대 100, 기존 타입 재사용)
- POST `/admin/departments` `{code,name,description,managerId}` / PATCH `/admin/departments/:id` `{code,name,description,managerId}`(에러 `INVALID_MANAGER` 추가) / DELETE 그대로
- `DepartmentDetail`에 `description: string | null`, `manager: {id,empId,name} | null` 추가(backend.md 참조)

## 문구 (`messages.departments`에 추가·변경, 일본어)
- `create` 「新規登録」→「部署を追加」, `description` 「部署情報の確認・追加・編集・削除を行います。」, `searchPlaceholder` 「部署名で検索」, `clear` 「条件をクリア」, `summary.departments` 「部署数」·`unitDepartments` 「部署」, `summary.members` 「所属社員数」·`unitPeople` 「名」, `viewMembers` 「所属社員確認」, `viewMembersLabel(name)` 「部署「{name}」の所属社員を確認」, `selectedTitle` 「選択中の部署情報」, `editSelected` 「この部署を編集」, `sort.*`(정렬 select 옵션·`aria-label`), `notes`(안내 3줄), `membersModal.*`(제목·社員番号·氏名·빈 문구·閉じる), `columns.manager` 「部署責任者」·`columns.description` 「説明」, `managerUnset` 「未設定」, `form.description*`(라벨·검증), `form.manager*`(라벨 「部署責任者（任意）」·해제 힌트·100명 상한 힌트, ApproverSelect `texts`용 placeholder 「氏名または社員番号で検索」·listLabel 「部署責任者の候補」·empty 「選択できる社員がいません。」·noMatch 「該当する社員がいません。」·loadError 「社員の候補を読み込めませんでした。」). 기존 `searchTitle`·`search`·`code` 검색 라벨 중 안 쓰게 되는 키는 삭제

## 파일
수정
- `frontend/src/app/(app)/admin/departments/DepartmentsView.tsx` — 전면 재구성(검색·정렬·선택·요약)
- `frontend/src/app/(app)/admin/departments/DepartmentsView.test.tsx`
- `frontend/src/lib/api/types.ts` — `DepartmentDetail`(description·manager), `DepartmentSummary`, `DepartmentMember`
- `frontend/src/app/(app)/admin/departments/DepartmentFormModal.tsx`(+ `.test.tsx`) — 説明·部署責任者 항목
- `frontend/src/messages/ja.ts`
- `frontend/src/components/leave/ApproverSelect.tsx` — 선택 prop `texts`만 추가(기본 동작 불변). `LeaveApplyModal.test.tsx` 회귀 확인
- `frontend/e2e/departments.spec.ts` — 검색(부서명)·정렬·所属社員確認·선택 상세, 375/1440 캡처
신규(화면 로컬, `app/(app)/admin/departments/`)
- `DepartmentMembersModal.tsx` (+ `.test.tsx`)
- `DepartmentDetailPanel.tsx` — 選択中の部署情報 카드
- `SortableTh.tsx` — 정렬 헤더(이 화면 전용)
- `icons.tsx` — 건물·사원·연필·휴지통·정렬 화살표 인라인 SVG(대시보드 `icons.tsx`와 같은 방식: 24 viewBox·`currentColor`·선 1.75·`aria-hidden`). `navIcons`는 셸 전용이라 import하지 않는다
재사용(변경 없음)
- `DepartmentDeleteModal.tsx`, `form.tsx` `textareaClass`, `components/PageHeader.tsx`, `StatCard.tsx`, `Card.tsx`, `SearchInput.tsx`, `DetailTable.tsx`, `Badge.tsx`, `Pagination.tsx`, `Modal.tsx`, `Skeleton.tsx`, `SectionError.tsx`, `table.ts`, `form.tsx`, `components/leave/leaveIcons.tsx`(`PlusIcon`·`InfoIcon`), `lib/useSyncedState.ts`, `lib/api/useApiQuery.ts`, `lib/format.ts` `formatTokyoDate`

## 문서 갱신 예정(frontend.md에 기록)
- 04 SCR-010 §3·§4·§5·§6(검색·정렬·요약(未所属 제외)·책임자·설명 열·선택 상세·所属社員 모달·등록/수정 모달 항목(책임자는 등록·수정 공통, 전체 활성 사원 검색 선택)·검증), 09 §6 화면 로컬 구성 1줄 + ApproverSelect `texts` prop(규칙·토큰 변경 없음)
