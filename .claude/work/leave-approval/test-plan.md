# test-plan: 휴가 승인 (SCR-005) + 사이드바 배지

근거: `docs/04_SCREEN_SPECIFICATIONS/SCR-005_LEAVE_APPROVAL.md`(§3·4·6·7·8·10·11), `docs/06_API_SPECIFICATION.md` API-LEAVE-007~009 에러 표, `docs/03_SCREEN_LIST.md` Common UI Rules, `docs/08_TEST_PLAN.md` §7 SCR-005 행
백엔드는 변경 없음 → 기존 `backend/test/leaves.e2e-spec.ts`가 계속 통과하는지만 회귀 확인(권한·409 동시 처리는 거기서 이미 검증).

## 1. 컴포넌트 (Vitest + Testing Library, apiFetch mock)

### `frontend/src/app/(app)/leaves/approvals/ApprovalsView.test.tsx`
정상
- A-01 EMPLOYEE: Tabs 없음, `scope=mine&page=1&limit=20` 호출, 승인자 컬럼 없음, 컬럼·값 표시(이름·부서·종류·기간·일수·신청일)
- A-02 ADMIN 기본: Tabs 표시, "내게 할당" 선택 상태(`aria-selected`), scope=mine 호출
- A-03 ADMIN `?scope=all`: scope=all 호출, 승인자 컬럼 표시
- A-04 ADMIN 탭 전환: `router.push`에 scope=all·page 1(현재 page=3이어도)
- A-05 페이지 이동: Pagination 클릭 → URL에 page 반영, scope 유지
- A-06 [승인] → 확인 문구(신청자 이름) → 확인 → PATCH approve, 성공 토스트, 목록 재조회, 배지 refresh 호출
- A-07 [반려] → 사유 입력 → PATCH reject `{rejectReason: trim값}`, 성공 토스트, 목록 재조회
- A-08 [상세] → 상세 모달, 모달 안 [승인]으로 처리 가능
실패·권한
- A-09 EMPLOYEE `?scope=all` → mine으로 호출(all 호출 없음)
- A-10 잘못된 `scope=xxx`, `page=0`/`page=abc` → mine·page 1
- A-11 ADMIN scope=all에서 본인 신청 행: [승인][반려] disabled, [상세] 활성
- A-12 승인 409 ALREADY_PROCESSED → `leave.alreadyProcessed` 토스트, 모달 닫힘, 목록 재조회
- A-13 승인 403 FORBIDDEN → "처리 권한이 없습니다." 토스트, 모달 닫힘, 목록 재조회
- A-14 반려 사유 공백만 → "반려 사유를 입력해주세요."(API 미호출) / 501자 → 500자 메시지
- A-15 [승인] 오픈 후 상세 조회 결과가 PENDING 아님 → 확인 단계가 아니라 상세 표시(승인 버튼 없음)
상태
- A-16 Loading 스켈레톤 / 조회 실패 SectionError → [다시 시도]로 재조회
- A-17 Empty mine / Empty all 문구 구분
- A-18 범위 밖 page(items 0, totalCount>0) → Empty + Pagination 표시
- A-19 중복 제출: 확인 버튼 연타 시 PATCH 1회

### `LeaveDetailModal.test.tsx` (추가)
- M-01 `initialStep='approve'` → 조회 후 바로 확인 단계, [취소] 시 모달 닫힘(상세로 가지 않음)
- M-02 `initialStep='reject'` → 사유 입력 단계로 시작
- M-03 기본(detail)에서 확인 단계 [취소] → 상세로 복귀(기존 동작 회귀)
- M-04 409 시 서버 message 대신 `leave.alreadyProcessed` 표시(대시보드 경로도 동일)

### `components/Tabs.test.tsx`
- T-01 tablist·tab 역할, 선택 탭 `aria-selected=true`·`tabIndex=0`, 나머지 -1
- T-02 클릭 시 onChange(value) / ←·→ 키로 이동·선택(양 끝 순환 여부는 구현과 일치시켜 검증)

### `components/layout/AppShell.test.tsx` (추가, apiFetch mock 필요)
- S-01 totalCount=3 → "휴가 승인" 메뉴에 3 표시, 링크 접근 이름에 건수 문구 포함
- S-02 totalCount=0 → 배지 없음 / 조회 실패 → 배지 없음, 토스트 없음
- S-03 totalCount=120 → "99+"
- S-04 pathname 변경 시 재조회, refresh() 호출 시 재조회, 재조회 중 직전 값 유지
- S-05 호출 경로 `/leaves/pending-approval?scope=mine&limit=1`(ADMIN도 mine)
- 기존 가드 테스트(비로그인·mustChangePassword·비관리자) 회귀 통과

### 회귀
- `DashboardView.test.tsx`: Provider 없이도 동작(refresh no-op), 처리 후 배지 refresh 호출 확인 1건 추가

## 2. E2E (Playwright, `frontend/e2e/approvals.spec.ts`, E2E 관리자 900001)
개발 DB에 PENDING 휴가를 만들 신청 API가 아직 없으므로 승인·반려 처리는 E2E에서 하지 않는다(컴포넌트 + 백엔드 e2e로 검증).
- E-01 비로그인 `/leaves/approvals` → `/login?redirect=%2Fleaves%2Fapprovals`
- E-02 관리자 로그인 → 사이드바 "휴가 승인" 클릭 → 제목·Tabs 표시, `aria-current="page"`, 조회 실패 문구 없음(목록 또는 Empty)
- E-03 "전체 승인 대기" 탭 → URL `scope=all`, 새로고침 후 같은 탭 선택 유지
- E-04 375px 폭에서 표 대신 카드 목록/Empty 표시, 가로 스크롤 없음

## 3. 실행
- `cd frontend && npx tsc --noEmit && npm run lint && npm test && npm run test:e2e`
- `cd backend && npm run test:e2e` (회귀, 변경 없음 확인)
