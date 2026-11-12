# docs-update (modal-audit) — frontend 검토 반영 내역

입력: `.claude/work/modal-audit/frontend-review.md` (REVIEW: NEEDS_CHANGES)
대상: `docs/UI_MODAL_AUDIT.md`(v2), `docs/UI_MODAL_PATTERNS.md`(v2, 전면 재작성), `docs/UI_MODAL_REFACTOR_PLAN.md`(v2, 전면 재작성)
수정하지 않은 파일: `docs/09_DESIGN_SYSTEM.md` 등 기존 docs, 코드, `.claude/agents/frontend.md`, `.claude/work/context.md`

## 1. 사실 오류 수정

| 검토 항목 | 반영 위치 | 내용 |
|---|---|---|
| A1 §5.3 라벨 "3종" 모순 | AUDIT §5.3 | "타이포 2종(배치 3종)"으로 정정 |
| A1 P5 Esc 경로 | AUDIT §3 관찰, §10 P5 | X는 onClose 가드가 먼저 작동해 안전, 상태 불일치는 Esc 경로만임을 명시 |
| A1 form footer 버튼 수 가정 | AUDIT §3 관찰 | grid-cols-2가 2버튼을 가정함을 추가 |
| A3 D5 판단 근거 | AUDIT §9 | 커밋 60379c3(PR #24) 메시지로 코드가 최신 의도임을 기록. 50dvh 내부 스크롤만 미확인 |
| C1 R3 테스트 영향 과대 | PLAN §3 R3 | 외형 단정은 `Modal.test.tsx` 약 7곳뿐, 다른 테스트의 toHaveClass는 본문 단정으로 무관함을 정정. footer 단정(:56-62)이 D4로 실패함을 명시 |
| C1 누락 테스트·호출부 | PLAN §1·§2·§6 | `FormTable.test.tsx`·`DetailTable.test.tsx`(존재 확인), `AdminAttendanceView.test.tsx`, `LeaveManagementLayout.test.tsx` 추가 |
| C1 스크린샷 비교/저장 구분 | PLAN §0-3, §3 R2 | grep 결과 38곳 모두 `.screenshot()` 저장형, `toHaveScreenshot` 0건 → "기준 갱신"이 아니라 수동 검토로 정정 |
| C1 난이도 보정 | PLAN §1 | M05 중→상, M09 하→하~중, M06 호출부 코드 무변경 명시 |

## 2. 설계 제안 반영

| 제안 | 결과 | 반영 위치 / 사유 |
|---|---|---|
| Q3 busy 안전망(cancel preventDefault + close 재오픈) | 채택 | PATTERNS §4.2, PLAN 단계 1·R4 |
| Q3 초기 포커스(`data-autofocus`) | 채택 | PATTERNS §3.4·§4.2·§7, AUDIT P10(정적 분석 결과로 표기, 브라우저 실측은 단계 1) |
| Q3 포커스 복귀 미검증 | 반영 | PATTERNS §7(M09 버튼 교체 케이스), PLAN §6 |
| Q4 alertdialog 보류 | 채택 | PATTERNS §3.4·§7에 사유(테스트 무의미화, 단계형과 role 불일치) |
| Q2 외형 대안 ①' | 채택 | PATTERNS §4.2 D1 표에 ①' 추가. ① 권장 확정을 철회하고 "시안 비교(①' vs ②) 후 결정"으로 변경 |
| C1 M08 FormRow 예외 | 채택(규칙화) | 예외 조항 대신 **size별 규칙**(lg 이상 FormRow / md 라벨 위 스택)으로 D2를 재정의. 유형 "A-md" 추가 |
| Q1 FormModal 최소화 | 채택 | PATTERNS §4.7: Modal + form + footer 2버튼만. v1의 `errorNotice`·`notice` prop 삭제. M08 제외 |
| Q1 대안 `ModalFooterButtons` | 미채택 | PATTERNS §4.1: ConfirmDialog·FormModal이 반복 대부분을 흡수, 단계형은 버튼 구성이 단계마다 달라 prop 분기만 늘어남 |
| Q1 3곳 원칙 | 반영 | SCR-006 미정이면 2곳 → 신설 여부를 사용자 결정 D14로 분리 |
| Q9 FormRow labelId | 채택 | PATTERNS §4.5(유니온 타입, 읽기 전용 값 정렬 규칙), PLAN 단계 1에 선행 |
| Q7 ConfirmMessage → 클래스 | 채택 | `confirmMessageClass = 'break-words text-general-100'` |
| Q6 danger hover·disabled | 채택 | `hover:bg-danger-100/90`, `disabled:bg-danger-100/50`. disabled 대비는 WCAG 1.4.3 비활성 예외를 근거로 허용, 09 갱신 시 1줄 추가 예정 |
| Q5 subtitle 유지 | 채택 | 이름 유지 + description 신규, 동시 지정 시 description 아래 subtitle |
| Q8 CharCount·FieldHint | 채택 | `CharCount` id 필수·초과 스타일 내장, M01 간격 8→4를 의도한 변경으로 명시. `FieldHint` id 선택, M05 힌트 연결은 D13 |
| Q8 글자 수 로직 차이 | 별도 이슈로 기록 | AUDIT §10 L1 (이번 리팩터링 범위 밖) |
| C2 단계 1 분할·ConfirmDialog 선행 | 채택 | PLAN §2: 1 가산 → 2 ConfirmDialog → 3 외형 통일 → 4 Form → 5 Detail·List → 6 정리 → 7 회귀 |
| C3 Modal.test 외형 단정 → 의도 기반 | 채택 | PLAN §3 R3·§6. testing-rules §10에 따라 PR에 변경 의도 명시 |
| D DetailModal/ListModal = 패턴 + 부품 조합 | 채택 | PATTERNS §2 표 "구현 형태" 열·주석 |
| A2 드로어 오독 방지 | 채택 | PATTERNS §5.2 금지 항목에 대상 외 명시 |
| D 검증 해상도 통일 | 반영(결정으로) | 360 권장(09 §5-3). frontend.md "약 375px"과의 정합은 D15 |
| D frontend.md §4 문구 추가 제안 | 미반영(사용자 판단) | 사용자 작성 중 파일이라 수정 금지. PLAN §7에 제안만 기록 |

## 3. 사용자 결정 목록 변경 (PATTERNS §9)
- D1: 권장 확정 → "시안 비교 후 결정"(①' 추가)
- D2: FormRow 단일 → size별 규칙
- D5: 투명도 변형 허용 여부 추가
- D10: "코드가 최신으로 확인됨" + 남은 확인(50dvh 내부 스크롤 변경이 의도인지)
- 신규 D13(M05 힌트 연결), D14(FormModal 신설), D15(모바일 검증 폭)

---

# v3 반영 (사용자 결정 D1~D15, 2026-11-13)

입력: `.claude/work/modal-audit/decisions.md`, 시안 `mockups/compare-*.png`·`compare-d7-*`·`compare-d8-*`, `build*.mjs`(시안 CSS 값의 근거)
대상: `docs/UI_MODAL_PATTERNS.md`(v3, 전면 재작성), `docs/UI_MODAL_REFACTOR_PLAN.md`(v3, 전면 재작성), `docs/UI_MODAL_AUDIT.md`(v3, 머리말·§9 주석·§10 L2·§11 신설)
수정하지 않은 파일: 09 등 기존 docs, 코드, agents, skills, context.md

## 1. v2 설계에서 바뀐 것

| 항목 | v2 | v3 | 근거 |
|---|---|---|---|
| 폼 배치 | size별(lg FormRow / md 라벨 위 스택), FormTable 신규 금지 | **FormTable 통일**, FormRow·스택 모달 사용 금지 | D2 |
| FormRow | `htmlFor\|labelId` 유니온 확장 | 확장 취소, M01 이행 후 **삭제**(전용 테스트 없음) | D2 |
| FormTable | 단계 6에서 삭제 | **유지·표준**, 09 §6에 기록 | D2 |
| 플레이스홀더·설명문 | 규칙 없음 / description 선택 | A Form은 플레이스홀더 + description **필수**(部署登録 방식) | D2 |
| 유형 A-md | 신설(M08 라벨 위 스택) | 폐지. M08은 **md→lg** + FormTable(“A 단계형 폼”) | D2·D3 파생, 시안 attedit도 lg |
| 제목 아이콘 | 유형별 선택 | **전 모달 필수**, `icon` prop 필수화, 선정 기준 I-1~I-6(도메인/동작/부모 유지, 색은 항상 primary) | D6, 시안 d8-delete(휴지통·primary 박스) |
| 수정 불가 값 | 행 컴포넌트 텍스트(권장) | **`ReadOnlySummary`/`ReadOnlySummaryItem` 신설**(dl, `bg-general-30 rounded-xl px-5 py-4 grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm/5`) | D7, `build-d7.mjs:47-48` |
| 계산 값(申請日数) | 행 컴포넌트 텍스트 | 수정 불가 값과 구분해 FormTable 행에 유지, 표시 스타일은 미결 U2 | D7 범위 해석 |
| 외형 | 시안 비교 대기 | ①' 확정, lg·xl/md 수치표(시안 `build.mjs:74-94`) | D1 |
| footer | 2버튼일 때만 2열(권장) | 개수별 확정 | D4 |
| 위험 버튼 | 권장 | 빨간 채움 확정 | D5 |
| FormModal | 신설 여부 결정 대기 | 신설(최소), `description`·`icon` 필수, M08 제외 | D14 |
| 리팩터링 순서 | 1 가산 → 2 Confirm → 3 외형 → 4 Form(M01→M05→M08) → 5 Detail·List → 6 정리 → 7 회귀 | 같은 골격. 단계 3에 **아이콘 일괄 적용** 포함, 단계 4 순서를 **M05(기준) → M01 → M08**로 변경, 단계 6 삭제 대상 FormTable → **FormRow**, 단계 7에 문서 반영 추가 | D2·D6·D12 |
| 난이도 | M01 중 / M05 상 / M08 중 | M01 **상** / M05 **중** / M08 **중~상** | D2로 기준·변경 대상이 뒤바뀜 |
| 문서 갱신 예정 | 09 중심 | 09 + **SCR-010(D10)·SCR-004·SCR-008·SCR-002·context.md** 항목 추가(PLAN §7.2), `ReadOnlySummary`·아이콘 규칙 09 반영 추가 | D7·D10 |

## 2. 결정 적용 중 정리한 해석·가정
- D3 "Form 기본 lg"를 M08(단계형 폼)에도 적용(md→lg). FormTable은 md에서 입력 폭이 부족하고 시안도 lg.
- D6 아이콘 색: 위험 동작도 primary 박스(시안 그대로). 위험 신호는 버튼·Notice가 담당.
- D7 시안의 「部署の編集」 部署コード 수정 불가는 시안 가정. 현재 코드·명세는 편집 가능 → 패턴에 넣지 않고 미결 U5(범위 밖)로 기록.
- 과도기: 단계 2 후 확인 모달에만 아이콘이 생김 → 단계 2·3 연속 병합 권장(R9).

## 3. 남은 미결 (PATTERNS §9.2)
U1 M02 제목·히어로 아이콘 중복 / U2 申請日数 표시 스타일 / U3 IconField 장식 아이콘 표준 여부 / U4 SCR-010 등록 제목 문구 / U5 부서 코드 편집 불가 여부(범위 밖)
