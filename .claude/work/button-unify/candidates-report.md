# 추가 공통화 후보 보고서 (button-unify, 코드 변경 없음)
조사 기준: 현재 작업 트리(DetailButton·EditButton 적용 후). 행 번호는 근사치.

## 1. 削除
- 사용: SCR-010 행 `DepartmentsView.tsx:118`(dangerOutline sm + TrashIcon + 「削除」), SCR-006 행 `UsersView.tsx:148`·役職確認 `JobTitlesModal.tsx:214`(dangerOutline sm **iconOnly** + TrashIcon), 확정 `ConfirmDialog` tone danger(`DepartmentDeleteModal.tsx:58/66`, `UserDeleteDialog.tsx:63/68`, `JobTitlesModal.tsx:~353`), `UserEditModal.tsx:234`(danger md 無効化).
- 차이: 행 버튼이 화면에 따라 문구 포함/아이콘 전용으로 갈림. 문구 키가 `departments.delete`/`users.delete`/`jobTitles.delete`로 3중. `TrashIcon`이 `admin/departments/icons.tsx`에 있어 users가 라우트 간 import.
- 공통화: 가능. 권장 `DeleteButton`(dangerOutline + Trash, `iconOnly` 지원, 기본 문구 `messages.common.delete`)을 `ActionButtons.tsx`에 추가. `TrashIcon`을 `leaveIcons.tsx`로 이동. 확정 단계(danger md)는 ConfirmDialog가 이미 공통이라 대상 외.

## 2. 登録·追加
- 사용: 페이지 헤더 primary lg + PlusIcon(`DepartmentsView.tsx:461` 部署を追加, `LeaveManagementLayout.tsx:62` 休暇申請, 社員追加(UsersView)), 役職 [追加] primary md + Plus(`JobTitlesModal.tsx:233`), `FormModal` submit primary md(문구 登録/追加する/申請する/保存する — `DepartmentFormModal.tsx:188`, `UserCreateModal.tsx:192`, `LeaveApplyModal.tsx:192`).
- 차이: 외형(variant·size·아이콘)은 규칙대로 일관. 불일치는 문구 키(`create`·`submit`·`add`)뿐.
- 공통화: 헤더용 `CreateButton`(primary lg + Plus)은 가능하나 사용처 3곳·문구가 화면별(部署を追加 등)이라 이득 작음. 우선순위 낮음. FormModal submit은 이미 공통.

## 3. 保存
- 사용: `JobTitlesModal.tsx:324`「保存」, `UserEditModal`「保存」(disabled `!hasChanges`), `AttendanceEditModal`「保存」(검증 후 확인 단계 진입), 部署 `DepartmentFormModal`「保存する」(`departments.form.save`).
- 차이: 문구 「保存」/「保存する」 혼재. 모두 primary md.
- 공통화: 버튼 컴포넌트보다 **문구 통일**(`messages.common.save`) 권장. 결정 필요(「保存」 vs 「保存する」: 確認文 짝 유무).

## 4. キャンセル·閉じる·戻る
- 사용: 취소 secondary md — `FormModal.tsx:52`, `ConfirmDialog.tsx:59`, `AttendanceEditModal.tsx:129`, `UserEditModal.tsx:211`, `JobTitlesModal.tsx:321`. 닫기 — `DepartmentDetailModal.tsx:31`, `DepartmentMembersModal.tsx:323`, `UserDetailModal.tsx:104`, `JobTitlesModal.tsx:353`, `LeaveDayModal.tsx:29`, `LeaveDetailModal.tsx:242`. 戻る — `AttendanceEditModal.tsx:112`, 休暇取消 `leave.cancel.back`.
- 차이: 외형은 모두 secondary md로 일치. 문구 키 중복: `common.cancel` vs `users.cancel`·`jobTitles.cancel`·`password.cancel`, `common.close` vs `users.close`·`jobTitles.close`·`departments.detailModal.close`·`membersModal.close`, 戻る 2중.
- 공통화: 컴포넌트 불필요(Button 직접 사용이 이미 일관). 중복 문구 키를 `common.cancel/close/back`으로 통합 권장(저위험).

## 5. 承認·却下
- 사용: `ApprovalsView.tsx` 행(承認 primary sm / 却下 secondary sm), `LeaveDetailModal.tsx:~254-270`(却下 secondary / 承認 primary md), 확정 「承認する」「却下する」(`leaves.approve/reject.submit`).
- 차이: 却下가 secondary(위험 색 아님, B11 결정). 행·모달 문구 키가 `approvals.approve/reject`와 `leaves.detail.approve/reject`로 분리.
- 공통화: `ApproveButton`/`RejectButton` 프리셋 가능(사용처 2곳×2). 이득 작음. 키 통합만 권장.

## 6. 検索·初期化
- 사용: 검색 primary lg + submit(`LeaveHistoryList.tsx:256`, `AttendanceHistoryView.tsx:257`, `AdminAttendanceView.tsx:310`), 초기화 secondary md(`DepartmentsView.tsx:497` 条件をクリア, `UsersView.tsx:527` クリア).
- 차이: 문구 「検索」/「照会」(`attendance.search`), 「条件をクリア」/「クリア」. 아이콘 없음으로 일치.
- 공통화: 문구 통일(`common.search`, `common.clear`) 권장. 컴포넌트는 불필요.

## 7. 모달 하단 액션
- `FormModal`·`ConfirmDialog`가 공통 footer. 직접 footer를 쓰는 모달: `AttendanceEditModal`(단계형 2종), `UserEditModal`, `JobTitlesModal`(목록/폼 2종), `LeaveDetailModal`, `DepartmentDetailModal`, `UserDetailModal`, `DepartmentMembersModal`, `LeaveDayModal`.
- 패턴 2종으로 정리 가능: (a) 닫기 1개(상세·목록 조회) (b) 닫기 + 수정 입구(`EditButton size="md"`, 상세 2종). 단계형 3종(Attendance·JobTitles·LeaveDetail)은 단계 key 재마운트 규칙이 있어 현행 유지 권장.

## 8. 기타
- 所属社員 [確認](`DepartmentsView.tsx` 표·카드, 확인 모달 여는 secondary sm 문구 버튼): 詳細과 다르므로 변경 안 함. 「詳細」로 통일할지 별도 결정 필요.
- SCR-008 확인 단계 「修正する」(Q1 유지)·`adminAttendance.modal.*` 「修正」 문구는 버튼 외라 그대로(문구 정책 정리 시 같이 결정).
- **우선순위 제안**: ① DeleteButton + TrashIcon 이동 ② 중복 문구 키 통합(cancel/close/back/save/search/clear) ③ 나머지는 불필요.
