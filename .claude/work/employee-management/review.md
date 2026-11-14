VERDICT: APPROVE

# Round 2 재리뷰 (MODE: FULL, 수정 파일만)

전제(사용자 결정, 메인 확인 완료): 社員管理 화면의 모달 5종은 원형 아이콘(`iconVariant="circle"`)·`FormStack`을 쓰고, `Pagination boxed`·`StatCard iconCircle`도 이 화면 한정으로 레퍼런스대로 유지. UI_MODAL_PATTERNS·09에는 architect가 문서 반영 단계에서 社員管理 한정 예외로 추가(frontend.md Fix 3 「문서 갱신 예정」). 따라서 Round 1의 높음·중간(디자인시스템) 2건은 설계 위반으로 보지 않고, **문서 반영 누락 여부와 다른 화면 영향**만 확인했다.

검토 대상: frontend.md Fix 3, backend.md Fix 3·4, test-report.md Run 4·5, 수정 코드(`components/{Select,StatCard,Pagination,ConfirmDialog,JobTitleBadge}.tsx`, `users/{userFormRules.ts,RadioCardGroup.tsx,UserCreateModal,UserEditModal,UserDetailModal,UserDeleteDialog,EmpIdModeField,UsersView,JobTitlesModal,JobTitleTonePicker}`, `backend/prisma/e2e-users-cleanup.ts`, `users.repository.ts`, `job-titles/dto/job-title.dto.ts`), `frontend/e2e/users-job-titles.spec.ts`.

## Round 1 이슈 처리 결과
| Round 1 이슈 | 결과 |
|---|---|
| [높음] 모달 원형 아이콘·FormStack | 사용자 결정으로 유지. 화면 안 통일 완료: 社員追加·役職確認·社員編集(`FormStack`)·社員詳細·社員削除(`ConfirmDialog iconVariant`) 모두 circle. `iconVariant="circle"` 사용처는 `admin/users/` 5파일뿐이고(Grep), Modal·FormModal·ConfirmDialog 기본값은 `square`라 部署·대시보드·휴가 모달 외형 불변. 문서 갱신 예정에 UI_MODAL_PATTERNS I-4/D2/금지 목록의 社員管理 한정 예외(Modal/FormModal/ConfirmDialog `iconVariant`, `FormStack/FormStackRow`)가 기재됨 → **해결(문서 반영 대기)** |
| [중간] Pagination boxed·StatCard iconCircle | 이 화면 한정으로 승인. boxed+compact 조합에 `boxedCompactCellClass`(높이 36·min-w 32) 추가로 compact 무시 문제 해소(Pagination.tsx:48-50,88-94). `variant` 미지정 경로는 이전과 같은 클래스. 09 §3 Pagination `boxed`·`pageSize`, 09 §6 StatCard `iconCircle`이 문서 갱신 예정에 있음 → **해결** |
| [중간] 등록·편집 검증·라디오 중복 | `userFormRules.ts`(패턴·길이·`validateEmpId/Name/Email`·`mapUserApiError`)와 `RadioCardGroup.tsx`로 통합, 두 모달·EmpIdModeField가 공유. 서버와 같은 사원명 제어 문자 검증도 반영 → **해결** |
| [중간] 테스트 누락 | `shouldAddEditAndDeleteJobTitleThroughModal`에 실제 삭제 추가, 신규 `shouldReflectJobTitleColorChangeInUserListBadge`(실제 백엔드에서 사원에 배정 → 緑 → 黄 변경 후 社員一覧 배지 배경색 검증), UsersView.test에 부서·役職 필터·クリア 2건·목록 로딩·실패 6건 추가 → **해결** |
| [낮음] StatCard `violet` 미사용 | 삭제, 문서 예정도 정정 → 해결 |
| [낮음] 색 라벨 하드코딩 | `messages.jobTitles.tones`로 이동, `JOB_TITLE_TONES`는 tone·variant·swatchClass만 → 해결 |
| [낮음] FilterSelect 중복 | 공용 `Select`에 `size?: 'md'|'sm'` 추가 후 재사용. `md` 경로 클래스는 기존과 같다(`selectClass` + `pr-10 appearance-none` + disabled) → 해결 |
| [낮음] 削除 비활성 판정이 문구 비교 | `deleteBlocked` 상태(코드 `JOB_TITLE_IN_USE`)로 분리 → 해결 |
| [낮음] cleanup이 다른 사원 레코드 삭제 가능·役職 FK 전체 롤백 | Fix 4: 다른 사원의 휴가(approver/processedBy)·근태(modifiedBy)가 E2E 사원을 참조하면 아무것도 삭제하지 않고 건수·사번 출력 후 exit 1. 삭제는 `userId`가 E2E 사원인 것만. 役職은 `users: { none: {} }`만 삭제하고 사용 중은 이름 출력. Fix 3의 null화(CHECK 제약 위반)는 Run 4에서 검출되어 폐기됨. Run 5 테스트 DB 시나리오 A(중단·무변경)·B(정상 삭제·사용 중 役職 보존) PASS → 해결 |
| [낮음] constraint-name 중복 | 후속 과제로 명시(backend.md Fix 3). 범위상 타당 → 유지(개선 제안) |

## 추가 확인 (문제 없음)
- `users.repository.ts:110-132,281,373`: 예상 밖 오류를 에러 이름·코드만 로그에 남기고 공통 500 `AppException`으로 바꿈. Prisma 오류 메시지에 들어갈 수 있는 쿼리 인자(passwordHash 등)가 로그에 남지 않는다. 응답 형식은 AllExceptionsFilter의 500과 같다(`INTERNAL_SERVER_ERROR`/「サーバーでエラーが発生しました。」). Run 4 backend e2e 514/514 통과
- 役職名 제어 문자 거부(`job-title.dto.ts`)는 사원명과 같은 규칙. dto spec에 create·update 케이스 추가됨
- Run 4: frontend 단위 885/885, users*.spec 42/42, 회귀 18 spec 140/4(실패 4건은 Run 2에서 변경 전 커밋으로 재현된 기존 순서 의존·출근부 overflow로 범위 외)

## Round 2 이슈 (낮음만)

[낮음] [담당: backend] [분류: 문서갱신] backend.md Fix 3 「문서 갱신 예정」 — 役職名 제어 문자 거부를 docs/05에만 쓰기로 했는데, API 계약 쪽 06 API-JOB-002·003의 검증 문구 「役職名に使用できない文字が含まれています。」(400 VALIDATION_ERROR)도 문서 반영 대상에 넣을 것.

[낮음] [담당: backend] [분류: 중복구현] backend/src/common/prisma/constraint-name.ts vs departments.repository.ts:66-75 — Round 1에서 넘어온 항목. 후속 작업에서 통일(이미 backend.md 후속 과제로 기재).

[낮음] [담당: backend] [분류: 코드품질] users.repository.ts:110-132 — 예상 밖 오류를 요약만 남기고 500으로 바꾸는 처리가 users에만 있고, job-titles·departments repository는 그대로 다시 던진다. 지금은 비밀번호가 users에만 있으므로 타당하다. 같은 정책이 필요해지면 `common/`의 헬퍼로 옮기는 것을 검토(지금 할 필요는 없음).

## 문서 반영 단계 체크리스트 (architect용, 누락 방지)
- UI_MODAL_PATTERNS I-4·D2·금지 목록(L64·L78·L271): 社員管理(SCR-006: 社員追加·社員編集·社員詳細·社員削除·役職確認) 한정 예외로 `iconVariant='circle'`(Modal/FormModal/ConfirmDialog)·`FormStack/FormStackRow`·`RadioCardGroup` 기재
- 09 §3 Pagination `variant='boxed'`(+compact)·`pageSize`, Select `size='sm'` / §6 StatCard `iconCircle`, `JobTitleBadge`·`JOB_TITLE_TONES`·`messages.jobTitles.tones`, Badge `lavender`·`yellow` / §2.1 토큰 7개 / §5 SCR-006 레퍼런스 재현 예외
- 04 SCR-006: 社員数(활성 기준)과 목록 「全 N 名」(기본 すべて, 무효 포함)의 기준 차이 명시
- 05 役職名 제어 문자, 06 API-JOB-002·003 검증 문구(위 낮음 이슈)
- context.md: `users/userFormRules.ts`·`RadioCardGroup`, `lib/password-policy.ts`, users·job-titles 모듈 추가(「미구현 주의: API-USER-*」 문구 삭제), `db:e2e-users-cleanup`(참조 시 중단 동작 포함)

## 담당별 이슈 수 (Round 2)
- frontend: 0
- backend: 낮음 3
- tester: 0

---

# Round 1 (이력) — VERDICT: CHANGES_REQUESTED

검토 범위: plan.md·design-backend.md·design-frontend.md·test-plan.md, backend.md·frontend.md(Fix 1·2)·test-report.md(Run 1~3), 변경 코드 전부(backend users·job-titles·cleanup·constraint-name, frontend users/*·JobTitleBadge·Badge·StatCard·PageHeader·Pagination·Modal·FormModal·FormTable·password-policy·PasswordChangeForm·DepartmentMembersModal), users*.spec·단위 테스트, `docs/UI_MODAL_PATTERNS.md`, reference/01~03, screenshots/r3-main-1440·r3-create-1440.

## 확인 결과 (문제 없음)
- 役職 변경이 인증 Role에 영향 없음: `job-titles.repository.ts:62-80`은 job_titles만 갱신, users 행 미접촉. `adminCount`는 `role='ADMIN' AND isActive`(`users.repository.ts:192`), 役職 무관
- 채번 배타: AUTO는 `pg_advisory_xact_lock` → MAX(5자리) → INSERT를 한 트랜잭션에서 수행, MANUAL 충돌(P2002 `users_emp_id_key`) 시 최대 3회 재채번(`users.repository.ts:217-263`). 6자리 900001 제외, 99999 초과 null/409
- 무효화: 대상 행 `FOR NO KEY UPDATE`, ADMIN 강등·무효화 시 활성 ADMIN 전원을 id 순으로 선잠금 후 LAST_ADMIN 판정, PENDING 취소(processedBy=요청 ADMIN)·책임자 해제·refresh token 폐기를 같은 트랜잭션에서 처리(`users.repository.ts:268-353`). 재활성화는 플래그만
- 사용 중 役職 삭제: 사전 건수(비활성 포함) + DELETE의 P2003도 409 JOB_TITLE_IN_USE(`job-titles.repository.ts:83-106`)
- 초기 비밀번호: 서버 `checkPasswordPolicy` 재사용, 해시만 저장, details에 값 비에코, 응답에 해시·평문 없음
- 역할 색 단일 정의: `JOB_TITLE_TONES`(JobTitleBadge.tsx) 한 곳. DepartmentMembersModal의 로컬 배지·색 정의 제거, 공용 사용. users 폴더에 hex/rgb/임의 px 없음(Grep)
- E2E cleanup(Run 1 사고 재발 방지): 이름 접두사 AND 13자리 숫자 메일 AND 보호 사번(900001/900002, 10001~10100) 제외, 삭제 전 대상·비대상 출력. users.spec의 편집·삭제는 자기 생성 사원만 대상(`users.spec.ts:77-106`), 메일 변경 테스트 없음. Run 3에서 테스트 DB로 1건만 삭제 확인
- 기존 공용 컴포넌트 기본값: Badge/StatCard/PageHeader/Pagination/Modal/FormModal은 새 prop 미지정 시 기존 클래스 경로 유지(코드 확인). Run 1·2 전체 Playwright(departments-members-modal·modal-a11y 포함) 통과
- PasswordChangeForm은 `lib/password-policy.ts` 공유 후 메시지 매핑만 변경(동작 불변), docs/ 직접 수정 없음

## 이슈

[높음] [담당: frontend] [분류: 디자인시스템] Modal.tsx:18,95 / FormModal.tsx:16 / FormTable.tsx:40-63 / UserCreateModal.tsx:218,226-366 / JobTitlesModal.tsx:358 — Fix 2에서 모달 아이콘 `iconVariant="circle"`(淡紫 원형 48px)과 라벨 위 스택 `FormStack/FormStackRow`를 추가해 社員追加·役職確認에 적용함. 이는 `docs/UI_MODAL_PATTERNS.md` I-4(L64 "항상 `bg-primary-30` 박스"), D2(L78 "`FormTable` 배치, 라벨 위 스택은 모달에서 쓰지 않는다"), 금지 목록(L271 "모달 안 라벨 위 스택 배치")과 plan.md DOC_ISSUES (10) "모달 외형은 UI_MODAL_PATTERNS 유지"(사용자 승인), design-frontend.md "淡紫 원형 아이콘은 재현하지 않는다"에 정면으로 어긋난다. 또 Modal·FormModal·FormTable은 plan.md 파일 소유 범위 밖이다. / 영향: 확정된 모달 공통 패턴이 화면 단위 예외로 깨지고, 같은 화면 안에서도 社員追加(원형+스택)와 社員編集·社員詳細(사각+FormTable)가 다른 구조가 된다(frontend.md Fix 2 "잔차분"에 미결로 남음). 문서 갱신 예정에도 UI_MODAL_PATTERNS 변경이 빠져 있다. / 수정 방향: (a) 승인된 설계대로 사각 아이콘 + `FormTable`로 되돌리고 `iconVariant`·`FormStack`을 삭제하거나, (b) 사용자가 레퍼런스 재현을 명시적으로 승인했다면 그 근거를 plan.md에 기록하고 UI_MODAL_PATTERNS(I-4·D2·금지 목록)·09 §5·§6 갱신을 문서 갱신 예정에 넣은 뒤 社員編集·社員詳細까지 같은 구조로 맞출 것.

[중간] [담당: frontend] [분류: 디자인시스템] Pagination.tsx:13,45-95,111-118 / StatCard.tsx:13-14,73 — `Pagination variant="boxed"`와 `StatCard iconCircle`은 SCR-006 한 곳에서만 쓰는 일회성 variant이고 승인된 설계(Pagination은 `pageSize`만 추가)에 없다. 다른 목록 화면(部署·勤怠·休暇)의 페이지네이션과 외형이 달라진다. 또 boxed는 `compact`의 셀 폭 축소를 무시한다(`cell = boxed ? boxedCellClass : ...`, 84-85행. 생략 기호만 compact 적용). / 영향: 같은 역할의 공용 컴포넌트가 화면별로 다른 모양이 되어 09 §3 Pagination 기준이 흐려지고, 좁은 폭에서 compact 의도가 boxed에서 반영되지 않음. / 수정 방향: 위 높음 이슈와 같은 결정으로 처리한다. 유지한다면 09 §3·§6에 표준으로 기록하고 boxed+compact 조합의 셀 크기를 정의할 것. 아니면 삭제.

[중간] [담당: frontend] [분류: 중복구현] UserCreateModal.tsx:30-33,87-116,169-196 / UserEditModal.tsx:24-27,151-170,217-250 / EmpIdModeField.tsx:55-77 vs UserEditModal.tsx:51-92 — 社員ID·社員名·メール 검증 상수(`EMP_ID_PATTERN`·`EMAIL_PATTERN`·`NAME_MAX_LENGTH`·`EMAIL_MAX_LENGTH`)와 검증 로직, 서버 오류(DUPLICATE_EMP_ID·INVALID_DEPARTMENT·INVALID_JOB_TITLE·400 details) → 필드 매핑이 두 모달에 그대로 복제돼 있고, 라디오 카드 UI(클래스 문자열까지 동일)도 `EmpIdModeField`와 `RadioChoice`로 두 번 구현됨. / 영향: 사원 입력 규칙을 바꿀 때 두 곳을 같이 고쳐야 하고 누락 시 등록·편집 검증이 어긋난다(이미 서버의 사원명 제어 문자 거부는 두 곳 모두 미반영). / 수정 방향: `admin/users/userFormRules.ts`(패턴·길이·`validateEmpId/Name/Email`·서버 오류 매핑)와 공용 라디오 카드 그룹(예: `RadioCardGroup`)을 users 폴더에 두고 두 모달·EmpIdModeField가 함께 쓸 것.

[중간] [담당: tester] [분류: 테스트] frontend/e2e/users-job-titles.spec.ts:22-42 / src/app/(app)/admin/users/UsersView.test.tsx — `shouldAddEditAndDeleteJobTitleThroughModal`은 이름과 달리 삭제를 하지 않고(생성한 E2E役職는 cleanup이 지움), test-plan §4의 "編集(색 변경) → 닫은 뒤 社員一覧 배지 색 변경 확인"과 "미사용 삭제"가 E2E에 없다(이번 기능의 핵심인 색의 전 화면 반영이 실제 백엔드로 검증되지 않음). UsersView 단위 테스트에는 test-plan §3의 부서·役職 필터 변경 → page 1, [クリア], 목록 로딩·목록 실패(SectionError) 케이스가 없다. / 영향: 색 반영·필터 회귀를 테스트가 잡지 못함, 테스트 이름이 실제 검증과 불일치. / 수정 방향: E2E에서 생성한 E2E 사원에 새 役職를 배정 → 색 변경 → 社員一覧 행 배지의 배경색이 새 tone 토큰인지 확인, 미사용 E2E役職 삭제까지 수행(또는 테스트 이름 정정 + 별도 테스트). UsersView.test에 필터 2종·クリア·목록 loading/error 케이스 추가.

[낮음] [담당: frontend] [분류: 코드품질] StatCard.tsx:4,15,27 — 설계상 3번째 카드용으로 추가한 tone `violet`이 실제로는 사용되지 않음(UsersView.tsx:360은 레퍼런스에 맞춰 `danger`). 사용처 없는 공용 variant. 쓰지 않으면 삭제하고, 문서 갱신 예정(09 §6 "StatCard tone violet")도 정정할 것.

[낮음] [담당: frontend] [분류: 컨벤션] JobTitleBadge.tsx:12-19 — 색 라벨(紫·青·グレー…, radio의 접근 가능한 이름)이 컴포넌트에 하드코딩됨. context.md "프론트 문구는 반드시 messages(ja.ts)에서 참조". `messages.jobTitles.tones[tone]`로 옮기고 `JOB_TITLE_TONES`는 tone·variant·swatchClass만 가지게 할 것.

[낮음] [담당: frontend] [분류: 중복구현] UsersView.tsx:83-129 — `FilterSelect`가 공용 `Select`의 chevron SVG·구조를 복제함(공용 Select는 placeholder가 disabled 옵션이라 「すべて」 선택을 못 하는 사정은 이해됨). 이 패턴이 다른 목록 화면에도 필요해지면 `Select`에 선택 가능한 빈 옵션·size를 추가하는 방향으로 통합 검토.

[낮음] [담당: frontend] [분류: 코드품질] JobTitlesModal.tsx:337 — 削除 버튼 비활성 판정을 `deleteError === t.inUse`(표시 문구 비교)로 함. 문구가 바뀌면 동작이 깨지므로 `inUse` boolean 상태로 분리할 것.

[낮음] [담당: backend] [분류: 코드품질] backend/prisma/e2e-users-cleanup.ts:68-79,83-85 — 휴가·근태 삭제 조건에 `approverId`·`processedBy`·`modifiedBy`가 포함돼, E2E 사원이 승인자·처리자인 **다른 사원**의 레코드까지 삭제될 수 있음(현재 E2E 흐름에선 발생하지 않음). 또 役職 삭제가 같은 트랜잭션이라, E2E役職이 보호 사원에게 배정돼 있으면 FK로 전체 롤백되어 E2E 사원 정리도 실패함. 다른 사원 레코드는 삭제 대신 건수를 출력하고 중단하거나, 役職 삭제를 사용 중이 아닌 것으로 한정(`users: { none: {} }`)할 것.

[낮음] [담당: backend] [분류: 중복구현] backend/src/common/prisma/constraint-name.ts:9 vs departments.repository.ts:66-75 — 같은 driverAdapterError 파싱이 두 곳에 있음. 이번 범위(departments는 import 변경만)상 그대로 둔 것은 타당하므로, 후속 작업에서 departments도 `violatedConstraintOf`로 통일 권장.

## 참고 (이슈 아님)
- 요약 「社員数」(활성 기준)과 목록 제목 「全 N 名」(기본 ステータス=すべて, 무효 포함)의 수치가 다르게 보인다(r3-main-1440: 93 vs 103). 승인된 결정(4)·(11)대로이나, 04 SCR-006 갱신 시 기준 차이를 명시할 것
- 削除 확인의 LAST_ADMIN을 Notice 대신 토스트로 표시한 것, 표/카드 전환을 xl로 바꾼 것은 frontend.md에 근거가 있어 수용

## 담당별 이슈 수 (Round 1)
- frontend: 높음 1 / 중간 2 / 낮음 4
- backend: 낮음 2
- tester: 중간 1
