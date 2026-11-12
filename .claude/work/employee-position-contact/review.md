VERDICT: APPROVE

# review: 사원 役職(직책 마스터)·連絡先 (employee-position-contact) — Round 1

## 총평
- 마이그레이션·스키마는 설계와 일치한다: `job_title_tone` ENUM(GRAY·BLUE·VIOLET·PINK), `job_titles`(name VARCHAR(50) UNIQUE, tone 기본 GRAY), `users.job_title_id` UUID NULL FK `ON DELETE RESTRICT ON UPDATE CASCADE`, `contact_email` VARCHAR(254) NULL. 다른 차이·데이터 INSERT 없이 기존 행은 NULL로 남는다. 인덱스를 추가하지 않은 근거도 설계에 적혀 있다. database-rules §3·§9·§10·§12 위반은 없다.
- seed는 `createMany({ skipDuplicates })`로 멱등이고 기존 직책 tone을 덮어쓰지 않는다. 초기 ADMIN에는 연락처를 넣지 않는다.
- 샘플 스크립트는 10001~10100만, E2E 스크립트는 900001·900002만 대상으로 한다. 직책이 없으면 트랜잭션 전(샘플) 또는 트랜잭션 안(E2E)에서 실패하므로 아무것도 바뀌지 않는다.
- `TestDataTracker.cleanup`은 users를 지운 뒤 job_titles를 지운다(RESTRICT 순서 정상).
- 공개 범위: `contactEmail`·`jobTitle`을 select하는 곳은 `departments.repository.ts` `findMembersPage`(ADMIN 전용 API-DEPT-008) 하나뿐이다. `USER_SUMMARY_SELECT`·auth `USER_SELECT`는 바뀌지 않았고 `include`도 없다. IT-DEPT-37로 회귀를 막는다.
- 연락처 입력 API·UI가 없으므로(Q3) 런타임 형식 검증 대상은 없다. 샘플·E2E 값은 고정된 `example.com` 주소다.
- 프론트: Hex는 globals.css `@theme`에만 있고 컴포넌트는 토큰 클래스만 쓴다. Badge variant와 Modal `xl`은 추가만 했으므로 기존 화면에는 영향이 없다(`BADGE_VARIANT_CLASS`를 쓰는 StatusFilterButtons도 영향 없음). `docs/` 직접 수정도 없다.
- 지적은 테스트 시나리오 누락과 문서 갱신 예정 누락에 몰려 있다.

## 이슈

[중간] [담당: tester] [분류: 테스트] backend/test/db/seed.e2e-spec.ts:124-126 — test-plan §3의 "이미 있는 직책의 tone을 바꿔 둔 뒤 재실행해도 덮어쓰지 않음" 시나리오가 없다. 124행 주석은 "色味は seed の指定どおり"라고 하지만 실제로는 건수만 확인한다 / 각 직책의 tone이 JOB_TITLES와 같은지 assert하고, 한 직책의 tone을 바꾼 뒤 seed를 다시 실행해도 그 값이 유지되는 케이스를 추가한다(테스트 후 원래 값으로 되돌린다).

[중간] [담당: tester] [분류: 테스트] backend/test/db/e2e-accounts.e2e-spec.ts:151-159, 194-236 — test-plan §3 E2E 시나리오 일부가 빠졌다. ① initial(900002) 계정의 `jobTitleId: null`·`contactEmail: null`을 검증하지 않는다. ② "값을 바꿔 둔 뒤 reset하면 정의값으로 돌아감"에서 jobTitleId·contactEmail 변경과 복원을 다루지 않는다. ③ "직책이 없으면 에러·롤백"이 없다 / ①②는 기존 케이스에 assert를 추가하고, ③은 존재하지 않는 jobTitleName을 가진 config로 reset했을 때 에러가 나고 사용자·토큰이 바뀌지 않는지 확인한다.

[중간] [담당: tester] [분류: 테스트] frontend/src/app/(app)/admin/departments/DepartmentMembersModal.test.tsx:164-170, 216-226 — FE-1의 "columnheader 5개, 순서"를 확인하지 않는다(존재 여부만 본다). FE-5의 "상태 셀 colSpan=5"도 Loading·Empty·Error 어디에서도 검증하지 않는다 / `getAllByRole('columnheader')`의 텍스트 배열을 `[社員番号, 氏名, 部署, 役職, 連絡先]`와 비교하고, 상태 셀에 `colSpan` 5를 assert한다.

[중간] [담당: tester] [분류: 테스트] frontend/e2e/departments-members-modal.spec.ts:225-239 — `shouldShowDesignerBadgeColorInHrDepartmentForScreenshot`은 선택 스크립트 `db:sample-users`의 데이터(人事部의 デザイナー)가 있어야 통과한다. globalSetup은 E2E 계정만 초기화하므로 샘플이 없는 환경에서는 실패한다 / 사전 조건을 API로 확인해 없으면 `test.skip`하고 사유를 남기거나, 테스트가 직접 데이터를 준비하도록 바꾼다. 파일 머리 주석에도 선행 조건을 적는다.

[중간] [담당: backend] [분류: 문서갱신] .claude/work/employee-position-contact/backend.md:28-31 — plan.md가 지정한 08(5.6 IT-DEPT-33 개정, IT-DEPT-37 신규, DB 스키마 테스트)과 10(로드맵) 갱신 예정이 backend.md·frontend.md 어디에도 없다 / 「문서 갱신 예정」에 08 TC 개정·신규 항목(IT-DEPT-33 응답 키, IT-DEPT-37 공개 범위, DB job_titles·FK RESTRICT·ENUM)과 10 진행 상태 갱신을 추가한다.

[낮음] [담당: backend] [분류: 컨벤션] backend/prisma/sample-users.ts:4, 33 — 머리 주석 "登録済みの社員はパスワードだけを更新する"와 로그 "パスワード更新 N 名"이 실제 동작(役職·連絡先도 갱신)과 맞지 않는다 / 주석과 로그 문구를 "パスワード・役職・連絡先を更新"으로 고친다(건수만 출력하는 방식은 유지).

[낮음] [담당: backend] [분류: 컨벤션] backend/prisma/seed.ts:1, backend/prisma/initial-data.ts:89 — 주석 "部署と初期 ADMIN 1 名のみ", "部署と初期 ADMIN を投入する"에 役職이 빠져 있다 / "部署・役職・初期 ADMIN"으로 고친다.

[낮음] [담당: tester] [분류: 테스트] backend/prisma/sample-users-data.spec.ts:159 — 테스트 이름 `shouldUpdateOnlyPasswordHashForExistingAndCreateTheRest`가 이제 役職·連絡先 갱신까지 검증한다 / 이름을 동작에 맞게 바꾼다(예: `shouldUpdatePasswordJobTitleAndContactForExistingAndCreateTheRest`).

[낮음] [담당: frontend] [분류: 테스트] frontend/src/components/Modal.tsx:14-18 — 공용 Modal에 `xl`을 추가했지만 Modal.test에는 해당 케이스가 없다. 1440에서 連絡先이 잘리지 않는 것(Fix 1)도 Playwright로 고정되어 있지 않다 / Modal.test에 `size="xl"` → `max-w-200` 케이스를 추가하고, 1440 spec에서 표 래퍼의 `scrollWidth <= clientWidth`를 assert하는 것을 고려한다.

## 확인만 (이슈 아님)
- `min-w-[40rem]`는 rem 임의 값이고 설계에 명시된 값이다. px 하드코딩이 아니므로 허용한다(`min-w-160`으로 바꿔도 된다).
- 部署 열 info 배지와 リーダー(BLUE→info)가 같은 색인 것은 설계에서 허용했다.
- Modal `xl`(max-w-200)은 승인 범위 밖의 공용 컴포넌트 변경이지만, test-report Run 1의 실패를 고치기 위한 최소 추가이고 기존 md·lg 값은 바뀌지 않았다. frontend.md Fix 1에 09 갱신 예정도 적혀 있어 타당하다고 본다.

## 담당별 개수
- backend: 중간 1, 낮음 2
- frontend: 낮음 1
- tester: 중간 4, 낮음 1

---

# Round 2

## 대상
- backend.md "Fix 1", test-report.md "Run 3"(RESULT: PASS)에서 수정된 파일만 확인했다: `backend/prisma/sample-users.ts`, `seed.ts`, `initial-data.ts`(주석), `backend/test/db/seed.e2e-spec.ts`, `backend/test/db/e2e-accounts.e2e-spec.ts`, `backend/prisma/sample-users-data.spec.ts`(이름), `frontend/src/app/(app)/admin/departments/DepartmentMembersModal.test.tsx`, `frontend/src/components/Modal.test.tsx`, `frontend/e2e/departments-members-modal.spec.ts`.

## Round 1 지적 해소 여부
- [중간] seed tone 미덮어쓰기: 해소. 첫 실행 뒤 4개 직책의 tone이 JOB_TITLES와 같은지 확인하고(124-129행), マネージャー를 PINK로 바꾼 뒤 재실행해도 `createdJobTitleCount` 0·tone PINK·id 동일을 확인한다. finally에서 원래 tone으로 되돌린다(134-155행).
- [중간] e2e-accounts 시나리오: 해소. ① initial의 null·null을 assert(159-160행). ② 두 계정의 役職·連絡先을 다른 값으로 바꾼 뒤 reset하면 정의값으로 돌아오는지 확인(210-246행). ③ `shouldThrowAndChangeNothingWhenJobTitleIsMissing`에서 에러 문구, 管理者·初回 사용자 행 전체(`toEqual`), 리프레시 토큰 건수가 그대로인지 확인한다(300-337행). 앞서 처리되는 管理者의 연락처를 미리 바꿔 두므로 롤백을 실제로 검증한다.
- [중간] FE 헤더 순서·colSpan: 해소. `columnHeaderTexts()`로 5열 순서를 비교하고, Loading·Empty·Error 상태 셀에 `colspan="5"`를 assert한다. 값 있는 행과 NULL 행의 셀 순서 검증도 추가되었다.
- [중간] 人事部 デザイナー Playwright: 해소. 파일 머리 주석(8-9행)에 선행 조건을 적었고, 본문에서 API로 HR 전체 사원을 조회해 デザイナー가 없으면 사유와 함께 `test.skip`한다.
  - 조건부 skip이 test-plan 의도와 맞는지: 맞다고 본다. test-plan은 4색 배지 캡처를 "`db:sample-users` 후"로 두고 실행 순서에서도 sample-users를 "필요 시"로 적었다. 즉 pink 확인은 선택 데이터에 의존하는 보조 검증(캡처 비교용)이다. 토큰이 실제로 적용되는지 확인하는 필수 시나리오 E2E-2b(マネージャー violet computed style)는 globalSetup 데이터만으로 항상 실행되므로 skip 때문에 필수 커버리지가 빠지지 않는다. HR 부서 자체가 없으면 skip이 아니라 실패하도록(`expect(hr).toBeDefined()`) 나눈 것도 적절하다. Run 3에서는 skip 0으로 실제 실행·통과했다.
- [중간] 문서 갱신 예정 08·10: 해소. backend.md Fix 1에 08(IT-DEPT-33 개정, IT-DEPT-37 신규, DB 스키마 테스트 항목)과 10(로드맵 진행 상태) 갱신 예정이 추가되었다.
- [낮음] sample-users.ts 주석·로그: 해소(4·33행). 건수만 출력하는 방식도 유지되어 개인정보 로그 출력은 없다.
- [낮음] seed.ts·initial-data.ts 주석: 해소(seed.ts 1행, initial-data.ts 1·89행).
- [낮음] sample-users-data.spec 테스트 이름: 해소(Run 3 보고 기준).
- [낮음] Modal xl 테스트: 해소. `shouldUseXlWidthWhenRequested`가 `max-w-200`과 다른 폭 클래스가 없음을 확인한다. tester가 추가했지만 테스트 코드이고 구현 변경은 없으므로 문제없다.

## 새 문제
- 높음·중간 없음. 구현 코드 변경은 backend 주석·로그 문구뿐이고 동작은 바뀌지 않았다. `docs/` 직접 수정도 없다.

## 이슈 (Round 2)

[낮음] [담당: tester] [분류: 테스트] backend/test/db/seed.e2e-spec.ts:137 — 새 tone 테스트는 `findUniqueOrThrow`로 マネージャー가 이미 있다고 가정하므로, 앞 테스트(직책 등록)에 의존한다. 이 테스트만 따로 실행하면(`-t`) 테스트 DB에 직책이 없을 때 실패한다 / 테스트 안에서 먼저 `seedAndTrack`을 한 번 실행해 직책을 준비하는 방식을 고려한다(제안).

## 담당별 개수 (Round 2)
- backend: 0
- frontend: 0
- tester: 낮음 1
