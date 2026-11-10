# 부서 관리 — 프론트엔드 설계

## 참조 문서
- `docs/03_SCREEN_LIST.md` 화면 표, Screen Access Rules, Common UI Rules(상태 처리·목록·모달·전역 내비게이션)
- `docs/04_SCREEN_SPECIFICATIONS/SCR-006_USER_LIST.md` (같은 "검색 + 표 + 등록 모달" 구성의 기준)
- `docs/09_DESIGN_SYSTEM.md` §4 화면 대응(SCR-006 행), §6 구현된 공용 컴포넌트
- API 상세는 `design-backend.md` §4

## 화면 (신규)
| ID | 화면명(일본어) | 라우트 | 권한 |
|---|---|---|---|
| SCR-010 | 부서 관리(部署管理) | /admin/departments | 관리자 |
- 사이드바: `ADMIN_MENU`에서 "社員管理"와 "全体勤怠" 사이(`/admin/users` → `/admin/departments` → `/admin/attendance`). 라벨 `messages.nav.adminDepartments = '部署管理'`
- 라우트 가드: `/admin/*`이므로 AppShell 기존 가드가 그대로 적용(추가 구현 없음)

## SCR-010 구성
1. 페이지 제목 `text-h5` 「部署管理」 + 우측 [新規登録] (`primaryButtonClass`)
2. 검색 조건(`Card` 안): 部署コード(Input `inputClass`), 部署名(Input), [検索](`primaryButtonClass`). `sm` 이상 1행, 미만은 세로 배치
3. 목록(`Card` + `table.ts` `thClass`/`tdClass`): 部署コード / 部署名 / 所属社員数(`memberCount` = 활성 사원 수, `tabular-nums`, 「N名」) / 更新日(`lib/format.ts`) / 操作([編集][削除] `textButtonClass`). code 오름차순(서버 정렬)
   - 표 위 보조 문구(14/20 `general-80`): 「所属社員数は有効な社員のみを数えます。」
   - `isSystem = true` 행(未所属): 部署名 옆 `Badge` neutral 「システム」, 操作 열에 [編集][削除]를 표시하지 않음(Q9-A)
   - `md` 미만: SCR-008·SCR-005와 같은 카드형 목록(기존 `AdminAttendanceView`의 좁은 폭 패턴 재사용)
4. `Pagination`(20건). 검색 조건·page는 URL Query(`code`, `name`, `page`) 유지, 조건 변경 시 1페이지(03 목록 규칙). `useSyncedState` 사용
5. 상태: Loading `SkeletonLines`, Empty 「条件に一致する部署がありません。」, Error `SectionError`

## 모달
### 등록·수정 모달 `DepartmentFormModal` (`Modal` 사용, 열 때마다 `key` 변경)
- 필드: 部署コード(필수, placeholder 「例: DEV」, 안내 「半角英数字とハイフン、20文字以内」), 部署名(필수, 100자)
- footer: [キャンセル](`secondaryButtonClass`) [登録する]/[保存する](`primaryButtonClass`, 요청 중 `Spinner`+비활성)
- 클라이언트 검증(trim 후): 미입력 「部署コードを入力してください。」「部署名を入力してください。」 / 형식 「部署コードは半角英数字とハイフンで20文字以内で入力してください。」 / 길이 「部署名は100文字以内で入力してください。」 → `FieldError` + `aria-invalid`
- 서버 409 DUPLICATE_DEPARTMENT_CODE/NAME → 해당 필드 아래 서버 message 표시(SCR-006의 DUPLICATE_EMP_ID와 같은 처리)
- 성공: 모달 닫기 + 토스트 「部署を登録しました。」/「部署を更新しました。」 + 목록 재조회
- 수정 시 404·409 PROTECTED_DEPARTMENT → 모달 닫기 + 서버 message 토스트 + 목록 재조회(03 모달 404 규칙과 같은 처리)

### 삭제
- 판단 기준은 `memberCount`(활성 사원 수)뿐이다. 서버 판단과 같다(Q4-B)
- `memberCount > 0` 행의 [削除]: API를 호출하지 않고 에러 토스트 「所属する社員が存在するため、部署を削除できません。」(버튼은 활성 유지, Q5-A)
- `memberCount = 0`: 확인 모달(`Modal`) 본문 「部署「{name}」を削除しますか？」. `inactiveMemberCount > 0`이면 아래에 안내 「無効の社員 {n} 名は「未所属」部署に移動されます。」를 추가(0이면 표시 안 함). footer [キャンセル] [削除する](`primaryButtonClass`, 위험 동작 전용 스타일은 시스템에 없으므로 추가하지 않음)
  - 안내를 넣는 이유: 비활성 사원의 부서가 바뀌는 부수 효과를 관리자가 모른 채 실행하지 않도록
- 서버 409 DEPARTMENT_HAS_MEMBERS(경합: 확인 중 활성 사원 배정·재활성화) → 모달 닫기 + 서버 message 토스트 + 목록 재조회 / 409 PROTECTED_DEPARTMENT·404 → 같은 처리
- 성공 204 → 토스트 「部署を削除しました。」 + 재조회(현재 페이지가 비면 이전 페이지로)

## 신규 컴포넌트
- 시스템 컴포넌트 신규 없음. 화면 전용 `DepartmentFormModal`, `DepartmentDeleteModal`만 화면 폴더에 둔다(재사용 대상 아님 → 09 §6 추가 불필요)

## 사원 관리(SCR-006·007)와의 연관 — 이번에는 문서만, 구현은 사원 관리 작업에서
- SCR-006 등록 모달·SCR-007 기본 정보의 부서 Select: 필수 O, 초기값 미선택(placeholder 「選択してください」), 미선택 시 「部署を選択してください。」. 未所属도 선택지에 포함(Q10-A, GET /departments 그대로)
- SCR-006 목록 "부서" 열의 "없으면 `-`" 삭제(항상 존재). 검색 조건 부서 Select는 그대로
- 부서 목록 조회 실패 시 기존 규칙(SCR-006 §9) 유지 — 필수 필드이므로 등록 버튼 비활성
- 기존 화면(대시보드·SCR-005·008, ApproverSelect, LeaveDetailModal)의 `departmentName ?? noValue` 대체 표시는 남겨도 무해 → 수정하지 않음

## 호출 API
- GET /admin/departments?code&name&page&limit=20 / POST /admin/departments / PATCH·DELETE /admin/departments/:id (`apiFetch`, 조회는 `useApiQuery`)
- 에러 처리: 403 FORBIDDEN 토스트(03), 네트워크 오류 토스트, 처리 실패는 서버 message 토스트

## 파일
생성
- `frontend/src/app/(app)/admin/departments/page.tsx` (서버, metadata 「部署管理」)
- `frontend/src/app/(app)/admin/departments/DepartmentsView.tsx` + `DepartmentsView.test.tsx`
- `frontend/src/app/(app)/admin/departments/DepartmentFormModal.tsx` + `.test.tsx`
- `frontend/src/app/(app)/admin/departments/DepartmentDeleteModal.tsx`
- `frontend/e2e/departments.spec.ts`
수정
- `frontend/src/components/layout/Sidebar.tsx` (ADMIN_MENU), `components/layout/AppShell.test.tsx` 또는 Sidebar 테스트(메뉴 순서)
- `frontend/src/messages/ja.ts` (`nav.adminDepartments`, `departments` 섹션)
- `frontend/src/lib/api/types.ts` (`DepartmentDetail` 타입: `memberCount`, `inactiveMemberCount`, `isSystem` 포함. 기존 `Department {id,name}`는 그대로)
재사용
- `components/Modal.tsx`, `Card.tsx`, `Pagination.tsx`, `SectionError.tsx`, `Skeleton.tsx`, `Toast.tsx`, `Spinner.tsx`, `form.tsx`, `table.ts`, `lib/api/useApiQuery.ts`, `lib/useSyncedState.ts`, `lib/format.ts`
- 패턴 참고: `app/(app)/admin/attendance/AdminAttendanceView.tsx`(URL Query·표·카드형), `AttendanceEditModal.tsx`(모달 폼·에러 처리)
