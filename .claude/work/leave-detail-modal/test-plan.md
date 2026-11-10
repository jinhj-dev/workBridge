# test-plan: leave-detail-modal

근거: `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md` §4.3·§4.4, `docs/03_SCREEN_LIST.md` 공통 UI 규칙(모달, 403/404), `decisions.md` D1~D11, `design-frontend.md`.
백엔드 변경 없음 → backend 테스트 추가 없음(회귀로 기존 전체 실행만).

## 1. 컴포넌트 단위 (Vitest + Testing Library)

### `frontend/src/components/leave/LeaveDetailModal.test.tsx` (수정·추가)
| ID | 시나리오 | 기대 결과 |
|---|---|---|
| LD-01 | PENDING·수동 승인자 상세 | 행 순서 申請者→休暇種別→期間→日数→理由→承認者→ステータス→処理者→処理日時(`dt` 텍스트 순서로 검증). 申請者 `申請者 (10001) / 営業部`, 承認者 `承認者`, 処理者·処理日時 모두 「—」, 却下理由 없음 |
| LD-02 | 자동 승인(`autoApproved:true`, approver null) | 承認者 「自動承認」, 処理者 = 신청자명, 処理日時 `2026/11/08 10:00` |
| LD-03 | `autoApproved:false`인데 승인자명 표시 | 承認者 = `approver.name`(「自動承認」 아님) |
| LD-04 | departmentName null | 申請者 `… (empId) / 未所属` |
| LD-05 | 期間 하루 / 여러 날 | `2026/11/10` / `2026/11/20 ～ 2026/11/21`(기존 기대값 "~" 갱신) |
| LD-06 | 日数 0.5 | `0.5日` |
| LD-07 | 상태별 Badge 문구 4종 | 承認待ち·承認済み·却下·取消済み 표시(색 클래스는 LeaveStatusBadge 테스트에서) |
| LD-08 | REJECTED | 却下理由 행이 処理日時 다음에 표시 |
| LD-09 | 긴 이름·사유 | 값 셀(`dd`)에 줄바꿈 클래스(`break-words`), 사유는 `whitespace-pre-wrap` |
| LD-10 | 닫기 3경로 | X 버튼·[閉じる] 클릭 시 `onClose` 1회. Esc는 jsdom 한계가 있으면 `dialog`에 `cancel`/`close` 이벤트 발화로 `onClose` 확인 |
| LD-11 | 회귀 | 기존 승인·반려·취소·initialStep·403/404 테스트 전부 통과(로직 변경 없음 확인) |

### `frontend/src/components/leave/LeaveStatusBadge.test.tsx` (신규)
| ID | 시나리오 | 기대 결과 |
|---|---|---|
| LS-01 | 4개 상태 | 문구 = `messages.leave.statuses[status]`, 배경 클래스: PENDING `bg-warning-40`, APPROVED `bg-success-40`, REJECTED `bg-danger-30`, CANCELLED `bg-general-40` |
| LS-02 | 아이콘 | 각 상태에 `svg[aria-hidden="true"]` 1개, 접근 가능한 이름은 문구만 |
| LS-03 | children 지정 | `休暇 承認済み`처럼 children 문구가 기본 문구를 대체 |
| LS-04 | 형태 | `rounded-full`(pill) |

### `frontend/src/components/DetailTable.test.tsx` (신규)
| ID | 시나리오 | 기대 결과 |
|---|---|---|
| DT-01 | 행 렌더 | `dl` 안에 `dt`(label)·`dd`(값) 쌍이 순서대로, `dt`에 `bg-general-30` |
| DT-02 | 긴 값 | `dd`에 `min-w-0`·`break-words` |

### `frontend/src/components/Modal.test.tsx` (신규)
| ID | 시나리오 | 기대 결과 |
|---|---|---|
| MD-01 | 기본 | `role="dialog"` 이름 = title, X 버튼 이름 「閉じる」, 클릭 시 `onClose` |
| MD-02 | `icon` 지정 / 미지정 | 지정 시 제목 옆 아이콘 박스(`aria-hidden`), 미지정 시 없음 |
| MD-03 | `size` | 기본 `max-w-105`, `lg` `max-w-160` |
| MD-04 | 본문 스크롤 영역 | 본문 래퍼에 `overflow-y-auto`, 푸터에 `border-t` |
| MD-05 | 바깥 클릭 | backdrop(dialog 요소 자체) 클릭 시 `onClose` 호출 안 됨 |

### 기존 테스트 갱신
- `frontend/src/lib/format.test.ts`: formatPeriod 여러 날 기대값 `2026/11/10 ～ 2026/11/12`
- `LeaveHistoryList`·`LeavesView`·`AttendanceSheetView`·`ApprovalsView`·`PendingApprovalsSection` 테스트 중 "~" 또는 `取消` 하드코딩 기대값이 있으면 갱신(`messages` 참조는 자동 반영). 기대값을 구현에 맞춰 무조건 바꾸지 말고 D3·D6 변경에 의한 것만.

## 2. E2E (Playwright, 실제 백엔드·개발 DB) — `frontend/e2e/leave-detail-modal.spec.ts` (신규) 또는 기존 `e2e/leaves.spec.ts`에 추가
| ID | 시나리오 | 기대 결과 |
|---|---|---|
| E-01 | /leaves(필터 `?status=…` 지정 상태)에서 [詳細] → 모달 | 이미지 항목 9행 표시, 모달 열린 동안 `document.documentElement` computed `overflow` = `hidden` |
| E-02 | Esc / X / [閉じる] 각각 닫기 | 모달 닫힘, URL Query·목록 그대로, `overflow` 원복 |
| E-03 | overlay 영역 클릭 | 모달 유지 |
| E-04 | 승인 목록 /leaves/approvals(ADMIN 900001)에서 [詳細] | 같은 모달, 承認者·処理者 「—」 표시, 승인 동작 기존대로 |
| E-05 | 뷰포트 360×640 | 모달 좌우 여백 16 이상, 가로 스크롤 없음(`scrollWidth <= clientWidth`), 긴 사유 입력 건에서 본문만 세로 스크롤되고 [閉じる] 보임 |
- 데이터: E2E 계정 900001/900002로 신청·자동 승인 건 생성(기존 leaves.spec 방식). 개발 DB에 데이터가 남음.

## 3. 공통 변경 회귀 확인 (T-REG, 수동 + 스크린샷)
Modal·Badge·formatPeriod·상태 문구 변경의 영향. 데스크톱 1440, 모바일 360 각각 확인하고 test-report에 결과 기록.
| 대상 | 확인 |
|---|---|
| 출근·퇴근 확인 모달(SCR-002) | 푸터 구분선·버튼 배치, 짧은 본문에서 불필요한 스크롤 없음 |
| 휴가 신청 모달(SCR-002·004) | 긴 폼이 본문만 스크롤, ApproverSelect 목록이 잘리지 않음(잘리면 보고) |
| 날짜 상세 모달(SCR-002 캘린더) | 인원 다수일 때 본문 스크롤 |
| 근태 수정 모달(SCR-008), 부서 등록·삭제 모달(SCR-010) | 레이아웃 깨짐 없음 |
| SCR-004 이력 표·카드·상태 필터 버튼 | 承認待ち 노랑·取消済み 회색, 아이콘 pill, 행 높이 변화 없음 |
| SCR-003 출근부 申請 배지 | `休暇 承認待ち` 문구 유지, compact 행(36) 높이 안에 들어감 |
| 승인 목록·대시보드 승인 대기 | 기간 표기 「～」 |
| 배경 스크롤 잠금 | 모달 닫은 뒤 페이지 스크롤 정상 복귀(모든 모달) |

## 4. 실행 명령
- frontend: `npx tsc --noEmit`, `npm run lint`, `npm test`, 단일 `npx vitest run src/components/leave/LeaveDetailModal.test.tsx`, `npm run test:e2e`(E2E_ADMIN_PASSWORD·E2E_INITIAL_PASSWORD 필요), `npm run build`
- 루트 `npm run format:check`
