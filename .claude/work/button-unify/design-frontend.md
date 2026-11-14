# design-frontend — 詳細·編集 버튼 통일 (button-unify)

## 0. 참조 문서 (해당 섹션만 읽는다)
- `docs/UI_BUTTON_PATTERNS.md` §2.1 Variant 선택 규칙, §3.1 Size, §4.4 Button props, §4.6 className 규약, §6.2 접근 이름, §9.2 금지사항
- `docs/09_DESIGN_SYSTEM.md` §5 11(버튼 공통 패턴)·12(SCR-006 예외 — "버튼 variant·size는 유지"), §6 `components/Button.tsx`·`components/leave/leaveIcons.tsx` 행
- 화면: `docs/04_SCREEN_SPECIFICATIONS/SCR-006_USER_LIST.md` §3 표 操作·§4.1 役職確認·§4.3 社員詳細, `SCR-010_DEPARTMENTS.md` §3 표 操作·部署詳細 모달, `SCR-008_ADMIN_ATTENDANCE.md` §5, `SCR-004_LEAVE.md` 신청 이력 操作, `SCR-005_LEAVE_APPROVAL.md` 操作·좁은 폭 카드
- 이전 작업: `.claude/work/button-audit/decisions.md`(B10 수정 = primaryOutline+Pencil, B12 이름 버튼 대상 외), `.claude/work/employee-management/frontend.md` Fix 2(SCR-006 編集을 secondary로 바꾼 경위)

## 1. 기준 외형 (사용자 지정)
| 역할 | 기준 | variant | 아이콘 | sm(행) | md(모달 footer) |
|---|---|---|---|---|---|
| 詳細 | SCR-006 `UsersView.tsx:136-143` | `secondary`(흰 배경·`general-50` 테두리·`general-100` Bold, hover `general-30`) | EyeIcon(앞) | 높이 36·좌우 12·아이콘 16·간격 4·14/20·nowrap | 사용처 없음 |
| 編集 | SCR-010 `DepartmentsView.tsx:115-123` | `primaryOutline`(흰 배경·`primary-100` 테두리·글자, hover `primary-30`, disabled 테두리 `general-50`·글자 `general-60`) | PencilIcon(앞) | 같음 | 높이 40·좌우 16·아이콘 20·간격 8 |
- focus-visible 2px outline offset 2 `primary-100`, radius 8 — 모두 Button 내장값. 새 클래스·토큰·색 없음.
- 버튼 사이 간격은 각 화면의 기존 컨테이너(`gap-2`, 모달 footer 12)를 그대로 둔다(레이아웃 변경 금지).

## 2. 공통 컴포넌트 — `components/ActionButtons.tsx`(신규)
기존 `Button`을 감싼 **프리셋**이다. 스타일은 Button의 variant·size 맵만 쓰고, 새 클래스를 만들지 않는다(UI_BUTTON_PATTERNS §4.5 "IconButton 별도 컴포넌트 불채택"과 충돌하지 않음: 새 외형이 아니라 역할 고정).
```ts
DetailButton(props: {
  size?: 'sm' | 'md';            // 기본 'sm'
  children?: ReactNode;          // 기본 messages.common.detail(「詳細」)
  className?: string;            // 배치 전용(§4.6)
} & Omit<ComponentPropsWithRef<'button'>, 'children' | 'className' | 'type'>)
// = <Button variant="secondary" size={size} icon={<EyeIcon />} ...rest>{children ?? 詳細}</Button>

EditButton(props:
  ({ iconOnly?: false; children?: ReactNode }                 // 기본 messages.common.edit(「編集」)
   | { iconOnly: true; 'aria-label': string; children?: never })
  & { size?: 'sm' | 'md'; className?: string }                // 기본 'sm'
  & Omit<ComponentPropsWithRef<'button'>, 'children' | 'className' | 'type'>)
// = <Button variant="primaryOutline" size={size} icon={<PencilIcon />} ...>
```
- `onClick`·`disabled`·`aria-label`·`autoFocus`·`data-autofocus`·`ref`는 그대로 전달. `type`은 항상 `button`(Button 기본). `loading`·`variant`·`icon`은 받지 않는다.
- `<button>` 1개만 렌더(모달 footer 개수 판정, §4.4).
- 파일 주석·문구는 일본어.
- ESLint: `frontend/eslint.config.mjs`의 두 selector `JSXOpeningElement[name.name='Button']`을 `[name.name=/^(Button|DetailButton|EditButton)$/]`로 넓힌다(금지 클래스 정규식은 그대로).
- 아이콘: `EyeIcon`을 `admin/users/icons.tsx:70-77`에서 삭제하고 `components/leave/leaveIcons.tsx`에 같은 path로 추가(`className?` 지원, 다른 아이콘과 같은 형식). `UsersView`의 import 정리.
- 문구(`messages/ja.ts`): `common.detail: '詳細'`, `common.edit: '編集'` 추가. 아래 키는 사용처가 0이 되므로 삭제: `leaves.history.detail`, `approvals.detail`, `adminAttendance.edit`, `departments.detail`, `departments.edit`, `users.detail`, `users.edit`. (`dashboard.pending.detailColumn`·`departments.editSelected`·각 `*Label` 함수는 유지)
- `adminAttendance.editLabel` 값: `` `${name}さんの${workDate}の勤怠を編集` ``(「修正」→「編集」).
- Q3 결과에 따라 SCR-008 표 헤더용 키: 유지(권장)면 `adminAttendance.editColumn: '修正'` 신설해 `AdminAttendanceView.tsx:149`에서 사용 / 변경이면 `messages.common.edit` 사용.

## 3. 대상 버튼 전수 목록

### 3.1 詳細 (DetailButton으로 교체)
| ID | 파일:행 | 화면 | 현재 | 변경 후 |
|---|---|---|---|---|
| D1 | `admin/users/UsersView.tsx:136-143`(표 :422·카드 :457 공용 `RowActions`) | SCR-006 | secondary sm + Eye 「詳細」 (기준) | `DetailButton` — 외형 불변 |
| D2 | `admin/departments/DepartmentsView.tsx:110-112`(표 :404·카드 :437 공용 `RowActions`) | SCR-010 | secondary sm, 아이콘 없음 | `DetailButton` — **Eye 추가(폭 +20px)** |
| D3 | `leaves/LeaveHistoryList.tsx:78-91` `renderDetailButton`(표 :158·카드 :184) | SCR-004 /leaves | secondary sm, 아이콘 없음 | `DetailButton` — Eye 추가 |
| D4 | `leaves/approvals/ApprovalsView.tsx:111-117` `renderActions`(표 :237) | SCR-005 | secondary sm, 아이콘 없음 | `DetailButton` — Eye 추가. 옆 [承認][却下]은 변경 없음 |
| D5 | `leaves/approvals/ApprovalsView.tsx:276-282`(md 미만 카드) | SCR-005 | secondary sm, 아이콘 없음 | `DetailButton` — Eye 추가 |

### 3.2 編集·修正 (EditButton으로 교체)
| ID | 파일:행 | 화면 | 현재 | 변경 후 |
|---|---|---|---|---|
| E1 | `admin/departments/DepartmentsView.tsx:115-123` | SCR-010 행 | primaryOutline sm + Pencil 「編集」 (기준) | `EditButton` — 외형 불변. `!item.isSystem` 조건 유지 |
| E2 | `admin/users/UsersView.tsx:144-153` | SCR-006 행 | **secondary** sm + Pencil 「編集」, `disabled={busy}` | `EditButton` — **회색 테두리 → 파란 테두리·파란 글자**(폭 불변). disabled 유지 |
| E3 | `admin/attendance/AdminAttendanceView.tsx:323-335` 로컬 `EditButton`(표 :182·카드 :221) | SCR-008 | primaryOutline sm + Pencil **「修正」** | 공통 `EditButton` — **문구 「編集」**, aria-label 「…の勤怠を編集」. 로컬 함수 `EditButton`은 삭제(이름 충돌)하고 호출부 2곳에서 공통 컴포넌트에 `aria-label`·`onClick` 전달 |
| E4 | `admin/users/JobTitlesModal.tsx:203-210` | SCR-006 役職確認 | secondary sm **iconOnly** + Pencil, `disabled={editing}` | (Q2 예) `EditButton iconOnly` — 파란 테두리 아이콘 전용 36×36. 문구 추가 안 함(열 폭 `w-28` 유지). 옆 삭제(dangerOutline iconOnly) 불변 |
| E5 | `admin/users/UserDetailModal.tsx:107-114` | SCR-006 社員詳細 footer | primaryOutline md + Pencil 「編集」, `disabled={!user}` | `EditButton size="md"` — 외형 불변 |
| E6 | `admin/departments/DepartmentDetailModal.tsx:34-36` | SCR-010 部署詳細 footer | **primary** md, 아이콘 없음 「この部署を編集」 | (Q4 예) `EditButton size="md"`, children `t.editSelected` — **파란 채움 → 파란 테두리 + Pencil**. 문구 유지, `!department.isSystem` 조건 유지 |

### 3.3 대상 외 (변경하지 않음, 이유)
| 파일:행 | 문구 | 이유 |
|---|---|---|
| `dashboard/MonthlyWorkSection.tsx:85` CardLink | 詳細を見る | 화면 이동 `<Link>` text(§6.1, CardLink 「すべて見る」 계열). 버튼 아님 |
| `dashboard/PendingApprovalsSection.tsx:116-126` | (이름) aria 「…の申請の詳細を開く」 | 모달 여는 표 안 이름 BT34(B12 현행 유지). `:139` chevron은 장식, 헤더 「詳細」 `detailColumn`은 sr-only 열 제목 |
| `dashboard/RecentRequestsSection.tsx:46-50` | 행 전체 버튼 | V11 행 버튼(§1.2) |
| `attendance/AttendanceSheetView.tsx:184` | 휴가 배지 「…の詳細を開く」 | V11 출근부 휴가 배지 |
| `admin/departments/DepartmentsView.tsx:173` | 確認(所属社員) | 詳細이 아님. 후보 보고서에 기록 |
| `admin/attendance/AttendanceEditModal.tsx:122` | 修正する | (Q1 유지) 확인 단계 확정 버튼. 확인문 「勤怠を修正しますか？」와 짝 |
| `AdminAttendanceView.tsx:149` | sr-only 열 제목 「修正」 | (Q3 유지) 버튼이 아닌 표 헤더 |
| `ja.ts` `adminAttendance.modal.title/description/confirm/success` | 勤怠の修正 / 出勤・退勤時刻を修正します。/ 勤怠を修正しますか？/ 勤怠を修正しました。 | 제목·설명·확인문·토스트(버튼 외) |
| `ja.ts` `attendance.modified`·`missingHint` | 管理者修正 / 管理者に退勤時刻の修正を依頼してください。 | 상태 표시·툴팁 |
| `ja.ts` description류·`departments.form.editTitle`·`users.editModal.title`·`users.createModal.notice`·`jobTitles.colorPanelDescription` | 編集 포함 | 제목·설명문(이미 「編集」) |
| `users/UserEditModal.tsx:202` | PencilIcon | 모달 제목 아이콘(버튼 아님) |
| 백엔드 | 주석의 「修正」만 | UI 문구 없음 → BACKEND SKIP |

## 4. 테스트가 근거로 쓸 문구·접근 이름
- 표시 문구: 詳細 = 「詳細」(`messages.common.detail`), 編集 = 「編集」(`messages.common.edit`), SCR-010 모달 = 「この部署を編集」
- 접근 이름(변경 없음): `users.detailLabel(name)` 「{name}の詳細」, `users.editLabel` 「{name}を編集」, `departments.detailLabel` 「部署「{name}」の詳細を表示」, `departments.editLabel` 「部署「{name}」を編集」, `approvals.detailLabel` 「{name}さんの申請の詳細を開く」, `leaves.history.detailLabel(type, period)` 「{type} {period} の申請の詳細を開く」, `jobTitles.editLabel` 「{name}を編集」. 모달 footer의 E5·E6은 aria-label 없음(보이는 문구가 이름)
- 접근 이름(변경): `adminAttendance.editLabel(name, workDate)` 「{name}さんの{workDate}の勤怠を編集」
- 아이콘 슬롯은 `aria-hidden="true"`(Button 내장), 버튼 안 `svg`는 EyeIcon/PencilIcon 1개
- 클래스 근거: 詳細 = `border-general-50`·`text-general-100`, 編集 = `border-primary-100`·`text-primary-100`, sm = `h-btn-sm`, md = `h-btn-md`

## 5. 사용자 확인 사항 (구현 전에 결정)
| Q | 내용 | 선택지 | 권장 |
|---|---|---|---|
| Q1 | SCR-008 확인 단계 [修正する] | A 「編集する」로 변경(버튼만, 확인문 「勤怠を修正しますか？」와 어긋남) / B 유지 / C 제목·설명·확인문·토스트까지 「編集」(요구 범위 밖) | **B** — 요구 3은 "버튼 이외 対象外"라 C는 범위 밖이고, A는 같은 단계 안에서 질문과 답 문구가 달라진다. 이 버튼은 "편집 입구"가 아니라 확정 버튼 |
| Q2 | 役職確認 아이콘 전용 編集 | A primaryOutline 아이콘 전용 / B 문구 포함 sm(열 폭·삭제 아이콘 전용과 불균형, 레이아웃 변경) / C 현행 | **A** — 색·아이콘은 기준과 같게, 레이아웃은 유지 |
| Q3 | SCR-008 표 조작 열 sr-only 제목 「修正」 | A 유지 / B 「編集」 | **A** — 버튼 외 문구는 対象外(사용자 지시). B가 더 일관되나 지시를 넘는다 |
| Q4 | 部署詳細 [この部署を編集] primary → primaryOutline+Pencil | A 변경 / B 현행(primary 유지) | **A** — 기준(部署管理 編集)·09 §5-11 "수정 입구 = primaryOutline+Pencil"·社員詳細 footer와 일치. 이 모달은 primary 0개가 됨(허용) |

## 6. 상태·동작 유지 체크
- onClick 대상(모달 열기·`setSelected`·`openForm`·`onEdit`)과 인자 불변. 표시 조건(`isSystem`, `isActive`, `status==='PENDING'`) 불변.
- disabled: E2 `busy`, E4 `editing`, E5 `!user` 그대로. 詳細 버튼은 disabled 없음(현행).
- 화면 이동 없음(모두 모달). 키보드: `<button>`이므로 Enter·Space 동작, Tab 순서 불변.

## 7. 반응형 확인 (폭 +20px 영향: D2~D5, E6)
- 360 / 768 / 1024 / 1440에서 SCR-010 행 [詳細][編集][削除](표 `md:justify-end`, 카드 `flex-wrap`), SCR-005 표 操作 열 [詳細][承認][却下], SCR-004 표·카드, 部署詳細 footer(2버튼 2열)가 줄바꿈·가로 넘침 없이 들어가는지 캡처로 확인. 넘치면 구현 전에 보고(열 폭·배치 변경은 하지 않는다).

## 8. 추가 공통화 후보 보고서 — `.claude/work/button-unify/candidates-report.md`(frontend 작성, 코드 수정 금지)
항목별로 "사용 위치(파일:행) / 현재 variant·size·아이콘·문구 / 디자인 차이 / 공통화 가능 여부 / 권장 구조(예: `DeleteButton` 프리셋, 공통 문구 키)". 조사 시드(architect 확인분):
- 削除: SCR-010 행 dangerOutline sm + TrashIcon + 문구 / SCR-006 행·役職確認은 dangerOutline sm **iconOnly** / 모달 확정 danger md(`ConfirmDialog` tone danger, `JobTitlesModal.tsx:342-349`, `UserEditModal.tsx:234` 無効化). `TrashIcon`이 `admin/departments/icons.tsx`에 있어 users가 라우트 간 import
- 登録·追加: 페이지 헤더 primary lg + PlusIcon(部署を追加·社員追加·休暇申請), 役職 [追加] primary md + Plus, `FormModal` submit primary md(문구 登録/追加する/申請する)
- 保存: `JobTitlesModal`「保存」, `UserEditModal`「保存」(disabled `!hasChanges`), `AttendanceEditModal`「保存」(검증 후 확인 단계), 部署 「保存する」 — 문구 「保存」/「保存する」 불일치
- キャンセル·閉じる·戻る: `messages.common.cancel` vs `users.cancel`·`jobTitles.cancel`·`password.cancel` 중복 키, `common.close` vs `users.close`·`jobTitles.close`·`departments.detailModal.close`·`membersModal.close`, 戻る(`leave.cancel.back`·`adminAttendance.modal.back`)
- 承認·却下: `ApprovalsView.tsx:120-137` 행(承認 primary sm / 却下 secondary sm), `LeaveDetailModal.tsx:254-270`, 확정 「承認する」「却下する」 primary(B11)
- 검색·初期化: 검색 primary lg(`LeaveHistoryList.tsx:258`, `AttendanceHistoryView.tsx:257`, `AdminAttendanceView.tsx:304`, 문구 検索/照会), 초기화 secondary md(`DepartmentsView.tsx:506` 条件をクリア, `UsersView.tsx:538` クリア) — 문구 불일치
- 모달 하단: `FormModal`·`ConfirmDialog`가 이미 공통 footer. 직접 footer를 쓰는 `AttendanceEditModal`·`UserEditModal`·`JobTitlesModal`·`LeaveDetailModal`·`DepartmentDetailModal`·`UserDetailModal`·`DepartmentMembersModal`·`LeaveDayModal`의 패턴 정리
- 그 밖에 발견한 것(예: 所属社員 [確認])은 "기타"로.

## 9. 생성·수정 파일
- 신규: `frontend/src/components/ActionButtons.tsx`
- 수정: `components/leave/leaveIcons.tsx`(+EyeIcon), `app/(app)/admin/users/icons.tsx`(−EyeIcon), `messages/ja.ts`, `admin/users/{UsersView,UserDetailModal,JobTitlesModal}.tsx`, `admin/departments/{DepartmentsView,DepartmentDetailModal}.tsx`, `admin/attendance/AdminAttendanceView.tsx`, `leaves/LeaveHistoryList.tsx`, `leaves/approvals/ApprovalsView.tsx`, `frontend/eslint.config.mjs`
- 재사용: `components/Button.tsx`(변경 없음), `components/leave/leaveIcons.tsx` PencilIcon
- 변경 후 정적 확인: `rg "PencilIcon|EyeIcon" frontend/src/app` 결과가 `UserEditModal.tsx`(제목 아이콘)뿐일 것, `rg "修正" frontend/src/app --glob "!*.test.tsx"`가 §3.3의 대상 외만 남을 것

## 10. 문서 갱신 예정 (frontend.md에 기록할 것)
- 09 §5-11: "상세 = `secondary` + Eye, 수정 입구 = `primaryOutline` + Pencil, 행 sm·모달 md, 공통 `DetailButton`·`EditButton` 사용, 수정 입구 버튼 문구는 「編集」(「修正」 쓰지 않음)" / §6: `components/ActionButtons.tsx` 행 신설, `leaveIcons.tsx` 행에 EyeIcon 추가·"SCR-008 修正" 표기 갱신
- UI_BUTTON_PATTERNS §2.1 상세 행에 Eye, §9.1 예시·§9.3 체크리스트, §11에 결정 B18(詳細·編集 프리셋)·B19(「修正」→「編集」)·Q1~Q4 결과, §12 v4
- 04: SCR-004·005 [詳細] 아이콘, SCR-006 [編集] variant·役職確認 아이콘 전용 編集, SCR-008 §5 [수정]→[編集]·접근 이름, SCR-010 §3 [詳細](secondary+目)·部署詳細 footer
- context.md 공용 모듈(ActionButtons), 10 로드맵
