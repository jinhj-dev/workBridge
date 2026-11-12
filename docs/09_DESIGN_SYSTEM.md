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
| 페이지 배경 | General 30 `#F5F6FA` (구현은 아래 추가 토큰 `page-from`→`page-to` 그라데이션으로 대체) |
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
| 사이드바 활성 항목 | 배경 Primary 100 + 흰 텍스트. **구현(2026-11 셸 재현, 5절 6)**: 배경 Primary 30 + Primary 100 텍스트 |
| 카운터 배지(사이드바) | 배경 General 100 + 흰 텍스트. **구현(2026-11 셸 재현)**: 배경 Red 100(`danger-100`) + 흰 텍스트 |

추가 토큰 (Figma 팔레트 외, SCR-002 대시보드 참조 디자인 재현용. `globals.css` `@theme`):

| 토큰 | 값 | 용도 |
|---|---|---|
| `success-30` | `#E6F7EE` | 淡い緑 배지 배경(Badge `positive`) |
| `success-110` | `#047A49` | 淡い緑 배지 글자(Badge `positive`) |
| `warning-30` | `#FFF1E0` | 淡い橙 배지 배경(Badge `caution`) |
| `warning-110` | `#B45309` | 淡い橙 배지 글자(Badge `caution`) |
| `violet-100` | `#7C5CF0` | SCR-002 今月の勤務状況의 残業·休日出勤 아이콘, 全社の出勤状況 도넛 休暇 구간(흰 배경 대비 4.5:1, 비텍스트 3:1 충족) |
| `violet-80` | `#9B86F5` | 진행 막대 그라데이션 끝색(`primary-80`→`violet-80`) |
| `page-from` / `page-to` | `#FAFBFF` / `#F1F3FC` | `body` 배경 `linear-gradient(160deg, page-from, page-to) fixed`. 로그인 후 화면과 인증 화면(SCR-001·009) 모두 적용 |

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
| 카드 | radius 6, 내부 padding 28, 그림자 `0 1 4 rgba(21,34,50,.08)` 또는 1px `#E6E9F4` 테두리. **구현(`Card`, 2026-11 대시보드 재현)**: radius 16, 1px `general-40` 테두리 + `shadow-card-soft`, padding 좌우 20·상하 16(`sm` 이상 좌우 24·상하 20). 상세는 6절 `Card` |
| 그림자 토큰 | `shadow-card` = `0 1px 4px rgba(21,34,50,.08)`(위 값) / `shadow-card-soft` = `0 2px 10px rgba(79,70,180,.08)`(추가, 青紫がかった柔らかい影. `Card`·아이콘 `StatCard`) |
| 컨트롤 radius | 4 (버튼·입력·배지·체크박스) |
| 버튼 높이 | Large 48 / Medium 40 / Small 36 |
| 입력 높이 | Large 48 / Medium 40, 라벨 14px이 위에 있고 간격 4, 좌우 padding 16 |
| 표 | 헤더 44 (하단 2px `#E6E9F4`), 행 52 (하단 1px), 셀 좌우 8. compact 행 36 (출근부 SCR-003처럼 행이 많은 표). SCR-002 대시보드 카드 안의 표는 예외로 헤더 행을 `general-30` 띠(양끝 radius 8, 하단선 없음, 글자 `general-80` Medium)로 표시: 承認待ち = 헤더 36·14px, 행 44·셀 좌우 12·행 구분선 없음(hover `general-30`) / 各部署 = 헤더 32·12px, 행 36·하단 1px `general-40`·셀 좌우 8(`sm` 미만 6), 숫자 열 오른쪽 정렬, 헤더·숫자 셀 줄바꿈 없음(「出勤（率）」 1줄, 넘치면 표 안 가로 스크롤). 두 표는 `table.ts`가 아니라 각 섹션 파일 안의 클래스로 정의 |
| 진행 막대 | 높이 8, `rounded-full`, 트랙 `general-40`, 채움 `primary-80`→`violet-80` 가로 그라데이션. 오른쪽에 수치(14/20 Medium, `tabular-nums`). `role="progressbar"`(SCR-002 今日の勤務進捗, 공용 컴포넌트 아님) |
| 사이드바 메뉴 | 항목 높이 44, 간격 0, 좌우 margin 16, 아이콘 24, 텍스트 시작 56. **구현(2026-11)**: 항목 radius 8, 좌우 padding 16, 아이콘 20 + 간격 12 |
| 배지 | 높이 24, radius 4, 14px. Pill 형(완전한 둥근 모서리, 좌우 12)은 출근부 勤務パターン에 사용 |
| 페이지네이션 | 36×36 셀, radius 4 |
| 아이콘 | 24×24 |
| 간격 단위 | 4 배수 (4, 8, 12, 16, 20, 24, 28, 36, 40, 44, 48, 52) |

반응형: 확인한 모든 프레임이 1440px 데스크톱뿐이다. 모바일·태블릿 프레임은 없다.

## 3. 공통 레이아웃·컴포넌트

### 레이아웃
- **App Shell**: Top Navigation(68, 흰 배경+그림자) + Side Navigation(250) + 본문(`#F5F6FA`)
  - Top: 로고, 검색, 채팅·알림(카운터), 사용자 드롭다운
  - Side: 그룹 라벨(12px General 60), 활성 항목 Primary 채움, 배지, 하단 배너 카드
  - **구현(2026-11, SCR-002 참조 디자인 기준 셸, 5절 6)**: Top = 로고 + 알림 벨(승인 대기 화면 링크, 건수 > 0이면 빨간 점) + 구분선 + 아바타 사용자 메뉴(이름은 `sm` 이상). 검색·채팅 없음. Side = 메뉴 아이콘(`layout/navIcons.tsx`) + 활성 `primary-30` 채움, 카운터 `danger-100`. 배너 카드 없음. `lg` 미만은 하단 탭(`MobileTabBar`, 5탭: ホーム·出勤簿·休暇管理·休暇承認·メニュー)이 사이드바를 대신하고 「メニュー」가 드로어(사이드바 메뉴 전체)를 연다. 상단바의 햄버거 버튼은 없다. 상세는 6절
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

## 4. workBridge 화면과의 대응 (SCR-001~010)

범례: ◎ 거의 그대로 사용, ○ 변형해서 사용, △ 부분 참고, ✕ 대응 프레임 없음

| 화면 | Figma 참고 프레임 | 매핑 | 비고 |
|---|---|---|---|
| SCR-001 로그인 | login `0:5858` | ◎ | Email→사원번호. 소셜 로그인·Create Account 링크·"Keep me signed in"은 제거. 오류 메시지는 폼 상단 영역을 새로 정의해야 함 |
| SCR-002 대시보드 | dashboard 1~4, 별도 참조 이미지(관리자·일반 사원 × 데스크톱·모바일) | ○ | (ADMIN) 아이콘 stats 카드 3개(全社員数/本日の出勤者/承認待ちの申請) + 카드 7종(承認待ち·今日の出勤状況·全社の出勤状況·今月の勤務状況·休暇の残り日数·各部署の状況·直近の申請履歴). 全社の出勤状況만 정적 SVG 도넛(`DonutChart`)을 쓴다(5절 4 예외). 그 외 차트는 사용하지 않음. 승인 대기 표는 "Recent Transactions" 표 참고. 카드 배치·구성은 SCR-002 §3 |
| SCR-003 근태 관리 | orders `0:2731` | ○ | 검색 조건 + 표 + 페이지네이션. 체크박스 열·Export·삭제 아이콘은 제거. Date Picker는 calendar 컴포넌트 참고 |
| SCR-004 휴가 관리 | settings `0:4810` (폼), orders (표) | △ | 폼 레이아웃을 참고(신청 폼은 공통 휴가 신청 모달로 구성). Textarea 글자수 표시·승인자 Searchable Select·반차 시 종료일 비활성은 별도 정의. 상세 모달 레이아웃 없음 |
| SCR-005 휴가 승인 | orders, delete modal | △ | 표 행 액션 3종([상세][승인][반려])과 반려 사유 입력 모달이 없다. 확인 모달은 delete modal 참고 |
| SCR-006 사원 관리 | customers `0:4061`, add customer `0:4192` | ○ | 검색 6개 조건은 한 줄에 안 들어가므로 2줄 필요. 신규 등록은 모달로 구성 |
| SCR-007 사원 상세 | settings, customer info `0:5736` | ○ | 읽기 전용 필드, Switch 2개, 부여 연차 표, [저장][취소][목록으로] 배치 |
| SCR-008 전체 근태 | orders | ○ | SCR-003과 같은 표에 사원명 링크·[수정] 버튼과 수정 모달 추가 |
| SCR-009 비밀번호 변경 | password reset `0:5877` | ○ | 입력 3개 + [변경][취소]. 최초 로그인 강제 시 취소 버튼과 메뉴 숨김 |
| SCR-010 부서 관리 | customers `0:4061`, add customer `0:4192` | ○ | SCR-006과 같은 구성(검색 조건 + 표 + 등록·수정 모달)에 삭제 확인 모달 추가. 검색 조건 2개라 `sm` 이상 한 줄. `md` 미만은 카드형 목록 |

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
   - **예외(차트)**: SCR-002 全社の出勤状況의 도넛 차트는 허용한다(2026-11 대시보드 개편 결정). 차트 라이브러리 없이 정적 SVG로 그리는 공용 `DonutChart`(6절)만 쓰며, 다른 차트(막대·선 등)는 여전히 쓰지 않는다.
5. **Figma에 없는 UI**: 4절 표의 ✕·△ 항목은 토큰과 컴포넌트 규칙을 확장해 직접 설계한다.
6. **SCR-002 참조 디자인 재현(2026-11)**: 대시보드는 별도 참조 이미지를 재현하기 위해 3항의 "새로운 색상·스타일을 추가하지 않는다"의 예외로 2.1절 추가 토큰(淡い緑·橙, violet, 페이지 그라데이션)·`shadow-card-soft`(2.3절)·`text-greeting`·`text-stat`(6절 타이포 토큰)을 추가했다. 이 중 `Card` 스타일(radius 16·테두리·soft 그림자·제목 18px)과 `body` 배경 그라데이션은 공용이라 전 화면에 적용된다.
   - **색·셸도 참조 이미지 기준(사용자 결정 D16 변경, 2026-11-12)**: 색 톤(위 추가 토큰)과 앱 셸(사이드바 아이콘·활성 스타일, 상단바 벨·아바타, `lg` 미만 하단 탭)도 참조 이미지에 맞춘다. 셸은 공용이라 로그인 후 전 화면에 적용된다(3절 App Shell 구현, 6절 `AppShell`·`SidebarNav`·`TopBar`·`MobileTabBar`). 이 결정은 3항 "새로운 색상·스타일을 추가하지 않는다"와 2.1절 사이드바 색 규칙의 예외다.
   - 재현하지 않는 것: 일러스트·아바타 사진, 참조 브랜드명(로고는 workBridge), お知らせ 카드, 참조 하단 탭의 社員情報·各種設定(화면 없음, 休暇承認·メニュー로 대체).

## 6. 구현된 공용 컴포넌트 (frontend)

> 위 1~5절의 토큰·규칙을 코드로 옮긴 결과 기록이다. 새 화면은 아래를 먼저 재사용하고, 없는 것만 같은 위치·방식으로 추가한다. 토큰은 `frontend/src/app/globals.css`의 `@theme`(2절 값 그대로 + 2.1절 추가 토큰)만 쓴다. Tailwind 4라 `tailwind.config`는 없다.

| 파일 | export | 용도·변형 | 사용 토큰 | 접근성 |
|---|---|---|---|---|
| `components/form.tsx` | `inputClass` | Input Large(높이 48, 좌우 16, radius 4). 상태 default/focus/error | `input-border`, `primary-100`(focus 테두리+ring), `danger-100`(`aria-invalid` 시) | `aria-invalid`로 error 표시, `aria-describedby`로 FieldError 연결 |
| | `selectClass` | Dropdown(Select) Regular. `inputClass`와 같은 높이·테두리 + `cursor-pointer` | `inputClass`와 같음 | `inputClass`와 같음 |
| | `textareaClass` | 여러 줄 입력(사유 등). `inputClass`와 같은 테두리·focus 표시, 상하 padding 12, 세로 크기 조절 가능. 휴가 신청 사유·반려 사유에 사용 | `inputClass`와 같음 | `inputClass`와 같음 |
| | `labelClass` | 입력 위 라벨(14/20 Medium, 아래 간격 4) | `general-80` | `<label htmlFor>`와 함께 사용 |
| | `primaryButtonClass` | Button Primary(채움). 높이·폭은 호출측 지정, disabled는 `disabled:bg-primary-60` | `primary-100`, hover `primary-90` | focus-visible 2px outline `primary-100` |
| | `secondaryButtonClass` | Button White(아웃라인). 취소 등 Primary 옆 보조 동작 | 테두리 `general-50`, hover `general-30`, 글자 `general-100` | 같음 |
| | `textButtonClass` | 텍스트 버튼(14/20 Medium, hover 밑줄). 로그아웃 등 보조 링크성 동작 | `primary-100` | 같음 |
| | `FieldError`, `ErrorIcon` | 필드 아래 오류 문구(아이콘 + 14/20) | `danger-100`(아이콘), `general-100`(문구) | `id`를 입력의 `aria-describedby`에 지정. 아이콘은 `aria-hidden` |
| `components/Toast.tsx` | `ToastProvider`, `useToast().showToast(message, variant)` | Notification floating. 상단 중앙, 1건만(새 알림이 교체), 4초 후 자동 소멸, 화면 이동 후에도 유지(`app/layout.tsx`에 배치). variant `success`/`error` | success: `success-100` 테두리 + `success-40` 배경 / error: `danger-100` + `danger-30`, `shadow-card`, radius 4 | `role="status"` + `aria-live="polite"` 영역이 항상 존재 |
| `components/Modal.tsx` | `Modal({open,title,onClose,children,footer})` | 제목 + 닫기(X) + 본문 + 우측 정렬 footer. 폭 최대 420, padding 28, radius 6 | `shadow-card`, backdrop `general-100/50` | `<dialog>` `showModal()`로 포커스 트랩·Esc 닫기, `aria-labelledby`(제목 id는 `useId()`로 생성해 여러 모달이 동시에 있어도 중복되지 않음), X 버튼 `aria-label`(`messages.common.close`) |
| `components/Spinner.tsx` | `Spinner` | Loader. 20px, 색은 부모 글자색 | — | `aria-hidden`. 단독 로딩 표시일 때는 부모에 `role="status"` + `sr-only` 문구(`messages.common.loading`)를 둔다 |
| `components/Logo.tsx` | `Logo` | workBridge 마크 + 워드마크(20 Bold) | `primary-100` | 마크 `aria-hidden`, 이름은 텍스트 |
| `components/Card.tsx` | `Card({title,icon?,action?,children})` | Card Panel. 제목(18/28 Bold) + 우측 `action` + 본문(제목 아래 간격 12, `flex flex-1 flex-col`로 카드의 남은 높이를 받음). `icon`을 주면 제목 왼쪽에 24px 아이콘(간격 8). padding 좌우 20·상하 16(`sm` 이상 좌우 24·상하 20), radius 16, 헤더 최소 높이 28. 헤더는 `flex-wrap`(가로 간격 16, 세로 간격 8): 제목과 `action`이 한 줄에 들어가면 그대로, 넘치면 제목을 줄이지 않고 `action`이 다음 줄로 내려간다. 스타일 변경(2026-11, 이전 radius 6·`shadow-card`·제목 16/24·padding 28)은 Card를 쓰는 모든 화면에 적용 | 흰 배경 + 1px `general-40` 테두리 + `shadow-card-soft`, 아이콘 `primary-100` | `<section aria-labelledby>`(제목 id는 `useId()`). 아이콘 래퍼 `aria-hidden` |
| `components/Skeleton.tsx` | `Skeleton({className})`, `SkeletonLines({count})` | Loading 스켈레톤. 크기는 호출측 지정 / 영역 전체용 줄 묶음 | `general-40` + `animate-pulse` | `Skeleton`은 `aria-hidden`. `SkeletonLines`는 `role="status"` + `sr-only`(`messages.common.loading`) |
| `components/SectionError.tsx` | `SectionError({onRetry})` | 영역 단위 조회 실패 문구 + [다시 시도](03 공통 UI 규칙 Error) | `ErrorIcon`, `secondaryButtonClass`(높이 36) | 문구에 `role="alert"` |
| `components/Badge.tsx` | `Badge({variant,shape?,children})`, `BadgeVariant`, `BadgeShape`, `BADGE_VARIANT_CLASS` | 상태 배지. 높이 24, 14/20 Medium, 아이콘과 간격 4. variant `neutral`/`success`/`warning`/`danger`/`dark`/`info`/`positive`/`caution`. shape `rounded`(기본, radius 4·좌우 8) / `pill`(`rounded-full`·좌우 12) | neutral: `general-40` 배경+`general-80` / success: `success-40`+`general-100` / warning: `warning-40`+`general-100` / danger: `danger-30`+`general-100` / dark: `general-80`+흰색 / info: `primary-30`+`primary-100`(SCR-002 휴가 종류) / positive: `success-30`+`success-110`(SCR-002 勤務中·承認済み) / caution: `warning-30`+`warning-110`(SCR-002 承認待ち) | 상태는 색과 문구를 함께 표시 |
| `components/leave/LeaveStatusBadge.tsx` | `LeaveStatusBadge({status,soft?,children?})`, `LEAVE_STATUS_BADGE` | 휴가 상태 배지(`Badge shape="pill"`). 기본은 상태 아이콘(16px) + 문구, `LEAVE_STATUS_BADGE`(PENDING=`warning` / APPROVED=`success` / REJECTED=`danger` / CANCELLED=`neutral`). `soft`이면 아이콘 없이 PENDING=`caution`·APPROVED=`positive`(나머지는 기본과 같음, SCR-002 直近の申請履歴). `children`으로 문구 교체(출근부 「休暇 承認済み」) | `Badge`와 같음, 아이콘 `success-100`·`warning-100`·`danger-100`·`general-80` | 아이콘 `aria-hidden`, 문구는 `messages.leave.statuses` |
| `components/StatCard.tsx` | `StatCard({label,value,unit?,icon?,tone?,href?})`, `StatCardTone` | stats 카드. `icon` 없음(기본, SCR-004): 항목명(14/20) + 수치(Heading 6), radius 6, padding 20. `icon` 있음(SCR-002): 왼쪽 아이콘(24, `sm` 이상 40·2행) + 항목명(12/16 Bold, `sm` 이상 16/24) + 수치(24/32, `sm` 이상 `text-stat` 36·행높이 40), radius 16, 1px `general-40` 테두리, padding 12(`sm` 이상 상하 16·좌우 24), 배경은 `tone`(`primary` 기본 / `danger`)별 흰색→연한 색 대각 그라데이션. `unit`은 수치 오른쪽 작은 단위(16/24, `sm` 이상 20/28 Bold). `href`가 있으면 카드 전체가 링크(화살표 없음) | 기본: `shadow-card`, hover `primary-30`, `text-h6` / 아이콘: `shadow-card-soft`(hover `shadow-card`), 그라데이션 끝 `primary-30`·`danger-30`, 아이콘 `primary-100` / 공통 `tabular-nums` | 아이콘 `aria-hidden`. 링크일 때 focus-visible outline `primary-100` |
| `components/DonutChart.tsx` | `DonutChart({segments:{value,colorClass,label}[],centerLabel,centerValue,ariaLabel})`, `DonutSegment` | 정적 SVG 도넛(5절 4 예외, 라이브러리 없음). viewBox 100, 반지름 42, 선 굵기 17, 12시 방향부터 시계 방향. 값 0인 구간은 그리지 않고 합계 대비 비율로 원주를 나눈다. 크기 112(`sm` 이상 128). 가운데 `centerLabel`(12/16 Medium) + `centerValue`(`text-h5` Bold) | 트랙 `general-40`, 구간 색은 `colorClass`(`text-*`, stroke = currentColor). SCR-002: 出勤 `primary-100` / 未出勤 `general-50` / 休暇 `violet-100` | 래퍼 `role="img"`+`aria-label`(내역 포함 문장), SVG·가운데 글자 `aria-hidden` |
| `components/Pagination.tsx` | `Pagination({page,totalPages,totalCount,onChange})` | 이전/다음 + 번호(처음·끝·현재 ±1, 사이는 `…`) + 총 건수. 셀 36×36, radius 4. `totalPages`가 1 이하이면 총 건수만 표시 | 현재 `primary-30` 배경 + `primary-100` Bold, hover `general-30`, disabled `general-60` | `<nav aria-label>`(`messages.pagination.label`), 현재 페이지 `aria-current="page"`, 번호 버튼 `aria-label`, `…`는 `aria-hidden`, focus-visible outline `primary-100` |
| `components/Tabs.tsx` | `Tabs({label,items:{value,label}[],value,onChange})` | Tabs horizontal(3절). 탭 높이 44, 간격 24(스크롤 영역을 만들지 않으므로 탭 행에 스크롤바가 나타나지 않음). ←/→로 이동과 동시에 선택(끝에서 반대쪽으로 순환) | 활성 `primary-100` 글자 + 하단 2px `primary-100`, 비활성 `general-80`(hover `general-100`), 구분선 `general-40` | `role="tablist"`+`aria-label`, 각 탭 `role="tab"`·`aria-selected`, 선택 탭만 `tabIndex=0`(roving), focus-visible outline `primary-100`(`-outline-offset`으로 잘림 방지) |
| `components/Tooltip.tsx` | `Tooltip({content,children})` | Tooltip. 트리거 위쪽에 표시, 최대 폭 240, 12px | `general-100` 배경 + 흰 글자, `shadow-card`, radius 4 | 트리거 `tabIndex=0`, hover와 키보드 focus 모두 표시, Esc로 닫힘, `role="tooltip"` + 표시 중 `aria-describedby` |
| `components/table.ts` | `thClass`, `tdClass`, `compactTdClass`, `compactTdBaseClass` | Table. 헤더 행 44(하단 2px), 데이터 행 52(하단 1px), 셀 좌우 8. `compactTdClass`는 행 36(출근부). `compactTdBaseClass`는 글자색 없는 compact 셀로, 글자색을 호출측이 정할 때 사용(색 클래스를 겹치면 CSS 생성 순서상 `general-100`이 이기므로) | `general-40`(선), 헤더 `general-80` Medium, 본문 `general-100` | `<th scope="col">`와 함께 사용 |
| `components/attendance/attendanceStatus.ts` | `ATTENDANCE_STATUS_BADGE`, `MISSING_ROW_CLASS` | 근태 상태 → Badge variant(WORKING=`success` / DONE=`neutral` / MISSING_CLOCK_OUT=`danger`). 퇴근 누락 행 강조 클래스(SCR-003·008) | 행 강조 `bg-danger-30/40`(배지와 구분되도록 농도를 낮춤) | 문구는 `messages.attendance.statuses` |
| `components/attendance/workPattern.ts` | `WORK_PATTERN_BADGE` | 출근부 勤務パターン(`WorkPatternKind`) → Badge variant(NORMAL=`neutral` / DAY_OFF·HOLIDAY=`danger` / LEAVE=`success`). `Badge shape="pill"`과 함께 사용 | `Badge`와 같음 | 문구는 `messages.attendance.sheet`(通常·休日·祝日) / `messages.leave.types`(휴가) |
| `components/attendance/WorkTimeline.tsx` | `WorkTimeline({segments,markerMinute?,label})`, `WorkTimelineAxis()` | 1일 24시간 막대(SCR-003 時間帯 열). 0~1440분 축, 2시간 간격 세로 눈금선, 막대 높이 12, 위치·폭은 `%` 계산. `segments`는 `{startMinute,endMinute,kind:'work'|'break'}[]`이며 1440 초과 부분은 잘라냄. `markerMinute`가 있으면 그 위치에 원형 점(크기 12, 근무 중·퇴근 누락의 출근 위치). `WorkTimelineAxis`는 표 헤더용 눈금 라벨(0, 2, …, 24) | work `primary-100`, break `general-50`, 눈금 `general-40`, 점 `primary-100`, 축 라벨 12px `general-80` | 막대 컨테이너 `role="img"`+`aria-label`(예 `09:00〜18:30 勤務、13:15〜14:15 休憩`), 눈금선·축 라벨 `aria-hidden` |
| `components/attendance/DateRangeFields.tsx` | `DateRangeFields({idPrefix,startDate,endDate,onChange,error})` | 조회 기간 입력(시작일·종료일 `type="date"`, `sm` 이상 2열). 오류는 FieldError 1개로 통합 | form 클래스 재사용 | 두 입력 모두 `aria-invalid`·`aria-describedby`로 같은 FieldError에 연결 |
| `components/attendance/StatusFilterButtons.tsx` | `StatusFilterButtons({idPrefix,selected,onChange})` | 근태 상태 토글 버튼 복수 선택(SCR-003 md 미만). 누를 때마다 선택·해제하고 즉시 반영된다(반영은 호출측). 선택 없음은 "전체", 표시 순서(`ATTENDANCE_STATUSES`)로 유지. 그룹 라벨 `状態` + 안내 문구(`messages.attendance.statusHint`). 높이 40(`h-10`), radius 4, 좌우 padding 16, 14/20 | 배경은 상태 배지와 같은 `BADGE_VARIANT_CLASS[ATTENDANCE_STATUS_BADGE[status]]`. 선택 중은 `general-100` 테두리 + Bold + ✓, 미선택은 투명 테두리 + Medium(hover `general-50`) | `role="group"`+`aria-labelledby`(그룹 라벨)·`aria-describedby`(안내 문구), 각 버튼 `aria-pressed`, 체크 표시 ✓는 `aria-hidden`, focus-visible outline `primary-100` |
| `components/layout/AppShell.tsx` | `AppShell({children})` | 로그인 후 화면 공통 레이아웃 + 라우트 가드(비로그인 → `/login?redirect=`, mustChangePassword → `/password`, 비관리자의 `/admin`·`/admin/*` → 이동 전까지 children 미렌더, 토스트 `messages.common.forbidden` 1회 + `/dashboard`로 replace). TopBar 68 + Sidebar 250(`lg` 이상 고정), `lg` 미만은 하단 탭(`MobileTabBar`, 높이 64) + 드로어(탭의 「メニュー」로 열고, 배경 클릭·Esc·메뉴 선택 시 닫힘. 드로어는 탭 위까지만 덮음). 본문 하단 여백 112(`lg` 이상 40)로 탭과 겹치지 않음 | 본문 배경은 자체 지정 없이 `body` 그라데이션(`page-from`→`page-to`, 2.1절), 드로어 backdrop `general-100/50` | 드로어 열면 첫 메뉴로 포커스. 인증 확인 중에는 `role="status"` Spinner |
| `components/layout/Sidebar.tsx` | `SidebarNav({isAdmin,onNavigate?,pendingApprovalCount?})` | 03 전역 내비게이션 메뉴. 항목 높이 44, 좌우 margin 16, radius 8, 항목마다 왼쪽 아이콘 20(`navIcons`, 간격 12). ADMIN은 그룹 라벨 아래 관리자 메뉴 추가. "휴가 승인" 항목 우측에 승인 대기 카운터 배지(높이 16, 최소 폭 16, `rounded-full`, 12px). 0건·null이면 숨김, 100건 이상은 `99+` | 활성 `primary-30` 배경+`primary-100` 글자, hover `general-30`, 그룹 라벨 12px `general-80`, 카운터 `danger-100` 배경+흰 글자 | `<nav aria-label>`, 활성 항목 `aria-current="page"`, 카운터는 `aria-hidden`이고 건수는 `sr-only` 문구(`messages.nav.pendingCount(n)`)로 제공 |
| `components/layout/PendingApprovalCount.tsx` | `PendingApprovalCountProvider({children})`, `usePendingApprovalCount()` → `{count,refresh}` | 사이드바 승인 대기 건수(03 전역 내비게이션). AppShell이 가드 통과 후 1회 감싸고 고정 사이드바·드로어가 공유. 셸 표시 시·pathname 변경 시·`refresh()` 호출 시 재조회, 늦은 응답은 무시, 실패 시 `count=null`(토스트 없음). Provider 밖에서는 `{count:null, refresh:noop}` | — | — |
| `components/layout/TopBar.tsx` | `TopBar({userName,pendingApprovalCount,onLogout})` | Top Navigation. 높이 68, 로고(대시보드 링크), 알림 벨(알림 기능은 없으므로 `/leaves/approvals` 링크. 승인 대기 건수 > 0일 때만 빨간 점), 세로 구분선, 아바타 사용자 메뉴(원형 사용자 아이콘 + 이름(`sm` 이상) + chevron. 비밀번호 변경·로그아웃). 햄버거 버튼 없음(`lg` 미만은 `MobileTabBar`) | 흰 배경 + `shadow-card`, 빨간 점 `danger-100`, 아바타 `primary-30` 배경 + `primary-100` | 벨 `aria-label`(건수 있음: `messages.nav.pendingCount(n)` / 없음: `messages.nav.approvalsLink`), 사용자 메뉴 버튼 `aria-expanded`/`aria-controls`·`aria-label`(이름 포함), 바깥 클릭·Esc로 닫힘 |
| `components/layout/MobileTabBar.tsx` | `MobileTabBar({drawerOpen,drawerId,onToggleDrawer,pendingApprovalCount})` | `lg` 미만 하단 고정 탭. ホーム(`/dashboard`)·出勤簿(`/attendance`)·休暇管理(`/leaves`)·休暇承認(`/leaves/approvals`) 링크 + 「メニュー」 버튼(드로어 토글). 관리자 메뉴는 드로어에만 있음. 탭 높이 48, 아이콘 24 + 12px 라벨. 休暇承認 탭은 승인 대기 건수 > 0이면 빨간 점 | 흰 배경 + 상단 1px `general-40`, 활성·드로어 열림 `primary-30` 배경 + `primary-100`, 비활성 `general-80`, 점 `danger-100` | `<nav aria-label>`(`messages.nav.tabLabel`), 활성 탭 `aria-current="page"`, 「メニュー」 `aria-expanded`/`aria-controls`·`aria-label`(열기/닫기), 아이콘 `aria-hidden`, 점은 `aria-hidden` + `sr-only` 건수 문구 |
| `components/layout/navIcons.tsx` | `HomeIcon`, `CalendarCheckIcon`, `UmbrellaIcon`, `ClipboardCheckIcon`, `UsersIcon`, `BuildingIcon`, `ClockIcon`, `BellIcon`, `UserIcon`, `MenuIcon` | 셸(사이드바·상단바·하단 탭) 전용 선화 아이콘. 24 viewBox, 선 1.75, 크기는 부모 지정(`size-full`) | `currentColor` | `aria-hidden` |
| `components/leave/LeaveDetailModal.tsx` | `LeaveDetailModal({leaveId,initialStep?,onClose,onProcessed})` | 공통 휴가 상세 모달(SCR-004 §4.4). `leaveId`가 null이면 닫힘. 처리 가능하면 승인 확인·반려 사유 입력을 모달 안 단계 전환으로 처리(중첩 dialog 없음). `initialStep`(`detail` 기본 / `approve` / `reject`)은 상세 조회 후 처음 보일 단계이며, 처리 불가 상태이면 상세 단계로 표시. 확인·사유 단계의 [취소]는 `initialStep`이 `detail`이면 상세로 돌아가고 그 외에는 모달을 닫음. 409 `ALREADY_PROCESSED`는 서버 message 대신 `messages.leave.alreadyProcessed` 표시. 본인 신청이 PENDING이거나 자동 승인(`status = APPROVED`, `autoApproved = true`)이고 시작일 > 오늘(도쿄)이면 [取消]를 표시하고, 모달 안 취소 확인 단계([戻る] [取り消す])로 전환한다. 취소 단계는 `initialStep`으로 지정할 수 없다 | `Modal`·`Badge`·form 클래스 재사용 | `Modal`과 같음 |
| `components/leave/ApproverSelect.tsx` | `ApproverSelect({id,value,onChange,error,candidates,status,onRetry})` | 승인자 Searchable Select(SCR-004, 3절 Autocomplete 상당). `candidates`를 화면 안에서 이름·사원번호 부분 일치로 필터. ↑↓로 이동, Enter 선택, Esc·바깥 포커스로 닫힘. `status`가 `loading`이면 Skeleton, `error`이면 조회 실패 문구 + [再試行](`onRetry`), 후보 0건이면 안내 문구. `error`는 모든 상태에서 FieldError(id `${id}-error`)로 표시 | 입력 `inputClass`, 목록 흰 배경 + `shadow-card`, 선택 항목 `primary-30`, 활성 항목 `general-30` | 입력 `role="combobox"`·`aria-expanded`·`aria-controls`·`aria-autocomplete="list"`·`aria-activedescendant`, 목록 `role="listbox"`, 항목 `role="option"`·`aria-selected`, `aria-invalid`·`aria-describedby`로 FieldError 연결 |
| `components/leave/LeaveApplyModal.tsx` | `LeaveApplyModal({open,onClose,onApplied,onBalanceStale?})` | 공통 휴가 신청 모달(SCR-004 §3.2, SCR-004에서 사용. SCR-002의 신청 진입은 2026-11 삭제). `Modal` 사용. 열 때마다 초기화하려면 사용처에서 `key`를 바꾼다. 승인자 후보는 open 시에만 조회. 휴가 종류 Radio(5종, 초기 미선택), footer [キャンセル](텍스트) [申請する](채움, 요청 중 Spinner). 성공 시 `onApplied(leave)`, 422 잔여 부족 시 `onBalanceStale` | Radio 20px(`size-5`), `accent-primary-100`. 그 외 `Modal`·form 클래스·`ApproverSelect` 재사용 | 종류는 `<fieldset>`+`<legend>`, 오류 `aria-invalid`·`aria-describedby`는 fieldset에 연결, Radio focus-visible outline `primary-100` |
| `components/leave/LeaveFilterButtons.tsx` | `LeaveFilterButtons({idPrefix,label,options,optionLabel,variantOf,selected,onChange,describedBy?})` | SCR-004 이력 필터의 토글 버튼 복수 선택(상태·휴가 종류에 사용하는 제네릭 컴포넌트). 누를 때마다 선택·해제하고 즉시 반영된다(반영은 호출측). 선택 없음은 "전체", 표시 순서(`options`)로 유지. 높이 40(`h-10`), radius 4, 좌우 padding 16, 14/20 | 배경은 `BADGE_VARIANT_CLASS[variantOf(v)]`(상태 = `LEAVE_STATUS_BADGE`, 종류 = 항상 `neutral`). 선택 중은 `general-100` 테두리 + Bold + ✓, 미선택은 투명 테두리 + Medium(hover `general-50`) | `role="group"`+그룹 라벨(`aria-labelledby`, `labelId`)+안내 문구(`aria-describedby` = `describedBy`), 각 버튼 `aria-pressed`, 체크 표시 ✓는 `aria-hidden`, focus-visible outline `primary-100` |

- 데이터 조회 훅: `lib/api/useApiQuery.ts` `useApiQuery<T>(path | null, {onError?})` → `{status:'loading'|'error'|'success', data, error, reload, setData}`. `path`가 null이면 호출하지 않는다. 403 `PASSWORD_CHANGE_REQUIRED`이면 `/password`로 이동한다. 영역별로 독립 조회할 때 사용한다.
- 휴가 관리 유틸: `lib/leave-days.ts` `countLeaveDays(leaveType,startDate,endDate)`(주말 제외 일수 미리보기, 반차 0.5, 미입력·역순·실재하지 않는 날짜는 null), `parseLeavesQuery(params,currentYear)` → `{year,statuses,leaveTypes,page}`(SCR-004 URL Query 해석. `status`·`leaveType`은 쉼표 구분이며 미지 값·중복은 버림, 잘못된 값은 기본값), `yearOptions(currentYear)`(올해+1 ~ 올해−4, 내림차순), `LEAVE_STATUSES`(상태 표시 순서), `LEAVE_TYPES`(휴가 종류 표시 순서), `isHalfDay(leaveType)`.
- 달력 유틸: `lib/calendar.ts` `shiftMonth(month,delta)`(`YYYY-MM` 월 이동, 연도 넘김 포함), `formatMonthLabel(month)`(`2026年11月`, 문구는 `messages.calendar`). 문자열 연산과 UTC만 사용해 로컬 타임존에 의존하지 않는다. 요일 문구는 `messages.calendar.weekdays`. 현재 사용처는 출근부(SCR-003). `buildMonthWeeks`와 `components/calendar/MonthCalendar.tsx`는 SCR-002 휴가 캘린더 삭제(2026-11)로 제거했다.
- 대시보드 유틸(SCR-002): `lib/greeting.ts` `greetingOf(now)`(도쿄 시각 5~10시 おはようございます / 11~17시 こんにちは / 그 외 こんばんは), `lib/work-progress.ts` `EXPECTED_WORK_MINUTES`(540 = 実労働 8시간 + 휴게 60분, 진행률 계산 전용 目安), `workProgressPercent(clockIn,until)`(0~100 클램프, 정수 내림, clockIn null이면 0), `lib/attendance-rate.ts` `shareOf(count,denominator)`(소수 1자리 %, 분모 0이면 null), `formatPercent(value)`(`83.3%`, null은 `messages.common.noValue`), `lib/format.ts` `formatHours(minutes)`(`96時間` / `96時間30分`). 退勤予定 目安 함수 `expectedClockOut`은 SCR-002 退勤時刻 실제값 표시 변경(2026-11)으로 삭제했다.
- 대시보드 전용(공용 아님, `app/(app)/dashboard/`): `icons.tsx`(인라인 SVG 아이콘, 24 viewBox·`currentColor`·선 1.75·`aria-hidden`), `CardLink.tsx` `CardLink({href,children})`(카드 헤더 오른쪽 「すべて見る ›」 링크, `textButtonClass` + 16px chevron), `MetricValue.tsx` `MetricValue({value})`(「96時間」「12日」을 숫자(부모 크기) + 단위(16/24, `sm` 이상 20/28 Bold)로 나눠 표시, 숫자로 시작하지 않으면 그대로). 直近の申請履歴 목록 위 구분선은 별도 Divider 컴포넌트 없이 목록 행 구분선과 같은 `general-40`(1px `border-t`)을 쓴다.
- 출근부 유틸: `lib/attendance-sheet.ts` `parseSheetMonth(value,currentMonth)`(SCR-003 `?month=` 해석, 없음·형식 오류·범위 밖은 이번 달), `formatSheetDate(ymd)`(`2日（月）`, 전각 괄호), `weekdayIndex(ymd)`(0 = 일), `workPatternOf(day)` → `WorkPattern`(판별 유니온 `{kind:'LEAVE',leaveType}` | `{kind:'NORMAL'|'DAY_OFF'|'HOLIDAY'}`, 우선순위 승인 종일 휴가 > 공휴일 > 토·일 > 평일), `approvedFullDayLeave(day)`, `SheetRequestKind`(申請 표시 분류, 현재 `'LEAVE'`만), `toTimelineSegments(day)`(API-ATT-007 일별 행 → `WorkTimeline`의 `segments`·`markerMinute`, 도쿄 기준 work_date 0시부터의 분). 문자열 연산과 UTC만 사용한다.
- 가로 넘침 훅: `lib/useHorizontalOverflow.ts` `useHorizontalOverflow<T>()` → `[ref, overflowing]`(`scrollWidth > clientWidth`, ResizeObserver로 요소와 첫 자식의 크기 변화 추적). 스크롤 가능한 영역만 `tabIndex=0`으로 Tab 순서에 넣을 때 사용(SCR-003 時間帯 영역).
- 미디어 쿼리 훅: `lib/useMediaQuery.ts` `useMediaQuery(query)` → `boolean | null`(`useSyncExternalStore` + `matchMedia`, `change` 이벤트로 갱신). 서버 렌더·hydration 중에는 `null`(미판정)이므로 사용처는 판정 전 로딩 표시를 두고 판정 후 한쪽 화면만 마운트한다. 쿼리 값은 Tailwind 브레이크포인트와 맞춘다(예 SCR-003 `(min-width: 768px)` = `md`).
- 대비 결정: 2.1절의 "성공 = 텍스트 Green 100 + 배경 Green 40"은 대비 약 2.7:1로 WCAG AA 미달이므로, Badge success·danger의 글자색은 General 100으로 한다. 사이드바 그룹 라벨도 3절의 General 60 대신 General 80을 쓴다.

- 타이포 토큰: `text-h4`(Heading 4 32/44, `@theme`의 `--text-h4`)를 로그인·비밀번호 변경 제목에 사용. `text-h5`(Heading 5 24/34, 페이지 제목)·`text-h6`(Heading 6 20/28, 통계 수치)를 같은 방식으로 추가했다. 다른 Heading이 필요해지면 같은 방식으로 추가한다. 2.2절 외 추가 토큰(SCR-002 재현, 5절 6): `text-greeting`(28/36, 대시보드 인사 제목 `sm` 이상) / `text-stat`(36/44, 아이콘 StatCard 수치·출근 시각·잔여 일수 등 큰 수치).
- Auth Layout 카드(SCR-001·009): 폭 최대 540, padding 28(`sm` 이상 40), radius 6, `general-40` 테두리 + `shadow-card`.
