# test-plan — 詳細·編集 버튼 통일 (button-unify)

근거: design-frontend.md §1(기준 외형)·§2(컴포넌트 API)·§3(대상 목록)·§4(문구·접근 이름), UI_BUTTON_PATTERNS §2.1·§3.1·§6.2. 버튼 외형은 Button 내장 클래스로만 정해지므로 단위 테스트는 클래스, 실제 계산값은 Playwright `toHaveCSS`로 확인한다(jsdom은 Tailwind CSS 미로드, §3.3).

## 1. 단위 — `frontend/src/components/ActionButtons.test.tsx`(신규)
| # | 시나리오 | 기대 결과 |
|---|---|---|
| U1 | `<DetailButton aria-label="X">` 기본 | role button, 이름 「X」, 텍스트 「詳細」, `type="button"`, 클래스 `border-general-50`·`text-general-100`·`h-btn-sm`·`whitespace-nowrap` |
| U2 | DetailButton 아이콘 | 버튼 안 `span[aria-hidden="true"] > svg` 1개(EyeIcon), 접근 이름에 아이콘 영향 없음 |
| U3 | DetailButton `size="md"` | `h-btn-md`, `whitespace-nowrap` 없음 |
| U4 | `<EditButton aria-label="Y">` 기본 | 텍스트 「編集」, 클래스 `border-primary-100`·`text-primary-100`·`h-btn-sm`, svg 1개(PencilIcon) aria-hidden |
| U5 | EditButton children 대체 | `<EditButton size="md">この部署を編集</EditButton>` → 텍스트·이름 「この部署を編集」, `h-btn-md` |
| U6 | EditButton `iconOnly aria-label="Z"` | 텍스트 없음, 이름 「Z」, `size-btn-sm`, `border-primary-100` |
| U7 | onClick | 클릭·Enter·Space 각각 1회 호출 |
| U8 | disabled | `disabled` 속성, 클릭해도 미호출, EditButton은 `disabled:border-general-50` 클래스 보유 |
| U9 | className 배치 | `className="w-full"`이 붙고 기존 클래스 유지 |
| U10 | 폼 안 | `<form onSubmit>` 안에서 클릭해도 submit 미발생(type=button) |

## 2. 화면 컴포넌트 (기존 테스트 수정 + 추가, Vitest)
| # | 파일 | 시나리오 | 기대 결과 |
|---|---|---|---|
| S1 | `admin/users/UsersView.test.tsx` | 행 編集 외형 | `getByRole('button',{name:'山田 太郎を編集'})`가 `border-primary-100` 보유(secondary 아님), 텍스트 「編集」 |
| S2 | 같은 파일 | 행 詳細 | 「山田 太郎の詳細」 버튼에 svg 1개·`border-general-50`, 클릭 시 dialog 「社員詳細」 |
| S3 | `admin/departments/DepartmentsView.test.tsx` | 詳細 아이콘 | 「部署「開発部」の詳細を表示」 버튼 안 aria-hidden svg 1개, 텍스트 「詳細」. 기존 `shouldApplyDangerStyleToDeleteButtonOnly` 통과 유지 |
| S4 | 같은 파일 | 部署詳細 footer | 「この部署を編集」이 `border-primary-100`·svg 1개(Q4 A일 때), 클릭 시 편집 모달로 전환(기존 :340-345 흐름 유지). 시스템 부서는 버튼 없음 |
| S5 | `admin/attendance/AdminAttendanceView.test.tsx` | 문구 변경 | `t.editLabel('山田太郎','2026/11/08(日)')` = 「山田太郎さんの2026/11/08(日)の勤怠を編集」로 찾음, 텍스트 「編集」, 「修正」 텍스트 버튼 0개, 클릭 시 수정 모달 열림(기존 :196) |
| S6 | `admin/users/JobTitlesModal.test.tsx` | 아이콘 전용 編集 | 「マネージャーを編集」 버튼이 `border-primary-100`(Q2 A일 때), `editing` 중 disabled 유지 |
| S7 | `admin/users/UserDetailModal.test.tsx` | footer 編集 | 텍스트 「編集」 버튼, 조회 전 disabled, 조회 후 클릭 시 `onEdit` 호출 |
| S8 | `leaves/LeavesView.test.tsx` 또는 LeaveHistoryList 관련 | 신청 이력 詳細 | 「{type} {period} の申請の詳細を開く」 버튼에 svg 1개, 클릭 시 「休暇詳細」 dialog |
| S9 | `leaves/approvals/ApprovalsView.test.tsx` | 표·카드 詳細 | `detailLabel(name)` 버튼에 svg 1개, 본인 신청이어도 詳細은 enabled(기존 :203), 承認·却下 외형 불변 |
| S10 | 전체 | 회귀 | `npm test` 전체 통과. 메시지 키 삭제(`users.detail` 등 7개)로 깨지는 테스트는 `messages.common.detail/edit`로만 교체(기대값 자체는 바꾸지 않는다) |

## 3. E2E (Playwright)
### 3.1 기존 spec 수정 (문구·키만)
- `e2e/attendance.spec.ts:62,131` `/の勤怠を修正$/` → `/の勤怠を編集$/`
- `e2e/button-c8.spec.ts:303`, `e2e/button-visual.spec.ts:195` `messages.adminAttendance.edit` → `messages.common.edit`
- `e2e/departments.spec.ts:43,70`, `e2e/departments-list-modal.spec.ts:169,220` `t.edit`/`t.detail` → `messages.common.edit/detail`
- `e2e/leaves.spec.ts:86` `t.history.detail` → `messages.common.detail`

### 3.2 신규 `e2e/button-unify.spec.ts` (읽기 전용: GET만 실백엔드, 쓰기 요청은 `blockWrites`로 중단 — button-visual.spec 방식, `button-helpers.ts` 재사용)
| # | 시나리오 | 기대 결과 |
|---|---|---|
| P1 | 1440에서 SCR-006·SCR-010·SCR-004·SCR-005(scope all)·SCR-008 표의 첫 詳細 버튼 계산값 | 모든 화면에서 height 36px, padding-left/right 12px, border-color·color·background-color·font-size 14px·font-weight 700·border-radius 8px·column-gap 4px가 SCR-006 기준과 동일, 아이콘 svg 16×16 |
| P2 | 같은 방법으로 編集(SCR-010 기준, SCR-006·SCR-008) | SCR-010 기준과 계산값 동일(테두리·글자 `primary-100` 계산색) |
| P3 | hover | 詳細 hover 시 background-color가 SCR-006 기준 hover 값과 동일, 編集 hover가 SCR-010 기준 hover 값과 동일 |
| P4 | focus-visible | Tab으로 詳細·編集에 도달 시 outline 2px solid, offset 2px, 색 `primary-100`. 표·카드 경계에서 링이 잘리지 않음(button-c8의 clipped 판정 재사용) |
| P5 | 키보드 | 각 화면 詳細에 포커스 후 Enter → 해당 상세 모달 열림, Esc → 닫히고 포커스가 같은 버튼으로 복귀. 編集은 Space로 편집 모달 열림(저장은 누르지 않음) |
| P6 | 모달 footer | 社員詳細 [編集]·部署詳細 [この部署を編集] height 40px, 테두리 `primary-100`, Pencil svg 20×20 |
| P7 | 役職確認 | 編集 아이콘 전용 36×36, 테두리 `primary-100` |
| P8 | 반응형 | 360/768/1024/1440에서 SCR-010 행, SCR-005 표·카드, SCR-004 표·카드, SCR-006 카드, 部署詳細 footer의 버튼 묶음이 가로 넘침 없음(`scrollWidth<=clientWidth`), 같은 행 버튼의 top 차이 0(한 줄) — 1024 이하 카드형은 `flex-wrap` 허용. 캡처 저장 |
| P9 | 문구 | 앱 전 화면(위 5개)에서 `getByRole('button',{name:/修正/})` 0건(SCR-008 확인 단계 [修正する]는 저장 단계까지 가지 않으므로 해당 없음 — Q1 B일 때) |
| P10 | 화면 이동 | 詳細·編集 클릭은 URL을 바꾸지 않음(모두 모달) |

- 실행 조건: `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD` 셸 export, dev 서버 3000/6000 기동. 개발 DB 쓰기가 없는 spec만 실행(3.1 중 departments·leaves·attendance spec은 DB에 쓰므로 실행 전 사용자 승인 필요 — 승인 없으면 "미검증"으로 보고).
- SCR-005 데이터가 없을 수 있으므로 GET 응답을 `page.route`로 고정 1건 주입해도 된다(button-visual.spec:146~ 선례).

## 4. 정적 검사
- `npm run lint`(ESLint가 `<DetailButton className="h-10">` 같은 금지 클래스를 검출하는지 임시 파일로 1회 확인 후 삭제), `npx tsc --noEmit`(`EditButton iconOnly`에 aria-label 누락 시 타입 오류), `npm run build`
- `rg "PencilIcon|EyeIcon" frontend/src/app` → `UserEditModal.tsx` 제목 아이콘만
- `rg "修正" frontend/src --glob "!*.test.tsx"` → design-frontend §3.3 대상 외만

## 5. 미검증 보고 기준
DB 쓰기 e2e, `npm run test:e2e` 전체, 실제 스크린리더 낭독은 실행하지 못하면 이유와 함께 미검증으로 보고한다.
