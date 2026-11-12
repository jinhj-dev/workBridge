# test-plan — modal-refactor

근거: `docs/UI_MODAL_REFACTOR_PLAN.md` §2(단계별 검증)·§3(R2~R5·R8)·§6, `docs/UI_MODAL_PATTERNS.md` §3.4·§4·§7, 화면 흐름은 `docs/04_SCREEN_SPECIFICATIONS/SCR-002·004·008·010`.
명령: `.claude/work/context.md` "명령어"(frontend). 단위 `cd frontend && npx vitest run <파일>`, 전체 `npm test`, E2E `npm run test:e2e`(개발 서버·개발 DB·`E2E_ADMIN_PASSWORD`·`E2E_INITIAL_PASSWORD` 필요. 없으면 미실행 사유를 보고).
원칙: 외형 클래스 단정은 줄이고 역할·접근성 단정(이름, describedby, disabled, busy 이벤트, 포커스)을 늘린다. 기존 단정 변경은 의도한 변경(D1·D6 외형, 초기 포커스, busy)에 한정하고 사유를 기록(testing-rules §10).

## 1. 신규 단위 테스트 (Vitest + Testing Library, jsdom)

jsdom 주의: `vitest.setup.ts`의 `showModal`/`close` 폴리필은 `close()` 시 `close` 이벤트를 보낸다. Esc는 `fireEvent(dialog, new Event('cancel', { cancelable: true }))`로 재현.

### `frontend/src/components/Modal.test.tsx` (추가)
| # | 시나리오 | 기대 |
|---|---|---|
| MO-1 | `description` 지정 | dialog `aria-describedby`가 설명문 요소 id를 가리키고 접근 설명 = 설명문 |
| MO-2 | `description` 없음 | `aria-describedby` 속성 없음 |
| MO-3 | `busy` | X 버튼 disabled, 클릭해도 `onClose` 미호출 |
| MO-4 | `busy` 중 cancel 이벤트 | `defaultPrevented === true` |
| MO-5 | `busy` 중 close 이벤트(브라우저가 닫은 상황 재현) | dialog `open` 유지(재오픈), `onClose` 미호출 |
| MO-6 | `busy` 아님 close 이벤트 | `onClose` 1회 |
| MO-7 | busy=true 상태에서 rerender로 `open=false` | dialog 닫힘, 재오픈 없음 |
| MO-8 | 자식에 `[data-autofocus]` | 열린 직후 그 요소가 `document.activeElement` |
| MO-9 | `[data-autofocus]` 없음 | 예외 없이 열림 |
| MO-10(C3) | `icon` 필수화 후 helper | 아이콘 박스 `aria-hidden`, footer 컨테이너 `sm:border-t`(기존 `border-t` 단정 대체). "plain" 케이스 삭제 |
| MO-11(C3) | `size` md/lg/xl | 기존 `max-w-105/160/200` 단정 유지 |

### `frontend/src/components/form.test.tsx` (신규)
| # | 시나리오 | 기대 |
|---|---|---|
| FO-1 | `CharCount length<=max` | 「n/max」 표시, id 부여, 초과 스타일 없음 |
| FO-2 | `CharCount length>max` | `text-danger-100` + `font-medium` |
| FO-3 | `CharCount error` 지정 | 오류 요소가 카운터와 같은 행(왼쪽)에 렌더 |
| FO-4 | `FieldHint id` | id·문구 렌더 |
| FO-5 | `modalSecondaryButtonClass`·`modalDangerButtonClass` | disabled 버튼에 `disabled:` 클래스 포함(문자열 포함 단정 1건씩으로 최소화) |

### `frontend/src/components/ReadOnlySummary.test.tsx` (신규)
| # | 시나리오 | 기대 |
|---|---|---|
| RS-1 | 항목 2개 | `dl` 1개 안에 `dt`·`dd` 쌍 2개, 순서 유지 |
| RS-2 | 긴 값 | `dd`에 `min-w-0` + `wrap-anywhere` |

### `frontend/src/components/ConfirmDialog.test.tsx` (신규)
| # | 시나리오 | 기대 |
|---|---|---|
| CD-1 | 기본(primary) | `dialog` 이름 = title, message 표시, [confirm]에 포커스, 클릭 시 `onConfirm` |
| CD-2 | `tone="danger"` | [confirm]에 danger 클래스(`bg-danger-100`), 초기 포커스 [キャンセル] |
| CD-3 | `notice` 지정 / 미지정 | warning Notice 표시 / 없음 |
| CD-4 | `submitting` | 양 버튼 disabled, Spinner, X disabled, cancel 이벤트 차단 |
| CD-5 | [キャンセル] 클릭 | `onClose` 1회 |

### `frontend/src/components/FormModal.test.tsx` (신규)
| # | 시나리오 | 기대 |
|---|---|---|
| FM-1 | 렌더 | `dialog` 이름 = title, 설명 = description, footer [キャンセル]·[submitLabel] |
| FM-2 | 제출 버튼 클릭 / 입력에서 Enter | `onSubmit` 1회(form `noValidate`) |
| FM-3 | `submitting` | 제출·취소 버튼 disabled, Spinner, X disabled |
| FM-4 | [キャンセル] | `onClose` 1회 |

### `frontend/src/components/Select.test.tsx` (추가)
| SE-1 | `autoFocus` | 네이티브 select에 `data-autofocus` 속성, 미지정 시 없음 |

## 2. 기존 단위 테스트 영향 (청크별 실행)

| 청크 | 파일 | 예상 영향 / 추가 단정 |
|---|---|---|
| C1 | `Modal.test.tsx`, `Select.test.tsx` | 기존 단정 무수정 통과 |
| C2 | `DashboardView.test.tsx`(M09) | 기존 출근·퇴근 확인 흐름 통과. 추가: 확인 모달 초기 포커스 = [登録する], 제출 중 cancel 이벤트 무시·모달 유지. `queryByRole('dialog')...not` 류(:406) 유효 |
| C2 | `DepartmentsView.test.tsx`(M04) | 추가: 제출 중 [キャンセル] disabled(PLAN §1 M04), 삭제 버튼 접근 이름 유지, 초기 포커스 [キャンセル]. 403·404·409 시 닫고 재조회 기존 단정 통과 |
| C2·C5 | `LeaveDetailModal.test.tsx`(M06) | 4단계·initialStep·권한별 버튼·409 메시지 기존 단정 통과. 추가: 제출 중 cancel 이벤트 무시, 取消 확정 단계 초기 포커스 [戻る], approve 단계 초기 포커스 [承認する]. C5: 却下 사유 초과 시 카운터·FieldError |
| C2·C4 | `AttendanceEditModal.test.tsx`(M08) | C2: 확인 단계 busy. C4: 社員名·勤務日이 `dl`(ReadOnlySummary)로 노출, 出勤時刻 `aria-required`, 설명문 describedby, `INVALID_TIME_RANGE` 시 입력 단계 복귀 + Notice error 기존 단정 통과 |
| C3 | 모달 관련 전 단위 테스트 | 아이콘 필수화로 인한 타입 오류 0, 외형 클래스 단정은 `Modal.test.tsx`만 조정 |
| C4 | `LeaveApplyModal.test.tsx`, `LeaveManagementLayout.test.tsx`(M05) | 반차 종료일 고정·일수 미리보기·승인자 조건부·서버 field 매핑·focusFirst 기존 단정 통과. 날짜 입력 describedby 정확 일치 단정이 있으면 힌트 id 추가로 조정(D13 의도 변경). 추가: 설명문 describedby, 理由 placeholder, 제출 중 취소 disabled |
| C4 | `DepartmentFormModal.test.tsx`(M01) | 책임자 검색·디바운스·후보 100 안내·managerUnchanged·오류 코드별 처리 기존 단정 통과. 카운터 문구 「n / max」 단정이 있으면 「n/max」로(R10 의도 변경) |
| C4 | `AdminAttendanceView.test.tsx` | [修正]→모달 열림·저장 후 재조회 통과 |
| C5 | `LeavesView`·`ApprovalsView`·`AttendanceSheetView`·`DashboardView`(M06 호출부), `DepartmentMembersModal.test.tsx`(M03), `LeaveCalendarView.test.tsx`(M07) | 무수정 통과(호출부 코드 무변경) |
| C6 | `FormTable.test.tsx`, `DetailTable.test.tsx` + 전체 `npm test` | 전부 통과 |

## 3. E2E (Playwright, 실제 백엔드·개발 DB)

| 청크 | 스펙 | 확인 |
|---|---|---|
| C2 이후 | 신규 1건(예: `frontend/e2e/modal-a11y.spec.ts`, M09 대시보드) | ① 확인 모달 열림 직후 포커스 = [登録する](X 아님) ② Esc → 닫힘 → 포커스가 연 버튼으로 복귀 ③ 제출 중(`page.route`로 출근 API 응답 지연) Esc 연타 → 모달 유지, X·[キャンセル] disabled ④ 출근 완료 후 버튼 교체 시 포커스 위치 기록(PATTERNS §7). DB 오염 방지: 지연 후 `route.abort()` 또는 E2E 계정 전용 reset 명령(`db:e2e-attendance-reset`) 사용 |
| C2 | `dashboard.spec.ts`, `dashboard-renewal.spec.ts`, `departments.spec.ts`, `approvals.spec.ts` | 확인 모달 흐름 통과 |
| C3~C5 | `departments*.spec.ts`(4), `leaves.spec.ts`, `leave-visual.spec.ts`, `leave-management.spec.ts`, `approvals.spec.ts`, `attendance*.spec.ts`, `dashboard*.spec.ts` | 통과 + `.screenshot()` 저장형 이미지(38곳, `departments-members-modal.spec.ts` 15곳) 전후 수동 검토 |

## 4. 화면 확인 (전후 스크린샷, D15)

- 폭: **360 / 768 / 1024 / 1440**. 대상: 9개 모달, 단계형은 단계별(M06 detail·approve·reject·cancel, M08 input·confirm·서버 오류, M09 出勤·退勤, M01 登録·編集).
- 저장: before = C1 착수 전 `.claude/work/modal-refactor/screenshots/before/<ID>-<step>-<width>.png`, after = C3·C4·C5 완료 시 `.../after/…`(PNG는 git 관리 외).
- 방법: 개발 서버(`npm run dev:backend`, `npm run dev:frontend`) + E2E 계정으로 Playwright 스크립트(스크래치 또는 위 신규 스펙의 보조 테스트). 환경이 없으면 미실행으로 보고.
- 대조 기준: 시안 `.claude/work/modal-audit/mockups/compare-*.png`, `compare-d7-*`, `compare-d8-*`.
- 체크 항목: 외형 ①'(radius 16·soft 그림자·padding 20/28/32·제목 20/24), 제목 아이콘(모든 모달, primary 박스), footer(모바일 2개=2열 전폭 / 1개=전폭 / 3개 이상=우측 정렬 줄바꿈, sm 이상 우측 정렬 + 본문 폭 구분선), 빨간 위험 버튼(M04·M06 取消), 아웃라인 취소, M01·M08 FormTable(360에서 1열), ReadOnlySummary 줄바꿈, M05 申請日数 일반 텍스트, 카운터 간격.
- 결과: 모달별 "의도한 차이 / 의도하지 않은 차이" 표를 tester 보고서에 기록. 의도하지 않은 차이는 frontend로 되돌림.

## 5. 접근성 수동 체크 (C2 이후·최종)
Tab 순환(dialog 안), Esc(평상시 닫힘·제출 중 차단·연속), 초기 포커스(PATTERNS §7: D 위험=[キャンセル], D 기타=주 버튼, A=첫 입력, reject=입력), 포커스 복귀, 이름(title)·설명(description) 낭독, ReadOnlySummary `dl` 구조.

## 6. 최종 회귀 (단계 7)
`cd frontend && npx tsc --noEmit && npm run lint && npm test && npm run build`, 이어서 §3 E2E 전체. 결과(통과 수·미실행 사유)를 tester 보고서에 기록 → 8단계에서 `docs/10_DEVELOPMENT_ROADMAP.md` 반영.
