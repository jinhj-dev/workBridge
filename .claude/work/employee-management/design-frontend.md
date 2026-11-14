# design-frontend — SCR-006 社員管理 재설계 + 役職確認·社員追加 모달

## 참조 문서 (해당 섹션만)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-006_USER_LIST.md` 전체(이번 설계로 대체되는 부분은 아래 결정 우선), `SCR-007_USER_DETAIL.md` §3.1·§5 수정·§8(편집·비활성화 문구)
- `docs/03_SCREEN_LIST.md` 공통 UI 규칙(상태 처리·검색 조건 URL 유지)
- `docs/09_DESIGN_SYSTEM.md` §2.1 색상, §5 8·9·10·11항, §6 공용 컴포넌트
- `docs/UI_MODAL_PATTERNS.md` §1 공통 구조·단계 전환 규칙, §4 유형별 / `docs/UI_BUTTON_PATTERNS.md`
- API 상세: `design-backend.md`의 「API 계약」 섹션
- 패턴 참고 코드: `frontend/src/app/(app)/admin/departments/DepartmentsView.tsx`(URL Query·디바운스 검색·표/카드 전환·행 액션), `DepartmentFormModal.tsx`, `DepartmentMembersModal.tsx`, `DepartmentDeleteModal.tsx`

## 화면
- SCR-006 社員管理 `/admin/users` (관리자, 기존 사이드바 링크 `messages.nav.adminUsers`)
- 모달(같은 페이지): 役職確認, 社員追加, 社員詳細, 社員編集, 社員削除(확인)
- SCR-007 `/admin/users/:id` 페이지는 만들지 않는다(상세·편집은 모달. plan.md 결정 5)

## 레퍼런스 우선 원칙과 예외
- 레이아웃·간격·radius·배지·표·페이지네이션 외형은 레퍼런스 이미지를 따른다
- 단, 사용자가 확정한 공통 패턴은 유지(화면 단위 예외 금지 규칙): 모달 외형(아이콘 박스 `primary-30` rounded-md, 제목·X·footer 구분선 — UI_MODAL_PATTERNS), 버튼 variant·size(UI_BUTTON_PATTERNS), Primary 색. 이미지의 淡紫 원형 아이콘은 재현하지 않는다
- 「社員ID」 표기는 이 화면 한정으로 레퍼런스를 따른다(로그인 등 다른 화면은 「社員番号」 유지)

## 1. 社員管理 페이지 (`UsersView`)
구성(위→아래, 컨테이너는 기존 `(app)` 레이아웃 폭)
1. `PageHeader` — icon 人物群(`PeopleIcon` 신규 users/icons), title 「社員管理」, **신규 prop `description`** 「社員情報の確認・追加・編集・削除を行います。」, action: [役職確認] `primaryOutline` lg + 組織図 아이콘, [社員追加] `primary` lg + `PlusIcon`. md 미만은 action이 제목 아래 줄로 내려가고 2버튼 균등(`PageHeader`는 `flex-wrap` 허용으로 변경 — 기존 사용처 영향 없음 확인)
2. 요약 `StatCard` 3개(grid: md 이상 3열, 미만 1열 또는 3열 compact — 390/375에서 넘치지 않을 것): 「社員数」 `employeeCount` 名(tone primary, 人物 아이콘) / 「管理者数」 `adminCount` 名(tone primary, Shield 아이콘) / 「今月の入社」 `hiredThisMonthCount` 名(**신규 tone `violet`**: `from-white to-violet-30`, 人物+ 아이콘). 로딩 `Skeleton`, 실패 시 값 「—」 + 카드 영역 아래 `SectionError`
3. `Card` title 「社員一覧（全 {totalCount} 名）」 icon List
   - 필터 행: `SearchInput`(label 「社員検索」 sr-only 가능, placeholder 「社員ID・氏名・メールアドレスで検索」, 300ms 디바운스) / 라벨 붙은 select 3개 `selectClass`: 「所属部署」(すべて + API-DEPT-001), 「役職」(すべて + API-JOB-001), 「ステータス」(すべて / 在籍中 / 入社予定 / 無効) / [クリア] `secondary` md(모든 조건 초기화). lg 이상 1행, md 2행(검색 전체폭 + select 3 + クリア), sm 미만 세로 스택(각 전체폭)
   - 검색·필터 변경 시 page 1. 조건은 URL Query(`keyword`, `departmentId`, `jobTitleId`, `status`, `page`)에 유지(DepartmentsView 방식). 기본값은 Query 생략
   - API 호출: `GET /admin/users?keyword&departmentId&jobTitleId&status&page&limit=10`
   - 표(lg 이상): 열 社員ID / 氏名(원형 아이콘 + 굵은 이름) / 役職(`JobTitleBadge`, 미설정 「—」) / メールアドレス(미설정 「—」) / 所属部署 / 入社日(`YYYY/MM/DD`) / ステータス(`EmploymentStatusBadge`) / 操作. 헤더 행 배경 `bandThClass` 계열(淡い紫青 — 기존 `primary-30`/`violet-30` 토큰 중 레퍼런스에 가까운 것, 신규 토큰 없이)
   - lg 미만: 행을 카드 목록으로(DepartmentsView 모바일 카드 방식): 이름+배지, 社員ID·部署·メール·入社日 2열, 하단 액션. 가로 overflow 없음
   - 操作: [詳細] `secondary` sm + Eye 아이콘, [編集] `primaryOutline` sm + `PencilIcon`, [削除] `dangerOutline` sm `iconOnly` + `TrashIcon`(aria-label 「{name}を削除」). 각 버튼 aria-label에 이름 포함(「{name}の詳細」「{name}を編集」). `INACTIVE` 행은 [削除] 숨김
   - 하단: `Pagination`에 **신규 prop `pageSize`** → 좌측 문구 「全 {total} 件中 {from} – {to} 件を表示」(미지정 시 기존 「全 N 件」 그대로). md 미만 `compact`
   - 상태: 로딩 `SkeletonLines`, Empty 「条件に一致する社員はいません。」, 실패 `SectionError`(재시도)
4. 데이터 갱신: 등록·편집·삭제·직책 변경 성공 시 목록·요약·(직책 변경 시) 직책 목록을 재조회(`useApiQuery` refetch). 전체 리로드 없음

## 2. JobTitleBadge (공용, 신규 `components/JobTitleBadge.tsx`)
- `JobTitleBadge({ jobTitle }: { jobTitle: {name, tone} | null })` → `Badge shape="pill"`, null이면 「—」
- 같은 파일에 `JOB_TITLE_TONES`(팔레트 표시 순서·라벨·Badge variant·스와치 클래스의 단일 정의) export:

| tone | 라벨(aria) | Badge variant | 스와치 |
|---|---|---|---|
| VIOLET | 紫 | `violet` | `bg-violet-100` |
| BLUE | 青 | `info` | `bg-primary-100` |
| GRAY | グレー | `neutral` | `bg-general-60` |
| LAVENDER | 薄紫 | **신규 `lavender`** | **신규 `bg-lavender-100`** |
| GREEN | 緑 | `positive` | `bg-success-100` |
| YELLOW | 黄 | **신규 `yellow`** | **신규 `bg-yellow-100`** |
| ORANGE | オレンジ | `caution` | `bg-warning-100` |
| PINK | ピンク | `pink` | **신규 `bg-pink-100`** |

- 신규 토큰(globals.css `@theme`): `lavender-30`(배경)·`lavender-110`(글자)·`lavender-100`(스와치), `yellow-30`·`yellow-110`·`yellow-100`, `pink-100`. 값은 레퍼런스에 맞추되 배지 글자/배경 대비 WCAG AA 4.5:1 이상(실측 기록). 기존 토큰 값은 바꾸지 않는다
- `DepartmentMembersModal`의 로컬 `JOB_TITLE_TONE_BADGE`·`JobTitleBadge`를 삭제하고 공용으로 교체(배지 모양 rounded → pill로 통일됨 — 의도된 변경). 화면별 색 하드코딩 금지

## 3. 役職確認 모달 (`JobTitlesModal`, `Modal` size lg, 단계형)
- icon Tag, title 「役職確認」, description 「役職の確認・追加・編集・削除を行います。」
- 단계 `list` / `form`(create|edit) / `confirmDelete` — 같은 dialog에서 본문·footer만 교체(중첩 dialog 금지)
- list: 소제목 「登録されている役職（{n}件）」, 표 2열(「役職名」 `JobTitleBadge` / 「操作」 [編集] `secondary iconOnly` sm Pencil(aria 「{name}を編集」), [削除] `dangerOutline iconOnly` sm Trash(aria 「{name}を削除」)), 표 아래 중앙 [追加] `primary` md + Plus. 0건 「登録されている役職はありません。」. footer [閉じる] `secondary`
- form: 목록은 위에 그대로(행 버튼 disabled), 아래 입력 영역
  - 「役職名」* 입력(`inputClass`, 50자, `CharCount`), 필수 오류 「役職名を入力してください。」
  - 패널(淡い背景 `general-30`, radius) 「色を選択」(Palette 아이콘) + 설명 「役職の追加・編集時に、役職の色を選択できます。」
    - `JobTitleTonePicker`(신규, users 폴더): `role="radiogroup"` aria-label 「色」, 8개 원형 스와치(각 `role="radio"` aria-label=라벨, 선택 시 체크 아이콘, 화살표 키 이동). 추가 시 초기 미선택 → 저장 시 미선택이면 「色を選択してください。」
    - 세로 구분선 오른쪽(모바일은 아래) 「プレビュー」 + `JobTitleBadge`(입력 이름·선택 색 실시간, 이름 비면 「役職名」 placeholder 텍스트)
  - `Notice info` 「選択した色は、システム内でその役職が表示されるすべての箇所でカプセルバッジの色として使用されます。」
  - footer [キャンセル] `secondary`(list로) [保存] `primary` submit `loading`
  - 성공: list로 복귀 + 토스트 「役職を追加しました。」/「役職を更新しました。」, 목록 재조회 + 부모에 `onChanged()`(사원 목록 재조회 → 배지 색 즉시 반영)
  - 409 DUPLICATE_JOB_TITLE_NAME → 이름 필드 아래 서버 message. 404 → 목록 재조회 + 토스트 「役職が見つかりません。」
- confirmDelete: 본문 「「{name}」を削除しますか？」, footer [キャンセル]（list로, data-autofocus）[削除] `danger`. 409 JOB_TITLE_IN_USE → `Notice error` 「この役職を使用している社員が存在するため、削除できません。」(단계 유지, 削除 버튼 disabled). 성공 토스트 「役職を削除しました。」
- 모바일: 배지와 아이콘 버튼이 겹치지 않게 행 `flex justify-between gap-2`, 배지 `min-w-0 truncate`. 본문만 스크롤
- 레퍼런스 footer의 「保存」은 form 단계에서만 표시(일괄 저장 없음, 각 조작은 즉시 API 반영)

## 4. 社員追加 모달 (`UserCreateModal`, `FormModal` lg — 단일 폼, 완료 단계 없음)
- icon 人物, title 「社員追加」, description 「新しい社員情報を登録します。」
- 배치 `FormTable`/`FormTableRow`(md 이상 라벨 좌측, 미만 세로 — 기존 FormTable 동작)
  1. 「社員ID」*: `EmpIdModeField`(신규, users 폴더) — 라디오 카드 2개 「自動生成」(기본)·「直接入力」, `role="radiogroup"`, 선택 카드 `violet-30` 배경
     - 自動生成: 아래에 예정 번호 `ReadOnlySummary`가 아닌 **읽기 전용 표시**(입력처럼 보이는 회색 박스, `aria-readonly`, 값 = API-USER-007 `empId`). 로딩 중 「取得中…」, 조회 실패 시 「—」(등록은 가능 — 번호는 서버가 확정), `empId: null`이면 「自動生成できません。直接入力してください。」(FieldError) — 이때 [追加する]는 直接入力으로 바꿔야 진행. `FieldHint`(info 아이콘) 「社員IDは自動で連番（5桁の数字）で生成されます。登録時に確定します。」
       - 등록 응답 409 EMP_ID_EXHAUSTED → 社員ID 필드 오류(서버 message) + 直接入力 권장
       - UI_MODAL_PATTERNS의 "수정 불가 값을 비활성 입력으로 표시 금지"와 충돌하므로 `<input disabled>`가 아닌 텍스트 표시 요소로 만든다
     - 直接入力: 텍스트 입력(placeholder 「社員IDを入力してください」, `inputMode="numeric"`). 클라이언트 검증 필수·숫자 1~50자리
  2. 「社員名」* placeholder 「社員名を入力してください」(100자)
  3. 「役職」* `Select`(placeholder 「役職を選択してください」, API-JOB-001) + 오른쪽 선택한 `JobTitleBadge`(모바일은 아래 줄)
  4. 「メールアドレス」* `type="email"` placeholder 「メールアドレスを入力してください」(254자, 형식 검증)
  5. 「所属部署」* `Select` placeholder 「所属部署を選択してください」(API-DEPT-001, 1개, 계층 없음)
  6. 「入社日」* `DateInput`(기본값 없음, 미래 허용) — **레퍼런스에 없는 추가 항목(plan.md 결정 2)**
  7. 「初期パスワード」* `type="password"` `autoComplete="new-password"`, placeholder 「初期パスワードを入力してください」 — **레퍼런스에 없는 추가 항목(plan.md 결정 1)**. 표시 전환 버튼은 만들지 않는다(기존 비밀번호 화면과 같음). `FieldHint` 「8文字以上で、英字と数字を含めてください。社員は初回ログイン時に変更します。」
     - 클라이언트 검증은 `app/password/PasswordChangeForm.tsx`의 정책 검사(`messages.password.validation.policy`·`tooLong`)를 `lib/password-policy.ts`로 옮겨 두 화면이 공유(PasswordChangeForm 동작 불변). 누락 「初期パスワードを入力してください。」
  - 하단 `Notice info` 「追加後、社員情報は一覧の「編集」から変更できます。」
  - role `EMPLOYEE`, approvalRequired `true`를 고정 전송(화면에 표시하지 않음, 편집 모달에서 변경)
  - footer [キャンセル] `secondary` / [追加する] `primary` submit `loading`(제출 중 busy → Esc·X·キャンセル 차단, 이중 제출 방지: submitting 중 재제출 무시)
  - 클라이언트 검증 실패 시 첫 오류 필드 포커스. 서버 400 details → 필드별 `FieldError`, 409 DUPLICATE_EMP_ID → 社員ID 아래, 400 INVALID_DEPARTMENT/INVALID_JOB_TITLE → 해당 목록 재조회 + 필드 오류, 그 외 → 폼 위 `Notice error`(서버 message, 네트워크는 공통 문구)
- 성공: 모달을 닫고 토스트 「社員（社員ID: {empId}）を登録しました。初回ログイン時にパスワードの変更が必要です。」(empId = 응답의 확정 번호, SCR-006 §5 문구 기반) + 목록·요약 재조회. 입력한 비밀번호 state는 닫을 때 폐기
- 열 때마다 `key` 변경으로 상태 초기화(LeaveApplyModal 방식)

## 5. 社員詳細 모달 (`UserDetailModal`, `Modal` lg, B Detail)
- icon 人物, title 「社員詳細」, `DetailTable`: 社員ID, 氏名, 役職(배지), メールアドレス, 所属部署, 入社日, ステータス(배지), 権限(管理者/一般), 休暇承認(必要/不要), パスワード変更(必要/済み), 登録日, 更新日. API-USER-003 조회(로딩 Skeleton, 404 → 「社員が見つかりません。」 + 목록 재조회)
- footer [閉じる] `secondary` / [編集] `primaryOutline` + Pencil(편집 모달로 전환 — 상세를 닫고 편집을 연다)
- 부여 연차(leaveGrants)는 표시하지 않는다(범위 밖)

## 6. 社員編集 모달 (`UserEditModal`, 무효화 확인 단계가 있으므로 A 단계형 = `Modal` lg 직접 사용 + `FormTable`)
- title 「社員編集」, description 「社員情報を変更します。」, 초기값 API-USER-003
- 항목: 社員ID*(직접 입력만), 社員名*, 役職(선택, 「未設定」 옵션 허용), メールアドレス(선택, 빈 값 = 미설정), 所属部署*, 入社日*, 権限*(管理者/一般), 休暇承認*(必要/不要), アカウント状態*(有効/無効)
- 변경된 필드만 PATCH. 변경 없음이면 [保存] disabled
- 有効→無効으로 저장 시 같은 dialog의 확인 단계: 삭제 확인(7)과 같은 문구 → [無効にする] `danger`
- 409 LAST_ADMIN → `Notice error` 서버 message, 값 되돌림. 그 외 오류 처리는 社員追加와 같다. 성공 토스트 「保存しました。」 + 목록·요약 재조회

## 7. 社員削除 확인 (`UserDeleteDialog`, `ConfirmDialog` tone danger)
- 열 때 API-USER-003으로 `pendingApprovalCount` 조회
- title 「社員を削除」, message 「「{name}」を削除しますか？削除すると、この社員はログインできなくなり、申請中の休暇は取り消されます。社員データは「無効」として残ります。」, `pendingApprovalCount > 0`이면 notice(warning) 「この社員に割り当てられた承認待ち {n} 件は、管理者が代理で処理してください。」, confirmLabel 「削除」
- PATCH `{isActive:false}`. 409 LAST_ADMIN → 오류 Notice. 성공 토스트 「社員を削除しました。」 + 재조회

## EmploymentStatusBadge (users 폴더 로컬)
- `Badge shape="pill"` + 앞 점(●, aria-hidden): ACTIVE 「在籍中」 `positive` / UPCOMING 「入社予定」 `info` / INACTIVE 「無効」 `neutral`

## 호출 API (계약은 design-backend.md 「API 계약」)
- GET `/admin/users`(001), GET `/admin/users/summary`(006), GET `/admin/users/next-emp-id`(007, `{empId: string|null}`), POST `/admin/users`(002, `initialPassword` 포함), GET·PATCH `/admin/users/:id`(003·004)
- GET·POST `/admin/job-titles`, PATCH·DELETE `/admin/job-titles/:id`(JOB-001~004)
- GET `/departments`(DEPT-001)
- 타입은 `lib/api/types.ts`에 추가: `JobTitleTone`(8값으로 확장), `JobTitleRef`, `JobTitle`, `EmploymentStatus`, `UserListItem`, `UserDetail`, `UserCreateRequest`, `NextEmpId`(`{empId: string|null}`), `UserSummaryCounts`

승인 피드백 Round 1: 社員追加 완료 단계에서 비밀번호 표시·コピー 삭제 → 메일 발송 결과 표시, 발송 실패·관리자 메일 미설정 처리, 재발급 입구(완료 단계·社員詳細) 추가, API-USER-007 응답 변경 반영
승인 피드백 Round 2: 社員追加에 「初期パスワード」* 입력 추가(정책 검사 `lib/password-policy.ts`로 공유), 완료 단계·메일 안내·재발급 입구 전부 삭제 → 성공 시 모달 닫고 토스트, `FormModal` 사용. API-USER-007은 `next-emp-id`(`{empId}`)

## 테스트 근거 문구·접근 가능한 이름 (tester가 그대로 사용)
- 페이지: heading 「社員管理」, 버튼 「役職確認」「社員追加」「クリア」, searchbox placeholder 「社員ID・氏名・メールアドレスで検索」, combobox label 「所属部署」「役職」「ステータス」(옵션 「すべて」「在籍中」「入社予定」「無効」), 카드 제목 「社員一覧（全 N 名）」, 요약 라벨 「社員数」「管理者数」「今月の入社」, 행 버튼 「{name}の詳細」「{name}を編集」「{name}を削除」, 페이지 문구 「全 N 件中 a – b 件を表示」, Empty 「条件に一致する社員はいません。」
- 役職確認: dialog 「役職確認」, 「登録されている役職（N件）」, 버튼 「追加」「閉じる」「キャンセル」「保存」「削除」, 「{name}を編集」「{name}を削除」, textbox 「役職名」, radiogroup 「色」 + radio 「紫」「青」「グレー」「薄紫」「緑」「黄」「オレンジ」「ピンク」, 「プレビュー」, 오류 「役職名を入力してください。」「色を選択してください。」「この役職名は既に登録されています。」「この役職を使用している社員が存在するため、削除できません。」, 토스트 「役職を追加しました。」「役職を更新しました。」「役職を削除しました。」
- 社員追加: dialog 「社員追加」, radio 「自動生成」「直接入力」, textbox 「社員ID」「社員名」「メールアドレス」, combobox 「役職」「所属部署」, 「入社日」, 버튼 「キャンセル」「追加する」, 오류 「社員IDを入力してください。」「社員IDは数字(50 桁以内)で入力してください。」「この社員IDは既に使用されています。」「社員名を入力してください。」「役職を選択してください。」「メールアドレスを入力してください。」「メールアドレスの形式が正しくありません。」「部署を選択してください。」「入社日を選択してください。」「初期パスワードを入力してください。」「パスワードは8文字以上で、英字と数字を含めてください。」「パスワードは72バイト以内で入力してください。」, password 입력 label 「初期パスワード」, 성공 토스트 「社員（社員ID: {empId}）を登録しました。初回ログイン時にパスワードの変更が必要です。」
- 詳細/編集/削除: dialog 「社員詳細」「社員編集」「社員を削除」, 버튼 「編集」「保存」「削除」「無効にする」, 토스트 「保存しました。」「社員を削除しました。」
- 문구는 모두 `messages/ja.ts`에 `users`·`jobTitles` 키로 둔다(하드코딩 금지). 서버 오류 문구는 서버 message를 표시

## 생성·수정 파일
신규
- `frontend/src/app/(app)/admin/users/page.tsx`(서버, metadata 「社員管理」), `UsersView.tsx`, `EmploymentStatusBadge.tsx`, `JobTitlesModal.tsx`, `JobTitleTonePicker.tsx`, `UserCreateModal.tsx`, `EmpIdModeField.tsx`, `UserDetailModal.tsx`, `UserEditModal.tsx`, `UserDeleteDialog.tsx`, `icons.tsx`(People·OrgChart·Shield·UserPlus·Eye·Tag·Palette·Info 등 이 화면 전용. 기존 `leave/leaveIcons`의 `PencilIcon`·`PlusIcon`, `departments/icons`의 `TrashIcon`·`ListIcon`은 재사용)
- `frontend/src/components/JobTitleBadge.tsx`, `frontend/src/lib/password-policy.ts`(PasswordChangeForm의 정책 검사 이동)
수정
- `frontend/src/app/password/PasswordChangeForm.tsx`(정책 검사 import만, 동작 불변)
- `frontend/src/app/globals.css`(토큰 7개), `components/Badge.tsx`(variant `lavender`·`yellow`), `components/StatCard.tsx`(tone `violet`), `components/PageHeader.tsx`(`description?`, 줄바꿈 허용), `components/Pagination.tsx`(`pageSize?`), `lib/api/types.ts`, `messages/ja.ts`, `app/(app)/admin/departments/DepartmentMembersModal.tsx`(공용 배지)
재사용: `Modal`, `FormModal`, `ConfirmDialog`, `FormTable`, `DetailTable`, `ReadOnlySummary`, `Notice`, `Select`, `DateInput`, `SearchInput`, `Card`, `StatCard`, `Pagination`, `Button`, `Skeleton`, `SectionError`, `Toast`, `form.tsx`(inputClass·selectClass·FieldError·FieldHint·CharCount), `table.ts`, `useApiQuery`, `useSyncedState`, `useMediaQuery`, `lib/format.ts`

## 문서 갱신 예정(frontend.md에 기록할 것)
04 SCR-006 재작성(구성·문구·모달 5종·반응형), SCR-007(모달로 대체 표기), 03 SCR-006·007 행·화면 흐름, 09 §2.1 토큰 7개·§5 신규 항목(SCR-006 레퍼런스 재현 예외)·§6 `JobTitleBadge`·Badge variant·StatCard tone·PageHeader description·Pagination pageSize, 10
