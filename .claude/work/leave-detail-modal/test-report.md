RESULT: PASS

# test-report: leave-detail-modal

## Run 1

실행 환경: 브랜치 feature/leave-detail-modal(미커밋), 프론트 `next dev`(3000)·백엔드 `dev`(6000) 기동 상태, 개발 DB, 테스트 DB `workbridge_test`.
결론 요약: 자동 테스트는 전부 통과. 다만 휴가 신청 모달의 승인자 드롭다운이 본문 스크롤 영역에 잘려 보이는 문제를 확인했으므로 RESULT는 FAIL. 그 밖의 항목은 미검증 목록 참고.

### 작성한 테스트 파일
- 신규: `frontend/src/components/leave/LeaveStatusBadge.test.tsx`(4 케이스 + 4 상태 it.each), `frontend/src/components/DetailTable.test.tsx`(2), `frontend/src/components/Modal.test.tsx`(5)
- 수정(추가): `frontend/src/components/leave/LeaveDetailModal.test.tsx`에 describe "追加表示" 블록 추가(행 순서, 승인자 표시, 단일일·0.5일, 상태 Badge 4종, 처리자 「—」, 긴 값 줄바꿈, 닫기 2경로)
- 기존 기대값 변경: 없음(format.test.ts·LeaveDetailModal.test.tsx의 「～」·처리자 표시 기대값은 이전 구현 단계에서 이미 갱신된 상태였고, 이번 run에서 수정하지 않음)
- 임시 검증 spec(`frontend/e2e/tmp-leave-modal-verify.spec.ts`)은 실행 후 삭제함

### 결과 집계
| 항목 | 결과 |
|---|---|
| frontend vitest 전체 | 36 파일 / 524 통과 / 0 실패 |
| frontend tsc --noEmit | 오류 0 |
| frontend eslint | 오류 0, 경고 0 (처음 1건 경고 'container' 미사용을 수정 후 통과) |
| backend vitest(unit) | 20 파일 / 294 통과 / 0 실패 |
| backend tsc --noEmit | 오류 0 |
| backend lint | 오류 0 |
| backend e2e(test:e2e) | 14 파일 / 385 통과 / 0 실패 |
| Playwright (지정 spec 9개) | 44 통과 / 1 skip / 0 실패 |
| prettier --check (변경 frontend 파일) | 통과 |

Playwright 대상: dashboard, dashboard-leave-calendar, approvals, login, password, departments, attendance, attendance-status, attendance-sheet-layout (leaves.spec 제외).
skip 1건: `dashboard-leave-calendar.spec.ts` "shouldCaptureCalendarScreenshotsDesktopAndNarrow"는 `E2E_SCREENSHOT_DIR` 미설정으로 spec 자체의 조건부 skip(기대값 약화 아님).

### 실패 항목

1. **휴가 신청 모달 승인자 드롭다운이 본문 스크롤 영역에 잘림** [담당: frontend]
   - 확인 방법: 일반 사원 계정으로 로그인해 신청 모달을 열고 承認者 콤보박스를 클릭. 여기서 사용한 계정은 900002(EMPLOYEE, 초기 비밀번호 변경 후 사용)이며, E2E 계정은 `approval_required=false`라서 실제 응답에는 승인자 필드가 없다. 그래서 `/api/v1/auth/me` 응답의 `approvalRequired`만 route로 `true`로 바꿔 승인자 필드를 노출했다. 후보 목록(92명)과 모달은 실물.
   - PC(1280×720): 드롭다운 시작점(top 601.5)이 본문 영역 하단(597.5)보다 아래. 열린 직후 목록 대부분이 본문 밖이라 보이지 않고, 본문을 내부 스크롤해야 후보가 나타난다. 스크린샷에서 목록이 본문 하단 경계에서 잘린 것을 확인.
   - 모바일(360×640): 목록 top 523 > 본문 하단 519. 열린 직후 목록 전체가 보이지 않는다.
   - 원인 추정: `ApproverSelect`의 `absolute` 목록이 `Modal` 본문 `overflow-y-auto` 안에서 클리핑됨(구조적 원인, 이전 frontend.md의 "구조상 가능성"과 일치).
   - 증거: `screenshots/approver-dropdown-pc.png`, `screenshots/approver-dropdown-mobile.png`.
   - 조치 제안(구현 변경은 하지 않음): 목록을 포털로 띄우거나, 신청 모달에서 목록을 in-flow로 배치해 본문 안에서 밀어내도록 변경. 어느 쪽이든 frontend 담당 판단.

### 환경 이슈(실패로 세지 않음)
- `npm run db:migrate:test` 실패: 마이그레이션 `20261110150000_department_code_and_required_user_department`가 `column "code" of relation "departments" already exists`(42701)로 중단. 테스트 DB에 이미 컬럼이 있고 마이그레이션 이력과 어긋난 상태로 보임. 이 마이그레이션은 기존 커밋(b6a087b)이며 이번 변경과 무관. DB 재생성은 하지 않았다. backend e2e 385건은 현재 스키마 기준으로 통과. 확인 필요: 테스트 DB 이력 정리는 사용자 판단.
- 승인 목록 spec 등은 기존 spec 동작대로 실행. 이번 run에서 새 휴가 생성은 없음(승인자 확인은 제출 없이 닫음). 개발 DB에 이미 있던 휴가 1건(CANCELLED, 특별휴가)이 상세 스크린샷에 보임.

### 요구 확인(c) 스크린샷
- `screenshots/leave-detail-pc.png`: 관리자 계정으로 /leaves 1280×800에서 상세 모달. 9행 표(申請者~処理日時) 정상, 취소 상태 Badge(pill, 아이콘) 표시, 閉じる 푸터, 본문 한 화면 안.
- `screenshots/leave-detail-mobile.png`: 375×700. 같은 테스트에서 촬영, 파일 존재 확인(내용 육안 확인은 하지 않음).
- 주의: 처음 캡처는 스켈레톤 상태였으므로 내용 로드 후 재촬영했다.

### 미검증 항목(명시)
- test-plan §2 E2E `leave-detail-modal.spec.ts`(E-01~E-05)는 작성하지 않았다. 필요하면 신규 spec 추가 필요(현재 leaves.spec 제외 결정 때문).
- LD-10 중 Esc 닫기는 단위 테스트에서 검증하지 않음(jsdom 한계, 닫기 X·[閉じる] 2경로만 확인).
- Modal.test MD-05(바깥 클릭 무시)는 `<dialog>` 클릭이 backdrop 클릭과 동일하게 보이지 않아 "onClose 미호출"만 확인(실제 backdrop 클릭 동작은 브라우저에서 미확인).
- T-REG 중 미확인: 출근·퇴근 확인 모달, 날짜 상세 모달(인원 다수 시 스크롤), 근태 수정 모달, 부서 등록·삭제 모달의 육안 확인, 배경 스크롤 잠금의 실제 브라우저 확인, SCR-004 이력 표·필터 색과 SCR-003 申請 배지 행 높이(육안), 승인 목록·대시보드의 「～」 표기(자동 테스트만 통과).
- 모바일 상세 모달(360) 가로 스크롤 여부는 측정하지 않음.

## Run 2

실행 환경: 브랜치 feature/leave-detail-modal(미커밋, 브랜치 전환 없음), 프론트 개발 서버 기동 상태, 개발 DB. `PLAYWRIGHT_BASE_URL` 미설정(global-setup이 E2E 계정 900001/900002 초기화). `E2E_ADMIN_PASSWORD=test0000`, `E2E_INITIAL_PASSWORD=test0000`, `E2E_SCREENSHOT_DIR`=`.claude/work/leave-detail-modal/screenshots` 설정.
결론 요약: Run 1의 실패(승인자 드롭다운 잘림)는 frontend Fix 1(ApproverSelect in-flow 변경) 이후 재실행에서 해소 확인. 전체 PASS.

### 변경 테스트 파일
- 이번 run에서 테스트 파일 작성·수정 없음(tester 수정 없음). 기존 Run 1 산출물을 그대로 재실행.

### 실행 결과
| 항목 | 결과 |
|---|---|
| frontend tsc --noEmit | 오류 0 (exit 0) |
| frontend eslint(`npm run lint`) | 오류 0, 경고 0 (exit 0) |
| frontend vitest 전체 | 36 파일 / 524 통과 / 0 실패 |
| Playwright 9개 spec | 45 통과 / 0 skip / 0 실패 |

Playwright 대상: dashboard, dashboard-leave-calendar, approvals, login, password, departments, attendance, attendance-status, attendance-sheet-layout (leaves.spec 제외, 기존 결함).
- Run 1에서 skip 1건이던 `dashboard-leave-calendar.spec.ts` "shouldCaptureCalendarScreenshotsDesktopAndNarrow"는 `E2E_SCREENSHOT_DIR` 설정으로 실행되어 통과.

### 생략 항목
- backend 테스트(unit·e2e·tsc·lint): 이번 feature 범위에서 backend 변경 없음(frontend.md·test-plan §0 기준). 기록상 생략. Run 1에서 backend 전체 통과(unit 294, e2e 385) 기록 유지.

### 실패 항목
- 없음.

### 환경 이슈
- 없음(Run 1의 테스트 DB 마이그레이션 이력 문제는 이번 run에서 재실행하지 않음, 영향 없음).

### 미검증 항목
- Run 1 미검증 목록(LD-10 Esc 닫기 jsdom 한계, MD-05 실제 backdrop 클릭, test-plan §2 E-01~E-05 신규 E2E spec 미작성, T-REG 육안 확인, 모바일 상세 모달 가로 스크롤 측정)은 이번 run 범위 밖이라 그대로 남음.
- 승인자 드롭다운 수정 후 육안 재확인 스크린샷은 frontend가 `screenshots/approver-dropdown-fix-pc.png`, `approver-dropdown-fix-mobile.png`로 남김(tester는 내용 육안 확인 안 함).
