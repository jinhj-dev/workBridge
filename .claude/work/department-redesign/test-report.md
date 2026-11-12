RESULT: PASS

# test-report — 部署管理 画面再構成 (SCR-010) / Run 1

## 1. 작성·추가한 테스트 파일
- 신규: `frontend/e2e/departments-manager.spec.ts` (5건: 社員権限でのブロック, 責任者の他部署社員指定と解除, 兼任, 未所属を除く部署数, 名前検索と列ソート)
- 신규: `frontend/e2e/departments-responsive.spec.ts` (8건: 1440/1366/390/375 각각 화면 레이아웃·모달 레이아웃)
- 기존 파일은 수정하지 않음(backend·frontend 담당 파일 그대로 실행)

## 2. 실행 결과 요약
| 구분 | 명령 | 결과 |
|---|---|---|
| Backend 타입체크 | `npx tsc --noEmit` | 통과 |
| Backend lint | `npm run lint` | 통과 |
| Backend 단위 | `npm test` | 22 파일 / 312 통과 / 0 실패 |
| Backend e2e | `npm run test:e2e` | 15 파일 / 385 통과 / 0 실패 (backend.md 기재 320·397과 개수 차이 있음. 실패 0) |
| Backend 빌드 | `npm run build` | 통과 |
| Frontend 타입체크 | `npx tsc --noEmit` | 통과 |
| Frontend lint | `npm run lint` | 통과 |
| Frontend 단위 | `npx vitest run` | 45 파일 / 623 통과 / **1 실패** (624건) |
| Frontend 빌드 | `npm run build` | 통과 |
| Playwright 부서 기존 spec | `departments.spec.ts` | 6 통과 |
| Playwright 신규 manager | `departments-manager.spec.ts` | 5 통과 |
| Playwright 신규 responsive | `departments-responsive.spec.ts` | 8 통과 |

- 합계(Playwright 부서 관련): 19 통과 / 0 실패
- 제외: `dashboard-renewal.spec.ts` 8건(사용자 결정, 기록만, 판정 제외)

## 3. 실패 항목
### F-1. DepartmentMembersModal 404 처리 테스트
- 테스트: `src/app/(app)/admin/departments/DepartmentMembersModal.test.tsx` > `shouldCloseAndNotifyWithServerMessageWhenDepartmentNotFound`
- 에러 요약: `findByText('部署が見つかりません。')` 실패 (요소 없음). 단독 실행에서도 재현됨(결정적)
- 원인 추정: members 404 시 `showToast(error.message)` 후 `onClose`·`onNotFound` 호출하는 경로에서 토스트 문구가 DOM에 나타나지 않음. 구현(토스트 표시 후 모달 닫기)과 테스트 기대가 맞지 않는지, 테스트 렌더 구조(ToastProvider 범위)와의 불일치인지 frontend 확인 필요. 직전 frontend 보고(624건 통과)와 달라진 상태
- 담당: frontend

## 4. 테스트 세부 (신규 spec 판정 근거)
- 권한: 일반 사원 900002는 mustChangePassword=true라 `/admin/departments` 진입 시 `/dashboard`가 아니라 비밀번호 변경 경로로 가므로, 판정은 "부서 관리 화면이 보이지 않음 + 관리자 URL에 머무르지 않음"으로 함
- 책임자: 임시 부서를 만들어 DEV 소속 관리자(900001)를 책임자로 지정 → 서버 검색(`manager-candidates?keyword=`) 응답 확인 → 입력 비움 저장으로 해제 → 한 명이 두 부서의 책임자(겸임) 저장 확인. DEV 부서 자체는 수정하지 않음
- 部署数: `/summary.departmentCount` = `/departments` 총수 − 1 (未所属 제외) 및 카드 표시값 일치
- 반응형: 가로 스크롤 없음(scrollWidth ≤ innerWidth), 표시 중 버튼·링크가 뷰포트 밖으로 나가지 않음, 등록/수정 모달 박스가 뷰포트 안

## 5. 디자인 토큰 점검
- 변경·신규 frontend 파일(`admin/departments/*`, `components/leave/ApproverSelect.tsx`, `lib/api/types.ts`, `messages/ja.ts`)을 grep
- 추가된 라인에 hex 색 없음, `text-[…]`·`bg-[…]`·`border-[…]`·인라인 `style={{}}`·rgb/hsl 없음 → 통과

## 6. 스크린샷 (`.claude/work/department-redesign/screenshots/`)
- 목록: `departments-1440.png`, `departments-1366.png`, `departments-390.png`, `departments-375.png`
- 등록 모달: `departments-create-modal-1440.png`, `-1366.png`, `-390.png`, `-375.png`
- 수정 모달: `departments-edit-modal-1440.png`, `-1366.png`, `-390.png`, `-375.png`

## 7. refs 대비 레이아웃 (refs/01-department-management.png)
- 큰 차이 없음: 헤더·요약 카드 2열, 검색·정렬·초기화 바, 행 액션(所属社員確認·編集·削除), 하단 설명, 선택 중 부서 정보 패널 배치는 기준과 일치
- 정보 배치 차이 (frontend 확인 권장, 범위 외로 명시되어 있음):
  - 기준의 3번째 카드 「今月の変更」 없음
  - 기준의 「状態: すべて」 필터 없음
  - 기준의 「有効」 배지 없음
- 캡처 관찰: fullPage 캡처에서 배경 레이아웃이 뷰포트 높이에서 끊겨 보임. 앱 셸의 내부 스크롤 구조로 보이며 결함으로 판단하지 않음 (참고만)
- 스타일(색·그림자·아이콘)은 프로젝트 디자인 시스템 우선 원칙에 따라 판정 제외

## 8. DB 변경 사항 (개발 DB)
- 실행한 것: `db:e2e-accounts`(globalSetup, 기존 초기화 스크립트), `db:migrate:test`(적용할 마이그레이션 없음)
- 테스트가 만든 임시 부서 15건(`E2E責任者…` 5건, `E2E兼任A…`·`E2E兼任B…` 각 5건)이 이전 실패 실행에서 남아 있었음. 전부 앱 API `DELETE /admin/departments/:id`로 삭제(204 × 15). 현재 잔존 테스트 부서 없음
- 기존 부서(HR, SALES, GA, DEV, UNASSIGNED)의 책임자·설명·소속 변경 없음. 수동 SQL 삭제·수정 없음
- E2E 비밀번호 값은 출력·기록하지 않음 (`frontend/.env.local`을 셸에서 로드)

## 9. 미검증 항목
- R2(사원 비활성화 시 책임자 자동 해제): API-USER-004 미구현으로 대상 외
- 사원 권한 Playwright는 일반 사원(900002)이 비밀번호 변경 대상이라 `/dashboard` 리다이렉트가 아닌 비밀번호 변경 경로로 판정됨
- 모바일 모달은 박스 좌표 기반 확인이며 시각 확인은 스크린샷 육안 비교로 대체(등록·수정 모달 PNG 4종 저장)
- 책임자 후보 100건 상한의 실측(101명 이상 데이터) 미검증. 백엔드 단위 수준에서만 확인
- backend e2e 개수가 backend.md 기재(397)와 달라 실행 파일 구성 차이 가능성 있음. 실패는 0
- `frontend/e2e/departments-manager.spec.ts`는 작업 중 외부에서 변경된 흔적이 있어 현재 디스크 상태 기준으로 실행함

## 10. 최종 판정
- FAIL: frontend 단위 테스트 1건(F-1). 그 외 항목은 모두 통과

---

## Run 2 (수정 루프 A 재실행)

대상: frontend.md Fix 1 반영 후 재실행, 테스트 개수 불일치 조사, 부서 관련 Playwright 재실행. 새로 작성한 테스트 파일은 없음.

### 1. 실행 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| Frontend 단위 | `npx vitest run` | 45 파일 / **624 통과** / 0 실패 (Run 1 F-1 해소) |
| Frontend 타입체크 | `npx tsc --noEmit` | 오류 없음 |
| Frontend lint | `npm run lint` | 오류 없음 |
| Frontend 빌드 | `npm run build` | 통과 |
| Backend 단위 | `npx vitest run` | 22 파일 / **320 통과** / 0 실패 |
| Backend e2e | `npx vitest run --config ./vitest.config.e2e.ts` | 15 파일 / **397 통과** / 0 실패 |
| Playwright 부서 | `departments.spec.ts`·`departments-manager.spec.ts`·`departments-responsive.spec.ts` | **19 통과** / 0 실패 / 0 skip |

- Backend 타입체크·lint·빌드는 이번 Run에서 재실행하지 않음(Run 1 통과, 이번 변경 범위는 테스트 파일 개수 조사)
- 제외: `dashboard-renewal.spec.ts` 8건(사용자 결정, 판정 제외)

### 2. 테스트 개수 불일치 원인 (Run 1 312·385 → 현재 320·397)
- 결론: **실패가 아니라 실행 시점 차이**. 현재 개수는 backend.md(320·397)와 일치하며, Run 1 개수는 테스트 파일이 최종 수정되기 전 상태로 실행된 결과로 추정됨
- 근거(개수 차이와 파일 변경분 대응):
  - e2e 385 → 397 (+12): `admin-departments.e2e-spec.ts`에 신규 describe `説明・責任者・並び替え・要約(DEPT-002・004・005・007〜009)` 1개가 추가되며 `it` 12건 증가(HEAD 선언 37 → 현재 49). 증가분 12건과 정확히 일치
  - unit 312 → 320 (+8): `departments.service.spec.ts`(HEAD 선언 4 → 현재 7, 실행 12건)와 `dto/department-dto.spec.ts`(HEAD 선언 6 → 현재 11, 실행 19건)에 테스트 추가. 파일 단위 합산 증가와 일치
  - 파일 수정 시각: 두 unit spec 18:09:25~18:09:50, e2e spec 18:10:51, backend.md 18:12:42. Run 1 실행 로그 시각은 기록이 없어 정확한 순서는 확정하지 못함(Run 1 실행이 18:10 이전이었던 것으로 추정)
- 배제한 원인:
  - 캐시: vitest는 결과 캐시를 쓰지 않고 매번 수집함
  - 필터·스킵: `.skip`·`.only`·`.todo` 0건(backend `src`·`test` grep). vitest include 설정은 변경 없음
  - 파일 구성: unit 22 파일, e2e 15 파일(`test/db/` 하위 3개 포함. 최상위 `test/*.e2e-spec.ts`만 세면 12로 보이므로 주의) — Run 1과 동일
  - 작업 트리: 단일 경로(`c:\Users\jinhyeonju\workBridge\backend`)에서 실행
- 파일별 단독 실행 확인: `departments.service.spec.ts` 12건, `department-dto.spec.ts` 19건 통과

### 3. Playwright 실행 참고
- `frontend/.env.local`을 셸에서 로드해 실행(값 출력 없음). globalSetup이 개발 DB의 E2E 계정 900001·900002를 기존 방식대로 초기화
- 개발 서버(3000·6000) 기동 상태에서 실행

### 4. DB 변경 사항
- 테스트 실행 자체로 생긴 변경: Playwright globalSetup의 E2E 계정 초기화(기존 스크립트, Run 1과 동일), backend e2e의 테스트 DB 데이터(TestDataTracker가 정리)
- 본 Run에서 직접 한 점검: 개발 API로 관리자(900001) 로그인 3회 → 부서 목록 조회 1회(200) → 로그아웃 1회. 조회 결과 부서 5건(DEV·GA·HR·SALES·UNASSIGNED)이며 테스트용 임시 부서 잔존 없음. 삭제·수정 없음
- 주의: 점검 중 로그아웃하지 못한 로그인 세션 2건이 개발 DB `refresh_tokens`에 남음(관리자 900001, 미폐기). 만료(7일)로 자연 소멸하며 업무 데이터에는 영향 없음
- 비밀번호 값은 출력·기록하지 않음

### 5. 실패 항목
- 없음

### 6. 최종 판정
- PASS: 전체 항목 통과(frontend 단위 F-1 해소, 백엔드 단위·e2e·Playwright 부서 19건 통과)

---

## Run 3 (수정 루프 B 1회차 재실행)

대상: review.md 담당 tester 항목(중간 5건 — 백엔드 e2e 누락 시나리오, 프론트 단위 F18·F9·F15·F12, 낮음 1건 — e2e assert 중복) 보강. backend Fix 1(memberCount 트랜잭션), frontend Fix 2(ApproverSelect blur 복원) 반영 후 전체 재실행.

### 1. 작성·수정한 테스트 파일
- 수정: `backend/test/admin-departments.e2e-spec.ts` — 신규 11건 추가, 기존 1건 보강(B18a 실패 시 부작용 없음, B19a 겸임 후 A 책임자 유지), `beforeAll`에서 admin id 보관
  - 정렬: 동률 code 오름차순(양방향)·limit=1&page=2 / updatedAt desc / memberCount + name 검색 + page 2 + description·manager 포함
  - 책임자: 같은 부서·다른 부서·요청자 본인 지정 시 manager 키 `id·empId·name`만 / 잘못된 PATCH 후 기존 책임자 유지 / POST `"abc"` 400 field managerId
  - 권한: EMPLOYEE의 managerId 포함 POST·PATCH 403(부작용 없음) / 비로그인 신규 엔드포인트 401 / summary + name Query 동일 응답
  - 후보: 사원번호 부분 일치 / 공백 keyword = 조건 없음(min(100, 有効 사원 수)) / 101자 400 field keyword
  - M2: 같은 사원을 2부서 책임자로 raw SQL 설정(UNIQUE 없음) → 책임자 부서 DELETE 204 → 책임자 사원 DELETE는 P2003, SQLSTATE 23001(RESTRICT) / `departments_manager_id_idx` 존재
- 수정: `frontend/src/app/(app)/admin/departments/DepartmentFormModal.test.tsx` — F18 4건(후보 Skeleton / 실패 시 loadError + 재시도 + managerId 없이 설명 저장 / 0건 시 입력 유지·noMatch / 100건 상한 힌트)
- 수정: `frontend/src/app/(app)/admin/departments/DepartmentsView.test.tsx` — F9(상세 편집 모달에 설명·책임자 채움) / F12 패널(未所属 「この部署を編集」 없음) / F15(책임자 未設定·설명 —). 후보 경로 응답 분기 추가
- 수정: `frontend/src/components/leave/ApproverSelect.test.tsx` — onSearch 지정 시 입력 후 선택 없이 blur → 이전 값 복원 / 입력란을 비운 뒤 blur → 해제 유지 / onSearch 미지정(휴가 승인자) → 해제 유지(기존 동작)
- 수정: `frontend/e2e/departments-manager.spec.ts` — 중복 `not.toContainText(managerName)` 1건 삭제
- 포맷: 위 파일 prettier 적용(내용 변경 없음)

### 2. 실행 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| Backend 타입체크 | `npx tsc --noEmit` | 통과 |
| Backend lint | `npm run lint` | 통과 |
| Backend 단위 | `npm test` | 22 파일 / **320 통과** / 0 실패 |
| Backend e2e | `npm run test:e2e` | 15 파일 / **408 통과** / 0 실패 (Run 2 397 + 신규 11) |
| Frontend 단위 | `npx vitest run` | 45 파일 / **634 통과** / 0 실패 (Run 2 624 + 신규 10) |
| Frontend 타입체크 | `npx tsc --noEmit` | 통과 |
| Frontend lint | `npm run lint` | 통과 |
| Frontend 빌드 | `npm run build` | 통과 |
| Playwright 부서·휴가 | `departments` · `departments-manager` · `departments-responsive` · `leaves` · `approvals` | **31 통과** / 0 실패 / 0 skip |

- 제외: `dashboard-renewal.spec.ts` 8건(사용자 결정, 판정 제외)
- 실행 시 `frontend/.env.local`을 셸에서 로드(값 출력 없음). 개발 서버(3000·6000) 기동 상태

### 3. 실패 항목
- 없음

### 4. 미검증 항목 / 참고
- B29(manager-candidates 100건 상한)의 e2e·단위 테스트는 이번 범위(review 목록)에 없어 추가하지 않음. 상한 100 전달은 `departments.service.spec.ts`에 아직 없음
- F18의 "0명 empty 문구": 책임자 입력은 서버 검색(onSearch)이라 0건이면 `empty`가 아니라 `noMatch`(該当する社員がいません。)를 표시. 테스트는 구현 기준(noMatch)으로 검증
- `departments-manager.spec.ts`의 `test.skip(E2E_INITIAL_PASSWORD 미설정)`은 기존 env 가드(context.md 규칙)로, 이번 실행은 env 설정되어 skip 0건

### 5. DB 변경 사항
- 수동 SQL·직접 수정 없음. 테스트 실행에 따른 변화만:
  - backend e2e: 테스트 DB(`workbridge_test`)에 생성한 데이터는 TestDataTracker.cleanup()으로 정리(M2 테스트도 책임자 해제 후 삭제)
  - Playwright: globalSetup의 E2E 계정(900001·900002) 초기화(기존 스크립트), 테스트가 만든 임시 부서는 각 테스트의 finally에서 API로 삭제
- 비밀번호 값은 출력·기록하지 않음

### 6. 최종 판정
- PASS: 전체 항목 통과(review 담당 tester 항목 반영, backend·frontend 단위·e2e·빌드·Playwright 부서·휴가 31건 통과)

---

## Run 4 (수정 루프 B 2회차 재실행, feature-dev 수정 루프)

대상: review.md Round 3 담당 tester 2건(중간 1, 낮음 1), frontend.md Fix 3·Fix 4·Fix 5 반영 후 전체 재실행, 所属社員確認 모달 캡처 확인.

### 1. 작성·수정한 테스트 파일
- 수정: `frontend/src/app/(app)/admin/departments/DepartmentMembersModal.test.tsx` — 3건 추가
  - `shouldShowErrorWithoutPartialListWhenSecondPageFails`: 1페이지 성공·2페이지 실패 시 재시도 버튼 표시, 부분 목록(「社員0」)·결과 없음 문구 미표시
  - `shouldReloadAllPagesWhenRetryClicked`: 재시도 클릭 → 재조회 → 행 표시·재시도 버튼 소멸, apiFetch 2회(실패 1 + 재취득 1), 마지막 호출이 page=1
  - `shouldIgnoreLateNotFoundResponseAfterUnmount`: 언마운트 후 도착한 404에서 onClose·onNotFound 미호출
- 수정: `frontend/e2e/departments-members-modal.spec.ts` — 126행 주석을 실제 검증 범위(모달이 화면 안에 있음)에 맞게 정정. 내부 스크롤 검증은 추가하지 않음(review 낮음 항목의 "주석 정정" 선택지). 셀렉터 변경 없음
- 임시 파일(캡처·긴 부서명 확인용 spec 2건)은 실행 직후 삭제. 저장소에 남지 않음

### 2. 실행 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| Backend 타입체크 | `npx tsc --noEmit` | 통과 |
| Backend lint | `npm run lint` | 통과 |
| Backend 단위 | `npx vitest run` | 22 파일 / **320 통과** / 0 실패 |
| Backend e2e | `npx vitest run --config ./vitest.config.e2e.ts` | 15 파일 / **408 통과** / 0 실패 |
| Frontend 단위 | `npx vitest run` | 45 파일 / **642 통과** / 0 실패 (Run 3 634 → Fix 4 이후 639 → 신규 3) |
| Frontend 타입체크 | `npx tsc --noEmit` | 통과 |
| Frontend lint | `npm run lint` | 통과 |
| Frontend 빌드 | `npm run build` | 통과 |
| Playwright | `departments` · `departments-manager` · `departments-responsive` · `departments-list-modal` · `departments-members-modal` · `leaves` · `approvals` | **37 통과** / 0 실패 / 0 skip |

- 제외: `dashboard-renewal.spec.ts` 8건(사용자 결정, 판정 제외)
- 백엔드 변경 없음이지만 PR 전 확인으로 backend 단위·e2e 전체 실행
- Playwright 실행 시 `frontend/.env.local`을 셸에서 로드(값 출력 없음). 개발 서버(3000·6000) 기동 상태

### 3. 所属社員確認 모달 캡처 확인 (Fix 5 시각 확인)
- `screenshots/run4-members-1440.png` (1440×900): 모달 x400~1040, y96~804로 화면 안. 헤더(아이콘·「所属社員確認」·部署/人数 Badge·X), 「対象社員 24名」, 検索, 3열 표, 「閉じる」 모두 정상. 표 헤더 하단선 유지
- `screenshots/run4-members-375.png` (375×667): 모달 x16~359, y22~646으로 화면 안, 가로 넘침 없음. 표는 내부 스크롤(5행 보이고 6행째 잘림 = 스크롤 가능 신호), 표 헤더 하단선 유지, 「閉じる」 보임
- `screenshots/run4-members-1366x600.png` (1366×600, 짧은 화면): 모달 x363~1003, y16~584로 화면 안. 상하 잘림 없이 본문 스크롤 구조 유지(헤더·푸터 보임)
- 긴 부서명 확인: 임시 부서(100자 가까운 이름)를 API로 만들어 375 폭에서 열었을 때 `screenshots/run4-members-375-longname.png`. 서브타이틀 Badge 안 텍스트가 「E2E長い部署名の所属社員確…」처럼 1행 말줄임, 모달 밖으로 넘치지 않음(페이지 가로 스크롤 없음). 임시 부서는 API로 삭제 후 목록에서 잔존 없음 확인
- 판정: 3개 뷰포트 + 긴 이름 확인 모두 정상. 헤더 구분선은 표 헤더 하단선으로 확인(모달 헤더 자체에는 구분선이 없고 푸터에만 `border-t`가 있는 것이 현재 Modal 구조)

### 4. 실패 항목
- 없음

### 5. DB 변경 사항 (개발 DB)
- Playwright globalSetup의 E2E 계정(900001·900002) 초기화, leaves.spec beforeAll의 `db:e2e-leaves-reset`(E2E 관리자 휴가 2건 삭제). 기존 스크립트 그대로
- 캡처용 임시 부서 2건(`E2E長い…`·`E2E所属社員確認`계열은 기존 spec 실행분) — 각 테스트 finally에서 API `DELETE`로 삭제. 삭제 후 부서 목록 조회 결과 5건(DEV·GA·HR·SALES·UNASSIGNED), 임시 부서 잔존 0
- 기존 부서·사원 수정 없음. 수동 SQL 없음. 비밀번호 값 출력·기록 없음

### 6. 미검증 항목
- 긴 부서명 말줄임은 이번 캡처에서 375 폭 1케이스만 확인(1440·1366은 짧은 이름으로만 캡처)
- 짧은 화면 1366×600에서 본문 스크롤 조작(휠) 자체는 확인하지 않음(레이아웃 상 경계만 확인)

### 7. 최종 판정
- PASS: review Round 3 tester 2건 반영 후 전체 항목 통과(backend 단위 320·e2e 408, frontend 단위 642, 빌드·tsc·lint, Playwright 37건), 所属社員確認 캡처 3종 + 긴 이름 1종 육안 확인 정상

---

## Run 5 (PR 직전 검증, origin/main 리베이스 후 재검증)

대상: 리베이스 후(origin/main 37dc533 위, 커밋 7444c69) frontend Vitest 전부 FAIL("Vitest failed to find the current suite") 원인 조사·해결, 전체 검사(`sh .husky/pre-commit`), Playwright 부서·휴가 재실행. 코드·설정 파일 변경 없음.

### 1. 원인 조사
- 증상 재현: 에이전트 Git Bash 셸에서 `npx vitest run`(frontend) 실행 시 45파일 전부 `vitest.setup.ts:5` afterEach에서 실패. `src/components/Modal` 단독도 동일하게 실패.
- 결정적 분기(같은 명령, 같은 워킹 디렉터리, 같은 Node 26.13.0):
  - Git Bash에서 실행 → 실패(재현 10회 이상, 워커 수 1, `--pool=forks/threads`, `--clearCache` 후에도 실패)
  - PowerShell에서 `npx vitest run` → **45파일 / 649건 통과**(드라이브 문자 `C:`·`c:` 모두 통과)
  - PowerShell → `bash.exe -c` → 통과. Git Bash를 에이전트 셸 밖(PowerShell)에서 띄우면 통과
  - 에이전트 셸 → `bash.exe` 직접 호출 또는 `cmd /c` → 실패
  - 같은 셸에서 backend Vitest(node 환경, setup 없음)는 통과(22파일 / 320건)
- 배제한 원인과 근거:
  - 코드·설정 변경: `vitest.config.mts`, `vitest.setup.ts`, `package.json`, lockfile은 #22(37dc533) 및 현재 브랜치 어디에서도 변경 없음(`git diff origin/main HEAD` 빈 결과). 작업 트리 clean
  - 설정 파일 자체: 최소 setup(`import { afterEach } from 'vitest'`만 있는 파일)을 임시 config(저장소 밖)로 지정해도 같은 실패. 실제 setup 파일을 임시 config로 지정해도 같은 실패 → setup 내용과 무관
  - 중복 설치: `frontend/node_modules/vitest`(4.1.12)가 단일 버전, `npm ls` 정상. backend와 frontend는 각자 node_modules(별개 프로젝트이므로 충돌 아님)
  - 동시 실행 프로세스: vitest 프로세스 없음 확인. 남은 node.exe는 MCP 서버, Next dev(3000), Nest dev(6000)뿐이며 vitest와 무관
  - 캐시: `vitest --clearCache`로 results·fs module cache 삭제 후에도 실패. 캐시가 원인 아님
  - 워커·메모리: `--maxWorkers=1`에서도 실패. 여유 메모리 약 2.2GB이나 PowerShell 경로가 동일 상태에서 통과하므로 메모리 부족이 원인은 아님
  - 환경변수: Git Bash와 PowerShell 자식 Node 프로세스의 env·cwd·execPath 덤프가 바이트 단위 동일(`cmp` IDENTICAL). `MSYSTEM`·`TERM`·`SHELL`·`SHLVL`·`PWD` 제거도 무효
  - Vitest 내부 메커니즘: 에러는 `@vitest/runner`의 `getCurrentSuite()`에서 `defaultSuite`가 비어 있을 때 발생. 즉 setup의 `afterEach`가 테스트 러너가 초기화한 것과 다른 러너 인스턴스(또는 수집 컨텍스트 밖)에서 호출된 것
- 결론(환경 원인): 프로젝트 코드·설정이 아니라 **에이전트 Git Bash 프로세스 환경에서 frontend Vitest(jsdom + setup 파일)가 러너 컨텍스트를 잃는 현상**. 정확한 Windows 레벨 메커니즘(부모 프로세스·핸들 상속 추정)은 확정하지 못함. 리베이스 전 hook 통과 및 PowerShell 통과가 이를 뒷받침함.
- 참고: 리베이스 직전·직후 첫 몇 번의 Git Bash 실행 중 일부는 우연히 통과했으나(재현 불안정), 현재는 재현 가능. 판정은 PowerShell 경로 기준.

### 2. 조치
- 코드·설정·node_modules 변경 없음. `npm ci` 불필요(의존성 정상)
- `vitest --clearCache`로 Vitest 결과 캐시 삭제(영향 없음 확인용. 재발과 무관)
- 테스트 실행을 PowerShell 경로(또는 PowerShell → `bash.exe -c`)로 수행
- 임시 파일은 `C:\Users\jinhyeonju\AppData\Local\Temp\claude\exp\`에만 생성(저장소 밖). 저장소 `git status` clean 유지
- 팁: 이후 에이전트에서 frontend 테스트가 같은 실패를 보이면 같은 방식으로 실행하면 됨. 설정 변경 불필요

### 3. 실행 결과
| 구분 | 명령 | 결과 |
|---|---|---|
| 전체 검사 | `sh .husky/pre-commit` (PowerShell → bash.exe 경유, 루트) | ALL CHECKS PASSED |
| Frontend lint | `npm --prefix frontend run lint` | 통과 |
| Frontend 타입체크 | `npm --prefix frontend run typecheck` | 통과 |
| Frontend 단위 | `npm --prefix frontend test` | 45 파일 / **649 통과** / 0 실패 |
| Backend lint | `npm --prefix backend run lint` | 통과 |
| Backend 타입체크 | `npm --prefix backend run typecheck` | 통과 |
| Backend 단위 | `npm --prefix backend test` | 22 파일 / **320 통과** / 0 실패 |
| Playwright 부서·휴가 | `departments` · `departments-manager` · `departments-responsive` · `departments-list-modal` · `departments-members-modal` · `leaves` · `approvals` · `leave-sidebar-submenu` · `leave-management` | **49 통과** / 0 실패 / 0 skip |

- Frontend 649건은 Run 4(642건)보다 많음. 리베이스로 합쳐진 #22 테스트 추가분으로 추정(개별 집계는 미확인)
- pre-commit 로그에 jsdom stderr 메시지(`Not implemented: navigation to another Document`)가 출력되나 해당 테스트는 통과. 실패 아님, 참고만
- 제외: `dashboard-renewal.spec.ts`(사용자 결정, 판정 제외 유지)

### 4. DB 변경 사항 (개발 DB)
- Playwright globalSetup의 E2E 계정(900001·900002) 초기화, `leaves.spec.ts` beforeAll의 `db:e2e-leaves-reset`(E2E 관리자 휴가 삭제). 기존 스크립트 그대로
- 테스트가 만든 임시 부서는 각 테스트 finally에서 API로 삭제하도록 되어 있음. 이번 Run에서 잔존 여부를 별도 API 조회로 재확인하지 않음(미검증)
- 수동 SQL·직접 수정 없음. 비밀번호 값은 출력·기록하지 않음(`frontend/.env.local`은 셸에서 로드만 함)

### 5. 실패 항목
- 없음

### 6. 최종 판정
- RESULT: PASS (frontend 단위 649, backend 단위 320, Playwright 49 모두 통과, 실패 0)
- 해결 상태: 코드 원인 없음. 환경 원인(Git Bash 실행 경로)은 실행 경로를 바꿔 우회. 근본 원인은 미확정
