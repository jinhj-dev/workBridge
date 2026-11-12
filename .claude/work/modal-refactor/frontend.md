# frontend — modal-refactor

## C1. 공통 기반 가산 (화면 무변경)

### 변경 파일 (frontend/src 아래)
- 수정: `components/Modal.tsx`(`description?`·`busy?`·`[data-autofocus]` 초기 포커스), `components/form.tsx`(`modalSecondaryButtonClass` 확장, `modalDangerButtonClass`·`confirmMessageClass`·`FieldHint`·`CharCount` 신설, `messages` import 추가), `components/Select.tsx`(`autoFocus?` → `data-autofocus`), `messages/ja.ts`(`common.charCount`)
- 신규: `components/ReadOnlySummary.tsx`(`ReadOnlySummary`·`ReadOnlySummaryItem`), `ReadOnlySummary.test.tsx`, `form.test.tsx`
- 테스트 추가: `Modal.test.tsx`(기존 6건 무수정 + 7건), `Select.test.tsx`(1건)

### 완료 조건
- Modal 신규 단정 전부 충족: describedby 유무, busy 시 X disabled·`cancel` defaultPrevented, busy 중 `close` → 재오픈·`onClose` 미호출, 비busy `close` → `onClose` 1회, `open=false`(busy 중이어도) 재오픈 없음, `data-autofocus` 포커스.
- `npx tsc --noEmit` 통과, `npm run lint` 통과, `npx vitest run` 전체 48파일 687건 통과(기존 단정 수정 없음).
- 화면 무변경 확인: Modal 외형·variant·icon 코드 무변경. 유일한 외형 차이는 의도된 것(disabled secondary 모양 = 결함 수정, `modalSecondaryButtonClass` 사용처 M06·M09).
- 구현 메모: busy/open ref는 render 중 쓰지 않고 open 동기화 effect보다 앞선 effect에서 갱신. 부모가 `open=false`로 닫는 경우 ref가 이미 false라 재오픈하지 않음.
- `has-[]` 변형은 C3 범위이므로 이번에 미확인.

### 권장안 적용
- `form.tsx`가 `@/messages/ja`를 import(CharCount 문구용). 순환 의존 없음. 설계에 명시된 `messages.common.charCount` 사용을 위한 불가피한 추가.

### before 스크린샷 (D15)
- 서버(3000 프론트·6000 백엔드) 가동 중이어서 캡처함. 사용자 서버는 종료하지 않음. Playwright 스크립트는 scratchpad(저장소 밖), 비밀번호는 .env.local에서 읽기만 함.
- 저장: `screenshots/before/<ID>-<step>-<폭>.png`, 4폭(360/768/1024/1440) 12종 = 48장:
  M01 create·edit, M02 detail, M03 members, M04 delete, M05 apply, M06 detail·cancel, M08 input·confirm·servererror, M09 clockin
- **미확보**: M06 approve·reject(개발 DB에 承認待ち 신청이 없어 버튼 없음), M07 날짜별 휴가자(해당 월에 휴가 데이터 없음), M09 clockout(현재 미출근 상태라 出勤만 열림). 필요 시 `db:e2e-leave-calendar-fixture`·신청 데이터 투입 후 추가 촬영해야 함(개발 DB 변경이라 임의 실행 안 함). 확보 전까지 C3 후 비교 불가 항목으로 tester에 전달 필요.

### 문서 갱신 예정 (8단계 architect)
- `docs/09_DESIGN_SYSTEM.md` §6 Modal: props `description?`(aria-describedby 연결)·`busy?`(Esc/X 차단, close 이벤트 시 재오픈)·`[data-autofocus]` 초기 포커스 규약 추가.
- §6 form 행: `modalSecondaryButtonClass`(disabled 모양 포함), `modalDangerButtonClass`, `confirmMessageClass`, `FieldHint({id?,children})`, `CharCount({id,length,max,error?})`(문구 `n/max`) 추가.
- §6 신규 `ReadOnlySummary`/`ReadOnlySummaryItem({label})`(회색 면 dl, 모달 상단 요약용), `Select` `autoFocus?`(data-autofocus).
- `messages.common.charCount(n,max)` 추가.

### 남은 이슈
- 위 미확보 스크린샷. 그 외 없음.

---

## C2. ConfirmDialog + 단계형 확인

### 변경 파일 (frontend/src 아래)
- 신규: `components/ConfirmDialog.tsx`, `components/ConfirmDialog.test.tsx`(6건)
- 수정: `app/(app)/dashboard/AttendanceSection.tsx`(M09 → ConfirmDialog), `app/(app)/admin/departments/DepartmentDeleteModal.tsx`(M04 → danger ConfirmDialog), `components/leave/LeaveDetailModal.tsx`(M06), `app/(app)/admin/attendance/AttendanceEditModal.tsx`(M08)
- 테스트 추가: `DashboardView.test.tsx`(M09 제출 중 cancel 이벤트 defaultPrevented), `DepartmentsView.test.tsx`(M04 초기 포커스 [キャンセル]·제출 중 disabled)

### 내용
- ConfirmDialog: props 설계대로(`open, icon, title, message, notice?, confirmLabel, cancelLabel?, tone?, submitting, onConfirm, onClose`). 내부 `Modal size="md" busy`. 초기 포커스 danger=[キャンセル], primary=[confirm] (`data-autofocus`).
- M09: pending에 따라 `EnterIcon`/`ExitIcon`. `onClose`는 `submittingRef` 가드 유지. 제출·409 재조회·`onClocked` 로직 무변경.
- M04: 로컬 버튼 클래스 제거, `TrashIcon`(`./icons`). 로직 무변경.
- M06: `busy={submitting}`, approve·cancel 본문 `confirmMessageClass`, approve [承認する]·cancel [戻る]에 `autoFocus`+`data-autofocus`, cancel 제출 `modalDangerButtonClass`, reject textarea에 `data-autofocus` 추가.
- M08: `busy={submitting}`, 확인 본문 `confirmMessageClass`, [修正する]에 `autoFocus`+`data-autofocus`, 로컬 버튼 클래스 → `modalSecondaryButtonClass`/`modalPrimaryButtonClass`.

### 권장안 적용 / 판단
- ConfirmDialog 본문 gap: 설계 문구는 `gap-4`이나 "시안 값이 다르면 시안" 규칙에 따라 시안(`build.mjs:104` `.cfm-wrap` gap 8px)대로 `gap-2` 사용(기존 M04와도 동일).

### 완료 조건
- tsc 0건, lint 0건, vitest 전체 49파일 694건 통과(C1 687건 + 신규 7건).
- M04 제출 중 [キャンセル] disabled 신규 단정, M09 제출 중 Esc 무시 신규 단정 추가. `role=dialog` 유지.

### 영향받은 기존 테스트
- 기존 단정 수정 없음(전부 무수정 통과). 4개 View/모달 테스트 모두 통과.

### 과도기 차이 (C3에서 해소)
- 확인 모달(M09·M04)만 아이콘 존재, 다른 모달은 아직 없음. M04 확인 모달 외형 변경(danger 빨간 버튼·제출 중 キャンセル disabled)은 의도.

### 문서 갱신 예정 (8단계 architect)
- 09 §6 신규 `ConfirmDialog`({open, icon, title, message, notice?, confirmLabel, cancelLabel?, tone?('primary'|'danger'), submitting, onConfirm, onClose}): 확인 전용 md 모달, danger는 초기 포커스 [キャンセル]·빨간 확정 버튼, 송신 중 Esc·X·キャンセル 차단.
- 03/04 SCR-010 삭제 확인·SCR-002 출근/퇴근 확인: 아이콘 표시, 제출 중 キャンセル 비활성, 삭제 확인 초기 포커스 キャンセル. SCR-004 取消 확정 버튼 빨강(danger).

### impeccable 점검 / 화면 확인
- 신규 마크업은 시스템 클래스·토큰만 사용, 하드코딩 없음, 문구는 기존 messages 재사용. 감지 훅 지적 없음.
- 화면 확인: 생략(이번 청크는 스크린샷 대상 아님, after 촬영은 C3).

### 남은 이슈
- 없음(C1의 before 스크린샷 미확보 항목은 그대로).

---

## C3. 외형 ①' + footer 개수별 배치 + 전 모달 제목 아이콘

### 변경 파일 (frontend/src 아래)
- `components/Modal.tsx`: `variant` 폐지, `icon` 필수화, `compact = size==='md'` 기준 외형(radius 16·`shadow-card-soft`·폭 `calc(100%-1rem)`/sm `calc(100%-2rem)`, Header/Body/Footer 패딩, 제목 md=`text-h6` 그 외 `text-h6 sm:text-h5`), subtitle `mt-1` 단일화, footer 개수별 배치(`has-[>:only-child]`·`has-[>:nth-child(3)]`, sm 이상 우측 정렬+`sm:border-t`).
- `components/Modal.test.tsx`: 아래 "영향 테스트" 참고.
- 아이콘 지정: `DepartmentDetailModal`(BuildingIcon ./icons), `LeaveDayModal`(CalendarIcon), `AttendanceEditModal`(ClockIcon, navIcons). `DepartmentFormModal`: `variant="form"` 제거, `subtitle`→`description`, `icon={<BuildingIcon/>}`. M03·M05·M06·M04·M09는 기존/C2 아이콘 유지(ConfirmDialog 변경 없음).

### 완료 조건 결과
- tsc 0건, lint 0건, vitest 49파일 694건 통과.
- `has-[]` 변형: Tailwind 4에서 기대대로 동작(브라우저 확인: M04/M09 360=2열 전폭, M03 360=1개 전폭, M06 cancel 768=sm 우측 정렬+구분선). 대안 불필요.
- 구분선 `sm:border-t`는 footer 안쪽 컨테이너(본문 폭)에 적용.

### 영향 테스트 (D1·D6 외형 방침 변경에 따른 단정 변경)
- `Modal.test.tsx` helper에 `icon` 기본값 추가, 「icon 없으면 박스 없음(plain)」 단정은 아이콘 필수화로 의미가 없어져 「아이콘 박스 항상 aria-hidden」으로 대체, footer `border-t` → `sm:border-t`. 폭(`max-w-*`) 등 나머지 단정 무수정. 다른 파일 테스트 수정 없음.

### 시안과 다른 점
- 없음(시안 `build.mjs:73-95` 값 그대로. 제목 md 20/28은 `text-h6`, 설계 지시 그대로).

### after 스크린샷 (`screenshots/after/<ID>-<step>-<폭>.png`, 360/768/1024/1440, 12종 48장)
- 촬영 스크립트는 scratchpad(저장소 밖). 개발 서버 가동 중 상태에서 촬영, 서버 종료 안 함. before와 같은 이름·폭 48장 전부 대응(M01 create·edit, M02, M03, M04, M05, M06 detail·cancel, M08 input·confirm·servererror, M09 clockin).
- 미촬영(before도 없음): M06 approve·reject, M07, M09 clockout(데이터 없음, 변경 없이 보류).
- 직접 확인(M09 360, M01 create 1440, M04 360, M06 cancel 768, M02 1440, M03 360, M08 input 360): 아이콘 박스가 모든 모달에 표시, radius 16·soft 그림자, 360에서 2버튼=2열 전폭·1버튼=전폭, sm 이상 우측 정렬+구분선, 취소 아웃라인·삭제/取消 빨간 확정 버튼, 시안과 큰 어긋남 없음.
- before 대비 차이는 외형 ①'(radius 16·shadow·여백·제목 크기), 제목 아이콘(M02·M07·M08·M01 신규), footer 배치(M01 외 모달 모바일 2열/1열 전폭, 구분선은 sm 이상만)뿐. 의도하지 않은 차이는 발견 못 함.
- 참고(C4 범위): M01은 로컬 버튼 클래스(h-11 등)가 남아 있고 FormRow 배치(라벨 좌측)는 C4에서 FormTable로 전면 변경 예정. M08 입력 단계는 아직 `dl` 구식 배치(C4).

### 문서 갱신 예정 (8단계 architect)
- 09 §6 Modal: `variant` 삭제, `icon` 필수, 외형(radius 16·shadow-card-soft·패딩 20/28(md)·32, 제목 md 20 / lg·xl 20→24), footer 개수별 배치(1=전폭, 2=모바일 2열, 3+=우측 정렬 wrap, sm 이상 우측 정렬+구분선).
- 03 공통 UI 규칙: 모든 모달 제목 아이콘 필수.

### impeccable 점검
- 새 색·px 하드코딩 없음(토큰·기존 클래스만). 접근성: 아이콘 aria-hidden 유지, X disabled 상태 유지. 고친 점 없음.

### 남은 이슈
- 위 미촬영 3종. M08 servererror 촬영은 PATCH를 라우트로 400 모킹(DB 변경 없음).


## C4. FormModal + M05 · M01 · M08 입력 단계

### 변경 파일 (frontend/src 아래)
- 신규: `components/FormModal.tsx`, `components/FormModal.test.tsx`(4건)
- 수정: `components/leave/LeaveApplyModal.tsx`(M05), `app/(app)/admin/departments/DepartmentFormModal.tsx`(M01), `app/(app)/admin/attendance/AttendanceEditModal.tsx`(M08), `messages/ja.ts`
- 모든 변경 파일은 prettier 적용. 비즈니스 로직(검증·API·글자 수 계산 L1·submittingRef) 무변경.

### 내용
- FormModal: props 설계대로(`size?` 'lg'|'xl', 기본 lg). 내부 `Modal busy`, `<form id=useId() noValidate className="flex flex-col gap-6">`, footer [キャンセル](`disabled={submitting}`)·[submit](`form={id}`, Spinner). footer 덮어쓰기·Notice 슬롯 없음.
- M05: Modal → FormModal(`CalendarIcon`, description). 理由 placeholder, 申請日数는 박스 제거(`flex min-h-12 items-center ...`, aria-live 유지), 힌트 `FieldHint`(id `${baseId}-days-hint`)를 開始日·終了日 `aria-describedby`에 연결(오류 id와 공백 구분), 理由 카운터 `CharCount`, 休暇種別 `Select autoFocus`. `leaves.apply.count` 삭제(미사용).
- M01: Modal → FormModal(lg, `BuildingIcon`). FormRow 4개 → `FormTable`/`FormTableRow`. 로컬 버튼 클래스·`FORM_ID`·`cancelButtonClass` 제거. 코드 힌트(id 유지)·책임자 100건 안내 `FieldHint`, 説明 `CharCount`(「n/max」, error 왼쪽 슬롯), 部署コード `data-autofocus`, 部署コード·部署名 `aria-required="true"`. Notice는 FormTable 뒤.
- M08: `size="lg"`, `description`, 입력 단계 = `Notice error`(server) → `ReadOnlySummary`(社員名·勤務日 tabular-nums) → `FormTable`(出勤時刻 required·aria-required·`data-autofocus` / 退勤時刻 `FieldHint`). `labelClass`·`dl` 제거. `Modal` 직접 사용(단계형).

### 새 문구 (R10)
- `leaves.apply.description`「新しい休暇を申請します。」, `leaves.apply.reasonPlaceholder`「休暇の理由を入力してください」, `adminAttendance.modal.description`「出勤・退勤時刻を修正します。」. M01의 「n / max」→「n/max」 표기 통일.

### 영향 테스트
- 기존 단정 무수정 전부 통과(라벨·역할 쿼리 유지). 신규 `FormModal.test.tsx` 4건.
- 검증: `tsc --noEmit` 0건, `npm run lint` 0건, vitest 50파일 698건 통과.

### 권장안 적용
- M08 確認 단계 description은 입력 단계와 같은 문구를 공통 표시(설계 그대로). M01 편집에서도 部署コード는 현행대로 편집 가능(`disabled` 아님)이라 FormTable 행으로 유지.

### 문서 갱신 예정 (8단계 architect)
- 09 §6 신규 `FormModal`({open,title,onClose,icon,description,size?('lg'|'xl'),onSubmit,submitLabel,cancelLabel?,submitting,children}): 입력 폼 모달, 송신 중 Esc·X·キャンセル 차단, footer 고정.
- SCR-004 §3.2 休暇申請: 설명문·理由 placeholder, 申請日数는 박스 없는 일반 값, 일수 힌트 aria 연결, 초기 포커스 休暇種別. SCR-010 登録/編集: lg 폭·FormTable 배치·카운터 `n/max`·초기 포커스 部署コード. SCR-008 勤怠修正: 설명문·읽기 전용 요약(社員名·勤務日)·FormTable·出勤時刻 필수 표시·초기 포커스 出勤時刻.
- `messages` 위 3키 추가, `leaves.apply.count` 삭제.

### 스크린샷 (`screenshots/after/`, 360/768/1024/1440, 같은 이름 덮어쓰기)
- 재촬영: M01 create·edit, M05 apply, M08 input·confirm·servererror(PATCH 400 모킹) 6종 24장. 서버 가동 중 촬영, 종료 안 함.
- 직접 확인(M01 create 1440·360, M05 1440, M08 servererror 360): 아이콘+설명문 헤더, FormTable 라벨 좌측(360은 1열 위/아래), 필수 `*`, 카운터 `0/500` 우측, Notice가 표 아래, M05 申請日数 박스 없이 값 표시, M08 Notice error → 회색 요약 → 표 순서·줄바꿈 정상, footer 360 2열 전폭·1440 우측 정렬+구분선. 초기 포커스 링이 部署コード·休暇種別에 표시. 잘림·겹침 없음. 시안(C 방식)과 큰 어긋남 없음.

### impeccable 점검
- 새 색·px 하드코딩 없음(토큰·시스템 클래스만), 일회성 폼 부품 없음(FormModal로 통합). 감지 훅 지적 없음. 고친 점 없음.

### 남은 이슈
- C1의 미촬영 3종(M06 approve·reject, M07, M09 clockout) 그대로.


## C5. Detail·List 마무리

### 변경 파일 (frontend/src 아래)
- `components/leave/LeaveDetailModal.tsx`: reject 단계 오류·카운터 블록 → `CharCount`(length는 기존 `[...rejectReason].length`, L1 유지, 라벨 위 배치 유지 A7). `CharCount` import 추가.
- `app/(app)/admin/departments/DepartmentMembersModal.tsx`: 본문 대상 인원 수 `text-xl/7` → `text-h6`(둘 다 20/28, 시각 동일).
- `messages/ja.ts`: 고아가 된 `leave.reject.count` 삭제.
- M02·M07·M03 배지: 그 외 변경 없음(subtitle 단일화 영향 없음 확인). M06 호출부 5곳 무변경(R5).

### 완료 조건 / 영향 테스트
- 기존 단정 무수정 통과(`LeaveDetailModal`·호출부·`DepartmentMembersModal`·`LeaveCalendarView`·`DepartmentsView`).
- 스크린샷: M03은 크기 동일이라 재촬영 불필요. M06 reject는 before도 없고(데이터 없음) 미촬영. 개발 DB 변경 금지로 보류.

## C6. 중복 정리

- 삭제: `components/FormRow.tsx`(사용처 0 grep 확인, 전용 테스트 없음).
- grep 결과(src·e2e, 0건): `FormRow`, `cancelButtonClass`, `variant="form"`, `leaves.apply.count`·`reject.count` 참조.
- 모달 파일(`*Modal.tsx`·`AttendanceSection.tsx`)의 `const buttonClass`·모달 안 `text-xl/7`: 0건.
- 잔존(모달 아님, 범위 외 기존 코드): `StatusFilterButtons`·`MonthNavigator`의 `const buttonClass`, `StatCard`·`MetricValue`·`LeaveCalendarView`의 `text-xl/7`.
- 미사용 import는 tsc·lint 0건으로 확인.

### 검증
- `npx tsc --noEmit` 0건, `npm run lint` 0건, vitest 50파일 698건 통과.

### 문서 갱신 예정 (C1~C6 누적 추가분)
- 09 §6: `FormRow` 삭제(FormTable/FormTableRow로 대체), `Modal`의 `variant` 삭제, `CharCount`는 M05·M01·M06 reject가 사용. 아이콘 자산: M01·M02=`BuildingIcon`(`departments/icons`), M04=`TrashIcon`, M07·M05·M06=`CalendarIcon`, M08=`ClockIcon`(`layout/navIcons`), M09=`EnterIcon`/`ExitIcon`(`dashboard/icons`).
- `messages`: `leave.reject.count` 삭제.

### 권장안 적용
- M03 `text-xl/7`은 같은 크기의 규칙 토큰 `text-h6`로 교체(권장안 적용).

### 남은 이슈
- 미촬영 스크린샷(M06 approve·reject, M07, M09 clockout)은 개발 DB 데이터가 필요해 보류.

## 수정 루프 A Run 1
- 대상: test-report F1(M06 取消 확정 초기 포커스), 관찰(M08 確認 단계 포커스 우연 일치), M06 承認 단계.
- 원인: 단계가 바뀌어도 푸터 버튼이 같은 위치의 DOM으로 재사용되어, React `autoFocus`(마운트 시에만 동작)가 적용되지 않고 방금 클릭한 버튼에 포커스가 남음.
- 수정: `Modal` footer를 `<Fragment key={단계}>`로 감싸 단계 전환 시 푸터 버튼을 재마운트. 비즈니스 로직·테스트 단정 변경 없음.
  - `frontend/src/components/leave/LeaveDetailModal.tsx` (key=shownStep: detail/approve/reject/cancel 모두 적용)
  - `frontend/src/app/(app)/admin/attendance/AttendanceEditModal.tsx` (key=step)
- 검증: tsc OK, eslint OK(2파일), vitest components+admin+dashboard 28파일 368건 통과.

## 수정 루프 B Round 1
- 대상: review Round 1의 frontend 항목(중간 2, 낮음 2).

### 수정 (frontend/src 아래)
- 중간1 포커스 유실: 단계 되돌아가기 시 포커스가 dialog 안 의미 있는 요소에 남도록 함.
  - `components/leave/LeaveDetailModal.tsx`: `returnFocus` state 추가. approve/reject [キャンセル]·cancel [戻る]로 detail 복귀 시 직전 진입 버튼([承認]/[却下]/[取消])에 `autoFocus`. `handleClose`에서 초기화. 초기 오픈 포커스는 변경 없음.
  - `app/(app)/admin/attendance/AttendanceEditModal.tsx`: 出勤時刻 input에 `autoFocus` 추가(confirm→input [戻る]·`INVALID_TIME_RANGE` 복귀 모두 본문 p→div 재마운트로 동작).
- 낮음 `Modal.tsx` 주석을 현행 배치(모바일 전폭/2열, sm 이상 우측 정렬+구분선)로 갱신.
- 낮음 `FieldHint` 연결(권장안 적용, 동작 변경 없는 접근성 개선): `DepartmentFormModal`의 책임자 100건 안내에 id `department-manager-hint` 부여, `components/leave/ApproverSelect.tsx`에 선택 prop `describedBy?` 추가(aria-describedby에 오류 id와 공백 구분으로 결합). 기존 호출부는 무변경.

### 검증
- prettier 적용, `tsc --noEmit` 0건, `npm run lint` 0건, vitest 50파일 712건 전체 통과(기존 테스트 깨짐 없음).
- 미검증: 단계 왕복 포커스 단위 테스트·Playwright 확인은 tester 담당(미작성).

### 문서 갱신 예정 (8단계 architect, C1~C6·루프 A/B 전체 누락 보충)
- 09 §3 Button: Danger 채움 버튼 구현(`modalDangerButtonClass`), 취소 = 아웃라인(D8), disabled 대비 예외 1줄(PATTERNS §4.3).
- 09 §3 Modal 행: 외형 ①'·아이콘 필수(C3 기재 항목과 통합).
- `.claude/work/context.md`: :39 "Danger 버튼 미구현" 정정, :57 Modal `icon?`→필수·`variant` 삭제, 신규 공용 부품(ConfirmDialog·FormModal·ReadOnlySummary·FieldHint·CharCount) 추가, FormRow 삭제.
- `docs/UI_MODAL_PATTERNS.md`: §2.1 I-6 아이콘 자산 정정(TrashIcon·ClockIcon은 기존 재사용, plan DOC_ISSUES 1), §9.2 U1~U4 확정 기록.
- SCR-010: D10(所属社員確認 5명 페이지), U4(제목「部署登録」).
- 단계 전환 포커스 동작(루프 A/B): 단계 전환 시 footer를 key로 재마운트, 진입 단계는 `autoFocus`, 되돌아가기는 직전 진입 버튼(M06) / 첫 입력(M08)에 포커스. 09 §6 Modal 또는 PATTERNS §7에 반영.
- 09 §6 `ApproverSelect`: 선택 prop `describedBy?` 추가.
- `docs/10_DEVELOPMENT_ROADMAP.md`: 회귀 결과(tsc·lint·vitest 50파일 712건 통과, build·E2E·스크린샷은 미검증 항목으로 기재).

### impeccable 점검
- 스킬 컨텍스트 로드 생략(변경이 포커스·aria 속성뿐, 외형 무변경). 디자인 감지 훅 지적 없음. 화면 확인: 생략(브라우저 도구 없음).
