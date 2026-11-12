RESULT: PASS

# DateInput 테스트 보고서

## 1. 대상
- DateInput 컴포넌트(`frontend/src/components/DateInput.tsx`)와 `formatDateInputValue`
- 적용 화면: 休暇申請(LeaveApplyModal, 開始日·終了日, 半日時 終了日 無効), 休暇履歴 期間フィルタ(LeaveHistoryList), 勤怠修正(AttendanceEditModal, datetime-local)
- LeaveDetailModal 却下 textarea のプレースホルダ

## 2. 작성한 테스트
| 파일 | 내용 | 결과 |
|---|---|---|
| `frontend/src/components/DateInput.test.tsx` (신규, 17개) | formatDateInputValue(date / datetime-local / 空・不正形式 → null / datetime値 + type date → 日付のみ), 重ね表示テキスト・プレースホルダ, aria-hidden, label 紐付け, change 伝播, showPicker(定義時 呼び出し・未定義時 エラーなし・外部 onClick 併用), disabled 透過 | 17/17 통과 |
| `frontend/src/components/leave/LeaveDetailModal.test.tsx` (기존, assertion 1줄 추가) | 却下 textarea に `messages.leave.reject.reasonPlaceholder` が付くこと | 통과 |

- 테스트 계획서(`test-plan.md`)는 이 작업 폴더에 없어서, 메인 에이전트가 지정한 Task A~D 항목을 기준으로 작성했다.
- jsdom에는 `showPicker`가 없어서 `vi.spyOn`이 실패했다. 테스트 쪽 문제로 판단해 `Object.defineProperty`로 주입하고 afterEach에서 제거하도록 고쳤다. 구현은 건드리지 않았다.

## 3. 실행 결과 (PowerShell)
- `npx vitest run` (frontend 전체): **51 files, 741 tests 전부 통과, 실패 0**
- `npx tsc --noEmit`: 종료 코드 0 (오류 없음)
- `npm run lint` (frontend 전체): 종료 코드 0
- 실행 중 jsdom의 `Not implemented: navigation to another Document` 경고가 출력되지만, 이 경고는 변경 전 기준 로그(`vitest-full.log`)에도 있어 이번 변경과 무관하다. 테스트는 모두 통과한다.

## 4. 시각 확인 (Playwright, dev server http://localhost:3000)
- 모든 `/api/v1` 요청을 `page.route`로 고정 응답 처리했다. GET 외 요청은 abort, 예외는 `POST /auth/refresh`(세션 복원용 고정 응답) 하나뿐이다. 개발 DB에는 아무것도 쓰지 않았고, 제출도 하지 않았다.
- `PLAYWRIGHT_BASE_URL`을 지정하고 E2E 비밀번호 환경변수를 비워서 globalSetup의 계정 초기화도 돌지 않았다. 자격 증명은 읽거나 출력하지 않았다.
- 임시 spec(`frontend/e2e/zz-date-input-visual.spec.ts`)은 실행 후 삭제했다. 사본은 scratchpad에 있다.
- 3개 케이스 모두 통과.

### 측정값 (모든 date/datetime 입력)
- 중첩 표시(span)와 입력칸의 세로 중심 차이: 전부 **0px**
- 왼쪽 오프셋: 전부 **0px**
- 네이티브 텍스트 color: 전부 `rgba(0, 0, 0, 0)` (투명). 이중 표시 없음
- 빈 값 placeholder: `----年--月--日`, 값이 있으면 `2026年11月16日`, datetime은 `2026年11月09日 09時00分` (24시간)
- 半日休暇 시 終了日: disabled, 텍스트 색은 disabled용 회색 (`rgb(90, 96, 127)`)

### 스크린샷 (`.claude/work/date-input/screenshots/`)
- `leave-apply-empty.png`: 休暇申請, 날짜 비어 있음. placeholder 정상
- `leave-apply-filled.png`: 날짜 입력됨. 申請日数 3日 계산, 겹침 없음
- `leave-apply-half-day-end-disabled.png`: 午前半休, 終了日 비활성(회색), 申請日数 0.5日
- `leave-apply-360px.png`: 360px 폭. 날짜 텍스트와 달력 아이콘이 입력칸 안에 들어가고 잘리지 않음
- `leave-history-filter.png`: 休暇履歴 期間フィルタ(compact). 빈 상태 placeholder 정상, 입력칸과 정렬됨
- `attendance-edit-datetime.png`: 勤怠修正 모달. `2026年11月09日 09時00分` 형식, 退勤 입력칸 정렬 정상

## 5. 시각 이슈
- 블로커 없음. 정렬 오차와 이중 표시는 측정과 스크린샷 모두에서 확인되지 않았다.
- 참고(비차단): 休暇履歴 필터의 placeholder 글자가 compact 크기라 작게 보인다. 의도된 크기이므로 조치는 필요 없다.
- 참고: 休暇履歴 페이지에는 숨겨진 date 입력(높이 0)이 2개 더 DOM에 있다. 모바일용 중복으로 보이며 표시에는 영향이 없다.

## 6. 미검증 항목
- 실제 브라우저의 네이티브 달력 팝업 동작(showPicker 호출 결과)은 Playwright 헤드리스 화면에서 확인하지 않았다. 단위 테스트에서는 mock으로만 검증했다.
- Safari·Firefox 등 다른 브라우저에서의 `::-webkit-datetime-edit` 숨김 동작은 Chromium 기준으로만 확인했다.
- 실제 백엔드 연동(제출, 저장)은 하지 않았다. 요청이 mock 응답으로만 처리되었다.

## 7. 구현 버그
- 발견하지 못했다. 구현 파일은 수정하지 않았다.

## 8. 변경 파일
- 신규: `frontend/src/components/DateInput.test.tsx`
- 수정: `frontend/src/components/leave/LeaveDetailModal.test.tsx` (placeholder assertion 1줄 추가)
- 산출물: `.claude/work/date-input/test-report.md`, `.claude/work/date-input/screenshots/*.png` 6개
- 커밋, push, 브랜치 변경은 하지 않았다.
