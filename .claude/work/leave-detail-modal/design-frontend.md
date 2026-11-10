# design-frontend: 休暇詳細 모달 개편 (leave-detail-modal)

결정 항목은 `decisions.md`(D1~D11, ★추천안 기준으로 작성. 사용자 승인 결과에 따라 갱신).
백엔드·API 변경 없음. 기존 `GET /api/v1/leaves/:id`(API-LEAVE-004) 응답 `Leave`(`frontend/src/lib/api/types.ts`) 그대로 사용.

## 참조 문서
- `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md` §4.4 휴가 상세 모달, §4.3 휴가 취소
- `docs/04_SCREEN_SPECIFICATIONS/SCR-005_LEAVE_APPROVAL.md`(상세에서 승인·반려), SCR-002 §승인 대기, SCR-003 申請 배지(호출처)
- `docs/03_SCREEN_LIST.md` 공통 UI 규칙 "모달", 403/404 처리 행
- `docs/09_DESIGN_SYSTEM.md` §2.1 색상(Yellow 행, 의미별 매핑), §2.3 간격·형태, §5 확정된 결정(3 반응형, 4 토큰만), §6 Modal·Badge·LeaveDetailModal 행, "대비 결정"
- 참고 이미지: 사용자 첨부(중앙 모달, 아이콘+제목, X, 2열 표, pill 상태 Badge, 하단 구분선 + [閉じる])

## 화면
SCR-004 §4.4 휴가 상세 모달(공통). 호출처는 변경 없음: `app/(app)/leaves/LeavesView.tsx`(휴가 이력), `app/(app)/leaves/approvals/ApprovalsView.tsx`(승인 목록), `app/(app)/dashboard/PendingApprovalsSection.tsx`, `app/(app)/attendance/AttendanceSheetView.tsx`. 닫으면 호출처의 `onClose`가 `leaveId`만 null로 → 목록·검색 조건(URL Query)은 그대로 유지(현행 구조 유지, 호출처 수정 불필요).

## 1. 공통 Modal 확장 — `frontend/src/components/Modal.tsx` (수정)
시그니처: `Modal({open, title, onClose, children, footer, icon?, size?})`
- `icon?: ReactNode` — 제목 왼쪽 40×40 박스(`rounded-md bg-primary-30 text-primary-100`, 아이콘 24, `aria-hidden`). 없으면 현행과 같이 제목만.
- `size?: 'md' | 'lg'` — md(기본) `max-w-105`(420, 현행) / lg `max-w-160`(640). (D7)
- 레이아웃(D8, 전 모달 공통): `<dialog>`를 `flex flex-col`, `max-h-[calc(100dvh-2rem)]`, 폭 `w-[calc(100%-2rem)]`(좌우 여백 16 유지), `p-0` + 내부 영역별 padding.
  - 헤더: `px-5 pt-5 sm:px-7 sm:pt-7`, 제목 `text-xl/7 font-bold`(현행), X 버튼 현행 유지.
  - 본문: `min-h-0 flex-1 overflow-y-auto px-5 sm:px-7 mt-4`. 긴 내용은 본문만 세로 스크롤, 헤더·푸터 고정.
  - 푸터: `mt-6 border-t border-general-40 px-5 py-4 sm:px-7 flex flex-wrap justify-end gap-3`.
  - radius 6(`rounded-md`)·`shadow-card`·`backdrop:bg-general-100/50` 유지(D11).
- 닫기: X, 푸터 버튼(호출측), Esc(`<dialog>` cancel → close → `onClose`) — 현행. 바깥 클릭으로 닫지 않음(D9, 핸들러 추가 금지).
- 배경 스크롤 잠금: `frontend/src/app/globals.css`에 `html:has(dialog:modal) { overflow: hidden; }` 1규칙(JS 없음, 모달이 여러 개여도 마지막이 닫힐 때 자동 해제).
- 주석은 일본어.

## 2. 상세 정보 표 — `frontend/src/components/DetailTable.tsx` (신규)
- export: `DetailTable({children, className?})`, `DetailTableRow({label, children})`
- 마크업: `<dl>` 바깥 테두리 `border border-general-40 rounded-md overflow-hidden`, 행은 `<div className="grid grid-cols-[6rem_1fr] sm:grid-cols-[10rem_1fr] border-b border-general-40 last:border-b-0">`(HTML 허용 `dl > div > dt + dd`).
  - `<dt>`: `bg-general-30 px-3 py-3 sm:px-5 text-sm/5 font-medium text-general-80`(D10)
  - `<dd>`: `bg-white px-3 py-3 sm:px-5 text-sm/5 text-general-100 min-w-0 break-words`(긴 이름·부서 줄바꿈)
- 모바일 360px: 라벨 열 96px(「ステータス」 5자 14px ≈ 70px + padding 24), 값 열 나머지. 가로 스크롤 없음.
- 재사용 가능성: 상세 정보 표가 필요한 다른 화면(사원 상세 등)에서 사용. 이번에는 LeaveDetailModal만 교체.

## 3. 상태 Badge
### 3-1. `frontend/src/components/Badge.tsx` (수정)
- `BadgeVariant`에 `'warning'` 추가, `BADGE_VARIANT_CLASS.warning = 'bg-warning-40 text-general-100'`(D1). 기존 variant 클래스 변경 없음.
- 기본 클래스에 `gap-1` 추가(아이콘 children용. 텍스트만일 때 영향 없음).
- `globals.css` @theme에 `--color-warning-100: #f99600; --color-warning-40: #fff4c9;`(09 §2.1 Yellow 100·40 값 그대로).
### 3-2. `frontend/src/components/leave/LeaveStatusBadge.tsx` (신규, D2)
- export: `LEAVE_STATUS_BADGE: Record<LeaveStatus, BadgeVariant>` = `PENDING:'warning'`, `APPROVED:'success'`, `REJECTED:'danger'`, `CANCELLED:'neutral'`(LeaveDetailModal.tsx에서 이동, 값 변경)
- `LeaveStatusBadge({status, children?})` → `<Badge variant={LEAVE_STATUS_BADGE[status]} shape="pill"><StatusIcon/>{children ?? messages.leave.statuses[status]}</Badge>`
  - 아이콘 16px 인라인 SVG `aria-hidden`: APPROVED 원+체크 `text-success-100` / PENDING 시계 `text-warning-100` / REJECTED ✕ `text-danger-100` / CANCELLED 슬래시 원 `text-general-80`
- 사용처 교체(중복 Badge 매핑 제거):
  - `components/leave/LeaveDetailModal.tsx` 상세 단계
  - `app/(app)/leaves/LeaveHistoryList.tsx` 표(135행 부근)·카드(153행 부근) → `LeaveStatusBadge`, 필터 `variantOf`는 import 경로만 변경(`LeaveFilterButtons`는 `BADGE_VARIANT_CLASS`로 warning 자동 반영)
  - `app/(app)/attendance/AttendanceSheetView.tsx` 申請 배지(206행 부근) → `<LeaveStatusBadge status={leave.status}>{s.leaveBadge(type, status)}</LeaveStatusBadge>`(문구·aria-label 유지)
  - `AttendanceSheetView.test.tsx`의 `vi.mock('@/components/leave/LeaveDetailModal', importOriginal…)`은 `LEAVE_STATUS_BADGE`가 빠져도 동작하는지 확인, 필요 시 정리
- 문구: `messages.leave.statuses.CANCELLED` `'取消'` → `'取消済み'`(D3)

## 4. LeaveDetailModal — `frontend/src/components/leave/LeaveDetailModal.tsx` (수정)
- `Modal`에 `size="lg"`, `icon={<CalendarIcon/>}`(인라인 SVG, 파일 내 로컬 함수). 제목은 단계별 현행 유지(休暇詳細 / 承認確認 등), 아이콘은 모든 단계 공통.
- 상세 단계 본문 = `DetailTable`, 행 순서(로컬 `DetailRow` 삭제):
  1. 申請者: `` `${name} (${empId}) / ${departmentName ?? t.detail.unassigned}` `` (신규 문구 `messages.leave.detail.unassigned = '未所属'`)
  2. 休暇種別: `t.types[leaveType]`
  3. 期間: `formatPeriod(startDate, endDate)` — 하루 `2026/11/10`, 여러 날 `2026/11/10 ～ 2026/11/12`(D6, `lib/format.ts` 수정)
  4. 日数: `formatDays(leave.days)`
  5. 理由: `whitespace-pre-wrap break-words`
  6. 承認者: `leave.autoApproved ? t.detail.autoApproved : (leave.approver?.name ?? messages.common.noValue)`
  7. ステータス: `<LeaveStatusBadge status={leave.status} />`
  8. 処理者: `leave.processedBy?.name ?? noValue`(항상 표시, D4)
  9. 処理日時: `leave.processedAt ? formatTokyoDateTime(processedAt) : noValue`(항상 표시)
  10. 却下理由: `status === 'REJECTED'`일 때만(D5, 현행 유지)
- 승인·반려·취소 단계, 버튼 조건(`canProcess`·`canCancel`), API 호출·에러 처리, `initialStep`은 **변경 금지**.
- 로딩(`SkeletonLines`)·에러(`SectionError`)·403/404 토스트+닫기 현행 유지.
- 푸터 [閉じる]는 현행(`secondaryButtonClass h-10 px-4`, 우측 정렬). 처리 가능 시 [却下][承認]·[取消] 현행 배치.

## 5. 기타
- `frontend/src/lib/format.ts` `formatPeriod`: `' ~ '` → `' ～ '`(U+FF5E). 영향: LeaveHistoryList, ApprovalsView, PendingApprovalsSection, LeaveDetailModal 표기(D6).
- `frontend/src/messages/ja.ts`: `leave.statuses.CANCELLED`, `leave.detail.unassigned` 추가.

## 생성·수정 파일
- 신규: `frontend/src/components/DetailTable.tsx`, `frontend/src/components/leave/LeaveStatusBadge.tsx`
- 수정: `frontend/src/app/globals.css`, `frontend/src/components/Modal.tsx`, `frontend/src/components/Badge.tsx`, `frontend/src/components/leave/LeaveDetailModal.tsx`, `frontend/src/app/(app)/leaves/LeaveHistoryList.tsx`, `frontend/src/app/(app)/attendance/AttendanceSheetView.tsx`, `frontend/src/lib/format.ts`, `frontend/src/messages/ja.ts`
- 테스트: test-plan.md 참조
- 재사용: `components/form.tsx`(secondaryButtonClass 등), `components/Skeleton.tsx`, `components/SectionError.tsx`, `lib/format.ts`(`formatDays`, `formatTokyoDateTime`)

## Modal 공통 변경 영향 대상(시각 확인 필수)
`app/(app)/dashboard/AttendanceSection.tsx`(출근·퇴근 확인), `dashboard/LeaveCalendarDayModal.tsx`, `admin/attendance/AttendanceEditModal.tsx`, `admin/departments/DepartmentFormModal.tsx`, `admin/departments/DepartmentDeleteModal.tsx`, `components/leave/LeaveApplyModal.tsx`, `components/leave/LeaveDetailModal.tsx`
- 확인 포인트: 푸터 구분선·padding, 긴 본문(신청 모달·날짜 상세 다수 인원)이 본문만 스크롤되는지, ApproverSelect 드롭다운 목록이 본문 `overflow-y-auto`에 잘리지 않는지(잘리면 보고 — 구현자가 임의로 구조 변경하지 말 것)

## 문서 갱신 예정
- `docs/09_DESIGN_SYSTEM.md` §2.1 의미별 매핑(경고 배지 = Yellow 40 배경 + general-100 글자, 아이콘 Yellow 100), §6 Badge 행(`warning`, `gap-1`), Modal 행(`icon`·`size`, 내부 스크롤, 푸터 구분선, 배경 스크롤 잠금, 바깥 클릭 미닫힘), `DetailTable` 행 신규, `LeaveStatusBadge` 행 신규, LeaveDetailModal 행(`LEAVE_STATUS_BADGE` 이동), LeaveFilterButtons 행(`LEAVE_STATUS_BADGE` 경로)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md` §4.4 처리자/처리 시간 "항상 표시, 미처리 —"
- `docs/10_DEVELOPMENT_ROADMAP.md` 해당 항목
