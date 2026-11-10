# 09. Design System (Figma: Modernize UI Kit 기반)

> 상태: **분석 초안** (구현 전). 소스 코드는 아직 수정하지 않았다.
> 출처: Figma `ADPn65Vy8EzjApnNjk0L3t` (Modernize), 페이지 05 Designed Pages 중심.
> 색상은 `02. Colors`, 타이포는 `03. Typography` 페이지에서 확인한 값이다. 컴포넌트 치수는 대시보드·주문·로그인·설정 프레임의 reference 코드에서 읽은 값이다.
> `get_variable_defs`는 선택 레이어가 필요해 실패했다. Figma Variables가 아니라 Color/Text Style 이름과 값을 기준으로 정리했다.

## 1. Figma 구조

| 페이지 | node | 내용 |
|---|---|---|
| 01. Components | 0:1 | button, input, dropdown, selection(checkbox/radio/toggle…), navigation(tabs/breadcrumb/pagination/steps/side·top nav), feedback(global·floating notification, tooltip), table, modal, choose(calendar/menu/autocomplete), other(avatar/badge/tag/counter/loader/progress), card, grid, spacer |
| 02. Colors | 0:816 | 8개 팔레트 × 8단계 |
| 03. Typography | 0:976 | 다크·라이트 각각 Heading, Subtitle, Text, Caption |
| 04. Icons & Illustrations | 0:1248 | 아이콘 세트 |
| 05. Designed Pages | 0:1681 | 약 36개 프레임, 모두 1440px 너비 |
| 06. Design Variations | 0:7558 | 변형안 |

Designed Pages 프레임 (이커머스 어드민 템플릿):
- 대시보드 4종(`0:1682`…)
- orders `0:2731`, products `0:3037`, categories `0:3771`, customers `0:4061`, coupons `0:4247`
- reports `0:5015`, inbox `0:4469`, knowledge base `0:4607`, pricing `0:4908`
- settings `0:4810`, settings notifications `0:4858`
- 인증: login `0:5858`, create account, password reset `0:5877`, email confirmation, registration complete
- Empty 상태: products·categories·customers empty
- 모달: delete modal `0:3218`, success modal `0:3407`, categories modal `0:3590`
- 폼: add products, create category, add customer, create coupon

## 2. 디자인 토큰

### 2.1 색상

| 그룹 | 100 | 90 | 80 | 70 | 60 | 50 | 40 | 30 |
|---|---|---|---|---|---|---|---|---|
| Primary / Secondary(동일값) | #1E5EFF | #336DFF | #4F81FF | #608DFF | #89ABFF | #B6CBFF | #D9E4FF | #ECF2FF |
| General | #131523 | #333752 | #5A607F | #7E84A3 | #A1A7C4 | #D7DBEC | #E6E9F4 | #F5F6FA |
| Green | #06A561 | #1FD286 | #25E191 | #48E9A5 | #74EFB9 | #95F6CC | #C4F8E2 | #DAF9EC |
| Red | #F0142F | #F12B43 | #F34359 | #F45A6D | #F8919D | #FAB3BC | #FCD5D9 | #FDE7EA |
| Yellow | #F99600 | #FFC700 | #FFD613 | #FFE45F | #FFE582 | #FFECA3 | #FFF4C9 | #FFF9E1 |

화면에서 쓰는 의미별 매핑:

| 용도 | 값 |
|---|---|
| 페이지 배경 | General 30 `#F5F6FA` |
| 카드·입력 배경 | `#FFFFFF` |
| 본문 텍스트 | General 100 `#131523` |
| 보조 텍스트·라벨 | General 80 `#5A607F` |
| placeholder·축 라벨 | General 60 `#A1A7C4` |
| 버튼·카드 테두리 | General 50 `#D7DBEC` |
| 입력 테두리 | `#D9E1EC` (팔레트에 없는 값) |
| 구분선·표 행 라인 | General 40 `#E6E9F4` |
| 주요 버튼·활성 메뉴·링크 | Primary 100 |
| 페이지네이션 활성 배경 | Primary 30 `#ECF2FF` |
| 성공 | 텍스트 Green 100 + 배경 Green 40 `#C4F8E2` |
| 오류·삭제 | Red 100 |
| 경고·Ready 배지 | Yellow 100 `#F99600` |
| Pending 배지 | 배경 General 40 + 텍스트 General 80 |
| Shipped 배지 | 배경 General 80 + 흰 텍스트 |
| 사이드바 활성 항목 | 배경 Primary 100 + 흰 텍스트 |
| 카운터 배지(사이드바) | 배경 General 100 + 흰 텍스트 |

### 2.2 타이포그래피 (Inter, 다크·라이트 동일 수치)

| 스타일 | size / line-height | weight |
|---|---|---|
| Heading 1 | 80 / 112 | Bold |
| Heading 2 | 64 / 90 | Bold |
| Heading 3 | 48 / 66 | Bold |
| Heading 4 | 32 / 44 | Bold (로그인 제목) |
| Heading 5 | 24 / 34 | Bold (페이지 제목) |
| Heading 6 | 20 / 28 | Bold (통계 수치) |
| Subtitle 1 / 2 | 20 / 28, 24 / 34 | Regular |
| Text 2 | 16 / 24 | Regular·Medium·Bold, 각각 밑줄 변형 |
| Text 3 | 14 / 20 | 같음 (표·라벨·메뉴의 기본) |
| Text 4 | 12 / 16 | 같음 (배지 숫자·축 라벨) |
| Caption 1 / 2 | 14 / 20, 16 / 24 | Bold, uppercase, letter-spacing 2px |

- 카드 제목은 16/24 Bold, 표 본문은 14/20 Regular, 표 첫 열은 14/20 Medium.
- 로고에만 Gilroy ExtraBold 21.7px를 쓴다. 앱 UI에는 필요 없다.
- Inter에는 한글 글리프가 없다. 한글 fallback(Pretendard 또는 Noto Sans KR)이 필요하다.

### 2.3 간격·형태·그림자

| 항목 | 값 |
|---|---|
| 레이아웃 | 1440 기준. 상단바 높이 68, 사이드바 너비 250, 본문 좌측 여백 290 |
| 카드 | radius 6, 내부 padding 28, 그림자 `0 1 4 rgba(21,34,50,.08)` 또는 1px `#E6E9F4` 테두리 |
| 컨트롤 radius | 4 (버튼·입력·배지·체크박스) |
| 버튼 높이 | Large 48 / Medium 40 / Small 36 |
| 입력 높이 | Large 48 / Medium 40, 라벨 14px이 위에 있고 간격 4, 좌우 padding 16 |
| 표 | 헤더 44 (하단 2px `#E6E9F4`), 행 52 (하단 1px), 셀 좌우 8 |
| 사이드바 메뉴 | 항목 높이 44, 간격 0, 좌우 margin 16, 아이콘 24, 텍스트 시작 56 |
| 배지 | 높이 24, radius 4, 14px |
| 페이지네이션 | 36×36 셀, radius 4 |
| 아이콘 | 24×24 |
| 간격 단위 | 4 배수 (4, 8, 12, 16, 20, 24, 28, 36, 40, 44, 48, 52) |

반응형: 확인한 모든 프레임이 1440px 데스크톱뿐이다. 모바일·태블릿 프레임은 없다.

## 3. 공통 레이아웃·컴포넌트

### 레이아웃
- **App Shell**: Top Navigation(68, 흰 배경+그림자) + Side Navigation(250) + 본문(`#F5F6FA`)
  - Top: 로고, 검색, 채팅·알림(카운터), 사용자 드롭다운
  - Side: 그룹 라벨(12px General 60), 활성 항목 Primary 채움, 배지, 하단 배너 카드
- **Auth Layout**: `#F5F6FA` 배경 위 가운데 정렬 카드 (폭 약 540 = 1440의 37.5%)
- **Page Header**: 좌측 Heading 5, 우측 액션 버튼 그룹
- **Card Panel**: 흰 카드 + 제목 + 본문

### 컴포넌트 (Figma 이름 → 용도)
| 컴포넌트 | 변형 |
|---|---|
| Button | Primary / White(아웃라인) / Light(Primary 40) / Danger(Red), 크기 3종, 아이콘 포함, Icon-only |
| Input | Regular, Search, Password 등. Large·Medium. 상태: default/focus/error/disabled |
| Dropdown(Select) | Regular, Medium |
| Checkbox / Radio / Toggle / Slider | 20px 체크박스 |
| Tabs | horizontal(활성 Primary 텍스트 + 하단 라인), vertical |
| Pagination | 이전/다음 + 번호 + `...` + 총 건수 |
| Table | header / text row / checkbox row / image row |
| Badge (light/solid) | Green, Yellow, Gray, Dark gray, Blue, Red |
| Counter | 16px 원형 |
| Modal | 제목 + 닫기(X) + 본문 + 우측 정렬 [취소(텍스트)] [확인(채움)] |
| Notification | global(상단 배너), floating(토스트) |
| Tooltip | 어두운 배경, 12px |
| Calendar / Autocomplete / Menu | 날짜 선택, 검색 선택 |
| Loader / Progress | 로딩 |
| Empty State | products·categories·customers empty 프레임 |
| File Upload | 점선 박스 + 파일 추가 버튼 (settings) |

## 4. workBridge 화면과의 대응 (SCR-001~009)

범례: ◎ 거의 그대로 사용, ○ 변형해서 사용, △ 부분 참고, ✕ 대응 프레임 없음

| 화면 | Figma 참고 프레임 | 매핑 | 비고 |
|---|---|---|---|
| SCR-001 로그인 | login `0:5858` | ◎ | Email→사원번호. 소셜 로그인·Create Account 링크·"Keep me signed in"은 제거. 오류 메시지는 폼 상단 영역을 새로 정의해야 함 |
| SCR-002 대시보드 | dashboard 1~4 | ○ | stats 카드 4개를 출근/미출근/휴가/승인대기에 매핑. 근태 카드(출근·퇴근 버튼), 휴가 현황 카드는 새로 구성. 차트는 사용하지 않음. 승인 대기 표는 "Recent Transactions" 표 참고 |
| SCR-003 근태 관리 | orders `0:2731` | ○ | 검색 조건 + 표 + 페이지네이션. 체크박스 열·Export·삭제 아이콘은 제거. Date Picker는 calendar 컴포넌트 참고 |
| SCR-004 휴가 관리 | settings `0:4810` (탭+폼), orders (표) | △ | 탭 UI와 폼 레이아웃(2열)을 참고. Textarea 글자수 표시·승인자 Searchable Select·반차 시 종료일 비활성은 별도 정의. 상세 모달 레이아웃 없음 |
| SCR-005 휴가 승인 | orders, delete modal | △ | 표 행 액션 3종([상세][승인][반려])과 반려 사유 입력 모달이 없다. 확인 모달은 delete modal 참고 |
| SCR-006 사원 관리 | customers `0:4061`, add customer `0:4192` | ○ | 검색 6개 조건은 한 줄에 안 들어가므로 2줄 필요. 신규 등록은 모달로 구성 |
| SCR-007 사원 상세 | settings, customer info `0:5736` | ○ | 읽기 전용 필드, Switch 2개, 부여 연차 표, [저장][취소][목록으로] 배치 |
| SCR-008 전체 근태 | orders | ○ | SCR-003과 같은 표에 사원명 링크·[수정] 버튼과 수정 모달 추가 |
| SCR-009 비밀번호 변경 | password reset `0:5877` | ○ | 입력 3개 + [변경][취소]. 최초 로그인 강제 시 취소 버튼과 메뉴 숨김 |

공통 UI 규칙(03_SCREEN_LIST)과의 대응:

| 규칙 | Figma 대응 |
|---|---|
| 전역 내비게이션 (상단 헤더 메뉴) | ✕ 충돌. Figma는 상단바 + **좌측 사이드바**. 아래 5절 결정 사항 참고 |
| 메뉴 배지(승인 대기 건수) | ◎ 사이드바 카운터 배지 |
| Loading 스켈레톤 | △ loader만 있고 skeleton 없음 |
| Empty 상태 | ◎ empty 프레임 |
| Error + [다시 시도] | ✕ 없음 |
| 토스트 | ◎ floating notification |
| 확인 모달 | ◎ delete modal, success modal |
| 필드 오류 | △ input error 상태 확인 필요 |
| 페이지네이션(20건) | ◎ |

## 5. 확정된 결정

1. **내비게이션**: 좌측 사이드바로 확정. 03_SCREEN_LIST의 "전역 내비게이션" 절을 이에 맞게 수정했다.
2. **언어와 폰트**: UI는 전부 일본어. 폰트는 Inter(영문·숫자) + Noto Sans JP(일본어, `next/font`). 앞의 2.2절 "한글 fallback" 항목은 일본어 기준으로 읽는다. 일본어 문구는 표시 문자열 사전 한 곳에서 관리하고, docs는 한국어를 유지한다.
3. **반응형**: 모든 화면을 최소 360px 폭부터 지원한다(2026-11-08 변경, 이전: 데스크톱 전용).
   - 디자인 기준은 Figma의 1440px 데스크톱 프레임이다. 좁은 폭의 배치는 같은 토큰(색상·간격·타이포·컴포넌트 규칙)을 유지한 채 조정하며, 새로운 색상·스타일을 추가하지 않는다.
   - 브레이크포인트는 Tailwind 기본값(`sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280)을 사용한다.
   - 화면별 좁은 폭 배치(예: 사이드바의 드로어 전환, 표의 표시 방식)는 각 화면 구현 시 정하고 해당 화면명세에 기록한다.
4. **템플릿 사용**: 디자인 토큰(색상·간격·폼 규칙)만 참고한다. 코드·로고·일러스트·이미지는 직접 만들고 로고는 workBridge로 한다. 차트·소셜 로그인·상품 이미지·배너는 가져오지 않는다.
5. **Figma에 없는 UI**: 4절 표의 ✕·△ 항목은 토큰과 컴포넌트 규칙을 확장해 직접 설계한다.

## 6. 구현된 공용 컴포넌트 (frontend)

> 위 1~5절의 토큰·규칙을 코드로 옮긴 결과 기록이다. 새 화면은 아래를 먼저 재사용하고, 없는 것만 같은 위치·방식으로 추가한다. 토큰은 `frontend/src/app/globals.css`의 `@theme`(2절 값 그대로)만 쓴다.

| 파일 | export | 용도·변형 | 사용 토큰 | 접근성 |
|---|---|---|---|---|
| `components/form.tsx` | `inputClass` | Input Large(높이 48, 좌우 16, radius 4). 상태 default/focus/error | `input-border`, `primary-100`(focus 테두리+ring), `danger-100`(`aria-invalid` 시) | `aria-invalid`로 error 표시, `aria-describedby`로 FieldError 연결 |
| | `selectClass` | Dropdown(Select) Regular. `inputClass`와 같은 높이·테두리 + `cursor-pointer` | `inputClass`와 같음 | `inputClass`와 같음 |
| | `labelClass` | 입력 위 라벨(14/20 Medium, 아래 간격 4) | `general-80` | `<label htmlFor>`와 함께 사용 |
| | `primaryButtonClass` | Button Primary(채움). 높이·폭은 호출측 지정, disabled는 `disabled:bg-primary-60` | `primary-100`, hover `primary-90` | focus-visible 2px outline `primary-100` |
| | `secondaryButtonClass` | Button White(아웃라인). 취소 등 Primary 옆 보조 동작 | 테두리 `general-50`, hover `general-30`, 글자 `general-100` | 같음 |
| | `textButtonClass` | 텍스트 버튼(14/20 Medium, hover 밑줄). 로그아웃 등 보조 링크성 동작 | `primary-100` | 같음 |
| | `FieldError`, `ErrorIcon` | 필드 아래 오류 문구(아이콘 + 14/20) | `danger-100`(아이콘), `general-100`(문구) | `id`를 입력의 `aria-describedby`에 지정. 아이콘은 `aria-hidden` |
| `components/Toast.tsx` | `ToastProvider`, `useToast().showToast(message, variant)` | Notification floating. 상단 중앙, 1건만(새 알림이 교체), 4초 후 자동 소멸, 화면 이동 후에도 유지(`app/layout.tsx`에 배치). variant `success`/`error` | success: `success-100` 테두리 + `success-40` 배경 / error: `danger-100` + `danger-30`, `shadow-card`, radius 4 | `role="status"` + `aria-live="polite"` 영역이 항상 존재 |
| `components/Modal.tsx` | `Modal({open,title,onClose,children,footer})` | 제목 + 닫기(X) + 본문 + 우측 정렬 footer. 폭 최대 420, padding 28, radius 6 | `shadow-card`, backdrop `general-100/50` | `<dialog>` `showModal()`로 포커스 트랩·Esc 닫기, `aria-labelledby`(제목 id는 `useId()`로 생성해 여러 모달이 동시에 있어도 중복되지 않음), X 버튼 `aria-label`(`messages.common.close`) |
| `components/Spinner.tsx` | `Spinner` | Loader. 20px, 색은 부모 글자색 | — | `aria-hidden`. 단독 로딩 표시일 때는 부모에 `role="status"` + `sr-only` 문구(`messages.common.loading`)를 둔다 |
| `components/Logo.tsx` | `Logo` | workBridge 마크 + 워드마크(20 Bold) | `primary-100` | 마크 `aria-hidden`, 이름은 텍스트 |
| `components/Card.tsx` | `Card({title,action?,children})` | Card Panel. 제목(16/24 Bold) + 우측 `action` + 본문. padding 20(`sm` 이상 28), radius 6 | `shadow-card`, 흰 배경 | `<section aria-labelledby>`(제목 id는 `useId()`) |
| `components/Skeleton.tsx` | `Skeleton({className})`, `SkeletonLines({count})` | Loading 스켈레톤. 크기는 호출측 지정 / 영역 전체용 줄 묶음 | `general-40` + `animate-pulse` | `Skeleton`은 `aria-hidden`. `SkeletonLines`는 `role="status"` + `sr-only`(`messages.common.loading`) |
| `components/SectionError.tsx` | `SectionError({onRetry})` | 영역 단위 조회 실패 문구 + [다시 시도](03 공통 UI 규칙 Error) | `ErrorIcon`, `secondaryButtonClass`(높이 36) | 문구에 `role="alert"` |
| `components/Badge.tsx` | `Badge({variant,children})`, `BadgeVariant` | 상태 배지. 높이 24, radius 4, 14px. variant `neutral`/`success`/`danger`/`dark` | neutral: `general-40` 배경+`general-80` / success: `success-40`+`general-100` / danger: `danger-30`+`general-100` / dark: `general-80`+흰색 | 상태는 색과 문구를 함께 표시 |
| `components/StatCard.tsx` | `StatCard({label,value,href?})` | stats 카드. 항목명(14/20) + 수치(Heading 6). `href`가 있으면 카드 전체가 링크(우측 화살표) | `shadow-card`, hover `primary-30`, `text-h6`, `tabular-nums` | 링크일 때 focus-visible outline `primary-100` |
| `components/Pagination.tsx` | `Pagination({page,totalPages,totalCount,onChange})` | 이전/다음 + 번호(처음·끝·현재 ±1, 사이는 `…`) + 총 건수. 셀 36×36, radius 4. `totalPages`가 1 이하이면 총 건수만 표시 | 현재 `primary-30` 배경 + `primary-100` Bold, hover `general-30`, disabled `general-60` | `<nav aria-label>`(`messages.pagination.label`), 현재 페이지 `aria-current="page"`, 번호 버튼 `aria-label`, `…`는 `aria-hidden`, focus-visible outline `primary-100` |
| `components/Tabs.tsx` | `Tabs({label,items:{value,label}[],value,onChange})` | Tabs horizontal(3절). 탭 높이 44, 간격 24(스크롤 영역을 만들지 않으므로 탭 행에 스크롤바가 나타나지 않음). ←/→로 이동과 동시에 선택(끝에서 반대쪽으로 순환) | 활성 `primary-100` 글자 + 하단 2px `primary-100`, 비활성 `general-80`(hover `general-100`), 구분선 `general-40` | `role="tablist"`+`aria-label`, 각 탭 `role="tab"`·`aria-selected`, 선택 탭만 `tabIndex=0`(roving), focus-visible outline `primary-100`(`-outline-offset`으로 잘림 방지) |
| `components/Tooltip.tsx` | `Tooltip({content,children})` | Tooltip. 트리거 위쪽에 표시, 최대 폭 240, 12px | `general-100` 배경 + 흰 글자, `shadow-card`, radius 4 | 트리거 `tabIndex=0`, hover와 키보드 focus 모두 표시, Esc로 닫힘, `role="tooltip"` + 표시 중 `aria-describedby` |
| `components/table.ts` | `thClass`, `tdClass` | Table. 헤더 행 44(하단 2px), 데이터 행 52(하단 1px), 셀 좌우 8 | `general-40`(선), 헤더 `general-80` Medium, 본문 `general-100` | `<th scope="col">`와 함께 사용 |
| `components/attendance/attendanceStatus.ts` | `ATTENDANCE_STATUS_BADGE`, `MISSING_ROW_CLASS` | 근태 상태 → Badge variant(WORKING=`success` / DONE=`neutral` / MISSING_CLOCK_OUT=`danger`). 퇴근 누락 행 강조 클래스(SCR-003·008) | 행 강조 `bg-danger-30/40`(배지와 구분되도록 농도를 낮춤) | 문구는 `messages.attendance.statuses` |
| `components/attendance/StatusFilterButtons.tsx` | `StatusFilterButtons({idPrefix,selected,onChange})` | 勤怠 상태(근무 중·퇴근 완료·퇴근 누락)를 토글 버튼으로 복수 선택(SCR-003). 누를 때마다 선택·해제하고 표시 순서로 유지하며, 누르는 즉시 반영된다(반영은 호출측). 선택 없음은 "전체". 높이 40, radius 4 | 색은 목록의 상태 배지와 같음(`BADGE_VARIANT_CLASS`: 근무 중 `success-40`, 퇴근 완료 `general-40`, 퇴근 누락 `danger-30`). 선택 중은 `general-100` 테두리 + Bold + ✓, 미선택은 투명 테두리(hover `general-50`) | `role="group"`+라벨(`aria-labelledby`)+안내 문구(`aria-describedby`), 각 버튼 `aria-pressed`, focus-visible outline `primary-100` |
| `components/attendance/DateRangeFields.tsx` | `DateRangeFields({idPrefix,startDate,endDate,onChange,error})` | 조회 기간 입력(시작일·종료일 `type="date"`, `sm` 이상 2열). 오류는 FieldError 1개로 통합 | form 클래스 재사용 | 두 입력 모두 `aria-invalid`·`aria-describedby`로 같은 FieldError에 연결 |
| `components/layout/AppShell.tsx` | `AppShell({children})` | 로그인 후 화면 공통 레이아웃 + 라우트 가드(비로그인 → `/login?redirect=`, mustChangePassword → `/password`, 비관리자의 `/admin`·`/admin/*` → 이동 전까지 children 미렌더, 토스트 `messages.common.forbidden` 1회 + `/dashboard`로 replace). TopBar 68 + Sidebar 250(`lg` 이상 고정), `lg` 미만은 드로어(배경 클릭·Esc·메뉴 선택 시 닫힘) | 본문 `general-30` 배경, 드로어 backdrop `general-100/50` | 드로어 열면 첫 메뉴로 포커스. 인증 확인 중에는 `role="status"` Spinner |
| `components/layout/Sidebar.tsx` | `SidebarNav({isAdmin,onNavigate?,pendingApprovalCount?})` | 03 전역 내비게이션 메뉴. 항목 높이 44, 좌우 margin 16. ADMIN은 그룹 라벨 아래 관리자 메뉴 추가. "휴가 승인" 항목 우측에 승인 대기 카운터 배지(높이 16, 최소 폭 16, `rounded-full`, 12px). 0건·null이면 숨김, 100건 이상은 `99+` | 활성 `primary-100`+흰색, hover `general-30`, 그룹 라벨 12px `general-80`, 카운터 `general-100` 배경+흰 글자 | `<nav aria-label>`, 활성 항목 `aria-current="page"`, 카운터는 `aria-hidden`이고 건수는 `sr-only` 문구(`messages.nav.pendingCount(n)`)로 제공 |
| `components/layout/PendingApprovalCount.tsx` | `PendingApprovalCountProvider({children})`, `usePendingApprovalCount()` → `{count,refresh}` | 사이드바 승인 대기 건수(03 전역 내비게이션). AppShell이 가드 통과 후 1회 감싸고 고정 사이드바·드로어가 공유. 셸 표시 시·pathname 변경 시·`refresh()` 호출 시 재조회, 늦은 응답은 무시, 실패 시 `count=null`(토스트 없음). Provider 밖에서는 `{count:null, refresh:noop}` | — | — |
| `components/layout/TopBar.tsx` | `TopBar({userName,drawerOpen,drawerId,onToggleDrawer,onLogout})` | Top Navigation. 높이 68, 로고(대시보드 링크), `lg` 미만 햄버거 버튼, 사용자 메뉴(비밀번호 변경·로그아웃) | 흰 배경 + `shadow-card` | 햄버거 `aria-expanded`/`aria-controls`, 사용자 메뉴는 바깥 클릭·Esc로 닫힘 |
| `components/leave/LeaveDetailModal.tsx` | `LeaveDetailModal({leaveId,initialStep?,onClose,onProcessed})`, `LEAVE_STATUS_BADGE` | 공통 휴가 상세 모달(SCR-004 §4.4). `leaveId`가 null이면 닫힘. 처리 가능하면 승인 확인·반려 사유 입력을 모달 안 단계 전환으로 처리(중첩 dialog 없음). `initialStep`(`detail` 기본 / `approve` / `reject`)은 상세 조회 후 처음 보일 단계이며, 처리 불가 상태이면 상세 단계로 표시. 확인·사유 단계의 [취소]는 `initialStep`이 `detail`이면 상세로 돌아가고 그 외에는 모달을 닫음. 409 `ALREADY_PROCESSED`는 서버 message 대신 `messages.leave.alreadyProcessed` 표시 | `Modal`·`Badge`·form 클래스 재사용 | `Modal`과 같음 |

- 데이터 조회 훅: `lib/api/useApiQuery.ts` `useApiQuery<T>(path | null, {onError?})` → `{status:'loading'|'error'|'success', data, error, reload, setData}`. `path`가 null이면 호출하지 않는다. 403 `PASSWORD_CHANGE_REQUIRED`이면 `/password`로 이동한다. 영역별로 독립 조회할 때 사용한다.
- 대비 결정: 2.1절의 "성공 = 텍스트 Green 100 + 배경 Green 40"은 대비 약 2.7:1로 WCAG AA 미달이므로, Badge success·danger의 글자색은 General 100으로 한다. 사이드바 그룹 라벨도 3절의 General 60 대신 General 80을 쓴다.

- 타이포 토큰: `text-h4`(Heading 4 32/44, `@theme`의 `--text-h4`)를 로그인·비밀번호 변경 제목에 사용. `text-h5`(Heading 5 24/34, 페이지 제목)·`text-h6`(Heading 6 20/28, 통계 수치)를 같은 방식으로 추가했다. 다른 Heading이 필요해지면 같은 방식으로 추가한다.
- Auth Layout 카드(SCR-001·009): 폭 최대 540, padding 28(`sm` 이상 40), radius 6, `general-40` 테두리 + `shadow-card`.
