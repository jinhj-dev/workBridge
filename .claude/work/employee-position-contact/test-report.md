RESULT: PASS

# test-report: 사원 役職(직책 마스터)·連絡先 (employee-position-contact)

## Run 1 (2026-11-12)

### 실행 환경
- 개발 백엔드 6000(PID 75448, 20:45:57 빌드), 프론트 개발 서버 3000(기존 프로세스 재사용)
- API-DEPT-008 확인: `GET /api/v1/admin/departments/{人事部 id}/members`가 200을 반환하고 `jobTitle`({id,name,tone})·`contactEmail`을 포함. 500 아님. 서버 재기동 없음.
- backend e2e: 테스트 DB `workbridge_test`, `npm run db:migrate:test` → "No pending migrations".
- frontend vitest: PowerShell 경유.

### 작성·수정한 테스트 파일
- `backend/test/db/schema.e2e-spec.ts`: DB-1(information_schema, users.job_title_id·contact_email), DB-2(job_titles 컬럼, pg_enum 값 GRAY·BLUE·VIOLET·PINK), DB-6 보강(참조 없는 직책 삭제 성공), DB-7(ENUM 외 'RED'·구 값 'INFO' 거부, name 51자 거부, contact_email 255자 거부), DB-8(같은 contact_email 2명 저장 가능)을 추가.
- `backend/test/admin-departments.e2e-spec.ts`: IT-DEPT-37 추가. API-DEPT-009(manager-candidates)·`GET /departments`(EMPLOYEE 토큰)·`GET /auth/me`에 jobTitle·jobTitleId·contactEmail 키가 없고 연락처 값도 노출되지 않음을 확인.
- `frontend/src/app/(app)/admin/departments/DepartmentMembersModal.test.tsx`: FE-3 추가(連絡先 평문, mailto 링크 없음, 아이콘 aria-hidden).
- `frontend/e2e/departments-members-modal.spec.ts`: E2E-2(開発部 900001 행 「マネージャー」·e2e-admin@example.com, 900002 행 「—」 2개), E2E-2b(배지 computed style: 배경 rgb(241,235,253)·글자 rgb(109,40,217)), E2E-3 보강(375에서 連絡先 헤더까지 가로 스크롤로 도달), 人事部의 デザイナー 배지 pink 색 확인 및 캡처 테스트 추가.

### 실행 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| backend 타입 | `npx tsc --noEmit` | 통과 |
| backend lint | `npm run lint` | 통과 |
| backend 단위 | `npm test` | 22 파일, 323/323 통과 |
| backend e2e | `npm run test:e2e` | 15 파일, 416/416 통과 (기존 411 + 신규 5) |
| frontend 타입 | `npx tsc --noEmit` | 통과 |
| frontend lint | `npm run lint` | 통과 |
| frontend 단위 | `npx vitest run`(PowerShell) | 45 파일, 654/654 통과 |
| frontend build | `npm run build` | 통과 |
| Playwright 신규·모달 | `e2e/departments-members-modal.spec.ts` | 5/5 통과 |
| Playwright 회귀 | departments-list-modal, departments-manager, departments-responsive, departments, leaves, approvals, leave-management, leave-calendar-mobile, leave-sidebar-submenu, dashboard | 54/54 통과 |

- 합계: 단위·e2e 통과(backend 739, frontend 654), Playwright 59 통과. 실패는 시각 비교 1건(아래).
- dashboard-renewal.spec.ts 8건은 기존 환경 이슈로 제외(실행 안 함).

### 실패 항목

1. **1440 所属社員確認 모달에서 連絡先 열이 잘려 보임 (시각 비교 불일치)**
   - 에러 요약: 1440 뷰포트에서 모달 폭(약 640px)이 표(`min-w-[40rem]`)보다 좁아 連絡先 값이 우측에서 잘림 (`user10004@example.`). 줄바꿈이나 말줄임 표시 없이 잘림.
   - 원인 추정: 모달 폭 또는 열 폭이 5열 구성에 맞지 않음. 레퍼런스(`refs/01-members-modal.png`)는 모달이 더 넓고 메일 주소가 전체 표시됨. 가로 스크롤로 도달은 가능하나 데스크톱 기본 화면에서는 값이 잘려 보임.
   - 담당: frontend
   - 증거: `screenshots/dev-members-1440.png`, `screenshots/hr-members-1440.png`, `screenshots/members-1440.png`

### 캡처 비교 결과 (레퍼런스 `refs/01-members-modal.png`와 비교)
- 役職 배지 4색: 일치. マネージャー = 보라(violet, 배경 #F1EBFD·글자 #6D28D9, computed style 확인), リーダー = 파랑(info), エンジニア = 회색(neutral), デザイナー = 분홍(pink, 배경 #FBE8FA·글자 #A21CAF, computed style 확인). 레퍼런스의 계열과 같음.
- 入社日 열: 레퍼런스에 있으나 사용자 결정에 따라 제외됨. 헤더는 社員番号·氏名·部署·役職·連絡先 5열.
- 「—」 표기: 役職·連絡先 없음일 때 정상 표시(900002 행).
- 375 캡처(`screenshots/members-375.png`): 다이얼로그가 뷰포트 안에 있고 가로 넘침 없음. 初期表示는 社員番号·氏名·部署까지만 보이고, 役職·連絡先는 표 가로 스크롤로 도달(E2E-3 통과). 이 동작은 설계대로임.
- 1440 모달 폭: 레퍼런스보다 좁음. 위 실패 항목 1의 원인.

### 공개 범위 회귀 (IT-DEPT-37)
- 통과: manager-candidates, `GET /departments`, `GET /auth/me`에 役職·連絡先 키와 값이 없음.
- 정적 확인: backend `src`에서 `contactEmail`·`jobTitle`을 select하는 곳은 `departments.repository.ts`의 멤버 조회(198~199행) 하나뿐. user-summary 매퍼는 변경 없음.
- 휴가 캘린더·대시보드 응답의 역할·연락처 노출 여부는 e2e 키 검사로 직접 검증하지 않음(코드 확인과 기존 Playwright 회귀 통과로 갈음).

### DB 변경 사항
- 이 테스트 실행이 개발 DB에 한 변경: Playwright `global-setup`이 기존 방식대로 E2E 계정 900001·900002를 초기화(값은 정의된 대로 재설정). 다른 데이터 변경 없음.
- 테스트가 만든 데이터: backend e2e는 TestDataTracker로 테스트 DB에서 정리. Playwright의 빈 부서(「E2E所属社員確認」)는 API로 생성 후 finally에서 API 삭제.
- 마이그레이션 적용 없음(이미 적용됨).
- 기존 데이터 변경·설정 파일 변경·구현 코드 수정 없음.

### 미검증 항목
- dashboard-renewal 8건(제외 지정).
- 휴가 캘린더·대시보드 응답의 연락처 노출 여부에 대한 직접 e2e 검사.
- 1440 모달에서 連絡先 열 전체 표시(실패 항목 1 수정 후 재검증 필요).
- `npm run build`는 개발 서버(3000)가 떠 있는 상태에서 실행. 빌드 후 개발 서버는 정상 동작했음.

## Run 2 (2026-11-12, feature-dev 수정 루프 A)

### 대상
- frontend.md "Fix 1" 반영 후 재실행: 공통 `Modal.tsx`에 size `xl`(max-w 800px) 추가, 所属社員確認 모달 `lg` → `xl`.
- backend 코드 변경 없음 → backend 재실행 생략, Run 1 결과 유지(e2e 416/416, 단위 323/323).

### 실행 환경
- 프론트 개발 서버 3000, 백엔드 6000(PID 75448, Run 1과 동일 프로세스). 서버 종료·재기동 없음.
- E2E 비밀번호는 `frontend/.env.local`을 셸에서 로드해 사용(출력·기록 없음).

### 실행 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| frontend 타입 | `npx tsc --noEmit` | 통과 |
| frontend lint | `npm run lint` | 통과 |
| frontend 단위 | `npx vitest run`(PowerShell) | 45 파일, 654/654 통과 |
| frontend build | `npm run build`(PowerShell) | 통과 |
| Playwright 부서 | `departments-members-modal`, `departments`, `departments-list-modal`, `departments-manager`, `departments-responsive` | 27/27 통과 |
| Playwright 휴가·승인·대시보드·근태 회귀 | `leaves`, `approvals`, `leave-management`, `leave-calendar-mobile`, `leave-sidebar-submenu`, `leave-visual`, `dashboard`, `attendance`, `attendance-status`, `attendance-sheet-layout` | 89/89 통과 |

- 합계: Playwright 116/116 통과, 실패 0. 단위 654/654. dashboard-renewal 8건은 지정에 따라 제외.
- 공통 Modal을 쓰는 화면(부서 등록·수정·삭제·상세, 휴가 신청·상세·일별 모달, 대시보드 근태 모달, 관리자 근태 수정 모달)의 Playwright와 Modal 단위 테스트가 모두 통과.

### 실패 항목
- Run 1 실패 1건(1440 所属社員確認 연락처 잘림)은 해소됨. 아래 캡처 비교 참고.

### 캡처 비교 (`screenshots/run2-*.png` vs `refs/01-members-modal.png`)
- 1440 (`run2-members-1440.png`): 모달 폭 약 800px. 連絡先 값(`user10002@example.com` 등)이 끝까지 표시되고 잘림 없음. 役職 배지는 リーダー=파랑, エンジニア=회색 계열로 레퍼런스와 같은 계열. 開発部에는 マネージャー/デザイナー가 없어 보라·분홍은 이 캡처에 없음(Run 1에서 computed style 확인 완료, E2E-2b 통과).
- 1440 레퍼런스와의 차이: 入社日 열은 사용자 결정에 따라 제외(레퍼런스에는 있음). 데이터·샘플 값이 다름은 무관.
- 375 (`run2-members-375.png`): 다이얼로그가 뷰포트 안(폭 343px 수준), 가로 넘침 없음. 初期表示는 社員番号·氏名·部署까지 보이고 役職·連絡先는 표 가로 스크롤로 도달(설계대로). 레퍼런스(모바일 캡처 없음)와 비교 대상 없음.
- 기존 캡처 `members-1440.png`·`members-375.png`는 spec이 같은 경로에 덮어쓴 결과이며, `run2-` 접두 사본을 별도로 보관.

### 작성·수정한 테스트 파일
- 없음(이번 실행은 기존 테스트 재실행만). 테스트 코드 수정 없음.

### DB 변경 사항
- Playwright `global-setup`이 E2E 계정 900001·900002를 기존 방식으로 재초기화(정의된 값으로 재설정). 2회 실행.
- 기존 스크립트: `attendance.spec`/`attendance-status.spec`의 beforeAll이 E2E 관리자 900001의 근태를 reset·fixture로 교체, `leaves.spec`·`leave-management.spec` 등이 E2E 관리자 휴가 reset·샘플 사원 10001~10012 휴가 fixture 재생성. 기존 스크립트만 사용.
- `departments-members-modal.spec`가 빈 부서 「E2E所属社員確認」을 API로 생성 후 finally에서 API 삭제(테스트 종료 시 잔존 없음).
- 마이그레이션·스키마·설정 변경 없음. 기존 사원·부서 데이터 직접 변경 없음.

### 미검증 항목
- dashboard-renewal 8건(제외 지정).
- 375 所属社員確認 모달의 連絡先 열은 가로 스크롤 후 확인(E2E-3에서 도달 검증). 캡처에는 스크롤 전 상태만 있음.

## Run 3 (2026-11-12, feature-dev 수정 루프 B 1회차)

### 대상
- review.md Round 1 중 tester 담당 항목 전부(중간 4, 낮음 1)와 frontend 낮음 1(Modal size xl), backend Fix 1 반영 후 전체 재실행.

### 작성·수정한 테스트 파일
- `backend/test/db/seed.e2e-spec.ts`: 첫 실행 후 4개 직책의 tone이 JOB_TITLES와 같은지 assert 추가. 신규 `既に登録済みの役職は、色味を変えた状態で再実行しても色味を上書きしない`(マネージャーを PINK로 바꾼 뒤 seed 재실행 → createdJobTitleCount 0, tone PINK 유지, finally에서 원래 tone 복원). 
- `backend/test/db/e2e-accounts.e2e-spec.ts`: ① 初回 생성 테스트에 initial의 `jobTitleId: null`·`contactEmail: null` assert 추가. ② 「変更後に reset」 테스트에서 두 계정의 役職·連絡先을 정의와 다른 값으로 바꾼 뒤 reset → admin은 マネージャー·e2e-admin@example.com, initial은 null·null로 복원됨을 assert. ③ 신규 `shouldThrowAndChangeNothingWhenJobTitleIsMissing`(존재하지 않는 役職名 지정 → 「npm run db:seed」 에러, 앞서 처리될 管理者의 連絡先 변경과 リフレッシュトークン이 롤백되어 그대로 남음).
- `backend/prisma/sample-users-data.spec.ts`: 테스트 이름을 `shouldUpdatePasswordJobTitleAndContactForExistingAndCreateTheRest`로 변경(동작 불변).
- `frontend/src/app/(app)/admin/departments/DepartmentMembersModal.test.tsx`: 헤더 5열 순서 검증(columnHeaderTexts), 값 있는 행·NULL 행의 셀 텍스트 순서 검증 신규(`shouldShowFiveColumnsInOrderWithJobTitleAndContactCells`), 로딩 상태 colSpan=5 검증(기존 헤더 테스트 교체), 빈 부서·에러 상태에도 colSpan=5 assert 추가.
- `frontend/src/components/Modal.test.tsx`: `shouldUseXlWidthWhenRequested`(size xl → max-w-200, 다른 폭 클래스 없음) 추가.
- `frontend/e2e/departments-members-modal.spec.ts`: 파일 머리에 선행 조건(db:migrate → db:seed → db:e2e-accounts, 人事部 デザイナー 검증은 db:sample-users 필요) 명시. 人事部 デザイナー 테스트는 본문 시작에서 API로 HR 전체 사원을 조회해 「デザイナー」가 없으면 `test.skip`(사유 명시)하고, 있으면 기존대로 배지 색 검증·캡처. Member 타입에 jobTitle·contactEmail 추가.
- 모든 수정 파일은 prettier 적용(의미 변화 없음).

### 실행 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| backend 타입 | `npx tsc --noEmit` | 통과 |
| backend lint | `npm run lint` | 통과 |
| backend 단위 | `npm test` | 22 파일, 323/323 통과 |
| backend e2e | `npm run test:e2e` | 15 파일, 418/418 통과 (Run 1 416 + 신규 2) |
| backend 수정 대상 | `seed.e2e-spec`, `e2e-accounts.e2e-spec` | 10/10 통과 (재실행 중 신규 rollback 테스트 1건의 assert를 `tokenCountBefore` 비교로 고침 — 테스트 코드의 오류, 구현 무관) |
| frontend 타입 | `npx tsc --noEmit` | 통과 |
| frontend lint | `npm run lint` | 통과 (exit 0) |
| frontend 단위 | `npx vitest run`(PowerShell) | 45 파일, 656/656 통과 |
| frontend 대상 | `departments` 디렉터리 + `Modal.test` | 4 파일, 73/73 통과 |
| frontend build | `npm run build`(PowerShell) | 통과 |
| Playwright 회귀 | departments-members-modal, departments-list-modal, departments-manager, departments-responsive, departments, leaves, approvals, leave-management, leave-calendar-mobile, leave-sidebar-submenu, leave-visual | 93/93 통과, 실패 0, skip 0 |

- 합계: backend 단위 323, backend e2e 418, frontend 단위 656, Playwright 93 모두 통과. 실패 0.
- dashboard-renewal 8건은 지정에 따라 제외.
- 실패 항목: 없음.

### 담당별 개수
- 실패 0건이므로 담당별 실패 없음.

### 미검증 항목
- dashboard-renewal 8건(제외 지정).
- 人事部 デザイナー 캡처 테스트는 이번 DB에서 실행되어 통과(배지 pink computed style 일치). 샘플 데이터가 없는 환경에서는 skip된다(의도된 동작).
- backend e2e에서 휴가 캘린더·대시보드 응답의 연락처 노출 여부는 직접 검사하지 않음(Run 1과 동일).

### DB 변경 사항
- 개발 DB: Playwright globalSetup이 E2E 계정 900001·900002를 정의된 값으로 재초기화. `frontend/e2e/leaves.spec.ts`·`leave-management.spec.ts`의 beforeAll이 기존 스크립트(`db:e2e-leaves-reset`, `db:e2e-leave-calendar-fixture`)로 E2E 관리자 휴가 삭제·샘플 사원 10001~10012 휴가 재생성. `departments-members-modal.spec.ts`의 빈 부서「E2E所属社員確認」은 API로 생성 후 finally에서 삭제. 직접 SQL 변경·마이그레이션·스키마 변경 없음.
- 테스트 DB(workbridge_test): backend e2e가 TestDataTracker로 정리. 새 테스트의 役職 tone 변경은 finally에서 원복.
- 설정·globalSetup·구현 코드·docs 변경 없음.

## Run 4 (2026-11-12, pre-commit 간헐 실패 원인 수정)

### 대상
- `.husky/pre-commit`의 frontend 단위 테스트가 간헐적으로 실패해 커밋이 막힘. 구현 변경 없음, 테스트 파일 정리 순서만 수정.

### 원인
- 실패 메시지: `TypeError: window.matchMedia is not a function` (`src/lib/useMediaQuery.ts:7`). 실패 테스트는 실행마다 달랐음(shouldShowRetryWhenLoadFails, shouldShowSixColumnsInOrder…, shouldShowErrorWithoutPartialListWhenSecondPageFails, shouldShowEmptyMessageWhenNoMembers 등).
- 원인 경로: 테스트 파일의 `afterEach`가 `vi.unstubAllGlobals()`로 matchMedia 스텁을 먼저 제거하고, 공통 setup의 `cleanup()`(언마운트)은 그 뒤에 실행됨. 언마운트 때 React가 보류 중인 passive effect를 먼저 flush하는데, `useMediaQuery`의 `subscribe` 함수는 렌더마다 새 identity라 재구독이 일어나 `window.matchMedia`를 호출함. 이때 스텁은 이미 없어 TypeError 발생.
- 구현 코드는 실제 브라우저에서 matchMedia가 항상 있으므로 문제가 없고, 원인은 테스트 정리 순서. 구현 수정 불필요.
- 재현: 수정 전 15회 중 4회 실패(run 1, 6, 7, 9), 전부 같은 TypeError.

### 수정
- `frontend/src/app/(app)/admin/departments/DepartmentMembersModal.test.tsx`: `@testing-library/react`에서 `cleanup` import, `afterEach`에서 `cleanup()`을 `vi.unstubAllGlobals()`보다 먼저 호출. assertion·skip 변경 없음.

### 실행 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| 반복 실행 | `DepartmentMembersModal.test.tsx` 단독 `npx vitest run`(PowerShell) | 20회 연속 22/22 통과, 실패 0 |
| frontend 단위 전체 | `npm --prefix frontend test`(pre-commit 내) | 45 파일, 663/663 통과 |
| backend 단위 전체 | `npm --prefix backend test`(pre-commit 내) | 22 파일, 323/323 통과 |
| pre-commit | `sh .husky/pre-commit`(PowerShell, 저장소 루트) | ALL CHECKS PASSED (exit 0) |

### 실패 항목
- 없음(수정 후). 수정 전 재현 실패 4건은 위 원인으로 해소.

### 담당별 개수
- 실패 0건.

### 미검증 항목
- 수정 전 20회 반복은 수행하지 않음(15회 베이스라인만 측정). 간헐 재현율이 낮아 수정 후 20회 + pre-commit 1회 통과로 확인.
- 실패 원인은 로그와 코드 경로로 추정(재구독 경로는 코드 분석 기준, 직접 디버거 확인은 아님).
- `DepartmentsView.test.tsx`도 matchMedia를 스텁하지만 이번에 정리 순서는 확인하지 않았고 실패도 관찰되지 않아 수정하지 않음.
