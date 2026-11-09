VERDICT: APPROVE

# 근태 관리 — 코드 리뷰 (Round 1)

## 총평
- 백엔드: API-ATT-004~006, API-DEPT-001이 design-backend.md 계약(기본 기간, 366일, 상태 WHERE, 정렬, INVALID_TIME_RANGE 3조건, 404 조건, `modifiedAt`)과 일치한다. 계층 분리, `Clock` 사용, `@AdminOnly()`, zod DTO 모두 컨벤션대로다. `userId` 파라미터를 받지 않는다. 높음 이슈 없음
- 프론트: SCR-003·SCR-008 필수 요소(검색 조건, 컬럼, 퇴근 누락 강조와 툴팁, 관리자 수정 비고, 사원명 링크, 수정 모달 2단계, Empty·Error·Loading, URL Query 유지)와 `/admin/*` 가드가 구현됐다. 하드코딩된 hex·rgb·px 값 없음(Grep 확인). 시스템 컴포넌트(Card, Badge, Modal, SkeletonLines, SectionError, form.tsx)를 그대로 쓴다
- `docs/`는 수정하지 않음(git status 확인)
- 테스트: test-plan의 I-01~I-31과 E-01~E-03 작성·실행 완료. DB 상태 검증(modified_by, 변경 없음)까지 포함돼 assertion 품질이 좋다

## 이슈

[중간] [담당: frontend] [분류: 문서갱신] .claude/work/attendance/frontend.md:28 — "문서 갱신 예정"의 SCR-003·SCR-008 항목에 실제로 문서와 달라진 점 세 가지가 빠져 있다. (1) 퇴근 없음·근무 시간 없음을 `-` 대신 `—`(`messages.common.noValue`)로 표시 (2) URL의 기간이 순서·366일 규칙을 어기면 기본값으로 바꾸지 않고 오류를 보여 주며 목록 카드를 숨김 (3) SCR-008 근무일도 요일을 붙여 표시(`formatWorkDate`. design-frontend.md는 SCR-008에 `formatDate`를 쓰기로 했음) / 세 항목을 문서 갱신 예정에 넣고, (3)은 "설계와 다른 점"에도 적는다

[중간] [담당: tester] [분류: 테스트] frontend/src/app/(app)/attendance/AttendanceHistoryView.test.tsx:142 — F-13 "툴팁 문구" assertion은 md 미만 카드 목록에 바로 보이는 문구만으로 통과하므로 `Tooltip`의 동작은 검증하지 않는다. 새로 만든 시스템 컴포넌트 `Tooltip`에는 테스트가 하나도 없다 / `components/Tooltip.test.tsx`를 추가해 hover와 focus 시 `role="tooltip"`이 표시되는지, 트리거의 `aria-describedby`가 연결되는지, Esc를 누르면 닫히는지 검증한다

[낮음] [담당: frontend] [분류: 버그] frontend/src/app/(app)/admin/attendance/AdminAttendanceView.tsx:75,101 — URL에 `departmentId`가 있는데 `/departments`가 아직 로딩 중이거나 실패하면 Select는 「すべて」로 보이지만 목록 조회에는 그 부서 조건이 그대로 들어간다. 이 상태에서 [照会]를 누르면 부서 조건이 조용히 사라진다(`selectedDepartmentId`가 ''). 화면에 보이는 조건과 실제 조회 조건이 어긋난다 / 부서 목록이 성공적으로 로드된 뒤에만 "목록에 없음 → すべて"를 적용하거나, 로딩·실패 중에는 form 값을 유지한다

[낮음] [담당: frontend] [분류: 컨벤션] frontend/src/lib/date-range.ts:23 — `AttendanceFilterStatus`가 `lib/api/types.ts`의 `AttendanceStatus`와 같은 union을 다시 정의한다(frontend.md에는 "AttendanceStatus 재사용"이라고 적혀 있음). `MISSING_ROW_CLASS`도 두 View에 중복돼 있다 / `AttendanceStatus`를 재사용하고, 행 강조 클래스는 `attendanceStatus.ts`로 옮긴다

[낮음] [담당: frontend] [분류: 버그] frontend/src/app/(app)/attendance/AttendanceHistoryView.tsx:83 (AdminAttendanceView.tsx:108 동일) — URL의 `page`가 totalPages보다 크면 Empty 문구만 나오고 Pagination이 없어 돌아갈 방법이 없다 / `items.length === 0 && totalCount > 0`이면 Pagination을 표시하거나 1페이지로 안내한다

[낮음] [담당: backend] [분류: 컨벤션] backend/src/modules/departments/departments.{controller,service,repository}.ts — 응답 타입 `{ id: string; name: string }[]`가 세 파일에 중복돼 있다 / `DepartmentSummary` 같은 타입 하나로 묶는다

[낮음] [담당: tester] [분류: 테스트] frontend/e2e/attendance.spec.ts — E-02가 퇴근 시각을 공란으로 되돌리는 정리 작업이 finally나 afterEach에 있지 않아, 중간에 실패하면 다음 실행의 E-01 전제가 깨진다(test-report에 적힌 내용) / 정리 작업을 `afterEach`나 `try/finally`로 옮긴다

[낮음] [담당: tester] [분류: 테스트] backend/test/admin-attendance.e2e-spec.ts — ATT-005·006의 403 PASSWORD_CHANGE_REQUIRED 케이스가 없다(design-backend.md 에러 목록에 있음). ATT-004(I-08)에서만 검증한다 / 전역 Guard 경로라 위험은 낮지만 한 건 추가를 권장한다

## 참고 (이슈 아님)
- `-` 대신 `—`로 표시한 것은 기존 대시보드 표기와 맞추기 위한 것이라 타당하다. 문서 갱신만 필요하다
- 신규 공용 모듈 `lib/useSyncedState.ts`, `components/attendance/DateRangeFields.tsx`, 관리자 가드는 docs-update 단계에서 context.md "공용 모듈"에 반영하고 "아직 없음"에서 관리자 가드를 지운다

---

# Round 2

대상: frontend.md "Fix 1", test-report.md Run 3에서 수정한 파일
- frontend/src/app/(app)/admin/attendance/AdminAttendanceView.tsx
- frontend/src/app/(app)/attendance/AttendanceHistoryView.tsx
- frontend/src/lib/date-range.ts
- frontend/src/components/attendance/attendanceStatus.ts
- frontend/src/components/Tooltip.test.tsx (신규), frontend/src/app/(app)/attendance/AttendanceHistoryView.test.tsx (F-13)
- frontend/e2e/attendance.spec.ts (E-02)
- backend/test/admin-attendance.e2e-spec.ts (ATT-005·006 403)

## Round 1 이슈 처리 확인
- [중간][frontend][문서갱신] 해결. frontend.md "화면 리스트와 다른 점"에 (3) `formatWorkDate`와 URL 기간 오류 처리를 적었고, "문서 갱신 예정"에 (1)~(3)을 모두 넣었다. `MISSING_ROW_CLASS`도 09 문서 갱신 대상에 추가함
- [중간][tester][테스트] 해결. `Tooltip.test.tsx` 7건이 hover·mouseLeave·focus·blur·Esc(hover/focus)·Esc 외 키·`aria-describedby` 연결/제거를 모두 검증한다. F-13은 `within(table)`로 표 안의 트리거를 hover해 `role="tooltip"`의 문구와 `aria-describedby` id 연결을 확인하므로 모바일 문구로 통과할 수 없다
- [낮음][frontend] 부서 조건 소실: 처리. `departments.status !== 'success'`이면 form 값을 유지하므로 [照会] 시 조건이 사라지지 않는다
- [낮음][frontend] 타입·클래스 중복: 처리. `AttendanceFilterStatus` 삭제 후 `AttendanceStatus` 사용, `MISSING_ROW_CLASS`를 `attendanceStatus.ts`에서 두 View가 import
- [낮음][frontend] 범위 밖 page: 처리. 두 View 모두 `items.length === 0 && totalCount > 0`이면 Pagination 표시
- [낮음][tester] E-02 정리: 처리. try/finally로 옮겼고 저장 시도 플래그로 불필요한 복원을 막는다
- [낮음][tester] ATT-005·006 403 PASSWORD_CHANGE_REQUIRED: 처리. 006은 DB 변경 없음까지 검증
- [낮음][backend] `DepartmentSummary` 타입 중복: 미처리(이번 Fix 범위 밖). 아래에 제안으로 남긴다

## 이슈 (Round 2)

[낮음] [담당: frontend] [분류: 버그] frontend/src/app/(app)/admin/attendance/AdminAttendanceView.tsx:77-78,265-277 — 부서 조회가 로딩 중이거나 실패하면 `selectedDepartmentId`가 URL 값으로 유지되지만 일치하는 `<option>`이 없어 Select는 「すべて」로 보인다. 화면 조건과 실제 조회 조건이 여전히 다르고, 실패 상태에서는 「すべて」가 이미 선택된 것처럼 보여 change 이벤트가 나지 않으므로 사용자가 부서 조건을 지울 방법이 없다(frontend.md Fix 1에 미처리로 적혀 있음) / 부서 목록이 success가 아니고 `form.departmentId`가 있으면 임시 option(예: 「選択中の部署」)을 하나 넣거나 Select를 disabled로 표시한다

[낮음] [담당: backend] [분류: 컨벤션] backend/src/modules/departments/departments.{controller,service,repository}.ts — Round 1 제안 그대로. 응답 타입 중복을 `DepartmentSummary` 하나로 묶는다

## 참고 (이슈 아님)
- 하드코딩 색상·px 값은 수정 파일에서 새로 생기지 않았다
- test-report Run 3: frontend 단위 202건, backend e2e 229건, Playwright 18건 통과. `npm run build` 미실행과 E-02 finally 실패 경로 미확인은 보고서에 미검증으로 명시돼 있다
