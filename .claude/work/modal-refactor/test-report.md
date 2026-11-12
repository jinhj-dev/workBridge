RESULT: PASS

# test-report — modal-refactor (Run 1, Run 2 아래 추가)

근거: `test-plan.md`, `frontend.md`(C1~C6). 실행 환경: Windows, vitest는 PowerShell, Playwright는 Git Bash, 개발 서버 3000·백엔드 6000(사용자 서버, 종료하지 않음).

## 1. 요약

| 구분 | 실행 | 통과 | 실패 | 비고 |
|---|---|---|---|---|
| Frontend vitest 전체 | 712 (50 파일) | 711 | 1 | 실패 1건 = 프론트 구현 결함(아래 §3) |
| Frontend tsc --noEmit | - | 0 오류 | - | 통과 |
| Frontend eslint | - | 0 오류 | - | 통과 |
| Playwright `modal-a11y.spec.ts` (신규) | 1 | 1 | 0 | ①~④ 모두 통과 |
| Playwright 배치(modal-a11y + dashboard + dashboard-renewal + login) | 27 | 19 | 8 | 실패 8건 전부 `dashboard-renewal.spec.ts`, 계정·픽스처 상태 전제 미충족(§4) |
| Backend vitest (unit) | 323 (22 파일) | 323 | 0 | backend 파일 변경 없음 |
| Backend e2e | - | - | - | 미실행(backend 변경 없음, 테스트 DB 필요) |
| `npm run build` | - | - | - | 미실행: 3000 `next dev`가 `.next`를 쓰는 중이라 빌드가 개발 서버를 깨뜨릴 수 있음 |

신규 단위 테스트 추가 14건(기존 698건 → 712건). 나머지 모달 단위 테스트(form.test, ReadOnlySummary.test, ConfirmDialog.test, FormModal.test, Modal.test 기존 7건, Select.test SE-1)는 프론트 C1~C4에서 작성되어 있었고, 내용을 test-plan과 대조해 통과를 확인했다.

## 2. 작성·수정한 테스트 파일

신규 단정 추가 (test-plan §1·§2 대응):
- `frontend/src/components/Modal.test.tsx` +1: 자동 포커스 요소 없음에서도 열림(MO-9)
- `frontend/src/components/FormModal.test.tsx` +2: input에서 Enter로 제출(FM-2), 送信中 X 無効(FM-3)
- `frontend/src/app/(app)/dashboard/DashboardView.test.tsx` +1: 出勤確認 열림 직후 [登録する] 포커스(M09)
- `frontend/src/app/(app)/admin/departments/DepartmentFormModal.test.tsx` +1: 열림 직후 部署コード 포커스, 説明 カウンター 「0/500」(M01)
- `frontend/src/components/leave/LeaveApplyModal.test.tsx` +2: 설명문·일수 힌트 describedby·理由 placeholder(M05), 送信中 キャンセル 無効(M05)
- `frontend/src/app/(app)/admin/attendance/AttendanceEditModal.test.tsx` +3: 설명문 describedby·出勤時刻 aria-required·초기 포커스(M08), 確認 단계 [修正する] 포커스(M08), 送信中 Esc 차단(M08)
- `frontend/src/components/leave/LeaveDetailModal.test.tsx` +4: 承認 확인 초기 포커스 [承認する](M06), 取消 확정 초기 포커스 [戻る](M06, **실패**), 承認 送信中 Esc 차단(M06), 却下 理由 カウンター(M06 reject)
- `import { fireEvent }` 추가 (LeaveDetailModal.test.tsx)

신규 E2E:
- `frontend/e2e/modal-a11y.spec.ts` (신규, 1건): M09 출근 확인 모달. ① 열림 직후 [登録する] 포커스 ② Esc로 닫힘·출근 버튼 포커스 복귀 ③ 送信中(응답 보류) Esc 3회 → 모달 유지, X·キャンセル disabled ④ 응답 후 모달 닫힘·「勤務中」 표시, 종료 시 포커스 = `button 退勤する`(annotation 기록). 출근 POST와 당일 근태 GET은 `page.route`로 대체해 개발 DB에 출근 데이터를 쓰지 않음.

기존 단정은 수정하지 않았다(의도한 외형 변경에 따른 단정 변경도 이번 Run에서는 없음).

## 3. 실패 항목

### F1. `LeaveDetailModal.test.tsx > shouldFocusBackButtonWhenCancelConfirmOpens`
- 에러 요약: 取消 확정 단계에서 `[戻る]`에 포커스가 없음(실제 포커스는 같은 자리에서 재사용된 `[取り消す]` 버튼).
- 원인 추정: 상세 푸터의 버튼과 취소 확정 푸터의 버튼이 같은 DOM 노드를 재사용한다. React `autoFocus`는 마운트 시에만 적용되므로 `[戻る]`(`autoFocus`+`data-autofocus`)에는 포커스가 가지 않고, 방금 클릭한 `[取消]` 노드가 `[取り消す]`(danger)로 바뀐 채 포커스를 유지한다. 실제 브라우저에서도 같은 동작이 예상된다. 사용자가 Enter를 누르면 **취소 확정이 바로 실행**될 수 있어 위험도가 높다.
- 담당: frontend
- 권장 수정 방향(참고): 단계별로 푸터 버튼에 `key`를 주어 재마운트시키거나, 단계 전환 effect에서 `[data-autofocus]`를 명시적으로 focus.
- 테스트 단정은 약화하지 않았다.

## 4. 기존 e2e 실패(환경 전제, 구현 결함 아님)

`dashboard-renewal.spec.ts`의 실패 8건:
- P-04, P-06, P-07, P-09, P-02, P-05, P-10, P-15
- 원인: 실행 시 `global-setup`(`db:e2e-accounts`)을 건너뛰었으므로 E2E 계정 상태가 초기화되지 않았다(일반 직원 계정이 비밀번호 변경 화면으로 리다이렉트, 승인 대기 픽스처 0건 등). 구현 결함으로 판단하지 않는다.
- 주의: 이 배치 실행에 `dashboard-renewal.spec.ts`를 포함한 것은 내 실수였다. 사전 조건 실패 전후에 쓰기 요청(예: P-09의 휴가 신청)이 나갔을 가능성이 있다. **개발 DB 상태를 확인해야 한다.** 쓰기 여부를 확인하지 못했다.

## 5. 실행 방법 메모 (재현용)

- 단위: `powershell`에서 `cd frontend; npx vitest run` (Git Bash에서는 실패).
- E2E: `PLAYWRIGHT_BASE_URL=http://localhost:3000` 지정, `.env.local`을 셸에서 읽어 `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD`를 전달(값은 출력·기록하지 않음). `PLAYWRIGHT_BASE_URL`을 지정하면 global-setup의 `db:e2e-accounts`가 실행되지 않는다. 대상 DB는 **개발 DB**(localhost). 신규 spec은 모든 출근 쓰기를 route mock으로 대체.
- 픽스처·리셋 스크립트(`db:e2e-*`, `db:sample-*`)는 실행하지 않았다(사용자 승인 필요 항목).

## 6. 스크린샷 대응 (`screenshots/before`, `screenshots/after`)

- 파일 이름 대응: before 48장 = after 48장, 이름 1:1 일치(12 모달·단계 × 360/768/1024/1440).

| 항목 | before | after | 비고 |
|---|---|---|---|
| M01 create / edit | 있음 | 있음 | C4 재촬영 |
| M02 detail | 있음 | 있음 | |
| M03 members | 있음 | 있음 | 크기 동일 |
| M04 delete | 있음 | 있음 | |
| M05 apply | 있음 | 있음 | C4 재촬영 |
| M06 detail / cancel | 있음 | 있음 | 768 cancel 육안 확인: 정상 |
| M06 approve / reject | 없음 | 없음 | **미검증**(개발 DB에 承認待ち 신청 없음) |
| M07 날짜별 휴가자 | 없음 | 없음 | **미검증**(해당 월 휴가 데이터 없음) |
| M08 input / confirm / servererror | 있음 | 있음 | C4 재촬영 |
| M09 clockin | 있음 | 있음 | |
| M09 clockout | 없음 | 없음 | **미검증**(미출근 상태만 있음, 출근 DB 쓰기 금지) |

- 의도한 차이 / 의도하지 않은 차이 표: **미완료**. 육안 비교는 M06-cancel-768 1장만 확인했다(정상). 나머지 47장의 의도 차이 판정은 이번 Run에서 하지 않았다(미검증, 사람 검토 필요).

## 7. 접근성 점검 관련 관찰

- M08 확인 단계의 초기 포커스 테스트(`shouldFocusSubmitOnConfirmStep`)는 통과하지만, 원인은 `autoFocus`가 아니라 방금 클릭한 [保存]이 재사용되어 [修正する]가 된 결과다. F1과 같은 원인이므로, 프론트 수정 시 함께 확인이 필요하다.
- ConfirmDialog(M04·M09)는 열릴 때 `data-autofocus`가 적용되어 통과한다.

## 8. 미검증 항목 (정리)

1. M06 approve·reject 스크린샷, M07 스크린샷, M09 clockout 스크린샷(데이터 없음).
2. 47장의 before/after 의도 차이 판정(육안 검토 미수행).
3. `npm run build`(개발 서버와 `.next` 충돌 우려로 미실행).
4. Backend e2e(backend 변경 없음, 테스트 DB 필요).
5. `dashboard-renewal.spec.ts` 실패 8건(E2E 계정·픽스처 초기화 필요, 개발 DB 쓰기 승인 필요).
6. `dashboard-renewal.spec.ts` 실행이 개발 DB에 쓰기를 남겼는지 여부(확인 필요).
7. 접근성 수동 체크(test-plan §5)의 Tab 순환·낭독: 자동화 범위 밖, 미수행.
8. 일부 test-plan 단정이 얕음(RS-2의 `min-w-0`, CD-4의 Spinner, FO-3의 같은 행 배치는 존재만 확인). 이번 Run에서는 보강하지 않음.

## 9. 판정

RESULT: FAIL. 실패 1건(F1, 담당 frontend). F1 수정 후 `LeaveDetailModal.test.tsx` 재실행이 필요하다.

---

## Run 2 (수정 루프 A 재실행, F1 수정 반영)

판정: **RESULT: PASS** (F1 해소, 신규 실패 없음)

### 실행 결과
| 항목 | 실행 | 통과 | 실패 | 비고 |
|---|---|---|---|---|
| `npx tsc --noEmit` | - | 0 오류 | - | 통과 |
| `npm run lint` | - | 0 오류 | - | 통과 |
| Frontend vitest 전체 | 712 (50 파일) | 712 | 0 | Run 1 실패 1건(F1) 해소. `shouldFocusBackButtonWhenCancelConfirmOpens` 통과 |
| Playwright `e2e/modal-a11y.spec.ts` | 1 | 1 | 0 | 실제 브라우저(3000, `PLAYWRIGHT_BASE_URL` 지정). ①~④ 통과 |

- 실행 명령: PowerShell `npx tsc --noEmit`, `npm run lint`, `npx vitest run`(frontend). Playwright는 `PLAYWRIGHT_BASE_URL=http://localhost:3000`, `E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD`는 `.env.local`에서 프로세스 환경으로만 전달(값 미출력). global-setup의 `db:e2e-accounts`는 설계상 건너뜀.
- 이번 Run에서 실행하지 않은 것: `dashboard-renewal.spec.ts` 등 개발 DB 쓰기 e2e(지시에 따라 제외), `dashboard.spec.ts`·`departments*.spec.ts` 등 기타 e2e, backend 테스트(변경 없음), `npm run build`.
- 테스트 파일 수정: 없음. 작성·수정한 테스트 파일 없음(Run 1 작성분 그대로).

### F1 재검증
- `LeaveDetailModal.test.tsx > shouldFocusBackButtonWhenCancelConfirmOpens`: **통과**. 구현 변경은 `LeaveDetailModal.tsx` 푸터를 `Fragment key={shownStep}`로 감싸 단계 전환 시 재마운트(`autoFocus`+`data-autofocus`가 적용되는 구조). 테스트 단정은 약화하지 않음.
- 관찰 §7 `shouldFocusSubmitOnConfirmStep`(M08 確認 단계): AttendanceEditModal key=step 변경 이후 전체 vitest에서 통과.
- 브라우저에서 M06 취消 확정 초기 포커스를 별도 확인하지 않음(미검증, 아래). 단위 테스트(jsdom)에서는 포커스가 [戻る]에 위치함을 확인.

### 개발 DB 쓰기 확인 (Run 1 미검증 6번, 읽기 전용)
- 방법: `backend/.env`의 `DATABASE_URL`을 읽어 `localhost`·DB `workbridge`(개발 DB) 확인. `BEGIN READ ONLY` 트랜잭션 내 SELECT만 실행 후 ROLLBACK. 접속 정보는 출력하지 않음.
- 오늘(도쿄 날짜 2026-11-13 기준) 생성 레코드:
  - `leaves`: **0건**. 휴가 신청 쓰기 흔적 없음. 전체 최신 created_at은 2026-11-12(도쿄 11-12 21:33).
  - `attendance`: **1건**. 사원 계정은 E2E 계정(사원번호 900001/900002 해당 여부 `true`). 출근 `clock_in` 16:34:59.989Z, 퇴근 `clock_out` 16:35:03.113Z(출근·퇴근 간격 약 4초), created_at 2026-11-12T16:35:00Z(도쿄 2026-11-13 01:35). 자동화 테스트가 출근·퇴근을 연달아 호출한 흔적으로 보인다.
  - `refresh_tokens`: 오늘 52건. 로그인 시 생성되는 정상 레코드(E2E 로그인 다수). 쓰기 자체는 정상 동작의 일부.
- 판단: 개발 DB에 **쓰기가 발생했음**(attendance 1건, E2E 계정). 생성 시각(도쿄 01:35)은 이번 Run 2 시작(도쿄 약 01:40) 이전이고, 이번 Run 2의 신규 spec은 출근 POST를 route mock으로 대체하므로 이 행의 원인이 아니다. 따라서 Run 1(dashboard-renewal 실행 시점)의 쓰기로 **추정**한다. 확정하려면 Run 1 실행 로그 시각과 대조 필요(미확정).
- 조치: 읽기 전용 원칙에 따라 삭제·수정하지 않음. 사용자 판단 필요: 해당 attendance 행(E2E 계정 오늘 근태) 정리 여부. 정리는 `npm run db:e2e-attendance-reset`(E2E 관리자 900001의 attendance만 삭제)으로 가능하나 이번 Run에서 실행하지 않음.

### 미검증 항목 (Run 2 기준)
1. F1의 **브라우저** 확인(M06 取消 확정 진입 시 [戻る] 포커스): route mock으로 휴가 목록·상세 응답을 주입하는 스크립트가 필요해 이번 Run에서는 미작성. 단위 테스트로만 검증.
2. M06 approve·reject, M07, M09 clockout 스크린샷 및 before/after 의도 차이 판정(Run 1 §6·§8 그대로).
3. `npm run build`(개발 서버 `.next` 충돌 우려, 미실행).
4. `dashboard-renewal.spec.ts` 실패 8건(E2E 계정·픽스처 초기화 필요). 이번 Run에서 실행하지 않음.
5. 기존 e2e(`dashboard.spec.ts`, `departments*.spec.ts`, `approvals.spec.ts` 등)의 확인 흐름 회귀: 미실행.
6. Backend e2e(backend 변경 없음, 테스트 DB 필요): 미실행.
7. 접근성 수동 체크(Tab 순환·낭독, test-plan §5): 자동화 범위 밖, 미수행.

---

## Run 3 (수정 루프 B Round 1 재검증 + 얕은 단정 보강)

판정: **RESULT: PASS** (실패 0건. 미검증 항목은 아래 §사용자 확인 목록)

### 실행 결과
| 항목 | 실행 | 통과 | 실패 | 비고 |
|---|---|---|---|---|
| `npx tsc --noEmit` (frontend) | - | 0 오류 | - | 통과 |
| `npm run lint` (frontend) | - | 0 오류 | - | 통과 |
| Frontend vitest 전체 | 724 (50 파일) | 724 | 0 | Run 2 712건 + 신규 12건 |
| Playwright `e2e/modal-a11y.spec.ts` | 1 | 1 | 0 | `PLAYWRIGHT_BASE_URL=http://localhost:3000`, skip 아님. 출근 POST·당일 GET은 route mock(개발 DB 쓰기 없음) |
| `npm run build` | - | - | - | **미실행**: `frontend/.next`를 3000 `next dev`가 사용 중. `next.config.ts`에 distDir 재지정 수단이 없어 안전하게 분리할 방법이 없음. 개발 서버 종료는 지시상 금지 |
| Backend (unit·e2e) | - | - | - | 미실행(backend 파일 변경 없음) |

- 실행 방식: vitest·tsc·lint는 PowerShell(스크립트 파일 `-File`로 실행). Playwright는 Git Bash, `frontend/.env.local`을 프로세스 환경에만 로드(값 미출력). `db:e2e-accounts`는 `PLAYWRIGHT_BASE_URL` 지정으로 건너뜀.
- 금지 준수: 개발 DB 쓰기 e2e(dashboard-renewal 등) 미실행, DB 수정 없음, 커밋 없음, 6000 서버 종료 없음, 비밀번호 미출력.

### 작성·수정한 테스트 파일 (기존 단정은 약화·삭제하지 않고 추가만 함)
- `frontend/src/components/ConfirmDialog.test.tsx` +1: `shouldShowSpinnerInConfirmButtonOnlyWhenSubmitting` (CD-4, 送信中에만 Spinner, `svg.animate-spin`)
- `frontend/src/components/FormModal.test.tsx` +1: `shouldShowSpinnerInSubmitButtonOnlyWhenSubmitting` (FM-3)
- `frontend/src/components/leave/LeaveDetailModal.test.tsx` +5
  - `shouldShowReasonCounterToneForLength500/501` (M06 reject, 500은 일반 톤, 501은 `text-danger-100`+`font-medium`)
  - `shouldReturnFocusToApproveButtonWhenCancelingApproveConfirm` (M06 承認 [キャンセル] → 詳細 → [承認] 포커스)
  - `shouldReturnFocusToRejectButtonWhenCancelingRejectReason` (M06 却下 → 詳細 → [却下] 포커스)
  - `shouldReturnFocusToCancelButtonWhenBackFromCancelConfirm` (M06 取消 [戻る] → 詳細 → [取消] 포커스)
- `frontend/src/app/(app)/admin/attendance/AttendanceEditModal.test.tsx` +2
  - `shouldFocusClockInWhenBackFromConfirm` (M08 確認 [戻る] → 出勤時刻 input 포커스)
  - `shouldFocusClockInWhenInvalidTimeRangeReturnsToInput` (M08 INVALID_TIME_RANGE 복귀 → 出勤時刻 포커스)
- `frontend/src/components/leave/LeaveApplyModal.test.tsx` +1: `shouldFocusLeaveTypeSelectWhenOpened` (M05 初期 포커스 休暇種別)
- `frontend/src/app/(app)/admin/departments/DepartmentFormModal.test.tsx` +2
  - `shouldDescribeManagerInputWithLimitHintOnlyWhenCandidatesReachLimit` (100건 시 책임자 입력 aria-describedby = 안내 문구)
  - `shouldNotDescribeManagerInputWithLimitHintWhenCandidatesBelowLimit` (100건 미만 시 미연결)
- 포맷: 위 6개 파일 prettier 적용.

### 얕은 단정 보강 대응 (review Round 1 tester 항목)
- CD-4 Spinner: 완료(송신 중 있음, 평상시 없음).
- FM-3 Spinner: 완료(동일).
- M06 reject 초과 시 카운터 스타일: 완료(501에서 danger 톤, 500에서 일반 톤).
- M05 초기 포커스 休暇種別: 완료(전용 테스트 추가. 기존 validation 테스트의 포커스 단정은 그대로 둠).
- 범위 밖으로 남긴 얕은 단정: RS-2(`min-w-0`·`wrap-anywhere`), FO-3(CharCount 왼쪽 슬롯 존재만 확인). 요청 목록에 없어 미처리.

### 수정 루프 B Round 1 대응 테스트
- M06 approve/reject/cancel → detail 복귀 시 직전 진입 버튼 포커스: 3건 통과. 구현(`returnFocus` + footer `Fragment key`)에 대한 jsdom 단정이다.
- M08 確認 [戻る]·INVALID_TIME_RANGE 복귀 → 出勤時刻 포커스: 2건 통과.
- DepartmentFormModal 책임자 안내 `aria-describedby` 연결: 2건 통과(100건 시 연결, 미만 시 미연결). 참고: 미연결 케이스는 후보 로드 후 상태를 확인하지만 안내 자체가 100건 미만에서 렌더되지 않으므로 음성 단정의 힘은 약하다.

### 판정 근거
- 실패 0건. 기존 단정은 수정하지 않았음(의도한 외형 변경도 이번 Run에서 없음).
- Run 2 F1 해소 상태 유지(`shouldFocusBackButtonWhenCancelConfirmOpens` 통과).

### 사용자 확인 목록 (미검증)
1. **브라우저 포커스 왕복**: M06 承認·却下·取消 확인 단계에서 [キャンセル]/[戻る] 후 진입 버튼 포커스, M08 確認 [戻る]·INVALID_TIME_RANGE 후 出勤時刻 포커스. 단위 테스트(jsdom)로만 확인. 실제 브라우저에서는 Tab 위치와 Enter 동작을 직접 확인 필요(Enter 시 취소 확정 실행 위험).
2. `npm run build`: 3000 `next dev` 종료 후 실행 필요(또는 별도 빌드 환경). 미실행.
3. Playwright 기존 스펙 회귀: `dashboard.spec.ts`, `departments*.spec.ts`, `leaves.spec.ts`, `leave-management.spec.ts`, `approvals.spec.ts`, `attendance*.spec.ts`. 미실행(개발 DB 쓰기 가능 스펙은 승인 필요).
4. `dashboard-renewal.spec.ts` 실패 8건(Run 1 관찰): E2E 계정·픽스처 초기화 후 재실행 필요. 미실행.
5. 개발 DB에 Run 1 시점으로 추정되는 E2E 계정 오늘자 attendance 1건(Run 2 §개발 DB 쓰기 확인). 정리 여부는 사용자 판단. 이번 Run에서 조회·수정 안 함.
6. M06 approve·reject, M07, M09 clockout 스크린샷과 before/after 47장 의도 차이 판정: 미수행(개발 DB 데이터 필요).
7. 접근성 수동 체크(test-plan §5): Tab 순환, 스크린 리더 낭독(title·description·dl 구조). 자동화 범위 밖, 미수행.
8. Backend e2e: backend 변경 없음, 테스트 DB 필요, 미실행.
9. RS-2·FO-3 얕은 단정(위 범위 밖) 보강 여부는 사용자 판단.
