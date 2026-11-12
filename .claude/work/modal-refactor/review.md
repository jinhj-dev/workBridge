VERDICT: APPROVE

# review — modal-refactor (Round 1)

대상: frontend.md C1~C6 + 수정 루프 A Run 1, test-report Run 1·2. 기준: plan.md(권장안 표), design-frontend.md, docs/UI_MODAL_PATTERNS.md v3, modal-audit/decisions.md, docs/09_DESIGN_SYSTEM.md, context.md.
참고: 이번 리뷰 환경에는 셸이 없어 `git diff docs/modal-audit`를 직접 돌리지 못했다. 변경 파일(git status 기준 21개 수정·1개 삭제·9개 신규)의 **현재 코드**를 전부 읽고, 로직 무변경 여부는 API 호출·검증·오류 분기·submittingRef가 설계 문서의 기존 동작 설명과 일치하는지로 판단했다.

## 이슈

[중간] [담당: frontend] [분류: 버그] frontend/src/components/leave/LeaveDetailModal.tsx:363, frontend/src/app/(app)/admin/attendance/AttendanceEditModal.tsx:220 — 수정 루프 A에서 넣은 `<Fragment key={step}>` 때문에 **이전 단계로 돌아갈 때 포커스가 사라진다**. 방금 누른 버튼(M06 approve·reject [キャンセル], cancel [戻る] → detail / M08 [戻る] 또는 `INVALID_TIME_RANGE` → input)이 언마운트되어 `document.activeElement`가 body가 된다. 수정 전에는 재사용 노드에 포커스가 남았으므로 키보드 사용자 기준 회귀다(PATTERNS §7 포커스 규칙). / 돌아가는 단계에도 진입 포커스를 지정한다. 예: M08 出勤時刻 input에 `autoFocus` 추가(입력 단계 본문은 `<p>`→`<div>`로 재마운트되므로 동작함, 서버 오류 복귀 시 첫 입력 포커스도 §3.1 규칙과 맞음), M06 detail 단계는 직전 단계 진입 버튼([取消]/[承認]/[却下]) 또는 첫 footer 버튼에 포커스. 단위 테스트로 "[戻る]/[キャンセル] 후 포커스가 dialog 안 요소" 단정 추가.

[중간] [담당: frontend] [분류: 문서갱신] .claude/work/modal-refactor/frontend.md "문서 갱신 예정" — 설계상 8단계 architect는 frontend.md의 목록만 반영하는데, plan.md:12에 있는 항목 일부가 빠져 있다. ① 09 §3 Button: Danger 채움 버튼 구현(`modalDangerButtonClass`), 취소 = 아웃라인(D8 "09 §3 문구 갱신"), disabled 대비 예외 1줄(PATTERNS §4.3) ② 09 §3 Modal 행(외형 ①'·아이콘 필수) ③ `.claude/work/context.md`:39 "Danger 버튼 미구현" 정정·:57 Modal `icon?`→필수·`variant` 삭제·신규 공용 부품(ConfirmDialog·FormModal·ReadOnlySummary·FieldHint·CharCount)·FormRow 삭제 ④ `docs/UI_MODAL_PATTERNS.md` §2.1 I-6 아이콘 자산 정정(TrashIcon·ClockIcon 기존 재사용, plan DOC_ISSUES 1)·§9.2 U1~U4 확정 기록 ⑤ SCR-010 D10(所属社員確認 5명 페이지)·U4(제목 「部署登録」) ⑥ 수정 루프 A의 단계 전환 포커스 동작(위 이슈 수정 결과 포함) ⑦ `docs/10_DEVELOPMENT_ROADMAP.md` 회귀 결과. / 위 항목을 frontend.md "문서 갱신 예정"에 한곳으로 모아 적는다.

[낮음] [담당: frontend] [분류: 컨벤션] frontend/src/components/Modal.tsx:22 — 주석 「右寄せのボタン(上に区切り線)」이 새 동작(모바일 2열/전폭, 구분선은 sm 이상)과 다르다. / 주석을 현행 배치로 고친다.

[낮음] [담당: frontend] [분류: 문서불일치] frontend/src/app/(app)/admin/departments/DepartmentFormModal.tsx:242-244 — 책임자 100건 안내 `FieldHint`에 id가 없고 `aria-describedby`에 연결되지 않는다(PATTERNS §3.1 "보조 설명 FieldHint + aria-describedby"). 기존 동작 유지라 낮음. / 필요 시 id 부여 후 ApproverSelect 입력에 연결하거나 현행 유지 사유를 frontend.md에 적는다.

[낮음] [담당: tester] [분류: 테스트] test-report 미검증 항목 — `npm run build`, 기존 E2E(`departments*`·`leaves`·`leave-management`·`approvals`·`attendance*`·`dashboard*`) 회귀, M06 approve·reject·M07·M09 clockout 스크린샷, before/after 47장 차이 판정, 브라우저에서 M06 取消 확정 포커스 확인이 남아 있다(개발 DB 쓰기 승인 필요라는 사유는 타당). / 최종 보고에서 사용자 확인 항목으로 명시하고, 위 포커스 이슈 수정 후 Playwright로 M06·M08 단계 왕복 포커스를 함께 확인한다.

[낮음] [담당: tester] [분류: 테스트] 얕은 단정 — CD-4(ConfirmDialog Spinner), FM-3(Spinner), RS-2, FO-3, M06 reject 초과 시 카운터 `text-danger-100`, M05 초기 포커스 休暇種別(A5) 단정이 없다. / 여유가 있으면 보강.

## 확인한 것 (문제 없음)
- 비즈니스 로직: M01·M04·M05·M06·M08·M09의 API 경로·본문, 검증(글자 수 L1 포함), 오류 코드 분기, `submittingRef`가 설계 설명과 일치. 로직 변경 흔적 없음. 
- 접근성: `busy`(cancel preventDefault·close 재오픈·X disabled), 초기 포커스(`data-autofocus`, 위험=[キャンセル]/[戻る], 기타=주 버튼, A=첫 입력), `aria-describedby`(description·D13 일수 힌트·CharCount·FieldHint), `aria-required`(A6) 모두 설계대로.
- 잔여 참조: `FormRow`, `cancelButtonClass`, `variant="form"`, `leaves.apply.count`, `leave.reject.count` — src·e2e 0건. 모달 파일 hex·임의 px·`text-xl/7` 0건.
- 시안·결정: D1·D3·D3'·D4·D5·D6·D7·D8·D13·D14, U1~U3, R10 문구, A1~A8 반영. ConfirmDialog 본문 `gap-2`는 시안 기준 판단으로 타당. 스크린샷(M06 detail 360, M08 input 1440) 육안 확인 정상.
- `docs/` 직접 수정 없음. backend 변경 없음.

---

# review — modal-refactor (Round 2)

대상: frontend.md "수정 루프 B Round 1", test-report "Run 3". 수정 파일만 확인: LeaveDetailModal.tsx, AttendanceEditModal.tsx, Modal.tsx, DepartmentFormModal.tsx, ApproverSelect.tsx, 테스트 6파일(ConfirmDialog·FormModal·LeaveDetailModal·AttendanceEditModal·LeaveApplyModal·DepartmentFormModal).

## Round 1 지적 처리 결과
- [중간] 포커스 유실 → **해소**. M06: `returnFocus` state로 detail 복귀 시 직전 진입 버튼([承認]/[却下]/[取消])에 `autoFocus`. footer `Fragment key={shownStep}` 재마운트와 맞물려 동작하고, `handleClose`에서 초기화되어 재오픈 시 초기 포커스에 영향 없음. `initialStep`이 approve/reject면 [キャンセル]이 닫기로 가므로 returnFocus를 쓰지 않는 분기도 맞다. M08: 出勤時刻 input `autoFocus`+`data-autofocus`, 본문이 `<p>`↔`<div>`로 바뀌어 [戻る]·`INVALID_TIME_RANGE` 복귀 모두 재마운트로 포커스됨. 단위 테스트 5건이 실제 포커스 대상을 단정한다.
- [중간] 문서 갱신 예정 누락 → **해소**. ①~⑦ 전부 frontend.md:207-215에 모였고, 이번 추가분(ApproverSelect `describedBy?`, 단계 전환 포커스 규칙)도 포함. 내용이 코드와 일치.
- [낮음] Modal.tsx:22 주석 → 해소(현행 배치와 일치).
- [낮음] 책임자 FieldHint 연결 → 해소. `DepartmentFormModal`에서 100건 이상일 때만 `department-manager-hint`를 넘기고 같은 조건에서 FieldHint를 렌더하므로 끊긴 id 참조가 없다. `ApproverSelect`는 선택 prop이라 다른 호출부 무영향, 오류 id와 공백 결합이 맞다.
- [낮음] tester 얕은 단정 → CD-4·FM-3·M06 카운터 500/501·M05 초기 포커스 보강 완료. 의미 있는 단정(Spinner 유무 양방향, danger 톤 양방향, 실제 포커스)이다. RS-2·FO-3은 미처리(낮음, 사용자 판단).

## 남은 이슈

[낮음] [담당: frontend] [분류: 컨벤션] frontend/src/app/(app)/admin/departments/DepartmentFormModal.tsx:241-249 — `(candidates.data?.length ?? 0) >= CANDIDATE_LIMIT` 조건이 두 번 반복된다. / `const reachedLimit = ...` 하나로 묶으면 두 곳의 조건이 어긋날 여지가 없어진다(선택).

[낮음] [담당: tester] [분류: 테스트] frontend/src/app/(app)/admin/departments/DepartmentFormModal.test.tsx:353-361 — 100건 미만 음성 단정은 test-report에도 적힌 대로 힘이 약하다(안내가 렌더되지 않으므로 연결 여부와 무관하게 통과). / 여유 있으면 `aria-describedby` 속성 자체가 없음(오류 없는 상태)을 단정하는 방식으로 바꾼다(선택).

## 최종 보고 항목 (사용자 확인, 블로커 아님)
test-report Run 3 §사용자 확인 목록 1~9를 그대로 최종 보고에 넘긴다. 특히:
1. 실제 브라우저에서 M06·M08 단계 왕복 포커스(jsdom으로만 확인). M06 取消 [戻る] 후 [取消]에 포커스가 가므로 Enter 연타 시 다시 취소 확인 단계로 진입할 뿐 즉시 확정되지는 않음(확정 단계 초기 포커스는 [戻る]).
2. `npm run build`(3000 dev 서버 종료 후).
3. 기존 Playwright 스펙 회귀, `dashboard-renewal` 8건 재실행(개발 DB 쓰기 승인 필요).
4. 개발 DB의 E2E 계정 오늘자 attendance 1건 정리 여부.
5. 미촬영 스크린샷(M06 approve·reject, M07, M09 clockout)과 before/after 47장 차이 판정.
6. 접근성 수동 체크(Tab 순환, 스크린 리더 낭독).
7. RS-2·FO-3 얕은 단정 보강 여부.

## 확인한 것 (문제 없음)
- 비즈니스 로직(API 경로·본문·검증·오류 분기·`submittingRef`) 변경 없음.
- 하드코딩 색·px 추가 없음(변경이 포커스·aria 속성·주석뿐).
- 기존 테스트 단정 약화·삭제 없음, `.skip`/`.only` 없음.
- `docs/` 직접 수정 없음.
