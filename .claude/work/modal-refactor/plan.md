FRONTEND: REQUIRED
SECURITY_REVIEW: SKIP
DOC_ISSUES: (1) PATTERNS §2.1 I-6은 휴지통·勤怠 시계 아이콘이 "없다"고 했으나 코드에 있음(`admin/departments/icons.tsx` TrashIcon, `components/layout/navIcons.tsx` ClockIcon, 둘 다 stroke 1.75) → 재사용 / (2) PATTERNS §3.4는 「취소 확정」을 위험 동작(빨간 버튼)으로 보지만 PLAN §1 M06 행에 없음 → PATTERNS 적용 / (3) PATTERNS §5.2 "모달 안 라벨 위 스택 금지"와 M06 却下 사유(D') 라벨 위 배치 충돌, PLAN 범위 밖 → 유지 / (4) 기존 AUDIT §9 문서 불일치 D1·D2·D3·D4·D5·D6·D7은 8단계 문서 반영에서 해소
SUMMARY: 모달 9종(M01~M09)을 UI_MODAL_PATTERNS v3대로 리팩터링(Modal 확장·ConfirmDialog·FormModal·ReadOnlySummary, 외형 ①'·제목 아이콘·FormTable 통일). 프론트만, 비즈니스 로직 무변경

## 승인용 설계 요약 (사용자 부재 — 승인 게이트 생략, 미결은 권장안 적용)
- 범위: REFACTOR_PLAN 단계 1~6(청크 C1~C6) + 단계 7 회귀(tester/reviewer). 하지 않는 것: API·DB·검증 규칙·오류 매핑·권한, L1(글자 수 계산 방식), U5(部署コード 편집 불가), D9 복합형, 바텀시트
- 핵심 결정: ① `Modal`에 `description`·`busy`·`[data-autofocus]` 추가, `variant` 폐지·`icon` 필수(C3) ② 외형 ①'(lg·xl / md 분기), footer 개수별 배치는 CSS `:has()`로 판정 ③ 위험 확인 = `modalDangerButtonClass`(빨간 채움) + 초기 포커스 [キャンセル] ④ 폼 = `FormModal` + `FormTable` + placeholder + description, 수정 불가 값 = `ReadOnlySummary`(M08) ⑤ 제출 중 `busy`로 X·Esc·취소 차단
- API: 없음(변경 없음)
- 화면: SCR-010(M01~M04), SCR-004(M05·M06·M07), SCR-008(M08), SCR-002(M09), M06 호출부 SCR-002·003·004·005(코드 무변경)
- 변경 파일 수: 백엔드 0 / 프론트 약 27(신규 6: ConfirmDialog·FormModal·ReadOnlySummary + 각 test, form.test 신규 시 +1), 삭제 1(FormRow.tsx)
- 프로젝트 문서 갱신 예정(8단계, architect 문서 반영 모드): `docs/09_DESIGN_SYSTEM.md`(§3 Modal 행, §5 모달 공통 패턴 신설, §6 Modal 행·신규 부품 행·FormRow 행 삭제·LeaveApplyModal 행), `04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md`(§4·§5, D10·U4), `SCR-004_LEAVE.md` §3.2, `SCR-008_ADMIN_ATTENDANCE.md` 수정 모달, `SCR-002_DASHBOARD.md` 확인 모달, `.claude/work/context.md`(:39 Danger 미구현 정정, 신규 공용 부품, FormRow 삭제), `docs/10_DEVELOPMENT_ROADMAP.md`(회귀 결과), `docs/UI_MODAL_PATTERNS.md` §9.2(U1~U4 확정 기록)·§2.1 I-6(아이콘 자산 정정)

## 청크 (frontend 순차 호출, 상세는 design-frontend.md)
C1 공통 기반 가산(Modal·form.tsx·ReadOnlySummary, 화면 무변경) / C2 ConfirmDialog(M09→M04) + 단계형 확인(M06·M08) / C3 외형 ①'·footer·아이콘(9개 전부) / C4 FormModal(M05→M01→M08) / C5 Detail·List 마무리(M02·M03·M06·M07) / C6 중복 정리(FormRow 삭제 등)

## 사용자 부재로 권장안 적용 (사용자 확인 후 변경 가능)
| ID | 항목 | 적용한 안 |
|---|---|---|
| U1 | M02 제목 아이콘과 히어로 아이콘 중복 | 히어로 유지 + 제목 건물 아이콘 적용(중복 수용) |
| U2 | M05 申請日数 표시 | 회색 박스 → FormTable 행 안 일반 텍스트(`flex min-h-12 items-center text-base/6 font-bold text-general-100 tabular-nums`), `aria-live` 유지 |
| U3 | IconField 폼 표준 여부 | 표준 아님. M01만 기존 유지 |
| U4 | SCR-010 등록 제목 | 코드 「部署登録」 기준, 명세는 8단계 갱신 |
| U5 | 部署コード 편집 불가 | 범위 밖(현행 편집 가능 유지) |
| R10 | 신규 일본어 문구 | `leaves.apply.description`「新しい休暇を申請します。」, `leaves.apply.reasonPlaceholder`「休暇の理由を入力してください」, `adminAttendance.modal.description`「出勤・退勤時刻を修正します。」, `common.charCount(n,max)`「n/max」(M01 「n / max」 표기가 「n/max」로 통일됨) |
| A1 | footer 버튼 개수 판정 | `Modal`이 CSS `:has()`(실제 DOM 자식 수)로 판정. prop 추가 없음 |
| A2 | FormModal 제출 중 [キャンセル] | disabled(busy와 일관, ConfirmDialog와 같음) |
| A3 | M06 取消 확정 단계 | PATTERNS §3.4대로 빨간 버튼 + 초기 포커스 [戻る] |
| A4 | D13 일수 힌트 연결 대상 | 開始日·終了日 입력의 `aria-describedby`에 힌트 id 추가(표시 div는 포커스 불가라 효과 없음) |
| A5 | A 폼 초기 포커스(PATTERNS §7) | 첫 입력: M01 部署コード, M05 休暇種別(`Select`에 `autoFocus?` prop 추가 → `data-autofocus` 출력), M08 出勤時刻 |
| A6 | M08 出勤時刻 필수 표시 | `FormTableRow required` + `aria-required`(검증 규칙은 기존 그대로) |
| A7 | M06 却下 사유(D') 배치 | 라벨 위 배치 유지, `CharCount`만 적용 |
| A8 | 아이콘 자산 | 신규 파일 없이 기존 재사용(M04 `departments/icons` TrashIcon, M08 `layout/navIcons` ClockIcon) |
| A9 | PR 분할(PLAN "한 단계 = 한 PR") | 한 브랜치에 청크별 커밋. 단계 3 "사용자 확인 후 병합"은 전후 스크린샷을 작업 폴더에 남기고 최종 보고에서 확인 요청 |
| A10 | 단계 1의 Playwright 실측 | 사용처가 생기는 C2 이후 M09(대시보드)로 수행 |

작업 문서: `.claude/work/modal-refactor/design-frontend.md`, `design-backend.md`, `test-plan.md`
