# test-plan — 부서 관리 화면 재구성 (SCR-010)

근거: `docs/06_API_SPECIFICATION.md` API-DEPT-002~006(+변경·신규는 design-backend.md), `docs/05_DATABASE_DESIGN.md` §1·§8, `docs/04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md` §5·§8, `docs/08_TEST_PLAN.md` §5.6(기존 IT-DEPT-* 회귀 유지). 책임자 규칙은 design-backend.md "책임자 규칙"(R1~R5 확정: 임의 활성 사원·겸임 허용·등록 시 지정 가능), 후보 API는 API-DEPT-009

## 0. 마이그레이션
- M1 `npm run db:migrate:test` 성공, 기존 부서의 description·manager_id = NULL
- M2 같은 사원을 두 부서의 manager_id로 직접 UPDATE → 성공(UNIQUE 없음) / 책임자로 지정된 사원 DELETE → FK RESTRICT 위반 / 책임자 지정된 부서 DELETE → 성공(raw SQL, e2e 1건씩). `departments(manager_id)` 인덱스 존재(pg_indexes)
- M3 `TestDataTracker.cleanup()`이 다른 부서·여러 부서의 책임자로 지정된 tracker 사원을 오류 없이 정리

## 1. Backend 통합(e2e) — `backend/test/admin-departments.e2e-spec.ts`
| ID | 시나리오 | 기대 결과 |
|---|---|---|
| B1 | sort 생략 | code 오름차순(IT-DEPT-05 회귀) |
| B2 | `sort=name&order=desc` | 이름 내림차순 |
| B3 | `sort=memberCount&order=desc`, 활성3·비활성5 vs 활성4·비활성0 | 활성 4 부서가 먼저 |
| B4 | memberCount 동률 | code 오름차순 |
| B5 | `sort=updatedAt&order=desc` | 최근 수정 부서 먼저 |
| B6 | memberCount 정렬 + name 검색 + page 2 | 검색·페이지 적용, totalCount 일치, 항목에 description·manager 포함 |
| B7 | `sort=foo` / `order=up` / `sort=code;DROP` | 400 VALIDATION_ERROR, field sort/order |
| B8 | GET summary | departmentCount = **未所属 제외** 부서 수, memberCount = 전체 활성 사원 수(테스트 전후 차이로 검증. 부서 1개 추가 시 +1, 未所属에 사원 추가 시 departmentCount 불변) |
| B9 | summary + `name` Query | 결과 동일 |
| B10 | `:id/members` 활성2·비활성1 | 2건, empId 오름차순, 키 id·empId·name만 |
| B11 | members limit=1 page=2 | 2번째 사원, totalCount 2 |
| B12 | members 없는 UUID / UUID 아님 | 404 / 400 field id |
| B13 | summary·members·manager-candidates·정렬 목록·POST/PATCH(managerId)를 EMPLOYEE / 비로그인 | 403 / 401 |
| B14 | `/summary`·`/manager-candidates`가 `:id`에 잡히지 않음 | 200 |
| B15 | 기존 IT-DEPT-01~(등록·수정·삭제·HAS_MEMBERS·PROTECTED) | 회귀 없음 |
| B16 | POST description 지정 / 생략 / `"  "` | 저장값 trim / null / null, 응답 manager null |
| B17 | POST·PATCH description 501자 / 500자 | 400 field description / 성공 |
| B18 | POST managerId = 활성 사원(다른 부서 소속) / null / 생략 | 201, manager `{id,empId,name}` / null / null |
| B18a | POST managerId = 비활성 사원 / 없는 UUID / `"abc"` | 400 INVALID_MANAGER(부서 미생성 확인) / 400 INVALID_MANAGER / 400 VALIDATION_ERROR field managerId |
| B19 | PATCH managerId = 그 부서 활성 사원 / **다른 부서 소속** 활성 사원 / ADMIN(요청자 본인) | 모두 200, `manager:{id,empId,name}`만 |
| B19a | 겸임: 같은 사원을 부서 A·B에 차례로 PATCH | 둘 다 200, A의 책임자 유지 |
| B20 | PATCH managerId = 비활성 사원 / 없는 UUID | 400 INVALID_MANAGER, 기존 책임자 불변 |
| B21 | PATCH managerId = `"abc"` | 400 VALIDATION_ERROR field managerId |
| B27 | GET manager-candidates(활성 A·비활성 B·요청 ADMIN) | A·ADMIN 포함, B 제외, empId 오름차순, 각 항목 키 정확히 id·empId·name·departmentName |
| B28 | manager-candidates `keyword`=이름 일부(대소문자 무시) / 사원번호 일부 / `"  "` / 101자 | 부분 일치만 / 부분 일치만 / 전체 / 400 field keyword |
| B29 | manager-candidates 상한 | 응답 ≤ 100건(활성 사원 101명 이상 만들기 비싸면 Service 단위에서 `take: 100` 전달로 검증) |
| B22 | PATCH managerId = null | 200, manager null(해제) |
| B23 | PATCH `{description:null}`만 / `{managerId:null}`만 | 200(빈 객체 아님으로 판정) / `{}`는 기존대로 400 |
| B24 | 未所属 PATCH managerId·description | 409 PROTECTED_DEPARTMENT(INVALID_MANAGER보다 우선) |
| B25 | 소속 사원 0명·다른 부서 사원이 책임자인 부서 DELETE / 활성 소속 사원 있는 부서 | 200(삭제, 책임자 사원 영향 없음) / 409 DEPARTMENT_HAS_MEMBERS(기존 규칙) |
| B26 | GET 상세·목록 | description·manager 포함, manager에 role·isActive 등 없음 |

## 2. Backend 단위 — `departments.service.spec.ts`, `dto/department-dto.spec.ts`
- DTO: sort·order 기본값·거부, description trim·빈 문자열→null·500자 경계, managerId UUID/null/형식 오류(create·update 모두), update refine(description·managerId만으로 통과), candidates keyword trim·100자
- Service: repository `invalidManager` → AppException 400 INVALID_MANAGER(create·update), members NOT_FOUND, summary 형태, candidates keyword 빈 값→undefined·상한 100 전달
- R2(비활성화 시 자동 해제)는 API-USER-004 미구현이라 **이번 테스트 대상 아님**(미검증 항목으로 보고). R3는 "해제하지 않음"으로 확정되어 구현 없음

## 3. Frontend 컴포넌트 — `DepartmentsView.test.tsx`, `DepartmentMembersModal.test.tsx`, `DepartmentFormModal.test.tsx`
| ID | 시나리오 | 기대 결과 |
|---|---|---|
| F1 | 초기 렌더 | 제목·설명·[部署を追加]·요약 2개·표(部署責任者·説明 열)·첫 행 선택 상세 |
| F2 | 요약 실패, 목록 성공 | 요약만 noValue |
| F3 | 목록 로딩/에러/0건 | Skeleton / SectionError / Empty, 상세 카드 숨김 |
| F4 | 검색 디바운스 | URL `name`, page 제거, API 전달 |
| F5 | 部署名 헤더 2회 | name asc → desc, aria-sort |
| F6 | 所属社員数 첫 클릭 | memberCount desc |
| F7 | [条件をクリア] | name·sort·order·page 제거 |
| F8 | 다른 행 선택 | 상세 갱신, aria-pressed |
| F9 | 상세 [この部署を編集] | 그 부서 값(説明·책임자 포함)이 채워진 모달 |
| F10 | memberCount>0 [削除] | API 호출 없이 토스트 |
| F11 | 삭제 성공 | 목록·요약 재조회 |
| F12 | 未所属 행·선택 | [編集][削除]·[この部署を編集] 없음, 「システム」 배지 |
| F13 | [所属社員確認] | 모달 표·0건·실패 |
| F14 | members 404 | 모달 닫힘·토스트·재조회 |
| F15 | 책임자·설명 없음 | 표·카드·상세에 noValue / 「未設定」 |
| F16 | 등록 모달 | 説明·部署責任者 입력 있음, 후보에서 다른 부서 사원 선택 → POST 본문 `managerId`=그 id / 미선택 → `managerId:null` |
| F17 | 수정 모달 후보 | `/admin/departments/manager-candidates` 호출(members API 아님), 옵션 「{name} ({empId}) / {部署名}」, 이름·사원번호 입력으로 필터, 현재 책임자 표시 |
| F18 | 후보 로딩/실패/0명/100건 | Skeleton / 이 화면 loadError 문구+재시도 / empty 문구 / 상한 힌트. 실패 시에도 説明 저장 가능(PATCH에 managerId 없음) |
| F19 | 책임자 입력 비우고 저장 / 설명 공백만 | PATCH `managerId:null` / `description:null` |
| F19a | ApproverSelect `texts` 미지정(LeaveApplyModal) | 기존 휴가 문구 그대로(기존 테스트 회귀 없음) |
| F20 | 説明 501자 | 클라이언트 에러, API 호출 없음 |
| F21 | 서버 INVALID_MANAGER | 책임자 FieldError에 서버 message, 모달 유지 |
| F22 | 모바일 카드(md 미만) | 책임자 행·説明 2줄 clamp 표시 |

## 4. E2E (Playwright, 개발 DB) — `frontend/e2e/departments.spec.ts`
- 관리자: 등록(설명 포함) → 부서명 검색 → 정렬 → 선택 상세 → 편집(설명 변경) → 삭제(0명)
- 등록 시 E2E 관리자(900001)를 책임자로 지정 → 표·상세에 표시. DEV 부서 편집에서도 같은 관리자 지정(겸임) → 입력 비워 해제(테스트 후 원상복구)
- 소속 사원 있는 부서 삭제 시 토스트, 所属社員確認 모달에 E2E 계정 표시
- 部署数 카드 = 목록 totalCount − 1(未所属) (검색 없는 상태)
- EMPLOYEE(900002) `/admin/departments` → `/dashboard`
- 1440·375: 페이지 가로 스크롤 없음, 버튼 뷰포트 안. 캡처 `.claude/work/department-redesign/screenshots/`

## 5. 정적 검증
- backend·frontend `npx tsc --noEmit`, `npm run lint`, `npm test`, backend `npm run test:e2e`(`db:migrate:test` 선행)
- 화면 코드에 hex 색·`text-[…]` 임의 크기 없음(grep)
