# test-plan: 사원 役職(직책 마스터)·連絡先 (employee-position-contact)

근거: `docs/06_API_SPECIFICATION.md` 「API-DEPT-008」, `docs/08_TEST_PLAN.md` 5.6(IT-DEPT-33·35), `docs/04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md` 「소속 사원 확인」, `docs/05_DATABASE_DESIGN.md` §0 「외래 키」, design-backend.md, design-frontend.md.
테스트 데이터는 가명·`example.com`만(실제 개인정보 금지). 테스트 DB는 migrate만 하므로 직책은 `TestDataTracker.createJobTitle`로 만든다.

## 1. DB 스키마 — `backend/test/db/schema.e2e-spec.ts` (e2e, 테스트 DB)
| ID | 시나리오 | 기대 결과 |
|---|---|---|
| DB-1 | information_schema로 users.job_title_id·contact_email 확인 | uuid / varchar(254), NULL 허용, 기본값 없음 |
| DB-2 | job_titles 컬럼 확인, `job_title_tone` ENUM 값 조회(pg_enum) | name varchar(50) NOT NULL, tone `job_title_tone` NOT NULL 기본 'GRAY', created_at·updated_at / ENUM 값 정확히 GRAY·BLUE·VIOLET·PINK |
| DB-3 | 두 컬럼 없이 사원 INSERT / tone 없이 직책 INSERT | 성공, 사원 두 값 NULL / tone = GRAY |
| DB-4 | 같은 name 직책 2건 INSERT | UNIQUE 위반 |
| DB-5 | 없는 job_title_id로 사원 INSERT | FK 위반 |
| DB-6 | 사원이 참조 중인 직책 DELETE | 실패(RESTRICT), 참조 없는 직책 DELETE는 성공 |
| DB-7 | tone에 ENUM 외 값('RED', 구 값 'INFO') / name 51자 / contact_email 255자 | 실패 |
| DB-8 | 같은 contact_email을 2명에게 저장 | 성공(UNIQUE 없음, Q2) |

## 2. API 통합 — `backend/test/admin-departments.e2e-spec.ts`
| ID | 시나리오 | 기대 결과 |
|---|---|---|
| IT-DEPT-33(개정) | 활성 2명(1명은 직책(tone VIOLET)·contactEmail 지정, 1명 NULL)·비활성 1명 소속 부서 조회 | 200, 활성 2명만 empId 오름차순, 키는 정확히 id·empId·name·jobTitle·contactEmail. 지정 사원 `jobTitle`이 정확히 `{id,name,tone:'VIOLET'}`(그 외 키 없음) / NULL 사원은 `jobTitle: null`·`contactEmail: null`(키 존재) |
| IT-DEPT-33b | 없는 id / UUID 형식 오류 | 404 NOT_FOUND / 400 VALIDATION_ERROR (회귀) |
| IT-DEPT-35(회귀) | EMPLOYEE의 members 조회 / 비로그인 | 403 / 401 (연락처 비노출) |
| IT-DEPT-37(신규) | 직책·연락처를 가진 사원에 대해 API-DEPT-009(manager-candidates)·`GET /departments`·`GET /auth/me` 응답 | `contactEmail`·`jobTitle`·`jobTitleId` 키 없음(노출 범위 회귀, Q5) |

## 3. Backend 단위·DB — 데이터 스크립트
- `backend/prisma/initial-data.spec.ts`: `JOB_TITLES`가 4개(マネージャー:VIOLET, リーダー:BLUE, エンジニア:GRAY, デザイナー:PINK), name 중복 없음·50자 이하. (DB를 쓰는 기존 seed 테스트가 있으면) seed 2회 실행해도 직책 4건(중복 없음), 이미 있는 직책의 tone을 바꿔 둔 뒤 재실행해도 덮어쓰지 않음, `createdJobTitleCount` 정확
- `backend/prisma/sample-users-data.spec.ts`: 100명 모두 contactEmail이 `user{empId}@example.com`·이메일 형식·254자 이하, jobTitleName은 `JOB_TITLES` 이름 또는 null이며 null이 1명 이상, 4개 직책이 모두 등장, 두 번 생성해도 동일(결정적)
- 샘플 삽입(가능하면 DB 테스트): seed 직책이 없으면 「先に npm run db:seed」 에러로 아무것도 바꾸지 않음 / 기존 샘플 사원의 jobTitleId·contactEmail이 정의값으로 갱신, 샘플 범위 밖 사원은 변경 없음
- `backend/prisma/e2e-account-data.spec.ts`: admin 정의 = `マネージャー`·`e2e-admin@example.com`, initial = null·null. reset 후 값이 정의대로 되돌아감(값을 바꿔 둔 뒤 reset). 직책이 없으면 에러·롤백

## 4. Frontend 컴포넌트 — `DepartmentMembersModal.test.tsx`
| ID | 시나리오 | 기대 결과 |
|---|---|---|
| FE-1 | 값 있는 사원·NULL 사원 응답 | columnheader 5개(社員番号·氏名·部署·役職·連絡先, 순서), 役職 Badge 텍스트(name)·連絡先 텍스트 표시 / NULL 사원은 두 칸 「—」 |
| FE-2 | tone 4종(GRAY·BLUE·VIOLET·PINK) 사원 | 각 役職 배지에 `BADGE_VARIANT_CLASS`의 neutral·info·violet·pink 클래스 적용(violet = `bg-violet-30 text-violet-110`, pink = `bg-pink-30 text-pink-110`) |
| FE-2b | Badge variant 추가 회귀 | 기존 variant 클래스 값 불변(기존 Badge 사용 화면 테스트 통과), 컴포넌트 소스에 Hex 직접 기재 없음(리뷰 확인) |
| FE-3 | 連絡先 표시 | `mailto` 링크 없음, 아이콘은 `aria-hidden` |
| FE-4 | 役職 값으로 검색(예 「マネージャー」) | 검색 대상 아님 → 이름에 없으면 「条件に一致する社員は見つかりませんでした。」 |
| FE-5 | Loading·Empty·Error 상태 | 상태 셀이 5열 전체(`colSpan=5`), 헤더 유지 (기존 기대값 갱신) |
| FE-6 | 기존 회귀 | 전 페이지 수집, 404 1회 처리, 재시도, 인원 수 유지 테스트 통과 |

## 5. Playwright — `frontend/e2e/departments-members-modal.spec.ts` (개발 DB, `db:seed` → `db:e2e-accounts` 후)
| ID | 시나리오 | 기대 결과 |
|---|---|---|
| E2E-1 | 1440: 가장 큰 부서 모달 | 열 5개, 행 수 = API 전체 수 (기존 3열 기대값 교체) |
| E2E-2 | 1440: 開発部(DEV) 모달에서 900001·900002 행 | 900001 행에 「マネージャー」 배지·「e2e-admin@example.com」, 900002 행에 「—」 2개 |
| E2E-2b | 1440: 「マネージャー」 배지 computed style | 배경 `#F1EBFD`·글자 `#6D28D9`(rgb 비교) — 토큰이 실제 적용되는지 확인 |
| E2E-3 | 375x667 | 다이얼로그가 뷰포트 안, `document` 가로 넘침 없음, 표 래퍼 안에서 連絡先 열까지 가로 스크롤로 도달 가능 |
| E2E-4 | 빈 부서 | Empty 문구, 열 5개 |
- 스크린샷: `.claude/work/employee-position-contact/screenshots/`(1440·375, `db:sample-users` 후 4색 배지·「—」 포함). 레퍼런스 이미지와 비교(マネージャー 보라·リーダー 파랑·エンジニア 회색·デザイナー 분홍이 레퍼런스와 같은 계열인지)

## 6. 실행
- backend: `npm run db:migrate:test` 후 `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run test:e2e`
- frontend: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`(개발 DB `npm run db:migrate` → `db:seed`(직책 등록) → `db:e2e-accounts`, 필요 시 `db:sample-users`)
