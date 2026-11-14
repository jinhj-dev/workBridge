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

추가 토큰 (SCR-004 휴가 관리 참조 이미지 재현용, 2026-11. 5절 7):

| 토큰 | 값 | 용도 |
|---|---|---|
| `leave-paid-bg` / `leave-paid-fg` | `#E7E3FC` / `#3A28B5` | 휴가 분류 PAID·OTHER의 캘린더 막대·`LeaveCategoryBadge` 배경 / 글자 |
| `leave-special-bg` / `leave-special-fg` | `#E2F5E7` / `#1D7A3C` | 휴가 분류 SPECIAL의 막대·배지 배경 / 글자 |
| `calendar-sunday` | `#F0142F`(`danger-100`과 같은 값) | 캘린더 일요일·공휴일 날짜·요일 글자 |
| `calendar-saturday` | `#2F5BEA` | 캘린더 토요일 날짜·요일 글자 |

추가 토큰 (SCR-010 所属社員確認 役職 배지 재현용, 2026-11. 5절 8):

| 토큰 | 값 | 용도 |
|---|---|---|
| `violet-30` / `violet-110` | `#F1EBFD` / `#6D28D9` | 役職 배지 배경 / 글자(Badge `violet`, tone VIOLET). 글자 대비 흰 배경 7.10:1, 자기 배경 6.10:1 |
| `pink-30` / `pink-110` | `#FBE8FA` / `#A21CAF` | 役職 배지 배경 / 글자(Badge `pink`, tone PINK). 글자 대비 흰 배경 6.32:1, 자기 배경 5.43:1 |

추가 토큰 (SCR-006 社員管理 役職 8색 재현용, 2026-11. 5절 12):

| 토큰 | 값 | 용도 |
|---|---|---|
| `lavender-30` / `lavender-110` | `#E9EAFD` / `#3F45B8` | 役職 배지 배경 / 글자(Badge `lavender`, tone LAVENDER). 자기 배경 대비 6.41:1, 글자 대 흰 배경 7.62:1(실측) |
| `lavender-100` | `#8F8AEA` | 役職確認 색 스와치(LAVENDER) |
| `yellow-30` / `yellow-110` | `#FFF6CC` / `#854D0E` | 役職 배지 배경 / 글자(Badge `yellow`, tone YELLOW). 자기 배경 대비 6.30:1, 글자 대 흰 배경 6.85:1(실측) |
| `yellow-100` | `#E0A800` | 役職確認 색 스와치(YELLOW) |
| `pink-100` | `#EC4899` | 役職確認 색 스와치(PINK) |

- 다른 tone의 스와치는 기존 토큰을 쓴다(VIOLET `violet-100`, BLUE `primary-100`, GRAY `general-60`, GREEN `success-100`, ORANGE `warning-100`). 밝은 스와치(黄·薄紫)는 `ring-general-100/15` 안쪽 테두리로 경계를 확보한다.

추가 토큰 (공통 안내 메시지 Notice, 2026-11. 5절 9):

| 토큰 | 값 | 용도 |
|---|---|---|
| `notice-{info,success,warning,error}-bg` | `primary-30` / `success-30` / `warning-30` / `danger-30` 참조 | Notice Background. 기존 토큰 재사용(값 변경 없음). 테두리 없이 배경색만으로 영역을 구분한다(흰 배경 대비 1.12 / 1.11 / 1.11 / 1.18:1, 장식. 의미 전달은 아이콘·문구) |
| `notice-{info,success,warning,error}-icon` | `primary-100` / `success-110` / `warning-110` / `danger-100` 참조 | Notice Icon. 배경 대비 4.56 / 4.87 / 4.52 / 3.67 (비텍스트 3:1 충족) |
| `notice-text` | `general-100` 참조 | Notice Text. 4개 배경 위 대비 16.14 / 16.31 / 16.31 / 15.35 (AA 4.5:1 충족, 도구로 계산) |
| `radius-notice` | `0.75rem`(12) | Notice Radius(`rounded-notice`) |
| `spacing-notice-x` / `spacing-notice-y` / `spacing-notice-gap` | `1.25rem` / `0.75rem` / `0.75rem` | Notice Padding 좌우·상하(`px-notice-x`·`py-notice-y`) / 아이콘-본문 간격(`gap-notice-gap`) |

- Primary(`primary-*`) 값은 바꾸지 않았다. 참조 이미지의 인디고 계열 강조색은 쓰지 않고, 이미지에서 강조색이 쓰인 자리(버튼·활성 탭·링크·선택일·하단 탭 활성·아이콘)는 기존 `primary-*`로 대응한다(사용자 결정).

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
| 컨트롤 radius | 4 (버튼·입력·배지·체크박스). **구현(2026-11, SCR-004 참조 이미지 재현, 5절 7)**: 버튼·입력·셀렉트·검색 입력은 radius 8(`form.tsx` 클래스, 전 화면 적용). 배지 pill·카드 16은 그대로. 예외(2026-11 버튼 표준화, B9): `Pagination` 셀·`StatusFilterButtons`는 radius 4(공통 Button 대상 외 컴포넌트), 텍스트 버튼(`text` variant)의 포커스 링 radius 4 |
| 버튼 높이 | Large 48 / Medium 40 / Small 36. 구현은 `Button` `size` lg/md/sm(UI_BUTTON_PATTERNS §3). 44는 쓰지 않는다(2026-11 버튼 표준화) |
| 버튼 크기 토큰 | (2026-11, B6) `--spacing-btn-sm`/`-md`/`-lg` = 2.25rem / 2.5rem / 3rem(높이·아이콘 전용 박스, `h-btn-*`·`size-btn-*`), `--spacing-btn-x-sm`/`-md`/`-lg` = 0.75rem / 1rem / 1.5rem(좌우 padding, `px-btn-x-*`), `--spacing-btn-gap-sm` / `--spacing-btn-gap` = 0.25rem / 0.5rem(아이콘↔글자, sm / md·lg), `--radius-btn` = 0.5rem(`rounded-btn`). `globals.css` `@theme`에 정의하고 `buttonClass()` 안에서만 참조(화면 코드 직접 사용 금지) |
| 입력 높이 | Large 48 / Medium 40, 라벨 14px이 위에 있고 간격 4, 좌우 padding 16 |
| 표 | 헤더 44 (하단 2px `#E6E9F4`), 행 52 (하단 1px), 셀 좌우 8. compact 행 36 (출근부 SCR-003처럼 행이 많은 표). SCR-002 대시보드 카드 안의 표는 예외로 헤더 행을 `general-30` 띠(양끝 radius 8, 하단선 없음, 글자 `general-80` Medium)로 표시: 承認待ち = 헤더 36·14px, 행 44·셀 좌우 12·행 구분선 없음(hover `general-30`) / 各部署 = 헤더 32·12px, 행 36·하단 1px `general-40`·셀 좌우 8(`sm` 미만 6), 숫자 열 오른쪽 정렬, 헤더·숫자 셀 줄바꿈 없음(「出勤（率）」 1줄, 넘치면 표 안 가로 스크롤). 두 표는 `table.ts`가 아니라 각 섹션 파일 안의 클래스로 정의. SCR-004 휴가 관리(3탭)의 표는 띠 헤더(`general-30`, 양끝 radius 8, 헤더 44) + 행 56(하단 1px `general-40`) + 셀 좌우 12(`table.ts` `bandThClass`·`bandTdClass`) |
| 진행 막대 | 높이 8, `rounded-full`, 트랙 `general-40`, 채움 `primary-80`→`violet-80` 가로 그라데이션. 오른쪽에 수치(14/20 Medium, `tabular-nums`). `role="progressbar"`(SCR-002 今日の勤務進捗, 공용 컴포넌트 아님) |
| 사이드바 메뉴 | 항목 높이 44, 간격 0, 좌우 margin 16, 아이콘 24, 텍스트 시작 56. **구현(2026-11)**: 항목 radius 8, 좌우 padding 16, 아이콘 20 + 간격 12. 하위 메뉴(`SidebarSubmenu`) 항목은 높이 40, 왼쪽 padding 48 |
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
  - **구현(2026-11, SCR-002 참조 디자인 기준 셸, 5절 6)**: Top = 로고 + 알림 벨(승인 대기 화면 링크, 건수 > 0이면 빨간 점) + 구분선 + 아바타 사용자 메뉴(이름은 `sm` 이상). 검색·채팅 없음. Side = 메뉴 아이콘(`layout/navIcons.tsx`) + 활성 `primary-30` 채움, 카운터 `danger-100`. 배너 카드 없음. `lg` 미만은 하단 탭(`MobileTabBar`, 4탭: ホーム·出勤簿·休暇管理·メニュー. 2026-11 SCR-005의 SCR-004 통합으로 休暇承認 탭 삭제, 승인 대기 빨간 점은 休暇管理로 이동)이 사이드바를 대신하고 「メニュー」가 드로어(사이드바 메뉴 전체)를 연다. 상단바의 햄버거 버튼은 없다. 상세는 6절
- **Auth Layout**: `#F5F6FA` 배경 위 가운데 정렬 카드 (폭 약 540 = 1440의 37.5%)
- **Page Header**: 좌측 Heading 5, 우측 액션 버튼 그룹. SCR-004 휴가 관리는 `PageHeader`(아이콘 + `text-page-title`, 6절)를 쓴다
- **Card Panel**: 흰 카드 + 제목 + 본문

### 컴포넌트 (Figma 이름 → 용도)
| 컴포넌트 | 변형 |
|---|---|
| Button | Primary / White(아웃라인) / Light(Primary 40) / Danger(Red), 크기 3종, 아이콘 포함, Icon-only. **구현(2026-11 버튼 표준화, 5절 11)**: 공통 `Button`·`buttonClass()`(6절)의 variant 7종 — `primary` / `secondary`(White, 모달 D8의 아웃라인) / `primaryOutline` / `danger`(채움, 모달의 위험 동작 확정) / `dangerOutline`(목록의 위험 동작 입구) / `ghost`(무테 아이콘) / `text`. Light는 미구현. size sm 36·md 40·lg 48, 아이콘 전용 36/40. 규칙은 `docs/UI_BUTTON_PATTERNS.md`. disabled 상태는 WCAG 1.4.3 대비 기준의 예외로 본다(비활성 컴포넌트) |
| Input | Regular, Search, Password 등. Large·Medium. 상태: default/focus/error/disabled |
| Dropdown(Select) | Regular, Medium |
| Checkbox / Radio / Toggle / Slider | 20px 체크박스 |
| Tabs | horizontal(활성 Primary 텍스트 + 하단 라인), vertical |
| Pagination | 이전/다음 + 번호 + `...` + 총 건수 |
| Table | header / text row / checkbox row / image row |
| Badge (light/solid) | Green, Yellow, Gray, Dark gray, Blue, Red |
| Counter | 16px 원형 |
| Modal | 제목 아이콘(필수) + 제목 + 닫기(X) + 본문 + 우측 정렬 [취소(아웃라인)] [확인(채움, 위험 동작은 빨간 채움)]. 구현 외형·유형 규칙은 5절 10, 6절 `Modal` |
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
| SCR-006 사원 관리 | customers `0:4061`, add customer `0:4192`, 별도 레퍼런스 화상(2026-11) | ○ | 2026-11 레퍼런스 화상 재현(5절 12): 요약 StatCard 3개 + 키워드 검색·select 3개 + 표(xl 이상)/카드 + boxed 페이지네이션, 등록·상세·편집·삭제·役職確認은 모달 |
| SCR-007 사원 상세 | settings, customer info `0:5736` | ✕ | 페이지 미구현. SCR-006 社員詳細·社員編集 모달로 대체(2026-11) |
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
   - 재현하지 않는 것: 일러스트·아바타 사진, 참조 브랜드명(로고는 workBridge), お知らせ 카드, 참조 하단 탭의 社員情報·各種設定(화면 없음. 2026-11 이후 하단 탭은 ホーム·出勤簿·休暇管理·メニュー 4개).
7. **SCR-004 휴가 관리 참조 이미지 재현(2026-11)**: 휴가 관리(自分の休暇·休暇カレンダー·承認 탭)는 별도 참조 이미지(PC 캘린더·모바일 캘린더·PC 신청 이력)를 최우선 기준으로 한다. 레이아웃·radius·카드·표·캘린더·배지·탭·하단 탭 스타일은 이미지를 따르고, 3항 "새로운 색상·스타일을 추가하지 않는다"의 예외로 2.1절 휴가 분류·요일 색 토큰과 6절 타이포 토큰(`text-page-title` 등)을 추가했다.
   - **Primary는 기존 값 유지(사용자 결정)**: 이미지의 인디고 계열 색은 쓰지 않는다.
   - 컨트롤 radius 8(2.3절)은 `form.tsx` 공용 클래스라 전 화면에 적용된다.
   - 社員情報·各種設定 메뉴·하단 탭은 추가하지 않는다(화면 없음). 이미지의 브랜드명·로고·가상 데이터는 가져오지 않는다.
8. **SCR-010 所属社員確認 役職 배지 색 재현(2026-11, 사용자 지시)**: 레퍼런스의 役職 배지 색(보라·분홍)을 재현하기 위해 3항 "새로운 색상·스타일을 추가하지 않는다"의 예외로 2.1절 색 토큰 4개(`violet-30`·`violet-110`·`pink-30`·`pink-110`)와 6절 `Badge` variant 2개(`violet`·`pink`)를 추가했다. 회색·파랑은 기존 `neutral`·`info`를 쓴다. 색은 직책명이 아니라 DB의 tone(05 §2-1)으로 정한다. 기존 토큰·variant·Primary 값은 바꾸지 않았다.
9. **안내 메시지는 공통 `Notice`만 쓴다(2026-11, 사용자 지시)**: 페이지·모달·카드 안의 안내·주의·성공·오류 문구(정보 안내, 주의, 폼 전체 오류, 영역 조회 실패 등)는 개별 CSS로 만들지 않고 **반드시 `components/Notice.tsx`를 사용한다.** 새 안내 메시지를 만들 때도 같다.
   - variant 선택: 일반 정보·보충 설명 = `info` / 처리 완료·정상 상태 = `success` / 진행 전 확인·영향 고지·선택지 없음 = `warning` / 실패·거절·입력 불가 = `error`. 문구와 표시 조건은 화면(호출부)이 정하고 `Notice`는 표시만 한다.
   - **Notice로 통합하지 않는 별도 패턴**: `Toast`(일시 알림, `role="status"`·자동 소멸), Confirm Dialog(`Modal`), 입력 필드별 검증 메시지(`FieldError`)와 필드 보조 설명(`codeHint` 등 입력 아래 12px 문구·Tooltip), 빈 상태(표·목록의 「〇〇はありません」)와 로딩 `Skeleton`. 이들은 위치·수명·접근성 연결 방식이 달라 각자의 컴포넌트를 유지한다.
   - 기존 토큰 값·Primary는 바꾸지 않았다(2.1절 `notice-*`는 신규 토큰이며 배경·아이콘·글자는 기존 토큰 참조).
10. **모달 공통 패턴(2026-11-13, 사용자 결정 D1~D15)**: 모든 모달은 `docs/UI_MODAL_PATTERNS.md`를 따른다. 요약:
   - 유형: A Form(`FormModal`, lg) / A 단계형 폼(`Modal` 직접, M08) / B Detail·C List(컴포넌트가 아니라 패턴 이름, `Modal` + `DetailTable`·목록 조합) / D Confirm(`ConfirmDialog`, md) / D 단계형 확인·D' 입력 동반 확인(부모 모달 안 단계 전환, 중첩 dialog 금지). E 복합형은 정하지 않음.
   - 외형 ①'(1계열, `variant` 없음): radius 16·`shadow-card-soft`, lg·xl과 md(확인·단순 목록)로 여백·제목 크기만 다르다(6절 `Modal`). 모든 모달에 제목 아이콘(대상 도메인, 독립 확인은 동작 아이콘, 박스는 위험 동작도 `primary-30`). 바텀시트·전체화면 모달은 도입하지 않는다.
   - 폼: `FormTable` 배치 + 플레이스홀더 + 제목 아래 설명문(`description` 필수). 수정 불가 값은 폼 위 `ReadOnlySummary`, 보조 설명 `FieldHint`, 글자 수 `CharCount`, 안내 `Notice`, 필드 오류 `FieldError`.
   - 버튼: footer는 공통 `Button`만 쓴다(size 기본 md, 높이 40. 2026-11 버튼 표준화로 모달 버튼 클래스 `modal*ButtonClass`는 삭제, 11항). 취소 = `secondary`(아웃라인), 위험 동작(삭제·취소 확정 등) 확정 = `danger`(빨간 채움). 크기·색 화면별 재정의 금지.
   - 동작: 제출 중 `busy`(Esc·X·취소 차단), 초기 포커스 `data-autofocus`(A 첫 입력 / D 위험 [キャンセル] / D 기타 주 버튼).
   - 금지: `Modal`을 거치지 않는 모달성 오버레이(드로어·팝오버·콤보박스 목록·Tooltip·Toast는 대상 외), 아이콘 없는 모달, 모달 안 `FormRow`·라벨 위 스택 배치, 수정 불가 값을 비활성 입력으로 표시.
   - 승인된 예외: SCR-006 社員管理의 모달 5종만 원형 아이콘(`iconVariant="circle"`)·라벨 위 스택(`FormStack`)을 쓴다(12항, UI_MODAL_PATTERNS 예외 E1).
   - 예외 절차: 패턴과 다른 디자인이 필요하면 구현 전에 차이·이유를 기록해 architect 검토 → 사용자 승인 후 PATTERNS 자체를 갱신한다(화면 단위 예외 금지).
   - 사용 예시: 확인 `ConfirmDialog({open,icon,title,message,notice,confirmLabel,tone:'danger',submitting,onConfirm,onClose})` / 등록 `FormModal({open,icon,title,description,onSubmit,submitLabel,submitting}) > FormTable > FormTableRow` / 단계형 수정 `Modal({size:'lg',icon,title,description,footer,busy}) > ReadOnlySummary + FormTable` / 상세 `Modal({size:'lg',icon,title,footer}) > DetailTable > DetailTableRow`.
11. **버튼 공통 패턴(2026-11, 사용자 결정 B1~B19)**: 모든 버튼은 `docs/UI_BUTTON_PATTERNS.md`를 따른다. 요약:
   - 구현: `<button>`은 공통 `Button`, 화면 이동 `<Link>`는 `buttonClass()`만 쓴다(6절 `components/Button.tsx`). 파일 로컬 버튼 클래스 상수 신설 금지(`form.tsx`의 버튼 상수 8개는 이행 후 삭제됨).
   - variant 선택: 영역의 주 동작 1개 = `primary`(표 행 반복 예외) / 취소·닫기·조회·상세 = `secondary`(상세는 Eye 아이콘) / 다음 단계·수정 입구 = `primaryOutline`(수정은 Pencil 아이콘) / 위험 동작 입구 = `dangerOutline`, 그 모달 확정 = `danger`(모달 밖 사용 금지) / 아이콘만 있는 닫기·셸 아이콘 = `ghost` / 월 이동 등 아이콘 컨트롤 = `secondary` + `iconOnly` / 화면 이동 텍스트 = `text` + `<Link>`.
   - size는 위치로 정한다: 표·목록 행 = sm(36) / 모달 footer·일반 = md(40, 기본) / 페이지 주 동작·인증 폼 제출·검색 실행·出勤·退勤 = lg(48). 44 등 3단계 밖 높이와 반응형 size 변경 금지.
   - 詳細·編集 공통 버튼(2026-11-14, B18·B19): 「詳細」 = `DetailButton`(`secondary` + Eye), 수정 입구 = `EditButton`(`primaryOutline` + Pencil, 아이콘 전용은 `iconOnly`). 행 sm·모달 footer md. 기본 문구 「詳細」「編集」을 쓰고 `children` 문구 대체는 예외적으로만 쓴다(6절 `components/ActionButtons.tsx`). 수정 입구 버튼 문구는 「編集」으로 통일하고 「修正」은 쓰지 않는다 — 범위는 버튼 문구와 그 `aria-label`·sr-only 열 제목만이며, 확인 단계 확정 버튼 [修正する]·모달 제목·설명·확인문·토스트·「管理者修正」 등 버튼 외 문구는 대상 외.
   - disabled·loading은 Button에 내장(`loading` = disabled + Spinner, 문구 불변). disabled 조건은 화면 로직이 정한다. 제출 버튼은 `type="submit"` 명시(기본 `button`).
   - `className`은 배치 전용(margin·폭·정렬·위치·`col-span`). 높이·padding·글자·색·radius·정렬 등은 ESLint(`no-restricted-syntax`)가 검출한다. Button은 `<button>` 1개만 렌더(모달 footer 개수 판정).
   - 금지: 위 금지 클래스, 모달 밖 `danger`, 한 영역 `primary` 2개 이상, `aria-label` 없는 아이콘 전용 버튼·링크, 고정 URL 이동용 `<button>`, 문장 속 인라인 링크에 `text`.
   - 대상 외(각자 컴포넌트 유지): `Pagination`·`StatusFilterButtons`·`Notice` X 등(UI_BUTTON_PATTERNS §1.2).
   - 예외 절차: 패턴과 다른 버튼이 필요하면 구현 전에 차이·이유를 기록해 architect 검토 → 사용자 승인 후 PATTERNS 자체를 갱신한다(화면 단위 예외 금지).
12. **SCR-006 社員管理 레퍼런스 재현(2026-11, 사용자 결정)**: 社員管理 화면은 별도 레퍼런스 화상의 외형을 우선한다. 3항 "새로운 색상·스타일을 추가하지 않는다"와 10항 모달 공통 패턴의 예외이며, **적용 범위는 SCR-006(`app/(app)/admin/users/`)만**이다. 다른 화면은 바꾸지 않는다.
   - 役職 색 8색: tone 8값(05 §0)의 색 정의는 공용 `JobTitleBadge`의 `JOB_TITLE_TONES` 한 곳에서만 관리한다(화면별 색 하드코딩 금지, SCR-010 所属社員確認도 같은 컴포넌트). 이를 위해 2.1절 토큰 7개(`lavender-30/110/100`·`yellow-30/110/100`·`pink-100`)와 6절 `Badge` variant 2개(`lavender`·`yellow`)를 추가했다. 색 이름(접근 가능한 이름)은 `messages.jobTitles.tones`.
   - 모달: 社員追加·社員編集·社員詳細·社員削除·役職確認 5종은 원형 아이콘(`Modal`·`FormModal`·`ConfirmDialog` `iconVariant="circle"`, 淡紫 원형 48px)을 쓰고, 입력 모달(社員追加·社員編集)은 라벨 위 스택 `FormStack`/`FormStackRow`를 쓴다(UI_MODAL_PATTERNS 예외 E1). 社員ID 선택 등 라디오 카드는 users 로컬 `RadioCardGroup`.
   - 목록: `Pagination variant="boxed"`, `StatCard iconCircle`(흰 원형 아이콘 받침)은 SCR-006만 쓴다. 다른 목록 화면의 페이지네이션·요약 카드는 기본 외형 그대로다.
   - 유지하는 것: Primary 값, 버튼 variant·size(11항), 모달의 제목·X·footer 구조와 동작 규칙(busy·초기 포커스·단계 전환), 수정 불가 값을 비활성 입력으로 표시하지 않는 규칙(自動生成 社員ID는 텍스트 표시).
   - 「社員ID」 표기는 이 화면 한정(다른 화면은 「社員番号」).

## 6. 구현된 공용 컴포넌트 (frontend)

> 위 1~5절의 토큰·규칙을 코드로 옮긴 결과 기록이다. 새 화면은 아래를 먼저 재사용하고, 없는 것만 같은 위치·방식으로 추가한다. 토큰은 `frontend/src/app/globals.css`의 `@theme`(2절 값 그대로 + 2.1절 추가 토큰)만 쓴다. Tailwind 4라 `tailwind.config`는 없다.

| 파일 | export | 용도·변형 | 사용 토큰 | 접근성 |
|---|---|---|---|---|
| `components/form.tsx` | `inputBaseClass`, `inputClass` | `inputClass` = Input Large(높이 48, 좌우 16, 16/24, radius 8. 2026-11 radius 4→8). 상태 default/focus/error. 정의는 `inputClass = h-12 px-4 text-base/6 + inputBaseClass`. `inputBaseClass`(2026-11 버튼 표준화 중 신설) = 높이·좌우 padding·글자 크기를 뺀 공통 부분(전폭·radius 8·테두리·focus·error). 높이·padding·글자 크기를 바꾸는 입력란은 `inputClass`에 덧붙이지 말고(같은 속성 충돌) `inputBaseClass`에 각자 지정한다(예: `SearchInput`) | `input-border`, `primary-100`(focus 테두리+ring), `danger-100`(`aria-invalid` 시) | `aria-invalid`로 error 표시, `aria-describedby`로 FieldError 연결 |
| | `selectClass` | Dropdown(Select) Regular. `inputClass`와 같은 높이·테두리 + `cursor-pointer` | `inputClass`와 같음 | `inputClass`와 같음 |
| | `textareaClass` | 여러 줄 입력(사유 등). `inputClass`와 같은 테두리·focus 표시, 상하 padding 12, 세로 크기 조절 가능. 휴가 신청 사유·반려 사유에 사용 | `inputClass`와 같음 | `inputClass`와 같음 |
| | `labelClass` | 입력 위 라벨(14/20 Medium, 아래 간격 4) | `general-80` | `<label htmlFor>`와 함께 사용 |
| | `FieldError`, `ErrorIcon` | 필드 아래 오류 문구(아이콘 + 14/20) | `danger-100`(아이콘), `general-100`(문구) | `id`를 입력의 `aria-describedby`에 지정. 아이콘은 `aria-hidden` |
| | `confirmMessageClass` | 확인 모달 본문 문장(`break-words text-general-100`). `ConfirmDialog`와 단계형 확인(M06·M08)에서 사용 | `general-100` | — |
| | `FieldHint({id?,children})` | 입력 아래 보조 설명(형식 안내 등, `mt-1 text-xs/4`) | `general-80` | `id`를 주고 입력의 `aria-describedby`에 연결(오류 id와 공백 구분) |
| | `CharCount({id,length,max,error?})` | 글자 수 카운터. 왼쪽에 `error`(FieldError 등) 슬롯, 오른쪽에 `messages.common.charCount`(「n/max」). 초과 시 Medium + `danger-100`. 글자 수 계산 방식은 호출부가 정한다. 사용처: SCR-004 휴가 신청 理由·반려 사유, SCR-010 部署登録 説明 | 평상시 `general-80`, 초과 `danger-100`, `tabular-nums` | `id`를 입력의 `aria-describedby`에 연결 |
| `components/Button.tsx` | `Button({variant?,size?,type?,disabled?,loading?,icon?,iconPosition?,iconOnly?,className?,...})`, `buttonClass({variant?,size?,iconOnly?,withIcon?})`, `ButtonVariant`, `ButtonSize` | **공통 버튼(2026-11 버튼 표준화, 5절 11, `docs/UI_BUTTON_PATTERNS.md`)**. `<button>`은 `Button`, `<Link>`는 `className={buttonClass(...)}`. 기본 `variant='secondary'`·`size='md'`·`type='button'`(제출은 `type="submit"` 명시, 모달은 `form={id}`). variant 7종(3절 Button). size sm 36(좌우 12, 14/20, 아이콘 16·간격 4, `whitespace-nowrap`) / md 40(좌우 16, 14/20, 아이콘 20·간격 8) / lg 48(좌우 24, 16/24, 아이콘 20·간격 8), 글자 Bold, radius 8. `iconOnly: true`(리터럴 판별) = 정사각형 36/40/48, `icon`·`aria-label` 필수·`children` 금지, ghost 아이콘 전용의 글리프 24. `icon`은 `<span aria-hidden>` 슬롯(`[&>svg]:size-full`), `iconPosition` `start`(기본)/`end`. `loading` = disabled + 슬롯에 `Spinner`(문구 불변, `aria-busy` 없음). `text` variant는 높이·padding 없음(인라인, 14/20 Medium, 포커스 링 radius 4, `withIcon`·아이콘 있을 때만 `inline-flex gap-1`). `<button>` 요소 1개만 렌더(모달 footer 개수 판정). `className`은 배치 전용(ESLint `no-restricted-syntax`가 금지 클래스 검출, `eslint.config.mjs`). 그 밖의 `<button>` 속성(`form`·`aria-*`·`autoFocus`·`data-autofocus`·`ref`)은 그대로 전달. 주의: `variant`는 Badge·Notice에서는 색 의미, Button에서는 스타일 계열이고, `size`는 Modal에서는 폭, Button에서는 높이다 | 크기 = 2.3절 버튼 크기 토큰(`h-btn-*`·`size-btn-*`·`px-btn-x-*`·`gap-btn-gap(-sm)`·`rounded-btn`). 색 = primary `primary-100`/hover `primary-90`/disabled `primary-60`, secondary 테두리 `general-50`·hover `general-30`·disabled 글자 `general-60`, primaryOutline 테두리·글자 `primary-100`·hover `primary-30`, danger `danger-100`/hover `danger-100/90`/disabled `danger-100/50`, dangerOutline 테두리·글자 `danger-100`·hover `danger-30`, ghost 글자 `general-80`·hover `general-30`, text `primary-100`·hover 밑줄. 아웃라인형 disabled는 테두리 `general-50`·글자 `general-60` | focus-visible 2px outline offset 2(`primary-100`, 위험 variant `danger-100`). 아이콘 슬롯 `aria-hidden`. disabled는 대비 기준 예외(3절 Button) |
| `components/ActionButtons.tsx` | `DetailButton({size?,children?,className?,...})`, `EditButton({size?,iconOnly?,children?,className?,...})` | **詳細·編集 역할 프리셋(2026-11-14, 5절 11, UI_BUTTON_PATTERNS §4.7·B18)**. 내부는 `Button`이며 variant·아이콘·기본 문구만 고정한다(새 클래스 없음). `DetailButton` = `secondary` + `EyeIcon` + `messages.common.detail`(「詳細」) / `EditButton` = `primaryOutline` + `PencilIcon` + `messages.common.edit`(「編集」), `iconOnly: true`면 `aria-label` 필수·`children` 금지. `size` 기본 `sm`(표·카드 행), 모달 footer는 `md`. `type`은 항상 `button`, `variant`·`icon`·`loading`은 받지 않음. 그 밖의 `<button>` 속성(`onClick`·`disabled`·`aria-label`·`ref` 등)은 전달. `children` 문구 대체는 예외적으로만 쓴다(현재 사용처 0). `className`은 배치 전용(ESLint 대상). 사용처: [詳細] SCR-004 신청 이력·SCR-005 표/카드·SCR-006 행·SCR-010 행 / [編集] SCR-006 행·社員詳細 footer·役職確認(`iconOnly`)·SCR-008 행·SCR-010 행·部署詳細 footer | `Button`의 `secondary`·`primaryOutline` 그대로 | `Button`과 같음. 아이콘 `aria-hidden`, 표 행은 호출부가 대상 이름 `aria-label`을 준다(보이는 문구 포함, WCAG 2.5.3) |
| `components/Toast.tsx` | `ToastProvider`, `useToast().showToast(message, variant)` | Notification floating. 상단 중앙, 1건만(새 알림이 교체), 4초 후 자동 소멸, 화면 이동 후에도 유지(`app/layout.tsx`에 배치). variant `success`/`error` | success: `success-100` 테두리 + `success-40` 배경 / error: `danger-100` + `danger-30`, `shadow-card`, radius 4 | `role="status"` + `aria-live="polite"` 영역이 항상 존재 |
| `components/Modal.tsx` | `Modal({open,title,onClose,children,footer,icon,size?,subtitle?,description?,busy?,iconVariant?})`(`iconVariant` 2026-11: `'square'`(기본, 기존 외형) / `'circle'`(淡紫 원형 48px, SCR-006 전용 — 5절 12)) | **2026-11 모달 리팩터링(5절 10)으로 외형 1계열(①')로 통일, `variant` 삭제, `icon` 필수.** 아이콘 박스(40, `rounded-md`, 아이콘 24) + 제목 + 닫기(X) + 본문(유일한 세로 스크롤) + footer. 외형: radius 16, 폭 모바일 `100%-1rem`·`sm` 이상 `100%-2rem`. `size`: `md`(기본, 최대 420. 확인·단순 목록) / `lg`(최대 640. 폼·상세) / `xl`(최대 800. 5열 표, SCR-010 所属社員確認). md = Header·Body·Footer 좌우 padding 20 → `sm` 28, 제목 `text-h6`(20/28), Header↔Body 16 / lg·xl = padding 20 → `sm` 32, 제목 `text-h6` → `sm` `text-h5`(24/34), Header↔Body 24. `description`(선택) = 제목 아래 설명문(14/20, `sm` 16/24, 간격 8). `subtitle`(선택) = 그 아래 배지 등 보조 표시(간격 4, SCR-010 所属社員確認의 「{部署名} / 所属社員 N名」). 닫기(X)는 `Button` `ghost` 아이콘 전용(40×40, 글리프 24, radius 8, 2026-11 버튼 표준화). footer 배치는 직계 자식 수로 판정(Tailwind `has-[>:only-child]`·`has-[>:nth-child(3)]`): `sm` 미만 1개 = 전폭 / 2개 = 2열 전폭 / 3개 이상 = 우측 정렬 줄바꿈, `sm` 이상 = 본문 폭 안쪽 구분선 아래 우측 정렬. `busy`(제출 중) = Esc(`cancel` 이벤트 차단 + `close` 시 재오픈)·X 차단. 바깥 클릭으로 닫지 않음. 모달별 아이콘: 部署登録/編集·部署詳細 `BuildingIcon`·所属社員確認 `PeopleIcon`·部署の削除 `TrashIcon`(`admin/departments/icons.tsx`) / 休暇申請·休暇詳細·날짜별 휴가자 `CalendarIcon` / 勤怠の修正 `ClockIcon`(`layout/navIcons.tsx`) / 出勤·退勤 확인 `EnterIcon`·`ExitIcon`(`dashboard/icons.tsx`) | 흰 배경, `shadow-card-soft`, backdrop `general-100/50`, 아이콘 박스 `primary-30`+`primary-100`(위험 동작 포함), 구분선 `general-40` | `<dialog>` `showModal()`로 포커스 트랩·Esc 닫기, `aria-labelledby`(제목 id `useId()`), `description`이 있으면 `aria-describedby`, X `aria-label`(`messages.common.close`)·`busy` 중 disabled, 아이콘 `aria-hidden`. 초기 포커스: 열린 직후 `[data-autofocus]` 요소(없으면 브라우저 기본). 단계형 모달(M06·M08)은 footer를 단계 key로 감싸 단계 전환 시 버튼을 재마운트하고 진입 단계의 요소에 `autoFocus`(UI_MODAL_PATTERNS §7) |
| `components/ConfirmDialog.tsx` | `ConfirmDialog({open,icon,title,message,notice?,confirmLabel,cancelLabel?,tone?,submitting,onConfirm,onClose,iconVariant?})`(`iconVariant`는 `Modal`에 그대로 전달, 기본 square. circle은 SCR-006 社員削除만) | 확인 전용 모달(5절 10 D 유형, 내부 `Modal size="md" busy`). 본문 = `message`(`confirmMessageClass`) + `notice`(`Notice warning`, 간격 8). footer [キャンセル](`Button` `secondary`, `cancelLabel` 기본 `messages.common.cancel`) + [확정](`tone` `primary`(기본) = `Button` `primary` / `danger` = `Button` `danger`, `loading={submitting}`). 제출 중 두 버튼 disabled + 확정 버튼 Spinner, Esc·X 차단. 사용처: SCR-002 出勤·退勤 확인, SCR-010 部署の削除(danger) | `Modal`·`Notice`·`Button` | 초기 포커스 danger = [キャンセル], primary = 확정 버튼(`data-autofocus`). role은 `dialog` |
| `components/FormModal.tsx` | `FormModal({open,title,onClose,icon,description,size?,onSubmit,submitLabel,cancelLabel?,submitting,children,iconVariant?})`(`iconVariant`는 `Modal`과 같음, circle은 SCR-006 社員追加만) | 입력 폼 모달(5절 10 A 유형, 내부 `Modal busy`). `size` `lg`(기본)/`xl`, `description` 필수. 본문 `<form id noValidate>`(자식 간격 24) + footer [キャンセル] [submit](`type="submit" form={id}`, 제출 중 Spinner). 제출 중 두 버튼 disabled, Esc·X 차단. footer 덮어쓰기·Notice 슬롯 없음(Notice는 children에 둠). 사용처: SCR-004 休暇申請, SCR-010 部署登録/編集. 단계형 폼(SCR-008 勤怠の修正)은 `Modal` 직접 사용. 버튼은 [キャンセル] `Button` `secondary` / [submit] `Button` `primary` `loading` | `Modal`·`Button` | `Modal`과 같음. Enter로 제출, 초기 포커스는 첫 입력에 `data-autofocus` |
| `components/ReadOnlySummary.tsx` | `ReadOnlySummary({children,className?})`, `ReadOnlySummaryItem({label,children})` | 폼 모달 위쪽의 수정 불가 대상 정보 요약(누구의·어느 날의 데이터인지). 2열 `dl`(라벨 auto + 값), 간격 가로 16·세로 8, padding 좌우 20·상하 16, radius 12, 14/20. 값은 `min-w-0 wrap-anywhere`(숫자·날짜 `tabular-nums`는 호출부). 입력 가능 값·계산 값은 넣지 않는다. 사용처: SCR-008 勤怠の修正(社員名·勤務日) | `general-30` 배경, dt `general-80`, dd `general-100` | `dl`/`dt`/`dd` 구조 |
| `components/FormTable.tsx` | `FormTable({children,className?})`, `FormTableRow({label,htmlFor?,labelId?,required?,children})`, `FormStack({children,className?})`·`FormStackRow`(props는 `FormTableRow`와 같음. 2026-11 추가: 라벨을 입력 위에 두는 세로 스택, 행 간격 16, 라벨 16/24 Bold `general-100` + `RequiredMark`. **SCR-006 社員追加·社員編集 전용** — 5절 12, UI_MODAL_PATTERNS 예외 E1. 다른 모달은 `FormTable`) | 모달 폼 표준 배치(5절 10). 항목명 열 `sm` 이상 10rem 회색 셀(14/20 Medium) + 값 셀(흰색), 행 구분선, `sm` 미만 항목명 위·값 아래 1열. 컨트롤이 있는 행은 `htmlFor`, 없는 행(계산 값·안내)은 `labelId`로 항목명을 연결. `required`면 `RequiredMark` | 테두리·구분선 `general-40`, 항목명 셀 `general-30`+`general-80` | `label htmlFor` 또는 `labelId`(값 쪽 `aria-labelledby`), 별표 `aria-hidden` |
| `components/DetailTable.tsx` | `DetailTable({children,className?})`, `DetailTableRow({label,children})`, `tableFrameClass` | 상세 모달용 2열 표(`dl`). 항목명 열 6rem → `sm` 10rem 회색 셀 + 값 셀(14/20, `break-words`). `tableFrameClass`(radius 6·테두리)는 `FormTable`과 공유 | `FormTable`과 같음 | `dl`/`dt`/`dd` 구조 |
| `components/Select.tsx` | `Select({id,value,onChange,options,placeholder?,invalid?,describedBy?,required?,disabled?,autoFocus?,size?})` | Dropdown(Select) Regular. 네이티브 `select` + 오른쪽 화살표. `size`(2026-11): `'md'`(기본, 기존 클래스 그대로) / `'sm'`(높이 44·`text-sm`, 목록 필터용 — SCR-006 필터 3개. `SearchInput`과 높이 정렬). 「すべて」처럼 선택 가능한 빈 값은 placeholder가 아니라 `options`에 넣는다. `autoFocus`는 React `autoFocus`가 아니라 `data-autofocus`를 출력해 모달이 열린 직후 초기 포커스가 되게 한다(SCR-004 休暇申請 休暇種別) | `selectClass`, disabled `general-30` 배경 | `aria-invalid`·`aria-describedby`·`aria-required`, 화살표 `aria-hidden` |
| `components/Spinner.tsx` | `Spinner` | Loader. 20px, 색은 부모 글자색 | — | `aria-hidden`. 단독 로딩 표시일 때는 부모에 `role="status"` + `sr-only` 문구(`messages.common.loading`)를 둔다 |
| `components/Logo.tsx` | `Logo` | workBridge 마크 + 워드마크(20 Bold) | `primary-100` | 마크 `aria-hidden`, 이름은 텍스트 |
| `components/Card.tsx` | `Card({title,icon?,action?,children})` | Card Panel. 제목(18/28 Bold) + 우측 `action` + 본문(제목 아래 간격 12, `flex flex-1 flex-col`로 카드의 남은 높이를 받음). `icon`을 주면 제목 왼쪽에 24px 아이콘(간격 8). padding 좌우 20·상하 16(`sm` 이상 좌우 24·상하 20), radius 16, 헤더 최소 높이 28. 헤더는 `flex-wrap`(가로 간격 16, 세로 간격 8): 제목과 `action`이 한 줄에 들어가면 그대로, 넘치면 제목을 줄이지 않고 `action`이 다음 줄로 내려간다. 스타일 변경(2026-11, 이전 radius 6·`shadow-card`·제목 16/24·padding 28)은 Card를 쓰는 모든 화면에 적용 | 흰 배경 + 1px `general-40` 테두리 + `shadow-card-soft`, 아이콘 `primary-100` | `<section aria-labelledby>`(제목 id는 `useId()`). 아이콘 래퍼 `aria-hidden` |
| | `cardFrameClass`, `cardSurfaceClass` | 카드 외곽 클래스. `cardFrameClass` = 패딩 없는 외곽(radius 16·테두리·흰 배경·`shadow-card-soft`), `cardSurfaceClass` = `cardFrameClass` + `Card`와 같은 패딩. 패딩·높이 제어가 달라 `Card`를 못 쓰는 곳(SCR-004 요약·이력·承認 목록·캘린더·休暇予定一覧 등)은 외곽을 직접 쓰지 말고 이것에 자체 패딩을 더한다 | `Card`와 같음 | 시맨틱 요소는 호출측이 정함 |
| `components/PageHeader.tsx` | `PageHeader({title,icon?,action?,description?})` | 페이지 제목 행(SCR-004). 왼쪽 아이콘(24, `md` 이상 32) + 제목(`text-page-title-sm` 22/30, `md` 이상 `text-page-title` 28/36, Bold, 넘치면 말줄임) + 오른쪽 `action`. 좁은 폭에서도 한 줄. `description`(2026-11, SCR-006): 제목 아래 설명문. 지정 시 `action`이 좁은 폭에서 다음 줄로 내려갈 수 있다(미지정 시 기존 배치 그대로) | 아이콘 `primary-100`, 제목 `general-100` | 제목 `<h1>`, 아이콘 `aria-hidden` |
| `components/SearchInput.tsx` | `SearchInput({id,label,value,onChange,placeholder})` | 검색 입력(`type="search"`). 왼쪽 돋보기 아이콘 20, 높이 44(`h-11`), padding 왼쪽 40(`pl-10`)·오른쪽 16(`pr-4`), radius 8, 14/20(`text-sm/5`). 2026-11 `inputClass` 덧붙임(높이 48과 충돌해 실제 48)에서 `inputBaseClass` + 각자 지정으로 바꿔 44로 고정(사용자 결정). 사용처: SCR-010 부서 검색·所属社員確認 모달 검색, SCR-004 休暇カレンダー 필터(氏名·社員番号) | `inputBaseClass` 재사용, 아이콘·placeholder `general-70` | 라벨은 `sr-only` `<label htmlFor>`, 아이콘 `aria-hidden` |
| `components/Skeleton.tsx` | `Skeleton({className})`, `SkeletonLines({count})` | Loading 스켈레톤. 크기는 호출측 지정 / 영역 전체용 줄 묶음 | `general-40` + `animate-pulse` | `Skeleton`은 `aria-hidden`. `SkeletonLines`는 `role="status"` + `sr-only`(`messages.common.loading`) |
| `components/SectionError.tsx` | `SectionError({onRetry,message?})` | 영역 단위 조회 실패 문구 + [다시 시도](03 공통 UI 규칙 Error). 2026-11부터 내부가 `Notice`(variant `error`, `action`에 버튼)이며 호출부 API는 그대로. `message` 생략 시 `messages.common.loadError` | `Notice`, `Button` `secondary` `sm`(높이 36, 좌우 12) | `Notice` error의 `role="alert"` |
| `components/Badge.tsx` | `Badge({variant,shape?,children})`, `BadgeVariant`, `BadgeShape`, `BADGE_VARIANT_CLASS`(2026-11 variant `lavender`(`lavender-30`/`lavender-110`)·`yellow`(`yellow-30`/`yellow-110`) 추가, 役職 tone LAVENDER·YELLOW용. 役職 배지는 직접 variant를 고르지 말고 `JobTitleBadge`를 쓴다) | 상태 배지. 높이 24, 14/20 Medium, 아이콘과 간격 4. variant `neutral`/`success`/`warning`/`danger`/`dark`/`info`/`positive`/`caution`/`violet`/`pink`. shape `rounded`(기본, radius 4·좌우 8) / `pill`(`rounded-full`·좌우 12) | neutral: `general-40` 배경+`general-80` / success: `success-40`+`general-100` / warning: `warning-40`+`general-100` / danger: `danger-30`+`general-100` / dark: `general-80`+흰색 / info: `primary-30`+`primary-100`(SCR-002 휴가 종류) / positive: `success-30`+`success-110`(SCR-002 勤務中·承認済み) / caution: `warning-30`+`warning-110`(SCR-002 承認待ち) / violet: `violet-30`+`violet-110`(SCR-010 役職, 5절 8) / pink: `pink-30`+`pink-110`(SCR-010 役職, 5절 8) | 상태는 색과 문구를 함께 표시 |
| `components/leave/LeaveStatusBadge.tsx` | `LeaveStatusBadge({status,soft?,children?})`, `LEAVE_STATUS_BADGE` | 휴가 상태 배지(`Badge shape="pill"`). 기본은 상태 아이콘(16px) + 문구, `LEAVE_STATUS_BADGE`(PENDING=`warning` / APPROVED=`success` / REJECTED=`danger` / CANCELLED=`neutral`). `soft`이면 아이콘 없이 PENDING=`caution`·APPROVED=`positive`(나머지는 기본과 같음, SCR-002 直近の申請履歴). `children`으로 문구 교체(출근부 「休暇 承認済み」) | `Badge`와 같음, 아이콘 `success-100`·`warning-100`·`danger-100`·`general-80` | 아이콘 `aria-hidden`, 문구는 `messages.leave.statuses` |
| `components/JobTitleBadge.tsx` | `JobTitleBadge({jobTitle})`(`{name,tone}` 또는 null), `JOB_TITLE_TONES`(`{tone,variant,swatchClass}[]`, 팔레트 표시 순서), `badgeVariantOf(tone)` | 役職 배지(2026-11, SCR-006·SCR-010 공용). `Badge shape="pill"`, null이면 「—」. 役職 tone 8색의 **단일 정의**: VIOLET `violet`/`bg-violet-100`, BLUE `info`/`bg-primary-100`, GRAY `neutral`/`bg-general-60`, LAVENDER `lavender`/`bg-lavender-100`, GREEN `positive`/`bg-success-100`, YELLOW `yellow`/`bg-yellow-100`, ORANGE `caution`/`bg-warning-100`, PINK `pink`/`bg-pink-100`(Badge variant / 스와치). 화면별 색 하드코딩 금지 | 2.1절 役職 토큰 | 색 이름은 `messages.jobTitles.tones[tone]`(스와치 radio의 접근 가능한 이름). 색만으로 의미를 전달하지 않음(배지에 이름 표시) |
| `components/StatCard.tsx` | `StatCard({label,value,unit?,icon?,tone?,href?,iconCircle?})`, `StatCardTone`(`iconCircle` 2026-11: 아이콘을 흰 원형 받침에 올린다(모바일 32px). **SCR-006 요약 전용** — 5절 12. tone은 추가하지 않음) | stats 카드. `icon` 없음(기본, SCR-004): 항목명(14/20) + 수치(Heading 6), radius 6, padding 20. `icon` 있음(SCR-002): 왼쪽 아이콘(24, `sm` 이상 40·2행) + 항목명(12/16 Bold, `sm` 이상 16/24) + 수치(24/32, `sm` 이상 `text-stat` 36·행높이 40), radius 16, 1px `general-40` 테두리, padding 12(`sm` 이상 상하 16·좌우 24), 배경은 `tone`(`primary` 기본 / `danger`)별 흰색→연한 색 대각 그라데이션. `unit`은 수치 오른쪽 작은 단위(16/24, `sm` 이상 20/28 Bold). `href`가 있으면 카드 전체가 링크(화살표 없음). `selected`(링크 카드 전용, SCR-005 상태 필터)이면 `primary-100` 테두리 + 1px ring | 기본: `shadow-card`, hover `primary-30`, `text-h6` / 아이콘: `shadow-card-soft`(hover `shadow-card`), 그라데이션 끝 `primary-30`·`danger-30`, 아이콘 `primary-100` / 공통 `tabular-nums` | 아이콘 `aria-hidden`. 링크일 때 focus-visible outline `primary-100`. `selected`이면 `aria-current="true"`(링크라 `aria-pressed`는 쓰지 않음) |
| `components/DonutChart.tsx` | `DonutChart({segments:{value,colorClass,label}[],centerLabel,centerValue,ariaLabel})`, `DonutSegment` | 정적 SVG 도넛(5절 4 예외, 라이브러리 없음). viewBox 100, 반지름 42, 선 굵기 17, 12시 방향부터 시계 방향. 값 0인 구간은 그리지 않고 합계 대비 비율로 원주를 나눈다. 크기 112(`sm` 이상 128). 가운데 `centerLabel`(12/16 Medium) + `centerValue`(`text-h5` Bold) | 트랙 `general-40`, 구간 색은 `colorClass`(`text-*`, stroke = currentColor). SCR-002: 出勤 `primary-100` / 未出勤 `general-50` / 休暇 `violet-100` | 래퍼 `role="img"`+`aria-label`(내역 포함 문장), SVG·가운데 글자 `aria-hidden` |
| `components/Pagination.tsx` | `Pagination({page,totalPages,totalCount,onChange,compact?,pageSize?,variant?})` | 이전/다음 + 번호(처음·끝·현재 ±1, 사이는 `…`) + 총 건수. 셀 36×36, radius 4. `totalPages`가 1 이하이면 총 건수만 표시. 2026-11 추가: `pageSize`를 주면 총 건수 문구가 「全 {total} 件中 {from} – {to} 件を表示」(`messages.pagination.range`, 마지막 페이지는 total로 clamp, 미지정 시 기존 「全 N 件」). `variant='boxed'`(기본 `'default'`): radius 8 정사각 셀·현재 페이지 파란 채움·이전/다음은 `<`·`>` 아이콘(sr-only 문구)·문구 왼쪽 배치. boxed + `compact`는 높이 36 유지·최소 폭 32. **boxed는 SCR-006 전용** — 5절 12 | 현재 `primary-30` 배경 + `primary-100` Bold, hover `general-30`, disabled `general-60` | `<nav aria-label>`(`messages.pagination.label`), 현재 페이지 `aria-current="page"`, 번호 버튼 `aria-label`, `…`는 `aria-hidden`, focus-visible outline `primary-100` |
| `components/Tabs.tsx` | `Tabs({label,items:{value,label}[],value,onChange})` | Tabs horizontal(3절). 탭 높이 44, 간격 24(스크롤 영역을 만들지 않으므로 탭 행에 스크롤바가 나타나지 않음). ←/→로 이동과 동시에 선택(끝에서 반대쪽으로 순환) | 활성 Bold `primary-100` 글자 + 하단 3px `primary-100`(2026-11 2px→3px. API 불변), 비활성 Medium `general-80`(hover `general-100`), 구분선 `general-40` | `role="tablist"`+`aria-label`, 각 탭 `role="tab"`·`aria-selected`, 선택 탭만 `tabIndex=0`(roving), focus-visible outline `primary-100`(`-outline-offset`으로 잘림 방지) |
| `components/Tooltip.tsx` | `Tooltip({content,children})` | Tooltip. 트리거 위쪽에 표시, 최대 폭 240, 12px | `general-100` 배경 + 흰 글자, `shadow-card`, radius 4 | 트리거 `tabIndex=0`, hover와 키보드 focus 모두 표시, Esc로 닫힘, `role="tooltip"` + 표시 중 `aria-describedby` |
| `components/table.ts` | `thClass`, `tdClass`, `compactTdClass`, `compactTdBaseClass`, `bandThClass`, `bandTdClass` | Table. 헤더 행 44(하단 2px), 데이터 행 52(하단 1px), 셀 좌우 8. `compactTdClass`는 행 36(출근부). `compactTdBaseClass`는 글자색 없는 compact 셀로, 글자색을 호출측이 정할 때 사용(색 클래스를 겹치면 CSS 생성 순서상 `general-100`이 이기므로). `bandThClass`·`bandTdClass`는 SCR-004 휴가 관리 표(띠 헤더 44 `general-30` 배경·양끝 radius 8, 행 56·하단 1px, 셀 좌우 12). sticky 등은 호출측에서 덧붙임 | `general-40`(선), 헤더 `general-80` Medium, 본문 `general-100` | `<th scope="col">`와 함께 사용 |
| `components/attendance/attendanceStatus.ts` | `ATTENDANCE_STATUS_BADGE`, `MISSING_ROW_CLASS` | 근태 상태 → Badge variant(WORKING=`success` / DONE=`neutral` / MISSING_CLOCK_OUT=`danger`). 퇴근 누락 행 강조 클래스(SCR-003·008) | 행 강조 `bg-danger-30/40`(배지와 구분되도록 농도를 낮춤) | 문구는 `messages.attendance.statuses` |
| `components/attendance/workPattern.ts` | `WORK_PATTERN_BADGE` | 출근부 勤務パターン(`WorkPatternKind`) → Badge variant(NORMAL=`neutral` / DAY_OFF·HOLIDAY=`danger` / LEAVE=`success`). `Badge shape="pill"`과 함께 사용 | `Badge`와 같음 | 문구는 `messages.attendance.sheet`(通常·休日·祝日) / `messages.leave.types`(휴가) |
| `components/attendance/WorkTimeline.tsx` | `WorkTimeline({segments,markerMinute?,label})`, `WorkTimelineAxis()` | 1일 24시간 막대(SCR-003 時間帯 열). 0~1440분 축, 2시간 간격 세로 눈금선, 막대 높이 12, 위치·폭은 `%` 계산. `segments`는 `{startMinute,endMinute,kind:'work'|'break'}[]`이며 1440 초과 부분은 잘라냄. `markerMinute`가 있으면 그 위치에 원형 점(크기 12, 근무 중·퇴근 누락의 출근 위치). `WorkTimelineAxis`는 표 헤더용 눈금 라벨(0, 2, …, 24) | work `primary-100`, break `general-50`, 눈금 `general-40`, 점 `primary-100`, 축 라벨 12px `general-80` | 막대 컨테이너 `role="img"`+`aria-label`(예 `09:00〜18:30 勤務、13:15〜14:15 休憩`), 눈금선·축 라벨 `aria-hidden` |
| `components/DateInput.tsx` | `DateInput({type?:'date'\|'datetime-local',value,compact?,...input 속성})`, `formatDateInputValue(value,type)` | 날짜·일시 입력. 브라우저 기본 입력의 글자를 투명하게 하고 「YYYY年MM月DD日」「YYYY年MM月DD日 HH時MM分」(24시)을 겹쳐 표시, 빈 값은 「----年--月--日」(일시는 「 --時--分」 추가). 클릭 시 기본 달력(`showPicker`). `compact`는 `px-3 text-sm` 입력용. 문구 `messages.dateInput`. 날짜·일시 입력은 모두 이 컴포넌트를 쓴다(DateRangeFields·休暇申請·勤怠修正·휴가 이력 필터) | 값 `general-100`, 빈 값 `general-70`, disabled `general-80` | 라벨·`aria-*`는 기본 입력에 그대로 붙고 겹친 표시는 `aria-hidden` |
| `components/attendance/DateRangeFields.tsx` | `DateRangeFields({idPrefix,startDate,endDate,onChange,error})` | 조회 기간 입력(시작일·종료일 `DateInput`, `sm` 이상 2열). 오류는 FieldError 1개로 통합 | form 클래스 재사용 | 두 입력 모두 `aria-invalid`·`aria-describedby`로 같은 FieldError에 연결 |
| `components/attendance/StatusFilterButtons.tsx` | `StatusFilterButtons({idPrefix,selected,onChange})` | 근태 상태 토글 버튼 복수 선택(SCR-003 md 미만). 누를 때마다 선택·해제하고 즉시 반영된다(반영은 호출측). 선택 없음은 "전체", 표시 순서(`ATTENDANCE_STATUSES`)로 유지. 그룹 라벨 `状態` + 안내 문구(`messages.attendance.statusHint`). 높이 40(`h-10`), radius 4, 좌우 padding 16, 14/20 | 배경은 상태 배지와 같은 `BADGE_VARIANT_CLASS[ATTENDANCE_STATUS_BADGE[status]]`. 선택 중은 `general-100` 테두리 + Bold + ✓, 미선택은 투명 테두리 + Medium(hover `general-50`) | `role="group"`+`aria-labelledby`(그룹 라벨)·`aria-describedby`(안내 문구), 각 버튼 `aria-pressed`, 체크 표시 ✓는 `aria-hidden`, focus-visible outline `primary-100` |
| `components/layout/AppShell.tsx` | `AppShell({children})` | 로그인 후 화면 공통 레이아웃 + 라우트 가드(비로그인 → `/login?redirect=`, mustChangePassword → `/password`, 비관리자의 `/admin`·`/admin/*` → 이동 전까지 children 미렌더, 토스트 `messages.common.forbidden` 1회 + `/dashboard`로 replace). TopBar 68 + Sidebar 250(`lg` 이상 고정), `lg` 미만은 하단 탭(`MobileTabBar`, 높이 64) + 드로어(탭의 「メニュー」로 열고, 배경 클릭·Esc·메뉴 선택 시 닫힘. 드로어는 탭 위까지만 덮음). 본문 하단 여백 112(`lg` 이상 40)로 탭과 겹치지 않음 | 본문 배경은 자체 지정 없이 `body` 그라데이션(`page-from`→`page-to`, 2.1절), 드로어 backdrop `general-100/50` | 드로어 열면 첫 메뉴로 포커스. 인증 확인 중에는 `role="status"` Spinner |
| `components/layout/Sidebar.tsx` | `SidebarNav({isAdmin,onNavigate?,pendingApprovalCount?})` | 03 전역 내비게이션 메뉴. 항목 높이 44, 좌우 margin 16, radius 8, 항목마다 왼쪽 아이콘 20(`navIcons`, 간격 12). ADMIN은 그룹 라벨 아래 관리자 메뉴 추가. 활성 판정은 `pathname === href` 또는 `href/` 하위 경로. "휴가 관리"는 `SidebarSubmenu`(2026-11, SCR-004 페이지 안 탭 대체)로 自分の休暇(`/leaves`)·休暇カレンダー(`/leaves/calendar`)·承認(`/leaves/approvals`, `useApprovalsVisible()`가 true일 때만)을 담는다. 승인 대기 카운터 배지는 "휴가 관리" 부모 행(개폐 화살표 왼쪽)에 표시(높이 16, 최소 폭 16, `rounded-full`, 12px). 0건·null이면 숨김, 100건 이상은 `99+` | 활성 `primary-30` 배경+`primary-100` 글자, hover `general-30`, 그룹 라벨 12px `general-80`, 카운터 `danger-100` 배경+흰 글자 | `<nav aria-label>`, 활성 항목 `aria-current="page"`, 카운터는 `aria-hidden`이고 건수는 `sr-only` 문구(`messages.nav.pendingCount(n)`)로 제공 |
| `components/layout/SidebarSubmenu.tsx` | `SidebarSubmenu({label,icon,basePath,items:{href,label}[],onNavigate?,badge?})`, `SidebarSubmenuItem` | 사이드바 개폐 하위 메뉴(`SidebarNav` 안의 `<li>`). 부모 행은 버튼(높이 44, 아이콘 20 + 라벨, 오른쪽에 `badge` + `ChevronDownIcon` 16, 열림 시 180도 회전). 하위 항목은 링크(높이 40, 왼쪽 padding 48). `pathname`이 `basePath` 또는 그 하위이면 처음부터 열리고, 그 밖에서 들어오면 자동으로 연다. 열린 동안 사용자가 접으면 화면을 옮길 때까지 유지. 하위 활성 = `pathname === href`. 접힌 상태로 하위 화면에 있으면 부모 행을 활성 스타일로 표시(펼침 중 하위 화면에 있으면 부모 글자만 `primary-100`). 개폐 애니메이션은 grid-rows `0fr`↔`1fr` + opacity 200ms(`motion-reduce` 시 없음) | 활성 `primary-30` 배경+`primary-100`, 비활성 `general-100`, hover `general-30` | 부모 버튼 `aria-expanded`/`aria-controls`, 하위 활성 `aria-current="page"`, 닫힌 목록은 `inert` + `invisible`로 포커스·읽기 대상에서 제외, 아이콘·화살표 `aria-hidden`, focus-visible outline `primary-100` |
| `components/layout/ApprovalsAccess.tsx` | `ApprovalsAccessProvider({children})`, `useApprovalsVisible()` → `boolean \| null`, `ApprovalsAccessContext` | 承認 메뉴(사이드바 休暇管理 하위) 표시 판정(03 承認 탭 표시 판정). ADMIN은 조회 없이 true, 그 외는 `GET /leaves/pending-approval?scope=mine&status=PENDING,APPROVED,REJECTED&limit=1`의 `totalCount > 0`, 조회 실패 시 false, 판정 전 null. AppShell이 1회 감싸고 사이드바(고정·드로어)와 `LeaveManagementLayout`이 공유. Provider 밖에서는 null | — | — |
| `components/layout/PendingApprovalCount.tsx` | `PendingApprovalCountProvider({children})`, `usePendingApprovalCount()` → `{count,refresh}` | 사이드바 승인 대기 건수(03 전역 내비게이션). AppShell이 가드 통과 후 1회 감싸고 고정 사이드바·드로어가 공유. 셸 표시 시·pathname 변경 시·`refresh()` 호출 시 재조회, 늦은 응답은 무시, 실패 시 `count=null`(토스트 없음). Provider 밖에서는 `{count:null, refresh:noop}` | — | — |
| `components/layout/TopBar.tsx` | `TopBar({userName,pendingApprovalCount,onLogout})` | Top Navigation. 높이 68, 로고(대시보드 링크), 알림 벨(알림 기능은 없으므로 `/leaves/approvals` 링크. `buttonClass({variant:'ghost',iconOnly:true})` 40×40·radius 8(2026-11 버튼 표준화, 4→8). 승인 대기 건수 > 0일 때만 빨간 점), 세로 구분선, 아바타 사용자 메뉴(원형 사용자 아이콘 + 이름(`sm` 이상) + chevron. 비밀번호 변경·로그아웃). 햄버거 버튼 없음(`lg` 미만은 `MobileTabBar`) | 흰 배경 + `shadow-card`, 빨간 점 `danger-100`, 아바타 `primary-30` 배경 + `primary-100` | 벨 `aria-label`(건수 있음: `messages.nav.pendingCount(n)` / 없음: `messages.nav.approvalsLink`), 사용자 메뉴 버튼 `aria-expanded`/`aria-controls`·`aria-label`(이름 포함), 바깥 클릭·Esc로 닫힘 |
| `components/layout/MobileTabBar.tsx` | `MobileTabBar({drawerOpen,drawerId,onToggleDrawer,pendingApprovalCount})` | `lg` 미만 하단 고정 탭. ホーム(`/dashboard`)·出勤簿(`/attendance`)·休暇管理(`/leaves`) 링크 + 「メニュー」 버튼(드로어 토글)의 4탭(2026-11 休暇承認 탭 삭제). 관리자 메뉴는 드로어에만 있음. 탭 높이 48, radius 8, 아이콘 24 + 12px 라벨. 활성 판정은 하위 경로 포함(`/leaves/*`는 休暇管理). 休暇管理 탭은 승인 대기 건수 > 0이면 빨간 점 | 흰 배경 + 상단 1px `general-40`, 활성·드로어 열림 `primary-30` 배경 + `primary-100`, 비활성 `general-80`, 점 `danger-100` | `<nav aria-label>`(`messages.nav.tabLabel`), 활성 탭 `aria-current="page"`, 「メニュー」 `aria-expanded`/`aria-controls`·`aria-label`(열기/닫기), 아이콘 `aria-hidden`, 점은 `aria-hidden` + `sr-only` 건수 문구 |
| `components/layout/navIcons.tsx` | `HomeIcon`, `CalendarCheckIcon`, `UmbrellaIcon`, `ClipboardCheckIcon`, `UsersIcon`, `BuildingIcon`, `ClockIcon`, `BellIcon`, `UserIcon`, `ChevronDownIcon`, `MenuIcon` | 셸(사이드바·상단바·하단 탭) 전용 선화 아이콘. 24 viewBox, 선 1.75, 크기는 부모 지정(`size-full`) | `currentColor` | `aria-hidden` |
| `components/leave/LeaveDetailModal.tsx` | `LeaveDetailModal({leaveId,initialStep?,onClose,onProcessed})` | 공통 휴가 상세 모달(SCR-004 §4.4). `leaveId`가 null이면 닫힘. 처리 가능하면 승인 확인·반려 사유 입력을 모달 안 단계 전환으로 처리(중첩 dialog 없음). `initialStep`(`detail` 기본 / `approve` / `reject`)은 상세 조회 후 처음 보일 단계이며, 처리 불가 상태이면 상세 단계로 표시. 확인·사유 단계의 [취소]는 `initialStep`이 `detail`이면 상세로 돌아가고 그 외에는 모달을 닫음. 409 `ALREADY_PROCESSED`는 서버 message 대신 `messages.leave.alreadyProcessed` 표시. 본인 신청이 PENDING이거나 자동 승인(`status = APPROVED`, `autoApproved = true`)이고 시작일 > 오늘(도쿄)이면 [取消]를 표시하고, 모달 안 취소 확인 단계([戻る] [取り消す])로 전환한다. 취소 단계는 `initialStep`으로 지정할 수 없다 | `Modal`·`Badge`·form 클래스 재사용 | `Modal`과 같음 |
| `components/leave/ApproverSelect.tsx` | `ApproverSelect({id,value,onChange,error,candidates,status,onRetry,texts?,onSearch?,leadingIcon?,describedBy?})`, `ApproverSelectTexts` `leadingIcon`(선택) 지정 시 입력 좌측 아이콘(`IconField`) + 우측 ▼(열리면 180° 회전)가 붙고 입력 좌우 padding 44(SCR-010 部署責任者). | 승인자 Searchable Select(SCR-004, 3절 Autocomplete 상당). `candidates`를 화면 안에서 이름·사원번호 부분 일치로 필터. ↑↓로 이동, Enter 선택, Esc·바깥 포커스로 닫힘. `status`가 `loading`이면 Skeleton, `error`이면 조회 실패 문구 + [再試行](`onRetry`), 후보 0건이면 안내 문구. `error`는 모든 상태에서 FieldError(id `${id}-error`)로 표시. 선택 prop(SCR-010 부서 책임자, 생략 시 기존 동작 그대로): `texts`(`{placeholder,listLabel,empty,noMatch,loadError}`, 생략 시 `messages.leaves.approverSelect`) / `onSearch(keyword)`(지정 시 서버 검색: 입력 중 문자를 알리고 확정·취소 시 빈 문자열, `candidates`는 필터 완료로 보고 클라이언트 필터를 하지 않으며 0건이어도 입력란 유지. 문자를 남긴 채 선택 없이 포커스를 벗어나면 입력 전 선택을 복원, 입력란을 비운 경우는 해제 유지) / `describedBy?`(입력 `aria-describedby`에 추가할 id. 오류 id와 공백 구분으로 결합. SCR-010 책임자 후보 100건 안내) | 입력 `inputClass`, 목록 흰 배경 + `shadow-card`, 선택 항목 `primary-30`, 활성 항목 `general-30` | 입력 `role="combobox"`·`aria-expanded`·`aria-controls`·`aria-autocomplete="list"`·`aria-activedescendant`, 목록 `role="listbox"`, 항목 `role="option"`·`aria-selected`, `aria-invalid`·`aria-describedby`로 FieldError 연결 |
| `components/Notice.tsx` | `Notice({variant?,title?,children,action?,onClose?,className?})`, `NoticeVariant` | **공통 안내 메시지(2026-11, 구 `InfoNotice` 개명·확장)**. variant `info`(기본, 파랑) / `success`(초록) / `warning`(주황) / `error`(빨강). 왼쪽 아이콘(24, variant별 형태가 다름) + 오른쪽 본문(14/20), 테두리 없음(배경색만), radius 12, padding 좌우 20·상하 12, 간격 12, 긴 문장은 `min-w-0`+`wrap-break-word`로 줄바꿈. `title`이 있으면 제목 Bold + 본문 Regular, 없으면 본문 Medium. `action`은 본문 아래(예: 再試行 버튼), `onClose`를 주면 닫기(X) 버튼(표시 전환은 호출부가 관리). `className`은 바깥 여백 등 배치 전용. 규칙은 5절 9 | `notice-*` 토큰(2.1절 Notice 표) | 아이콘 `aria-hidden`(종류는 아이콘 형태+색+문구로 전달), `error`만 `role="alert"`(나머지는 정적 안내라 role 없음), 닫기 버튼 `aria-label` + focus-visible outline `primary-100` |
| `components/form.tsx` | `IconField({icon,trailing?,align?})`, `iconInputClass`(pl 44), `iconInputTrailingClass`(pr 44) | 입력·텍스트에어리어 좌측(필요 시 우측)에 장식 아이콘(20, `general-70`)을 겹치는 틀. `align="top"`은 복수 행 입력용(1행 위치). 클릭을 통과시킴 | `general-70` | 아이콘 aria-hidden |
| `components/leave/LeaveApplyModal.tsx` | `LeaveApplyModal({open,onClose,onApplied,onBalanceStale?})` | 공통 휴가 신청 모달(SCR-004 §3.2, SCR-004에서 사용. SCR-002의 신청 진입은 2026-11 삭제). `FormModal`(`CalendarIcon`, 설명문) + `FormTable` 사용. 열 때마다 초기화하려면 사용처에서 `key`를 바꾼다. 승인자 후보는 open 시에만 조회. 휴가 종류 `Select`(5종, 초기 미선택, 초기 포커스), 申請日数는 박스 없는 일반 값(`aria-live`) + `FieldHint`(開始日·終了日의 `aria-describedby`에 연결), 理由 placeholder + `CharCount`. footer [キャンセル](아웃라인) [申請する](채움, 요청 중 Spinner). 제출 중 Esc·X·キャンセル 차단. 성공 시 `onApplied(leave)`, 422 잔여 부족 시 `onBalanceStale` | `FormModal`·`FormTable`·`Select`·form 클래스·`ApproverSelect` 재사용 | 오류 `aria-invalid`·`aria-describedby`는 각 입력에 연결, 필수 입력 `aria-required` |
| `components/leave/LeaveCategoryBadge.tsx` | `LeaveCategoryBadge({category,compact?})`, `LEAVE_CATEGORY_CLASS` | 공유 캘린더 공개용 휴가 분류 배지(pill, 높이 24, 좌우 12, 14/20 Medium). 문구 PAID 有給休暇 / SPECIAL 特別休暇 / OTHER 休暇(`messages.leaveCategory`). `compact`이면 앞에 아이콘 16(SPECIAL = 잎, 그 외 = 가방). `LEAVE_CATEGORY_CLASS`는 막대·범례에도 쓰는 분류별 배경+글자 클래스 | PAID·OTHER `leave-paid-bg`+`leave-paid-fg`, SPECIAL `leave-special-bg`+`leave-special-fg` | 색만으로 구분하지 않고 문구를 항상 표시, 아이콘 `aria-hidden` |
| `components/leave/MonthNavigator.tsx` | `MonthNavigator({month,onChange})` | `‹ 2026年11月 ›` 월 이동. 前月·翌月 아이콘 버튼 = `Button` `secondary` `iconOnly`(40×40, 1px `general-50` 테두리, radius 8, `ChevronLeftIcon`·`ChevronRightIcon`) + 월 라벨(18/28 Bold, `formatMonthLabel`). `onChange(-1 | 1)` | 흰 배경, hover `general-30` | 버튼 `aria-label`(`messages.leaveCalendar.prevMonth`·`nextMonth`), 월 라벨 `aria-live="polite"` |
| `components/leave/LeaveDayModal.tsx` | `LeaveDayModal({open,title,items,onClose})` | 캘린더 막대·「+N件」을 눌렀을 때의 휴가자 목록 모달(SCR-004 休暇カレンダー). 항목: 氏名(Bold) + `LeaveCategoryBadge` / 「社員番号：… \| 部署」 / 기간(`formatLeavePeriod`). API를 호출하지 않고 받은 `items`만 표시. footer [閉じる] | `Modal`·`Button` `secondary` 재사용, 구분선 `general-40` | `Modal`과 같음 |
| `components/leave/leaveIcons.tsx` | `PencilIcon`(2026-11 버튼 표준화 때 `admin/departments/icons.tsx`에서 이동, `EditButton`이 사용 — SCR-006·008·010 編集. 그 밖에 SCR-006 社員編集 모달 제목 아이콘), `EyeIcon`(2026-11-14 `admin/users/icons.tsx`에서 이동, `DetailButton`이 사용), `SearchIcon`, `ChevronLeftIcon`, `ChevronRightIcon`, `PlusIcon`, `BagIcon`, `LeafIcon`, `UserCircleIcon`, `CalendarSmallIcon`, `ClipboardCheckSummaryIcon`, `XCircleIcon` | 휴가 관리 화면·위 공용 컴포넌트(`SearchInput`·`MonthNavigator`·`LeaveCategoryBadge`)의 선화 아이콘. `className?` 지정 가능, 크기는 부모 지정 | `currentColor` | 사용처에서 `aria-hidden` 래퍼에 넣음 |

- 데이터 조회 훅: `lib/api/useApiQuery.ts` `useApiQuery<T>(path | null, {onError?})` → `{status:'loading'|'error'|'success', data, error, reload, setData}`. `path`가 null이면 호출하지 않는다. 403 `PASSWORD_CHANGE_REQUIRED`이면 `/password`로 이동한다. 영역별로 독립 조회할 때 사용한다.
- 휴가 관리 유틸: `lib/leave-days.ts` `countLeaveDays(leaveType,startDate,endDate)`(주말 제외 일수 미리보기, 반차 0.5, 미입력·역순·실재하지 않는 날짜는 null), `parseLeavesQuery(params)` → `LeavesQuery {appliedFrom,appliedTo,leaveType,status,page}`(SCR-004 自分の休暇 URL Query 해석. `appliedFrom`·`appliedTo`는 실재하는 `YYYY-MM-DD`만, 역전 범위는 둘 다 버림. `status`·`leaveType`은 단일 값이며 쉼표 복수 값은 첫 값, 미지 값은 「すべて」(`''`). 이전 `year`는 무시), `LEAVE_STATUSES`(상태 표시 순서), `LEAVE_TYPES`(휴가 종류 표시 순서), `isHalfDay(leaveType)`. `yearOptions`는 연도 필터 폐지(2026-11)로 삭제했다.
- 휴가 캘린더 유틸: `lib/leave-calendar.ts`(SCR-004 休暇カレンダー, 문자열 연산과 UTC만 사용) `parseCalendarMonth(value,currentMonth)`(`?month=`, 2000-01~2100-12 밖·형식 오류는 이번 달), `parseCalendarDate(value,month)`(표시 월 안의 실재 날짜만), `buildMonthGrid(month)`(일요일 시작 주별 날짜, 월 앞뒤 포함), `isInMonth`, `layoutWeekLanes(items,weekDates,month,maxLanes)` → `{bars:{item,startCol,endCol,lane}[], hidden:{날짜:건수}}`(주별로 월 안 구간만 잘라 연속 막대로 lane 배치, 넘친 건은 날짜별 「+N件」 수), `itemsOnDate(items,date)`, `calendarDayCount(item)`(주말 포함 달력 일수), `formatLeavePeriod(item)`(`11/13（水）～11/15（金）`, 반차 「午前」「午後」), `formatLeavePeriodWithCount(item)`(모바일 `2026/11/13（木）～11/15（土）` + 「（3日間）」/「（半日）」), `formatDateLabel(ymd)`(`11月13日（木）`), `barText(item)`(氏名 + 「（午前）」).
- 휴가 관리 공용 구조(공용 컴포넌트 아님, `app/(app)/leaves/`): `layout.tsx` → `LeaveManagementLayout`(SCR-004 3탭 공통 틀: `PageHeader` + [休暇申請] + `LeaveApplyModal`. 페이지 안 탭 UI는 없고 전환은 사이드바 `SidebarSubmenu`. 承認 표시 판정은 `useApprovalsVisible()`를 쓰고, 비대상의 `/leaves/approvals` 직접 접근 시 스켈레톤 → `/leaves` replace를 담당), `LeaveDataVersion.tsx` `LeaveDataVersionContext`·`useLeaveDataVersion()` → `{version,bump}`(신청 성공·잔여 부족 시 version 증가 → 自分の休暇·休暇カレンダー가 재조회).
- 달력 유틸: `lib/calendar.ts` `shiftMonth(month,delta)`(`YYYY-MM` 월 이동, 연도 넘김 포함), `formatMonthLabel(month)`(`2026年11月`, 문구는 `messages.calendar`). 문자열 연산과 UTC만 사용해 로컬 타임존에 의존하지 않는다. 요일 문구는 `messages.calendar.weekdays`. 현재 사용처는 출근부(SCR-003). `buildMonthWeeks`와 `components/calendar/MonthCalendar.tsx`는 SCR-002 휴가 캘린더 삭제(2026-11)로 제거했다.
- 대시보드 유틸(SCR-002): `lib/greeting.ts` `greetingOf(now)`(도쿄 시각 5~10시 おはようございます / 11~17시 こんにちは / 그 외 こんばんは), `lib/work-progress.ts` `EXPECTED_WORK_MINUTES`(540 = 実労働 8시간 + 휴게 60분, 진행률 계산 전용 目安), `workProgressPercent(clockIn,until)`(0~100 클램프, 정수 내림, clockIn null이면 0), `lib/attendance-rate.ts` `shareOf(count,denominator)`(소수 1자리 %, 분모 0이면 null), `formatPercent(value)`(`83.3%`, null은 `messages.common.noValue`), `lib/format.ts` `formatHours(minutes)`(`96時間` / `96時間30分`). 退勤予定 目安 함수 `expectedClockOut`은 SCR-002 退勤時刻 실제값 표시 변경(2026-11)으로 삭제했다.
- 대시보드 전용(공용 아님, `app/(app)/dashboard/`): `icons.tsx`(인라인 SVG 아이콘, 24 viewBox·`currentColor`·선 1.75·`aria-hidden`), `CardLink.tsx` `CardLink({href,children})`(카드 헤더 오른쪽 「すべて見る ›」 링크, `buttonClass({variant:'text',withIcon:true})` + 16px chevron, 아이콘 간격 4), `MetricValue.tsx` `MetricValue({value})`(「96時間」「12日」을 숫자(부모 크기) + 단위(16/24, `sm` 이상 20/28 Bold)로 나눠 표시, 숫자로 시작하지 않으면 그대로). 直近の申請履歴 목록 위 구분선은 별도 Divider 컴포넌트 없이 목록 행 구분선과 같은 `general-40`(1px `border-t`)을 쓴다.
- 부서 관리 전용(공용 아님, `app/(app)/admin/departments/`, SCR-010): `icons.tsx`(`LayersIcon`·`BuildingIcon`·`PeopleIcon`·`ListIcon`·`TrashIcon`·`SortIcon({direction})`·`MailIcon`(連絡先 앞 장식 아이콘, 16px). 대시보드 `icons.tsx`와 같은 방식: 24 viewBox·`currentColor`·선 1.75·`aria-hidden`. `SortIcon`은 위·아래 화살표로 비활성 방향만 흐리게), `SortableTh.tsx` `SortableTh({label,direction,onSort,align?})`(정렬 가능한 표 헤더. `thClass` 위에 `<th aria-sort>` + 라벨·`SortIcon` 버튼), `DepartmentDetailModal.tsx`(部署詳細 모달, 조회 전용. `Modal size="lg"`·`DetailTable`·`Badge`·`Button`(`secondary`/`primary`) 조합. 2026-11 `DepartmentDetailPanel`(選択中の部署情報 카드)을 대체), `DepartmentMembersModal.tsx`(所属社員確認 모달. `Modal size="xl"`(`icon`·`subtitle`)·`SearchInput`·`Badge` info·`thClass`/`tdClass`(sticky 헤더)·`SkeletonLines`·`SectionError`·`Button` `secondary` 조합. 전 페이지 수집 후 클라이언트 검색이라 `Pagination` 없음. 5열(社員番号·氏名·部署·役職·連絡先), 표 `min-w-[40rem]`로 좁은 폭은 표 영역 가로 스크롤. 役職은 공용 `JobTitleBadge`(2026-11, 로컬 `JOB_TITLE_TONE_BADGE`는 삭제. 배지 모양은 pill로 통일), 미설정은 `messages.common.noValue`(「—」). 連絡先은 `MailIcon`+주소(`break-all`), 미설정은 「—」). 토큰·variant 추가는 5절 8.
- 사원 관리 전용(공용 아님, `app/(app)/admin/users/`, SCR-006, 2026-11): `UsersView.tsx`(페이지 본체. URL Query 동기화·300ms 디바운스·`useMediaQuery('(min-width: 80rem)')`로 xl 이상 표/미만 카드 중 한쪽만 마운트·sm 미만 `Pagination compact`), `EmploymentStatusBadge.tsx`(在籍中 `positive`·入社予定 `info`·無効 `neutral`, pill + 앞 점), `JobTitlesModal.tsx`(役職確認, 단계형 list/form/confirmDelete, 삭제 불가는 `deleteBlocked` 상태(코드 `JOB_TITLE_IN_USE`)), `JobTitleTonePicker.tsx`(`role="radiogroup"` 8색 스와치, 화살표 키 이동, 선택 = 진한 색+체크+외곽선, 스와치는 `JOB_TITLE_TONES`), `UserCreateModal.tsx`·`EmpIdModeField.tsx`(社員ID 自動生成/直接入力)·`UserDetailModal.tsx`·`UserEditModal.tsx`·`UserDeleteDialog.tsx`, `RadioCardGroup.tsx`(라디오 카드 그룹, `EmpIdModeField`·社員編集의 권한·休暇承認·アカウント状態 공용), `userFormRules.ts`(社員ID·社員名·メール 패턴·길이, `validateEmpId/Name/Email`, 서버 오류 → 필드 매핑 `mapUserApiError`. 등록·편집이 공유하며 서버와 같은 규칙(사원명 제어 문자 포함)), `icons.tsx`(이 화면 전용 아이콘, 대시보드 `icons.tsx`와 같은 방식). 원형 아이콘·`FormStack`·boxed 페이지네이션·`StatCard iconCircle`은 5절 12 예외.
- 비밀번호 정책: `lib/password-policy.ts` `checkPasswordPolicy(value)` → 위반 코드(`policy`·`tooLong`) 또는 null(8자 이상·영문+숫자·72바이트 이하, FR-AUTH-003). SCR-009 `PasswordChangeForm`과 SCR-006 社員追加 初期パスワード가 공유하고, 문구는 각 화면이 `messages`에서 매핑한다.
- 출근부 유틸: `lib/attendance-sheet.ts` `parseSheetMonth(value,currentMonth)`(SCR-003 `?month=` 해석, 없음·형식 오류·범위 밖은 이번 달), `formatSheetDate(ymd)`(`2日（月）`, 전각 괄호), `weekdayIndex(ymd)`(0 = 일), `workPatternOf(day)` → `WorkPattern`(판별 유니온 `{kind:'LEAVE',leaveType}` | `{kind:'NORMAL'|'DAY_OFF'|'HOLIDAY'}`, 우선순위 승인 종일 휴가 > 공휴일 > 토·일 > 평일), `approvedFullDayLeave(day)`, `SheetRequestKind`(申請 표시 분류, 현재 `'LEAVE'`만), `toTimelineSegments(day)`(API-ATT-007 일별 행 → `WorkTimeline`의 `segments`·`markerMinute`, 도쿄 기준 work_date 0시부터의 분). 문자열 연산과 UTC만 사용한다.
- 가로 넘침 훅: `lib/useHorizontalOverflow.ts` `useHorizontalOverflow<T>()` → `[ref, overflowing]`(`scrollWidth > clientWidth`, ResizeObserver로 요소와 첫 자식의 크기 변화 추적). 스크롤 가능한 영역만 `tabIndex=0`으로 Tab 순서에 넣을 때 사용(SCR-003 時間帯 영역).
- 미디어 쿼리 훅: `lib/useMediaQuery.ts` `useMediaQuery(query)` → `boolean | null`(`useSyncExternalStore` + `matchMedia`, `change` 이벤트로 갱신). 서버 렌더·hydration 중에는 `null`(미판정)이므로 사용처는 판정 전 로딩 표시를 두고 판정 후 한쪽 화면만 마운트한다. 쿼리 값은 Tailwind 브레이크포인트와 맞춘다(예 SCR-003 `(min-width: 768px)` = `md`).
- 대비 결정: 2.1절의 "성공 = 텍스트 Green 100 + 배경 Green 40"은 대비 약 2.7:1로 WCAG AA 미달이므로, Badge success·danger의 글자색은 General 100으로 한다. 사이드바 그룹 라벨도 3절의 General 60 대신 General 80을 쓴다.

- 타이포 토큰: `text-h4`(Heading 4 32/44, `@theme`의 `--text-h4`)를 로그인·비밀번호 변경 제목에 사용. `text-h5`(Heading 5 24/34, 페이지 제목)·`text-h6`(Heading 6 20/28, 통계 수치)를 같은 방식으로 추가했다. 다른 Heading이 필요해지면 같은 방식으로 추가한다. 2.2절 외 추가 토큰(SCR-002 재현, 5절 6): `text-greeting`(28/36, 대시보드 인사 제목 `sm` 이상) / `text-stat`(36/44, 아이콘 StatCard 수치·출근 시각·잔여 일수 등 큰 수치). SCR-004 재현(5절 7): `text-page-title`(28/36, `PageHeader` 제목 `md` 이상) / `text-page-title-sm`(22/30, `md` 미만) / `text-cal-holiday`(10/14, PC 캘린더 공휴일명) / `text-cal-note`(11/14, 모바일 캘린더 「+N件」) / `text-cal-chip`(10/20, 모바일 캘린더 칩). 화면에서 `text-[…]` 임의 크기는 쓰지 않는다.
- Auth Layout 카드(SCR-001·009): 폭 최대 540, padding 28(`sm` 이상 40), radius 6, `general-40` 테두리 + `shadow-card`.
