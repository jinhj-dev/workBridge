# UI 모달 단계별 리팩터링 계획 (UI_MODAL_REFACTOR_PLAN)

> 상태: **v3 — 사용자 결정 D1~D15 반영(2026-11-13). 실행은 사용자 승인 후.** 변경 내역: `.claude/work/modal-audit/docs-update.md`.
> 진행(2026-11-13, 브랜치 `feature/modal-refactor`, 미커밋·미병합): **단계 1~6 구현 완료, 단계 7은 자동 회귀(tsc·lint·vitest 50파일 724건·Playwright `modal-a11y.spec.ts`)와 문서 반영까지 완료, 일부 검증은 미수행(사용자 확인 대기)**. "한 단계 = 한 PR" 대신 한 브랜치에 청크(C1~C6)별 작업으로 진행했다(사용자 부재로 권장안 적용, 작업 기록 `.claude/work/modal-refactor/`). 미검증 항목은 `docs/10_DEVELOPMENT_ROADMAP.md` 해당 항목에 기록.
> 근거: `docs/UI_MODAL_AUDIT.md`(M01~M09, 문서 불일치 D1~D7, P1~P10, L1~L2), `docs/UI_MODAL_PATTERNS.md` v3(패턴, 확정 결정 §9.1, 미결 U1~U5 §9.2).
> 원칙: 한 단계 = 한 PR. **디자인 / 동작 / 로직** 변경을 나눠 적고, 비즈니스 로직(API 호출·검증 규칙·권한 판정·오류 매핑)은 바꾸지 않는다.

---

## 0. 선행 조건

| # | 내용 | 상태 |
|---|---|---|
| 0-1 | 사용자 결정 D1~D15 | **완료**(`decisions.md`) |
| 0-2 | 미결 U1~U5(PATTERNS §9.2) | **U1~U4 권장안 적용(사용자 부재, 사용자 확인 후 변경 가능)**, U5 범위 밖 |
| 0-3 | 변경 전 기준 이미지: 9개 모달 × 360 / 768 / 1024 / 1440(단계형은 단계별) | 12종 48장 확보(`.claude/work/modal-refactor/screenshots/before`). **미확보**: M06 승인·반려 단계, M07, M09 退勤(개발 DB에 해당 데이터 없음) |
| 0-4 | e2e 이미지는 `.screenshot()` 저장형 38곳(11개 스펙), 비교형 `toHaveScreenshot` 0건 → 전후 이미지 **수동 검토** | 확인 완료 |

---

## 1. 모달별 변경 대상 (v3)

난이도: 하(클래스 교체) / 중(구조 이동·테스트 수정) / 상(배치 전면 변경·다단계·다수 테스트).
"동작" = 조작 결과가 달라지는 것(로직 아님: busy, 초기 포커스, describedby).

| ID | 적용 패턴 | 현재와의 차이 | 공통 컴포넌트로 대체 | 유지할 개별 기능 | 예상 변경 파일(테스트 포함) | 난이도 | 영향 |
|---|---|---|---|---|---|---|---|
| M01 部署登録/編集 | A | form variant, **FormRow → FormTable**, xl → lg, 로컬 버튼(44→48·회색 취소), 아이콘 없음, 카운터 `mt-2` | `FormModal`(description·icon 건물), `FormTable`, `FieldHint`, `CharCount`, modal 버튼 클래스 | 책임자 서버 검색·디바운스·후보 100 안내·`IconField`(U3)·`managerUnchanged`·오류 코드별 처리·UTF-16 글자 수(L1) | `DepartmentFormModal.tsx`, `DepartmentFormModal.test.tsx`, e2e `departments-manager`·`departments-responsive`·`departments.spec.ts` | **상**(v2 중) | 디자인: 배치 전면(라벨 16 Bold 좌측 열 → 14 Medium 회색 셀), 폭 800→640, 버튼, 카운터 간격. 동작: busy |
| M02 部署詳細 | B 패턴 | 외형, 아이콘 없음 | 없음 | 히어로(U1), 시스템 부서 편집 숨김, 편집 전환 | `DepartmentDetailModal.tsx`, `DepartmentsView.test.tsx` 해당분 | 하 | 디자인만 |
| M03 所属社員確認 | C 표형 | 외형 | 없음 | 전 페이지 수집·클라이언트 검색·표/카드·5명 페이지(D10 코드 기준) | `DepartmentMembersModal.tsx`, `.test.tsx`, e2e `departments-members-modal.spec.ts`(15장)·`departments-list-modal.spec.ts` | 하~중(이미지 검토량) | 디자인만 |
| M04 部署の削除 | D 위험 | 로컬 버튼, 삭제에 Primary, 아이콘 없음, 제출 중 취소 활성 | `ConfirmDialog tone="danger"`(휴지통 아이콘, `notice`) | `inactiveMemberCount` 고지, 403·404·409 시 닫고 재조회 | `DepartmentDeleteModal.tsx`(내부 교체), `DepartmentsView.test.tsx`(제출 중 취소 disabled 단정 신규) | 하 | 디자인: 빨간 버튼·아이콘. 동작: busy, 초기 포커스 [キャンセル] |
| M05 休暇申請 | A(**배치 기준**) | 플레이스홀더 없음, 설명문 없음, 일수 회색 박스(U2), 힌트 미연결 | `FormModal`(description·달력 아이콘), `CharCount`, `FieldHint` | 반차 종료일 고정·일수 미리보기(`aria-live`)·승인자 조건부·서버 field 매핑·`focusFirst`·코드포인트 글자 수 | `LeaveApplyModal.tsx`, `.test.tsx`, `LeaveManagementLayout.test.tsx`, `messages/ja.ts`(placeholder·description 문구 추가), e2e `leaves.spec.ts`·`leave-visual.spec.ts` | **중**(v2 상) | 디자인: 외형·플레이스홀더·설명문. 동작: busy, D13 describedby |
| M06 休暇詳細(+3단계) | B + D 단계형 + D' | secondary disabled 미표시, Esc 미차단, 확인 문장 클래스 | `confirmMessageClass`, `CharCount` | 4단계·`initialStep`·권한별 버튼·409 메시지 치환·사유 검증 | `LeaveDetailModal.tsx`, `LeaveDetailModal.test.tsx`. 호출부 5곳 코드 변경 없음 | 상(회귀 범위) | 디자인: 외형. 동작: busy, reject 입력 `data-autofocus` |
| M07 날짜별 휴가자 | C 단순형 | 외형, 아이콘 없음 | 없음 | API 미호출, 항목 구성 | `LeaveDayModal.tsx`, `LeaveCalendarView.test.tsx` | 하 | 디자인만 |
| M08 勤怠の修正 | A 단계형(FormModal 대상 외) | **md → lg**, 라벨 위 스택 → **FormTable**, `dl` → **`ReadOnlySummary`**, 설명문·아이콘(시계) 없음, 로컬 버튼 | `ReadOnlySummary`, `FormTable`, `FieldHint`, `confirmMessageClass`, modal 버튼 클래스 | 입력→확인 단계, `INVALID_TIME_RANGE` 시 입력 단계 복귀 + Notice error | `AttendanceEditModal.tsx`, `.test.tsx`, `AdminAttendanceView.test.tsx`, `messages/ja.ts`(description), e2e `attendance*.spec.ts` 해당분 | **중~상**(v2 중) | 디자인: 폭·배치 전면·요약 영역. 동작: busy |
| M09 出勤/退勤確認 | D | 인라인, 아이콘 없음 | `ConfirmDialog`(들어가기/나가기 아이콘) | 409 재조회, `onClocked`, `submittingRef`·`pending`은 호출부 유지 | `AttendanceSection.tsx`, `DashboardView.test.tsx` | 하~중 | 동작: Esc 차단, 초기 포커스 주 버튼 |

v2와 달라진 점: D2가 FormTable 통일로 정해져 **M05가 배치 기준(변경 최소), M01·M08이 배치 전면 변경**으로 뒤바뀌었다. `FormRow` 확장은 취소, `FormTable` 삭제 계획은 **`FormRow` 삭제**로 바뀌었다.

---

## 2. 단계별 순서 (v3)

### 단계 1. 공통 기반 가산 (기존 화면 무변경)
- 범위: `Modal`의 `description`·`busy`(cancel 차단 + close 재오픈 + X disabled)·`[data-autofocus]` / `form.tsx`의 `modalSecondaryButtonClass` disabled·flex, `modalDangerButtonClass`, `confirmMessageClass`, `FieldHint`, `CharCount` / 신규 `ReadOnlySummary` / 없는 아이콘 추가(휴지통, 勤怠 시계).
- 디자인: 없음(예외: 기존 disabled secondary(M06·M09 제출 중)가 비활성 모양이 됨 — 결함 수정).
- 동작: 없음(새 prop 미사용).
- 검증: `Modal.test.tsx` 신규 단정(describedby, busy 시 X disabled, `cancel` 이벤트 `defaultPrevented`, `close` 이벤트 후 재오픈·`onClose` 미호출, `data-autofocus`), `ReadOnlySummary.test.tsx`(dl/dt/dd 구조), Playwright 실측 1건(초기 포커스·포커스 복귀·연속 Esc).

### 단계 2. ConfirmDialog (M09 → M04, 단계형 확인 정리)
- 범위: `ConfirmDialog` 신설 → M09(인라인 제거, 들어가기/나가기 아이콘) → M04(`tone="danger"`, 휴지통). M06 승인·취소, M08 확인 단계는 `confirmMessageClass`·`busy`·`data-autofocus`.
- 디자인: 빨간 삭제 버튼(D5), 아이콘(D6). 외형 계열은 단계 3까지 현행(default)이라 **확인 모달만 먼저 아이콘이 생김**(과도기 차이, 단계 3에서 해소).
- 동작: 제출 중 취소·X·Esc 차단, 초기 포커스.
- 검증: `DashboardView.test.tsx`, `DepartmentsView.test.tsx`(제출 중 취소 disabled), `LeaveDetailModal.test.tsx`, `AttendanceEditModal.test.tsx`, `ConfirmDialog.test.tsx`(신규), e2e `dashboard*`·`departments.spec.ts`·`approvals.spec.ts`. role은 `dialog` 유지라 기존 role 단정 유효.

### 단계 3. 외형 통일 + 제목 아이콘 (D1 ①'·D4·D6)
- 범위: `Modal` 외형 ①'(lg·xl / md 분기), footer 개수별 배치, `variant` 제거, `icon` 필수화, 아이콘이 없던 M02(건물, U1 확인)·M07(달력)·M08(시계)·M01(건물)에 아이콘 지정, 제목 `text-xl/7` → `text-h6`.
- 디자인: **9개 모달 전부**. 동작·로직: 없음.
- M01은 `variant="form"` 제거와 `subtitle` → `description` 이관만(배치는 단계 4).
- 검증: 9개 모달 전후 이미지 수동 검토, PR에 전후 이미지 첨부 → 사용자 확인 후 병합. `Modal.test.tsx` 외형 단정 조정(§3 R3).

### 단계 4. FormModal (M05 → M01 → M08)
- 범위: `FormModal` 신설 → **M05**(기준 배치. placeholder·description 문구 추가, `CharCount`·`FieldHint`, D13, U2) → **M01**(FormRow → FormTable, xl → lg, 로컬 버튼 제거, `CharCount` 간격 8→4) → **M08**(FormModal 없이 `Modal` 직접: md → lg, FormTable, `ReadOnlySummary`, description).
- 순서 이유: 기준(M05)을 먼저 확정해 M01·M08의 비교 기준으로 쓴다.
- 디자인: M01·M08 배치 전면, M05 플레이스홀더·설명문. 동작: busy, describedby.
- 선행 확인: U2, U3.
- 검증: `LeaveApplyModal.test.tsx`, `DepartmentFormModal.test.tsx`, `AttendanceEditModal.test.tsx`, `LeaveManagementLayout.test.tsx`, `AdminAttendanceView.test.tsx`, `FormModal.test.tsx`(신규), e2e `leaves.spec.ts`·`leave-visual.spec.ts`·`departments-manager.spec.ts`·`departments-responsive.spec.ts`·`attendance*.spec.ts`, 360 폭 이미지(FormTable 1열·ReadOnlySummary 줄바꿈).

### 단계 5. DetailModal·ListModal 마무리 (M02·M06 → M03·M07)
- 범위: 외형·아이콘은 단계 3에서 끝남. 남은 것은 상태 문구·`confirmMessageClass` 잔여, M06 reject 단계 `CharCount`.
- 검증: `LeaveDetailModal.test.tsx` + 호출부 View 테스트(`DashboardView`·`LeavesView`·`ApprovalsView`·`AttendanceSheetView`), `DepartmentMembersModal.test.tsx`, `LeaveCalendarView.test.tsx`, e2e `departments-members-modal`·`departments-list-modal`·`approvals.spec.ts`.
- 규모가 작으면 단계 4 또는 6에 합쳐도 된다.

### 단계 6. 중복 정리
- 범위: `FormRow.tsx` 삭제(M01 이행 후 사용처 0 확인. 전용 테스트 파일은 없음), 로컬 버튼 클래스·`cancelButtonClass` 잔존 제거, `text-xl/7`(모달 내) 잔존 확인.
- 검증: `npx tsc --noEmit`, `npm run lint`, `npm test`, grep(`FormRow`, `cancelButtonClass`, `variant="form"`, `*Modal.tsx`의 `const buttonClass`).

### 단계 7. 전체 회귀 + 문서 반영
- §6 전체 실행 → 결과를 `docs/10_DEVELOPMENT_ROADMAP.md`에 기록.
- 리뷰 통과 후 architect가 §7의 09·명세 갱신을 반영(문서 반영 모드).

---

## 3. 영향 범위와 위험 요소

| 위험 | 내용 | 대응 |
|---|---|---|
| R1 전 모달 외형 변경 | 단계 3이 9개 모달에 반영 | 외형 전용 PR, 전후 이미지·사용자 확인 후 병합 |
| R2 이미지 검토량 | 저장형 38곳(`departments-members-modal.spec.ts` 15곳) | 단계별 대상 모달만 전후 비교, 결과를 PR에 기록 |
| R3 외형 단위 단정 | `Modal.test.tsx` 약 7곳(`max-w-*` :42·45·51-53, `overflow-y-auto` :59, `border-t` :61, 아이콘 박스 :37). footer 단정(:56-62)은 `sm:border-t`로 바뀌어 실패. 아이콘 없음 단정(:36-37 "plain" 케이스)은 `icon` 필수화로 의미가 없어짐 | 의도 기반 단정으로 전환(폭은 `data-size` 또는 e2e, 구분선·스크롤은 e2e 이미지). PR에 "외형 방침 변경(D1·D6)에 따른 단정 변경" 명시(testing-rules §10) |
| R4 Esc 차단 브라우저 차이 | Chrome close watcher의 연속 Esc | close 재오픈 안전망 + Playwright 실측 |
| R5 M06 호출부 5곳 | 대시보드·출근부·휴가·승인 회귀 | 호출부 코드 무변경, 테스트 전부 실행 |
| R6 M01·M08 배치 전면 변경 | 라벨 위치·타이포·폭이 크게 바뀜. M08은 폭 420→640 | 단계 4에서 M05 확정 후 진행, 360 폭 이미지 필수 |
| R7 명세 정합 혼입 | 리팩터링 중 명세대로 고치기 → 로직 혼입 | 명세 갱신(§7)·로직 이슈(L1, U5)는 별도 |
| R8 초기 포커스 변경 | 확인 모달의 Enter 결과가 바뀜 | 동작 변경으로 PR 명시, 위험 확인은 [キャンセル] 기본 |
| R9 과도기 외형 차이 | 단계 2 후 확인 모달만 아이콘이 생김 | 단계 2·3을 연달아 병합(같은 릴리스) |
| R10 문구 추가 | placeholder·description 신규 문구(`ja.ts`) | 일본어 문구는 사용자 확인(CLAUDE.md §5) |

---

## 4. 디자인 / 동작 / 로직 변경 범위

| 구분 | 포함 | 제외 |
|---|---|---|
| 디자인(이번 계획) | 외형 ①', 제목 아이콘, FormTable 배치, ReadOnlySummary, 버튼 클래스(빨간 위험 버튼·아웃라인 취소), 플레이스홀더·설명문 문구, 카운터 간격, 모달 size(M01 xl→lg, M08 md→lg) | — |
| 동작(명시 승인 필요) | `busy`(제출 중 X·Esc·취소 차단), 초기 포커스, M05 힌트 describedby(D13) | — |
| 로직(이번 계획 아님) | — | API·요청 본문, 검증 규칙·글자 수 계산(L1), 오류 매핑, 권한, 페이지·검색(D10은 현행 유지), 부서 코드 편집 가능 여부(U5) |

---

## 5. 작업 규모 추정

| 단계 | 변경 파일 | 신규 |
|---|---|---|
| 1 | `Modal.tsx`, `form.tsx`, `Modal.test.tsx`, 아이콘 파일, (e2e 1) | `ReadOnlySummary.tsx`(+test) |
| 2 | `AttendanceSection.tsx`, `DepartmentDeleteModal.tsx`, `LeaveDetailModal.tsx`, `AttendanceEditModal.tsx` + 테스트 | `ConfirmDialog.tsx`(+test) |
| 3 | `Modal.tsx`, `Modal.test.tsx`, 9개 모달(아이콘·variant), | 0 |
| 4 | `LeaveApplyModal.tsx`, `DepartmentFormModal.tsx`, `AttendanceEditModal.tsx`, `messages/ja.ts` + 테스트 | `FormModal.tsx`(+test) |
| 5 | M02·M03·M06·M07 + 테스트 | 0 |
| 6 | `FormRow.tsx` 삭제, 잔존 정리 | 0 |
| 합계 | 기존 약 25파일 | 신규 3(+테스트). 백엔드·API·DB 변경 없음 |

---

## 6. 테스트 및 검증 계획

| 수준 | 대상 | 명령(`.claude/work/context.md`) |
|---|---|---|
| 타입·린트 | frontend 전체 | `cd frontend && npx tsc --noEmit && npm run lint` |
| 단위 | `Modal.test.tsx`, 신규 `ConfirmDialog`·`FormModal`·`ReadOnlySummary` 테스트, `*Modal.test.tsx` 6개, `FormTable.test.tsx`·`DetailTable.test.tsx`, 호출부 View 테스트(`DashboardView`·`DepartmentsView`·`LeavesView`·`ApprovalsView`·`AttendanceSheetView`·`AdminAttendanceView`·`LeaveManagementLayout`·`LeaveCalendarView`) | `npx vitest run <파일>`, 최종 `npm test` |
| E2E | `departments*.spec.ts`(4), `leaves.spec.ts`, `leave-visual.spec.ts`, `leave-management.spec.ts`, `approvals.spec.ts`, `dashboard*.spec.ts`, `attendance*.spec.ts`, 단계 1 실측 1건 | `npm run test:e2e`(E2E 계정 환경변수 필요) |
| 시각 | 9개 모달 × **360 / 768 / 1024 / 1440**(D15), 단계형은 단계별. 시안(`mockups/compare-*`)과 대조 | 저장형 이미지 전후 수동 비교 |
| 접근성 수동 | Tab 순환, Esc(평상시·제출 중·연속), 초기 포커스, 포커스 복귀(M09 버튼 교체), 이름·설명 낭독, ReadOnlySummary 낭독 | 단계 1·7 체크리스트 |

단위 테스트 방침: 외형 클래스 단정은 줄이고 역할·접근성 단정(이름, describedby, disabled, busy 이벤트)을 늘린다. 외형은 e2e 이미지로 본다.
완료 기준: 대상 모달의 단위·E2E 통과 + 이미지 차이가 의도한 변경뿐임을 PR에 기록.

---

## 7. 문서 갱신 예정 사항 (단계 7, 문서 반영 모드에서 architect가 반영)

> 이번에는 `docs/09_DESIGN_SYSTEM.md`·화면 명세·context.md를 수정하지 않는다.
> **2026-11-13 반영 완료**(문서 반영 모드): 아래 7.1·7.2 전부. 반영 목록은 `.claude/work/modal-refactor/docs-update.md`.

### 7.1 `docs/09_DESIGN_SYSTEM.md`

| 위치 | 갱신 내용 |
|---|---|
| §3 `Modal` 행(:166) | 「[취소(텍스트)] [확인(채움)]」 → 「[취소(아웃라인)] [확인(채움, 위험 동작은 빨간 채움)]」 + 제목 아이콘 필수(D6·D8·D5) |
| §5 신규 「10. 모달 공통 패턴」 | 유형 A~D 기준(DetailModal·ListModal은 패턴 이름), 외형 ①', 아이콘 선정 기준(PATTERNS §2.1), 폼 배치 FormTable + 플레이스홀더·설명문, 수정 불가 값 = ReadOnlySummary, 바텀시트 미도입, 금지사항(드로어 등 대상 외 명시), 예외 절차, disabled 대비 예외 1줄 |
| §6 `Modal` 행(:245) | `description`·`busy`·`data-autofocus`, `icon` 필수, `variant` 폐지, ①' 수치(lg·xl / md), 개수별 footer |
| §6 신규 행 | `ConfirmDialog`, `FormModal`, `ReadOnlySummary`·`ReadOnlySummaryItem`, `modalPrimaryButtonClass`·`modalSecondaryButtonClass`·`modalDangerButtonClass`·`confirmMessageClass`, `FieldHint`, `CharCount`, `FormTable`·`FormTableRow`, `DetailTable`·`DetailTableRow`, 추가 아이콘 |
| §6 `FormRow` 행(:277) | 삭제(컴포넌트 삭제 시) |
| §6 `LeaveApplyModal` 행(:280) | Radio·텍스트 취소 → Select·아웃라인, FormModal·FormTable 사용으로 정정 |
| 신규 절 「모달 패턴」 | PATTERNS §1~§7 요약 + 사용 예시 |

사용 예시(시그니처 수준):
- 확인: `ConfirmDialog({ open, icon, title, message, notice, confirmLabel, tone:'danger', submitting, onConfirm, onClose })`
- 등록: `FormModal({ open, icon, title, description, onSubmit, submitLabel, submitting }) > FormTable > FormTableRow…`
- 단계형 수정: `Modal({ size:'lg', icon, title, description, footer, busy }) > ReadOnlySummary + FormTable`
- 상세: `Modal({ size:'lg', icon, title, footer }) > DetailTable > DetailTableRow…`

신규 모달 준수사항(09 문안 초안):
1. 유형(A / A 단계형 / B / C / D)을 정하고 PATTERNS 표를 따른다.
2. 모달성 오버레이는 `Modal`·`ConfirmDialog`·`FormModal`만. 제목 아이콘은 기준 §2.1.
3. footer 버튼은 모달 버튼 클래스만. 크기·색 재정의 금지.
4. 폼은 FormTable + 플레이스홀더 + 설명문, 수정 불가 값은 ReadOnlySummary.
5. 안내 `Notice`, 필드 오류 `FieldError`, 보조 설명 `FieldHint`, 글자 수 `CharCount`.
6. 제출이 있으면 `busy`, 확인류는 `data-autofocus`.

예외 절차: 패턴과 다른 디자인이 필요하면 구현 전에 frontend.md "문서 갱신 예정"에 차이·이유를 적고 architect 검토 → 사용자 승인 후 패턴 자체를 갱신(화면 단위 예외 금지). `.claude/agents/frontend.md` §3·§4와 같은 흐름.

### 7.2 화면 명세 등

| 문서 | 갱신 |
|---|---|
| `04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md` §5 所属社員確認(:116-129) | **D10**: 코드 기준(데스크톱 6열 + 화살표 열(入社日 포함), `lg` 미만 카드, 5명 페이지네이션(`sm` 미만 compact), 모달 Body 스크롤, 내부 50dvh 스크롤·최소 폭 640 삭제, 「入社日 열 미표시」 범위 밖 문구 삭제) |
| 같은 문서 §4 部署詳細·§5 등록·삭제 | 제목 아이콘, 등록 모달 size lg·FormTable·설명문, 삭제 버튼 빨간 채움, 등록 제목 문구(U4) |
| `SCR-004_LEAVE.md` §3.2(:37·:41) | 휴가 종류 Select, footer [キャンセル](아웃라인), 설명문·플레이스홀더 |
| `SCR-008_ADMIN_ATTENDANCE.md` 수정 모달(:64) | 사원명·근무일은 상단 읽기 전용 요약, 설명문, size lg |
| `SCR-002_DASHBOARD.md` 확인 모달(:144) | 아이콘(출근/퇴근) |
| `.claude/work/context.md` | :39 "Danger 미구현" 정정, 신규 공용 부품(ConfirmDialog·FormModal·ReadOnlySummary 등) 추가, FormRow 삭제 반영 |

별도 이슈(이번 계획 밖): L1 글자 수 계산 방식, U5 부서 코드 편집 가능 여부.

---

## 8. 결정 기록

| ID | 결정 | 일자 |
|---|---|---|
| D1~D15 | `UI_MODAL_PATTERNS.md` §9.1 / 원문 `.claude/work/modal-audit/decisions.md` | 2026-11-13 |
| U1~U4 | 권장안 적용(사용자 부재, PATTERNS §9.2) | 2026-11-13 |
| U5 | 범위 밖(현행 편집 가능 유지) | — |
| A1~A10 | 구현 세부 권장안(footer 개수 판정 CSS `:has()`, M06 取消 확정 빨간 버튼, 아이콘 기존 자산 재사용, 청크별 단일 브랜치 등). 원문 `.claude/work/modal-refactor/plan.md` | 2026-11-13 |
