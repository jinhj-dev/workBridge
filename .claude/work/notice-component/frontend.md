# 안내 메시지 공통 컴포넌트화 (Notice) — frontend.md

## 1. 조사 결과

| # | 위치 | 기존 구현 | 의미 | 처리 |
|---|---|---|---|---|
| 1 | 部署管理 `DepartmentsView` 하단 notes | `InfoNotice`(primary-30, 아이콘) | 정보 | Notice info |
| 2 | 部署登録/編集 모달 `DepartmentFormModal` notice | `InfoNotice` | 정보 | Notice info |
| 3 | 로그인 `LoginForm` formError | 독자 CSS(`rounded border border-danger-100 bg-danger-30` + `ErrorIcon`) | 오류 | Notice error |
| 4 | 비밀번호 변경 `PasswordChangeForm` notice | 회색 `<p>` 텍스트 | 정보 | Notice info |
| 5 | 部署削除 모달 `inactiveNote` | 회색 `<p>` | 주의(영향 고지) | Notice warning |
| 6 | 勤怠修正 모달 `errors.server`(時刻範囲) | `FieldError`를 role=alert div로 감쌈 | 오류(폼 전체) | Notice error |
| 7 | 休暇カレンダー `LeaveScheduleTable` listNote | 회색 상자 + InfoIcon | 정보 | Notice info |
| 8 | 대시보드 休暇残 `LeaveBalanceSection` notGranted | 회색 `<p>` + InfoIcon | 정보 | Notice info |
| 9 | 대시보드 全社出勤·部署別 `holidayNote`(2곳) | 회색 `<p>` | 정보 | Notice info |
| 10 | `SectionError`(영역 조회 실패, 14곳 사용) | 문구 `<p role=alert>` + ErrorIcon + 버튼 | 오류 | **통합**: 내부를 Notice error + action으로 교체, 호출부 API 유지(`message?` 추가) |
| 11 | `ApproverSelect` 조회 실패 | SectionError와 동일한 중복 마크업 | 오류 | SectionError(message) 재사용 |
| 12 | `ApproverSelect` 후보 0건(empty) | ErrorIcon + 텍스트 | 주의(선택지 없음) | Notice warning |

## 2. 통합하지 않은 것과 이유
- `Toast`: 일시 알림(자동 소멸, role=status). 수명·위치가 다름.
- Confirm Dialog(`Modal` 확인 단계): 인터럽트 패턴.
- `FieldError`·필드 보조 문구(codeHint, managerLimitHint, daysHint, clockOutHint, statusHint)·Tooltip(missingHint, breakHint): 입력 필드와 aria-describedby로 연결되는 필드 단위 패턴.
- 빈 상태 문구(「〇〇はありません」), Skeleton 로딩, `autoApprove` 표시(폼 값 표시), 캘린더 범례 노트(`text-cal-note`), 모달의 件数 표시: 안내 메시지가 아님.
- `ErrorIcon`은 `FieldError`가 계속 사용하므로 유지.

## 3. 설계 / 판단 근거
- `InfoNotice`를 새 이름 없이 **`Notice`로 개명(git mv)** 하고 variant로 확장. 사용처 2곳을 모두 이전해 중복 컴포넌트 없음(`InfoNotice` 참조 0건). 기존 네이밍(PascalCase 단일 파일, `Badge`처럼 variant prop)과 맞춤.
- props: `variant`(info 기본/success/warning/error), `title?`, `children`, `action?`, `onClose?`(없으면 닫기 버튼 없음, 상태는 호출부 관리), `className?`(배치 전용).
- 구조: 좌 아이콘(20, variant별 형태 다름) + 우 본문. 1px 테두리, radius 8, padding 16/12, gap 12, 14/20. 제목 있으면 Bold + 본문 Regular, 없으면 본문 Medium. `min-w-0 wrap-break-word`로 줄바꿈.
- a11y: error만 `role="alert"`(role=status는 기존 Skeleton 검색 테스트와 충돌하고 정적 안내라 부여하지 않음), 아이콘 aria-hidden(형태+색+문구로 의미 전달), 닫기 버튼 aria-label.
- 토큰(`globals.css`, 기존 값 변경 없음, Primary 불변): `notice-{variant}-bg/-icon`은 기존 토큰 참조, `notice-{variant}-border` 4개 신규, `notice-text`(general-100 참조), `radius-notice`, `spacing-notice-x/y/gap`.
- 대비(도구 계산): 글자(general-100) / 배경 = info 16.14, success 16.31, warning 16.31, error 15.35. 아이콘 / 배경 = 4.56 / 4.87(success-110) / 4.52(warning-110) / 3.67(비텍스트 3:1 충족). 테두리는 장식(배경과 1.6:1)으로 의미 전달은 아이콘·문구가 담당.

## 4. 변경 파일
- 신규/개명: `components/Notice.tsx`(구 InfoNotice.tsx), `components/Notice.test.tsx`(8케이스: variant 토큰·아이콘 aria-hidden·기본 info·error만 alert·title/action·긴 문장 클래스·닫기 버튼).
- 수정: `globals.css`, `SectionError.tsx`, `leave/ApproverSelect.tsx`, `LoginForm.tsx`, `PasswordChangeForm.tsx`, `DepartmentsView.tsx`, `DepartmentFormModal.tsx`, `DepartmentDeleteModal.tsx`, `AttendanceEditModal.tsx`, `LeaveScheduleTable.tsx`, `LeaveBalanceSection.tsx`, `CompanyAttendanceSection.tsx`, `DepartmentStatusSection.tsx`.
- 중복 스타일·미사용 정리: 교체로 쓰지 않게 된 `leave/leaveIcons.tsx`·`dashboard/icons.tsx`의 `InfoIcon`(다른 참조 없음 확인), 각 파일의 미사용 import(`ErrorIcon`, `secondaryButtonClass`).
- 문서: `docs/09_DESIGN_SYSTEM.md` — 2.1절 Notice 토큰 표, 5절 9항(「새 안내 메시지는 반드시 공통 Notice 사용」+ variant 선택 기준 + 별도 패턴 목록), 6절 `InfoNotice` 행→`Notice` 행, `SectionError` 행 갱신, `leaveIcons`의 InfoIcon 제거.
- 안내 문구·표시 조건·비즈니스 로직 변경 없음. 백엔드·DB 변경 없음.

## 5. 검증 결과
- `tsc --noEmit` 통과, `eslint` 통과.
- vitest(PowerShell) 46파일 672테스트 전체 통과(기존 테스트 수정 없음, Notice 테스트 신규).
- Playwright(임시 spec·임시 갤러리 라우트는 삭제 완료): 4 variant·타이틀·닫기·긴 문장 갤러리(PC 1440 / SP 375), 로그인 오류, 비밀번호 변경 안내, 部署管理, 部署登録 모달, 休暇カレンダー, 대시보드 캡처. variant 간 radius·padding·폰트·아이콘 크기 동일, 가로 오버플로 없음. 캡처: `screenshots/`(gallery-pc/sp, login-error-pc/sp, password-notice-pc/sp, departments-pc/sp, department-modal-pc/sp, leave-calendar-pc/sp, dashboard-pc/sp).
- 기존 E2E 회귀 `login`·`password`·`departments`·`departments-list-modal` 통과(list-modal 2건은 첫 실행에서 로그인 지연으로 실패, 재실행 3/3 통과).
- 직접 화면 확인하지 못한 것: 部署削除 모달의 warning(inactiveMemberCount>0 데이터 필요), 勤怠修正 모달 error, ApproverSelect warning/error, SectionError(실패 상태 재현 불가) — 갤러리의 동일 컴포넌트와 vitest로 대체. 기존 info 배지 4.4:1 이슈는 범위 외.

## 6. 화면 리스트와 다른 점
없음.

## impeccable 점검
- 아이콘 선택자(`svg:first-child`)가 children 내부 svg에 번질 위험을 발견해 variant별 클래스를 아이콘에 직접 부여하도록 수정. 색만 구분하지 않도록 아이콘 형태를 variant별로 분리. 갤러리 확인 중 가로 오버플로는 갤러리 `main`의 폭 지정 누락(컴포넌트 문제 아님)으로 판명.

## Fix 1 — 레퍼런스 안내 메시지 디자인 반영
레퍼런스(`refs/01-notice-reference.png`, 1536px 이미지에서 모달 폭 약 1196px)를 측정. 모달 폭 비율 0.67(800/1196)로 환산: 안내 박스 높이 71→약 48, 좌측 여백 28→약 19~20, 아이콘 지름 34→약 23, 아이콘-본문 간격 19→약 13, 본문 글자 약 23→약 15. 테두리 없음, 연한 파란 배경, 진한 본문.

**바꾼 수치(전→후)**
| 항목 | 전 | 후 |
|---|---|---|
| 테두리 | 1px `notice-*-border` | 없음 |
| `radius-notice` | 0.5rem(8) | 0.75rem(12) |
| `spacing-notice-x` | 1rem(16) | 1.25rem(20) |
| 아이콘 | size-5(20), 원 r=9 | size-6(24), 원 r=10.5(지름 약 23) |
| 유지 | padding-y 12, gap 12, 14/20, medium, notice-text, bg·icon 색 | 동일 |
`notice-{variant}-border` 4개 토큰 삭제(사용처 0건 확인). 수정 파일: `globals.css`, `components/Notice.tsx`, `components/Notice.test.tsx`(border 클래스 assertion을 「border 클래스 없음」으로 교체, 약화 아님), `docs/09_DESIGN_SYSTEM.md`(토큰 표 border 행 삭제, radius/spacing 값, Notice 행 설명 갱신).

**대비(도구 계산)**: 글자/배경 16.14 / 16.31 / 16.31 / 15.35, 아이콘/배경 4.56 / 4.87 / 4.52 / 3.67는 배경·글자·아이콘 토큰 불변이라 그대로(AA 4.5:1, 비텍스트 3:1 충족). 흰 배경 대비 영역 구분은 info 1.12 / success 1.11 / warning 1.11 / error 1.18:1로 낮다. 레퍼런스도 같은 방식(테두리 없는 연한 배경)이고 의미 전달은 아이콘 형태·문구가 맡으므로 장식 취급(WCAG 비텍스트 3:1 대상 아님).

**확인**: tsc·eslint 통과, vitest(PowerShell) 46파일 672테스트 통과. Playwright 캡처 1440/375(`screenshots/v2-*.png`): gallery(4 variant·제목·닫기·action·긴 문장·좁은 카드 w-72), login-error, dashboard(休暇残 카드), departments, department-modal, leave-calendar. 部署登録 모달은 레퍼런스와 박스 높이비·여백·아이콘 비율이 거의 일치. 375px에서 가로 오버플로·잘림 없음. 임시 갤러리 라우트·임시 spec 삭제 완료.
미확인: 비밀번호 변경 화면(캡처 생략, 같은 컴포넌트), 휴가 캘린더 listNote·部署管理 하단 notes는 데이터/표시 조건상 캡처에 보이지 않음(갤러리로 대체), 部署削除 warning, 勤怠修正 error.
레퍼런스와 남은 차이: 레퍼런스 글자가 약간 굵고 박스가 약간 높아 보이나 앱 본문 14px 체계 유지(시스템 우선). 배경 색은 primary-30(#ECF2FF) 유지.
impeccable 점검: 아이콘 크기 확대로 `i`·`!` 선이 상대적으로 가늘어지지 않게 원 반지름만 키우고 stroke 2 유지, 제목/닫기/action 구성도 같은 비율에서 자연스러움 확인.
