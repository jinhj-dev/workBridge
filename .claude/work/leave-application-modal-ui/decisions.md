# 결정 기록 — leave-application-modal-ui

근거: `docs/04_SCREEN_SPECIFICATIONS/SCR-004_LEAVE.md` §3.2·§5, `docs/09_DESIGN_SYSTEM.md` §3·§6, 첨부 이미지(3.png), 현재 코드(`components/leave/LeaveApplyModal.tsx`, `LeaveDetailModal.tsx`, `DetailTable.tsx`, `Modal.tsx`, `form.tsx`).

## 확인 결과 (결정 불필요)

| 항목 | 확인 내용 |
|---|---|
| 休暇種別 값 | 프론트 `LeaveType`·`LEAVE_TYPES`, Prisma `enum LeaveType`, `create-leave.dto.ts` 모두 `ANNUAL/HALF_AM/HALF_PM/SPECIAL/OTHER` 5종. 라벨(`messages.leave.types`)도 年次休暇/午前半休/午後半休/特別休暇/その他로 요청과 1:1 일치. 반차 2종이 enum에 따로 있으므로 매핑 문제 없음 |
| 필수 여부(실제 검증) | `validate()`: 종류 미선택, 시작·종료일 미입력(반차는 종료=시작), 사유 공백·500자 초과, `approvalRequired`일 때 승인자 미선택. 서버 zod: leaveType·startDate·endDate·reason 필수, approverId optional(승인 필요 여부는 서비스에서 판단). SCR-004 §3.2 필수 열과 동일 |
| ステータス 항목 | 현재 신청 모달에 이미 없음. 추가하지 않는다 |
| 申請日数 | `countLeaveDays(leaveType,start,effectiveEnd)` 미리보기, 최종 값은 서버. 로직 유지, 표시 위치만 표의 한 행으로 |
| 승인자 | `ApproverSelect`(in-flow 후보 목록) 그대로. 승인 필요 사용자만 `/leaves/approvers` 조회 |
| 공통 Modal | `icon`·`size('md'|'lg')` 지원. 상세 모달은 `size="lg"` + 로컬 `CalendarIcon` |
| 공통 Select | **없음**. `form.tsx`의 `selectClass`(문자열)만 있고 사용처(AdminAttendanceView, LeaveHistoryList)는 네이티브 `<select>`를 직접 씀 |

## 결정 필요 (사용자 승인)

### D1. 모달 제목 문구
- 현재 `messages.leaves.apply.title = '休暇を申請'`, 첨부 이미지·페이지 버튼은 `休暇申請`.
- **추천: `休暇申請`으로 변경**(이미지·버튼과 일치, 상세 모달 "休暇詳細"과 같은 명사형). 테스트는 키로 참조하므로 영향 없음.

### D2. footer 버튼 크기·스타일
- 현재 신청 모달: [キャンセル] 텍스트 버튼 h-12, [申請する] h-12. 상세 모달: White(아웃라인) h-10 / Primary h-10, 14px.
- 이미지: [キャンセル] 아웃라인, [申請する] 채움.
- **추천: 상세 모달과 동일(아웃라인 h-10 + Primary h-10)**. 두 모달의 버튼 클래스를 `form.tsx`의 공용 상수로 옮겨 한 곳에서 관리(상세 모달은 값 동일, 화면 변화 없음).
- 대안: 이미지 비율대로 h-12 유지 → 상세 모달과 불일치.

### D3. 모바일(<sm, 640 미만) 배치
- 상세 모달(DetailTable)은 모바일에서도 2열(항목명 6rem). 신청 모달을 같은 2열로 두면 360px 폭에서 입력 폭이 약 168px로 승인자 검색 placeholder·날짜가 잘린다.
- **추천: <sm은 항목명 셀(배경 general-30)이 위, 입력 셀이 아래인 세로 배치, sm 이상은 2열(10rem)**. 색·테두리·구분선은 동일.
- 대안: 상세 모달과 똑같이 모바일도 2열(6rem).

### D4. 승인 불필요 사용자의 承認者 행
- 이미지는 "自動承認" Select에 * 를 붙였지만, 요청은 "承認者는 기존 방식 유지", "필수가 아니면 * 없음".
- **추천: 행 라벨 `承認者`, 값은 기존 안내 문구(`申請するとすぐに承認されます。`), * 없음**. 이미지의 Select는 따르지 않는다.

### D5. 공통 Select 구현 범위
- 요청은 "공통 Select 드롭다운"을 쓰라고 하지만 컴포넌트가 없다.
- **추천: `components/Select.tsx` 신규(네이티브 `<select>` 래퍼 + 오른쪽 chevron 아이콘 + placeholder 옵션). 이번에는 신청 모달에만 적용**하고 기존 select 2곳 교체는 범위 밖(필요 시 별도 작업).

### D6. 09 §6 미기록 항목(PR #18)
- DetailTable·LeaveStatusBadge·Modal `icon`/`size`가 09 §6에 없음. FormTable이 DetailTable 스타일을 공유하므로 함께 기록하는 것을 **추천**(문서 반영 모드에서 "문서 갱신 예정"에 포함).

## 설계 내 결정 (승인 불필요, 기록용)
- 필수 * 는 `<label>` 밖의 형제 `<span aria-hidden>`로 둔다 → 접근 가능한 이름은 "理由" 그대로(기존 `getByLabelText(t.reason)` 테스트·E2E 유지). 필수 여부는 컨트롤의 `aria-required="true"`로 전달.
- 반차 선택 시 終了日은 비활성·시작일 고정이지만 필수 항목이므로 * 유지(검증은 effectiveEnd 기준으로 이미 필수).
- `required`(네이티브) 대신 `aria-required`: 폼은 `noValidate`이고 검증 문구는 자체 표시하므로 브라우저 검증과 섞지 않는다.
- 申請日数 힌트(`daysHint`)와 理由 글자 수 표시는 SCR-004 §3.2 요구이므로 이미지에 없어도 유지.
- 날짜 입력은 네이티브 `type="date"` 유지(이미지의 왼쪽 달력 아이콘은 재현하지 않음).
