# test-plan — 사원 관리·役職 관리·사원 등록

근거: design-backend.md 「API 계약」(에러 코드·문구), design-frontend.md 「테스트 근거 문구」, `docs/08_TEST_PLAN.md` 권한 매트릭스(§ 사원 관리 행)·SCR-006 행(초기 비밀번호 규칙 검증). 문구는 설계 문서의 일본어를 그대로 쓴다.

## 1. Backend unit (Vitest, `backend/src/modules/**/*.spec.ts`)
- `users/emp-id-generator.spec.ts`: 5자리 없음 → `00001` / `[00001, 10001..10100, 900001]` → `10101`(6자리 무시) / `00009` → `00010`(0채움) / `99999` → null(채번 불가) / 숫자 아닌 값 무시
- `users/employment-status.spec.ts`: 오늘 = hireDate → ACTIVE, 내일 → UPCOMING, isActive false(미래 입사 포함) → INACTIVE. 도쿄 날짜 경계(UTC 15:00 전후)
- `users/dto/*.spec.ts`: create — MANUAL empId 누락·비숫자·51자리 400, AUTO empId 무시, name 101자·제어 문자(`\n`·`\r`·`\t`) 거부, contactEmail 공백 trim·형식·255자, jobTitleId·departmentId 누락, hireDate 실재하지 않는 날짜, `initialPassword` 누락(「初期パスワードを入力してください。」)·정책 위반(`abcdefgh`·`12345678`·7자 → 「パスワードは8文字以上で、英字と数字を含めてください。」)·73바이트(「パスワードは72バイト以内で入力してください。」)·129자 거부·72바이트 정확히 허용, 앞뒤 공백 비제거, 오류 details에 입력값이 에코되지 않음, 미지 필드 거부(strict) / update — 빈 객체, `departmentId:null`·`hireDate:null` 거부, `initialPassword` 거부(strict), `jobTitleId:null`·`contactEmail:''`→null 허용 / query — status 허용값, keyword 101자, hireDateFrom>To
- `job-titles/dto/*.spec.ts`: name trim·0자·51자, tone 8값 외 거부, update 빈 객체
- 기존 `departments.service.spec.ts`·`common/security/password-policy.spec.ts` 회귀

## 2. Backend API 통합 (Supertest + 테스트 DB, `backend/test/`)
`admin-users.e2e-spec.ts`
- 권한: 엔드포인트 전부 × (비로그인 401 / EMPLOYEE 403 / mustChangePassword 403 PASSWORD_CHANGE_REQUIRED / ADMIN 성공)
- 목록: keyword가 empId·name·contactEmail 각각 부분 일치, `%`·`_` 문자 그대로, departmentId·jobTitleId·status(ACTIVE/UPCOMING/INACTIVE, FixedClock) 필터, AND 결합, 정렬 hireDate→empId, limit=10 페이지네이션(totalCount·totalPages), 항목 키(jobTitle null 포함·employmentStatus), 기존 Query(name·empId·role·approvalRequired·isActive·hireDate 기간) 동작
- 요약: 비활성 제외, adminCount는 Role 기준(役職 マネージャー인 EMPLOYEE는 미포함), 이번 달 입사(FixedClock 월 경계: 말일·다음 달 1일), 비활성 이번 달 입사 제외
- next-emp-id: `{empId}` 예정 번호, 99999 존재 시 `{empId: null}`
- 등록 AUTO: 201·5자리 다음 번호·mustChangePassword true·isActive true, DB 해시가 입력한 initialPassword와 bcrypt 일치, 그 번호·비밀번호로 로그인 성공 후 PASSWORD_CHANGE_REQUIRED 흐름, 99999 존재 시 409 EMP_ID_EXHAUSTED
- 평문 비노출: 201·400 응답 JSON 문자열에 입력한 비밀번호가 없음, 응답에 `initialPassword`·`passwordHash` 키 없음, Logger 출력(spy)에 비밀번호 없음
- 등록 동시성: AUTO 5건 병렬 → 모두 201, empId 전부 다름 / MANUAL로 예정 번호를 먼저 점유한 뒤 AUTO → 다음 번호로 재채번
- 등록 MANUAL: 중복 409 DUPLICATE_EMP_ID(앞자리 0 유지 `00123` vs `123`은 다른 번호), 앞뒤 공백 trim
- 등록 실패: 비밀번호 정책 위반 400 details field `initialPassword`(사원 미생성), 없는 부서 400 INVALID_DEPARTMENT, 없는 직책 400 INVALID_JOB_TITLE, 검증 400 details(field명)
- 상세: 200(leaveGrants year 내림차순, pendingApprovalCount), UUID 형식 오류 400, 없음 404
- 수정: 각 필드 변경, empId 중복 409, jobTitleId null 해제, contactEmail '' → null, 직책 변경이 role 불변, 비밀번호 필드 400
- 비활성화: PENDING 신청 → CANCELLED(processedBy=요청 ADMIN), 책임자 부서 manager_id NULL(겸임 2부서), refresh token revoked, 할당된 타인 PENDING 유지, 이후 로그인 401. 재활성화 가능
- LAST_ADMIN: 유일 활성 ADMIN 비활성화·강등 409, ADMIN 2명일 때 동시 상호 비활성화 → 1건만 성공
- 물리 삭제 엔드포인트 없음(DELETE /admin/users/:id → 404), 재발급 엔드포인트 없음(POST /admin/users/:id/initial-password → 404)

`admin-job-titles.e2e-spec.ts`
- 권한 매트릭스(위와 같음)
- 목록: createdAt asc 정렬, userCount(비활성 사원 포함)
- 등록 201, 새 tone(LAVENDER·GREEN·YELLOW·ORANGE) 저장, 이름 중복 409 DUPLICATE_JOB_TITLE_NAME(trim 후 비교)
- 수정: 이름·색 변경, 중복 409, 없음 404, 빈 객체 400. 변경 후 API-DEPT-008·API-USER-001 응답의 tone이 바뀜
- 삭제: 미사용 204, 사용 중(활성·비활성 사원) 409 JOB_TITLE_IN_USE, 없음 404
- 마이그레이션: 기존 seed 4개의 name·tone 보존(`test/db/schema.e2e-spec.ts`에 enum 8값 확인 추가)

## 3. Frontend 컴포넌트 (Vitest + Testing Library, `frontend/src/**/*.test.tsx`)
- `components/JobTitleBadge.test.tsx`: tone 8개 → 해당 variant 클래스, pill, null → 「—」
- `components/Pagination.test.tsx`(추가): `pageSize` 지정 시 「全 120 件中 11 – 20 件を表示」, 마지막 페이지 to = total, 미지정 시 기존 문구
- `components/StatCard.test.tsx`·`PageHeader` 회귀(새 prop 선택적)
- `lib/password-policy.test.ts`(신규) + 기존 `PasswordChangeForm` 테스트 회귀(이동 후 동작 불변)
- `admin/users/UsersView.test.tsx`: 요약 3값 표시, 목록 열·배지·상태 배지, 검색 디바운스 후 keyword Query·page 1 리셋, 필터 3종 변경 → page 1, クリア, URL Query 복원, Empty·Error·Loading, INACTIVE 행 削除 숨김, 행 버튼 aria-label
- `JobTitlesModal.test.tsx`: 목록 N건, 追加 → 이름 필수·색 필수 오류, 스와치 선택 → 프리뷰 배지 이름·색 즉시 반영(radio aria-checked), 키보드 화살표 이동, 저장 성공 토스트·목록 재조회·onChanged 호출, 중복 409 필드 오류, 편집 초기값, 삭제 확인 → 409 IN_USE 문구, 삭제 성공
- `UserCreateModal.test.tsx`: 기본 自動生成 + 예정 번호 표시(읽기 전용, 입력 불가), `empId: null` 처리, 直接入力 전환 시 입력란, 필수 검증 7항목 문구(初期パスワード 포함), 비밀번호 정책 위반 문구, password 입력이 `type="password"`, 메일 형식, 役職 선택 시 배지 표시, 제출 중 버튼 loading·두 번 클릭해도 POST 1회, POST 바디에 initialPassword 포함, 성공 → 모달 닫힘·토스트(확정 社員ID 포함)·onCreated 호출, 409 DUPLICATE_EMP_ID·EMP_ID_EXHAUSTED 필드 오류, 400 details 매핑(initialPassword 포함), 500 → Notice error, 다시 열면 입력값(비밀번호 포함) 초기화
- `UserEditModal.test.tsx`: 초기값, 비밀번호 항목 없음, 변경 없으면 保存 disabled, 변경 필드만 PATCH, 有効→無効 확인 단계, LAST_ADMIN 오류
- `UserDetailModal.test.tsx`·`UserDeleteDialog.test.tsx`: 표시 항목, pendingApprovalCount 경고, PATCH `{isActive:false}`
- `DepartmentMembersModal.test.tsx` 회귀(공용 배지 사용, pill)

## 4. Playwright E2E (`frontend/e2e/`, 개발 DB, 1440·1024·390·375)
사전: `db:seed`·`db:sample-users`(10001~10100)·E2E 계정. 생성 데이터 이름은 `E2E社員`·`E2E役職` 접두사, beforeAll·afterAll에서 `npm run db:e2e-users-cleanup`
- `users.spec.ts`(1440): 페이지 표시·요약 값이 API와 일치, 검색(empId·이름·메일), 부서·役職·ステータス 필터, 페이지네이션(10건, 2페이지 이동, 검색 시 1페이지 복귀), 詳細 모달, 編集 저장 후 행 반영, 削除 → 상태 「無効」·요약 社員数 감소, 비관리자 접근 차단(기존 AppShell 가드)
- `users-job-titles.spec.ts`(1440): 役職確認 열기·목록, 追加(이름+緑) → 목록·프리뷰, 編集(색 변경) → 닫은 뒤 社員一覧 배지 색 변경 확인, 해당 직책 사원이 있는 부서의 所属社員確認 모달(SCR-010) 배지 색도 변경 확인, 사용 중 삭제 차단 문구, 미사용 삭제
- `users-create.spec.ts`(1440): 自動生成 예정 번호 표시 → 初期パスワード 입력 → 등록 → 토스트·목록에 확정 번호로 표시·요약 갱신·리로드 없음(페이지 내 상태 유지 확인), 直接入力 중복 번호 오류, 필수 검증, 비밀번호 정책 위반 문구, 役職·部署 선택, 서버 실패(route로 500 주입) 오류 표시, 더블 클릭 시 POST 1회(request 카운트), 등록한 社員ID·初期パスワード로 로그인 → `/password` 이동
- `users-responsive.spec.ts`(1024·390·375): `document.documentElement.scrollWidth <= innerWidth`, 필터 스택 배치, 모바일 카드 목록, 役職確認 행에서 배지와 버튼 bounding box 비겹침, 社員追加 세로 배치·본문 내부 스크롤(390×640 등 낮은 높이)·footer 버튼 가시성, 페이지네이션 1행
- 스크린샷: 1440·390에서 페이지·役職確認·社員追加 3장씩 `test-results/` 저장 → test-report.md에 레퍼런스 이미지와의 차이(레이아웃·색·간격)를 항목별로 기록(자동 비교 아님)

## 5. 보안 점검 관점 (security 참고)
모든 엔드포인트 ADMIN 전용, 초기 비밀번호 서버 측 정책 검증·bcrypt 해시만 저장·mustChangePassword=true·응답/로그/오류 details에 평문 없음, strict DTO(필드 주입 방지), LIKE 이스케이프, LAST_ADMIN·비활성화 처리(토큰 폐기) 트랜잭션, 직책 변경이 Role에 영향 없음

## 6. 회귀
backend unit·e2e 전체, frontend Vitest 전체, Playwright 기존 spec(특히 `departments-members-modal`, `modal-a11y`, `button-*`, `password`), 타입체크·lint 양쪽

승인 피드백 Round 1: 메일 발송·재발급 시나리오 추가(Round 2에서 전부 삭제)
승인 피드백 Round 2: 초기 비밀번호 관리자 입력 시나리오(DTO 정책·평문 비노출·로그인 확인·UI 입력)로 교체, 메일·Mailpit·재발급·FakeMailSender 시나리오 삭제, next-emp-id `{empId:null}` 반영
