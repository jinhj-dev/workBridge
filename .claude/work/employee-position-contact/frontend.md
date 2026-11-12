# frontend 구현 결과: 所属社員確認 モーダル 役職・連絡先 (employee-position-contact)

## 생성·수정한 파일 (frontend/)
- `src/app/globals.css`(@theme 토큰 4개), `src/components/Badge.tsx`(variant `violet`·`pink`), `src/lib/api/types.ts`(`JobTitleTone`, `DepartmentMember`에 `jobTitle`·`contactEmail`), `src/messages/ja.ts`(`membersModal.jobTitle`·`contact`)
- `src/app/(app)/admin/departments/DepartmentMembersModal.tsx`(5열, `COLUMN_COUNT`, `JOB_TITLE_TONE_BADGE`, 표 `min-w-[40rem]`), `icons.tsx`(`MailIcon`), `DepartmentMembersModal.test.tsx`(헤더 5열, 신규 테스트 4건)
- `e2e/departments-members-modal.spec.ts`(열 수 3→5, 헤더 役職・連絡先 추가, 주석 수정, 스크린샷 경로 `.claude/work/employee-position-contact/screenshots`, 파일명 `fix4-` 접두 제거)

## 구현한 화면
- SCR-010 部署管理 > 所属社員確認 모달: 社員番号·氏名·部署·役職·連絡先(入社日 없음). 役職=tone 배지(GRAY→neutral, BLUE→info, VIOLET→violet, PINK→pink), 없으면 「—」. 連絡先=MailIcon(16px, 장식)+주소(`break-all`), 없으면 「—」(아이콘 없음). 검색은 氏名만 유지.
- 사용 시스템 컴포넌트: Modal, SearchInput, Badge, thClass/tdClass, SkeletonLines, SectionError, modalSecondaryButtonClass, useToast. 신규 시스템 컴포넌트 없음.

## 색 토큰 대비 (Node로 WCAG 상대휘도 계산)
| 토큰 | 값 | 흰 배경 | 자기 배경 |
|---|---|---|---|
| violet-30 / violet-110 | #F1EBFD / #6D28D9 | 7.10:1 | 6.10:1 |
| pink-30 / pink-110 | #FBE8FA / #A21CAF | 6.32:1 | 5.43:1 |
- 모두 AA 4.5:1 충족. Hex는 globals.css에만, 컴포넌트는 토큰 클래스만. 기존 토큰·variant·Primary 변경 없음.

## 화면 리스트와 다른 점
- 없음.

## 문서 갱신 예정
- 04 SCR-010 所属社員確認: 열 구성 5열(入社日 제외), 빈 값 「—」, 모바일 가로 스크롤, L125 "범위 밖" 문구를 入社日만 범위 밖으로
- 09 §2.1: 「추가 토큰 (SCR-010 役職 배지 재현용, 2026-11)」 표 — 위 4개 토큰·용도·대비
- 09 §5: 예외 항목 추가 — 사용자 지시로 役職 배지 색 재현을 위해 색 토큰 4개·Badge variant 2개 추가
- 09 §6 `Badge` 행: `violet`(bg-violet-30 text-violet-110)·`pink`(bg-pink-30 text-pink-110) 추가, 사용처 役職 / 「부서 관리 전용」: `MailIcon`, 모달 구성에 役職 배지(tone→variant 표)
- (Q3) 04 SCR-006·007 役職·連絡先 입력 항목은 미구현 화면이라 구현 시 적용

## impeccable 점검
- 대비 수치 확인, 토큰 hex 오타(#a21cae→#a21caf) 수정, 상태 행 colSpan을 상수화. 설계 훅 지적 없음. 장식 아이콘 aria-hidden, 배지는 텍스트로 정보 전달(색 단독 아님).

## 검증
- `npx tsc --noEmit` 통과, `npm run lint` 통과, vitest(PowerShell) `src/app/(app)/admin/departments`+`src/components` 20파일 247건 통과.
- backend: `npm run build`로 dist 재생성(코드 변경 없음, dist는 Git 제외).

## 화면 확인: 미완료 (블로커)
- 3000/6000에 이미 떠 있던 프론트·백엔드(PID 75808, `dist/main`)가 jobTitle 반영 전 빌드라 API-DEPT-008이 500. Playwright 3건 실패(원인은 이 서버, 코드 아님). 새 빌드로 교체하려 했으나 타인 프로세스 종료 권한이 거부됨.
- 대체로 6001에 새 백엔드(PID 71180)를 띄웠으나 Next dev가 디렉터리당 1개라 프론트 연결 불가. **PID 71180은 제가 띄운 것이니 종료 필요**.
- 캡처 `members-375.png` 1장만 존재(오류 상태 기준이라 비교 불가). 1440/375 캡처·레퍼런스 비교는 서버 교체 후 `npx playwright test e2e/departments-members-modal.spec.ts` 재실행 필요.
- E2E 비밀번호는 셸에서만 로드, 출력·기록 없음.

## Fix 1 (test-report Run 1 / frontend 담당)
- 원인: 모달 max-w 640px(lg)에서 본문 폭(약 584px)이 표 min-w(40rem=640px)보다 좁아 5열 연락처가 우측에서 잘림.
- 수정: `frontend/src/components/Modal.tsx`에 size `xl`(max-w-200 = 800px) 추가(기존 md/lg 값은 불변, 다른 화면 영향 없음). `DepartmentMembersModal.tsx`는 size `lg` -> `xl`. 표 min-w·모바일 가로 스크롤은 유지.
- 근거: 기존 size에 lg보다 큰 값이 없었음. max-w-200은 기존 max-w-160과 같은 Tailwind 스페이스 스케일 유틸리티이며 새 토큰/임의 값(px) 아님.
- 검증: tsc·eslint 오류 없음, vitest(Modal.test + departments) 4 파일 71 테스트 통과(테스트 파일 무수정).
- 화면 확인(포트 3000/6000 기존 서버 사용, 백엔드 별도 기동 없음): 1440에서 다이얼로그 800px, 표 scrollWidth=clientWidth(744, 잘림 없음), 연락처 전체 표시. 375에서 다이얼로그 343px, 문서 가로 오버플로 없음, 표는 가로 스크롤(640/303). screenshots/fix1-1440.png, fix1-375.png.
- 문서 갱신 예정: docs/09_DESIGN_SYSTEM.md Modal 섹션에 size `xl`(최대 800px, 5열 표 등 넓은 표용) 추가.

## Fix 2 — 데스크톱 크기 조정
- 요청: 레퍼런스(refs/01-members-modal.png)에 맞춰 데스크톱 모달이 너무 크다는 지적. 주된 차이는 높이.
- 수정: `DepartmentMembersModal.tsx`의 목록 영역 상한 `max-h-[50dvh]`(임의 값) -> `max-h-80`(20rem, Tailwind 스페이스 스케일. 표 머리글 1행 + 약 5행 + 6번째 행 살짝 노출로 스크롤 단서). 높이 40rem 미만 화면에서는 기존대로 상한 해제(모달 본문 스크롤). 폭은 xl(800) 유지(더 키우지 않음). 공통 Modal·size 값·헤더 아이콘/제목/여백은 무변경(공통 규격이라 이 모달만 바꾸는 범위 밖).
- 근거: 레퍼런스는 행 약 5개에서 끝나는 높이. 행 높이 52px 기준 5행 + 머리글이 320px 안에 들어감. 새 토큰·임의 값 없음.
- 표 머리글 sticky 유지, 내부 스크롤.

### 비교 수치 (개발부 24명, Playwright 실측)
| 뷰포트 | 모달 폭x높이 | 폭 비율 | 높이 비율 | 보이는 행 | 비고 |
|---|---|---|---|---|---|
| 레퍼런스 1448x1086 | 약 880x615 | 61% | 57% | 약 5 | 기준 |
| 이전 1440x900 | 800x710 | 56% | 79% | 8 | |
| 1440x900 | 800x578 | 56% | 64% | 5(+살짝) | 목록 320px |
| 1920x1080 | 800x578 | 42% | 54% | 5 | |
| 1366x600 | 800x568 | 59% | 95% | 본문 스크롤 | 화면 밖 넘침 없음(상한 568=600-32) |
| 375x667 | 343x610 | 91% | 91% | 5 | 가로 오버플로 없음, 표 가로 스크롤 |
- 높이 비율 64%는 레퍼런스(57%)보다 약간 큼. 헤더·푸터가 공통 Modal 여백(pt-7, mt-6 등)이라 이 이상 줄이려면 공통 Modal 변경이 필요해 보류. 레퍼런스 대비 1440 폭 56%는 레퍼런스 61% 이하로 연락처 잘림 없음.
- 캡처: screenshots/fix2-1440x900.png, fix2-1920x1080.png, fix2-1366x600.png, fix2-375x667.png (임시 spec으로 촬영 후 삭제, E2E 비밀번호는 셸 로드만).
- 검증: tsc 통과, lint 통과, vitest(PowerShell) departments+components 20파일 250건 통과(테스트 수정 없음). 개발 서버는 기존 3000 사용, 별도 서버 기동 없음.
- 문서 갱신 예정: 없음(Fix 1의 Modal xl 항목은 유지).

## Fix 3 — 데스크톱 役職·連絡先 헤더
- 폭 문제가 아니었음. 1024·1280·1366·1440·1920 및 768·800·900(데스크톱 최소 구간)에서 다이얼로그 800px(좁은 폭은 768/736), 표 scrollWidth=clientWidth(744 등), 5열 헤더·값 모두 보이고 가로 스크롤 없음(수정 전 실측, screenshots/fix3-before-*.png).
- 원인: Fix 2에서 넣은 `[@media(min-height:40rem)]:max-h-80` 때문에, 뷰포트 높이가 640px(40rem) 미만이면 목록 내부 스크롤이 없어지고 모달 본문이 스크롤됨. sticky 헤더는 목록 래퍼 기준이라 본문 스크롤 시 헤더가 화면 밖으로 사라짐(1280x620에서 th top -681). 노트북·브라우저 확대(125% 등)에서 흔한 높이. 높이 640 이상(1280x700 등)에서는 정상.
- 수정: `DepartmentMembersModal.tsx` 목록 래퍼를 `mt-3 max-h-80 overflow-auto`로 변경(미디어쿼리 제거). 높이와 관계없이 목록은 항상 래퍼 안에서 스크롤하고 sticky 헤더가 유지됨. 모달 xl 800px·max-h-80(약 5행)·열 폭·공통 Modal 무변경. 새 토큰/임의 값 없음(오히려 임의 미디어쿼리 제거).
- 트레이드오프: 매우 짧은 화면(약 560 이하)에서는 모달 본문과 목록의 스크롤이 이중이 됨. 헤더 유지를 우선.
- 폭별 수정 후 확인(Playwright, 개발부 22명): 1024x768, 1280x560, 1280x620, 1366x768, 1440x900, 1920x1080, 1093x614, 768x800 모두 5열 헤더 표시, 목록 스크롤 후에도 헤더 유지(fix3-1280x620-scrolled.png, fix3-1280x560-scrolled.png 등). 모바일 375는 코드 경로 무변경(측정 스크립트가 375 목록 UI에서 확인 버튼을 못 찾아 미촬영, Fix 2 캡처 유효).
- 검증: tsc 통과, lint 통과, vitest(PowerShell) departments+components 20파일 250건 통과(테스트 수정 없음). 임시 spec 삭제, 별도 서버 기동 없음(3000/6000 기존 사용). E2E 비밀번호는 셸 로드만.
- 문서 갱신 예정: 없음.

## Fix 4 — 반응형 레이아웃(테이블/카드, 페이지네이션)
- 수정 파일(frontend/): `src/app/(app)/admin/departments/DepartmentMembersModal.tsx`(전면 개편), `icons.tsx`(`ChevronRightIcon` 추가), `src/lib/api/types.ts`(`DepartmentMember.hireDate`), `src/messages/ja.ts`(`membersModal.hireDate`), `DepartmentMembersModal.test.tsx`, `DepartmentsView.test.tsx`(matchMedia 스텁·멤버 fixture에 hireDate), `e2e/departments-members-modal.spec.ts`. 백엔드·DB·공통 Modal·globals.css·docs 무변경.
- 구조: 헤더 → 부서 배지 → 対象社員 N名+검색 → 목록 → Pagination → 閉じる. 전체 페이지 수집 + 클라이언트 검색 로직 재사용, 클라이언트에서 5명씩 분할(`PAGE_SIZE`). 검색 시 1페이지로 초기화, 페이지 이동은 재조회 없음, 재조회로 건수가 줄면 `Math.min`으로 보정.
- 데스크톱(lg=1024 이상, `useMediaQuery`로 한쪽만 마운트): 6열 표(社員番号·氏名·入社日·部署·役職·連絡先), `table-fixed`+`colgroup` 퍼센트 폭(10/13/13/10/16/38), 연락처·부서 배지는 말줄임+`title`. 모달 xl(800) 유지, 1280·1440에서 가로 스크롤 없음, 이메일 전문 표시(e2e로 검증). 氏名의 아바타 아이콘은 레퍼런스에 없어 폭 확보를 위해 제거(굵은 글씨만).
- 모바일(lg 미만): 카드 `ul/li`. 1행 社員番号+部署名(text-xs), 2행 氏名(굵게)+役職 배지, 3행 入社日：날짜 + 메일 아이콘+연락처(sr-only "連絡先："). 연락처는 길면 줄바꿈(`break-all`)해 잘리지 않음. 입사일·연락처가 없을 때 役職·連絡先은 「—」. 카드 오른쪽 화살표는 **장식 아이콘**(aria-hidden, 버튼/링크 아님): 상세 화면이 아직 없어 클릭 동작을 만들지 않기로 판단(상세 화면이 생기면 카드 전체를 링크로 바꾸는 것을 검토).
- 스크롤: Fix 2의 목록 `max-h-80` 내부 스크롤·sticky 헤더는 폐기(5명 고정이라 불필요). 높이 부족 시 공통 Modal의 본문(`overflow-y-auto`)이 스크롤하고 모달 헤더(제목·X)와 하단 閉じる는 고정(1280x620, 390x844, 375x667에서 검증).
- 사용 시스템 컴포넌트: Modal(xl), SearchInput, Badge(info/neutral/violet/pink), Pagination(변경 없음, 「全N件」 문구 그대로 — 레퍼런스의 「1 – 5 / 18 件」과 다름), thClass/tdClass, SkeletonLines, SectionError, modalSecondaryButtonClass. 신규 시스템 컴포넌트·토큰 없음.
- 화면 리스트와 다른 점: 연락처는 레퍼런스(전화)와 달리 사내 이메일(사용자 결정). 카드의 部署는 레퍼런스에 없으나 요청서에 따라 표시. Pagination 문구 차이(공통 컴포넌트 불변). 카드 전환 임계값 1024는 6열 표가 800px 모달에 들어가는 최소 폭 기준(레퍼런스 예시 768/1280 사이 구간은 카드).
- 문서 갱신 예정: docs/04 SCR-010 所属社員確認(6열·入社日 추가, 1페이지 5명·Pagination, lg 미만 카드, 화살표는 장식), docs/06 API-DEPT-008은 backend 보고대로 hireDate, docs/09 §6 DepartmentMembersModal 구성(표/카드 전환 기준 lg, 5명 페이지네이션). 09 Modal xl 항목은 유지.
- impeccable 점검: 이메일 말줄임이 1440에서 일부 잘려 열 폭을 재배분(연락처 27%→38%), 잘림 없음을 e2e에 추가. 상태(로딩·에러·0건)를 표/카드 공통 `renderStatus`로 통일해 colSpan(6)·중복 제거. 배지 색은 텍스트(역할명)로도 전달, 장식 아이콘 aria-hidden.
- 검증: tsc 통과, eslint 통과, vitest(PowerShell) departments+components+lib 32파일 408건 통과(깨진 5열·전건 표시 기대를 6열·5명/페이지로 갱신, 신규 4건: 5명 분할·검색 시 1페이지 복귀·카드 정보 일치/화살표 비조작·카드 페이지네이션/상태. assertion 약화 없음). Playwright `departments-members-modal.spec.ts` 7건 통과(개발부 24명, 포트 3000/6000 기존 서버, 별도 서버 기동 없음, 비밀번호는 셸 로드만).
- 캡처(screenshots/): fix4-1440.png, fix4-1280x620(.png, -scrolled), fix4-390(.png, -scrolled), fix4-375(.png, -scrolled), fix4-search-1440, fix4-no-result-1440/390/375, fix4-empty-1440, fix4-dev-members-1440. 레퍼런스와 비교: 열 구성·순서, 役職 배지 tone 색, 하단 Pagination·閉じる 배치 일치. 차이: 레퍼런스의 파란 부서 정보 밴드·「1 – 5 / 18 件」·카드 내 구분선·電話 아이콘은 기존 공통 규격(배지 부제·Pagination·이메일)을 유지해 미반영.
- 남은 문제: 레퍼런스 미반영 항목(위), 1024 미만 태블릿은 카드, 매우 낮은 화면(~560)에서는 본문 스크롤로 Pagination이 아래로 밀림(헤더·閉じる는 고정).

## Fix 5 — 모바일 페이지네이션 1줄
- 원인: Pagination이 `flex-wrap`이고 셀이 36px·버튼 px-3이라, 2~중간 페이지(1 … p-1 p p+1 … N 등 최대 9칸)가 모달 본문 폭(320=248px, 375=303px)을 넘어 次へ가 다음 줄로 내려감. 재현: 320 p1·375 p2에서 복수 행(`fix5-before-*.png`). 390은 5페이지 부서에서는 재현 안 됨.
- 변경: `src/components/Pagination.tsx`에 `compact?: boolean`(기본 false) 추가. compact일 때만 ①번호는 처음·끝·현재(양 끝 페이지에서는 안쪽 이웃 1개 추가, 2페이지로 직접 이동 가능) ②셀 높이 36 유지·최소 폭 32·px-1, 前へ/次へ px-2.5, 「…」 폭 w-5 ③`flex-nowrap` gap-0.5. 기존 「…」 규칙(앞/뒤 구분)은 그대로.
- 모달: `DepartmentMembersModal.tsx`가 `useMediaQuery('(max-width: 39.99rem)')`(sm 미만)일 때만 `compact` 전달. 640px 이상·1440은 기존 표시 그대로. 다른 화면(Pagination 사용처)은 compact 미지정이라 영향 없음.
- 「全N件」은 기존대로 번호 줄 아래 별도 줄(번호 줄 1줄 + 총건수 줄). 같은 줄에 넣을 폭이 없어 유지.
- 토큰·전역 CSS·색 변경 없음.
- 테스트: `Pagination.test.tsx`에 compact 3건 추가(기존 assertion 변경 없음). E2E `departments-members-modal.spec.ts`에 `shouldKeepPaginationInOneRowInMobileViewport_320/375/390` 추가(1·2·3·마지막 페이지에서 nav 내 li 상단 좌표 동일, 모달 내 수납, 가로 스크롤 없음). `PAGINATION_SHOT_PREFIX`로 캡처 접두어 지정 가능. 1440 캡처 `fix5-1440.png` 추가.
- 확인: tsc·eslint 무오류, vitest(Pagination·departments) 81건 통과, Playwright 모달 spec 10건 통과(수정 전 코드에서는 320·375가 실패).
- 캡처: screenshots/fix5-{320,375,390}-p{1,2,3,5}.png, fix5-1440.png, 수정 전 fix5-before-*.png.
- 화면 리스트와 다른 점·문서 갱신 예정: 문서 갱신 예정 — 09_DESIGN_SYSTEM.md §Pagination에 `compact` 옵션(스마트폰 폭에서 번호 축약·셀 축소) 추가.

## Fix 6 — 데스크톱 행 화살표
- 요청: 데스크톱 표에도 모바일 카드처럼 각 사원 행 오른쪽에 화살표 추가.
- 수정(`DepartmentMembersModal.tsx`): 표에 7번째 열 추가(각 행 `ChevronRightIcon size-5 text-general-60`, 카드와 동일). 장식 아이콘(svg aria-hidden, 버튼/링크 아님, 클릭 동작 없음). 헤더는 빈 `th`(스크린리더용 텍스트 없음). `COLUMN_COUNT` 6->7(로딩·에러·0건·검색결과 없음 행 colSpan=7). 열 폭 9/12/12/9/15/38/5%(합 100, 화살표 5%, 연락처 38% 유지; 입사일·사번 등은 소폭 축소). 모달 xl 800px·모바일 카드·Pagination(Fix 5)·토큰·전역 CSS 무변경.
- 테스트: 단위 `DepartmentMembersModal.test.tsx`의 colspan 6->7, 열/셀 기대에 빈 7열 반영, 행에 button/link 없음·마지막 셀에 aria-hidden svg 검증 추가(assertion 약화 없음). E2E `departments-members-modal.spec.ts`: columnheader 6->7, 신규 `shouldShowDecorativeArrowOnEachDesktopRow_1024/1280/1440`(각 행 마지막 셀에 aria-hidden svg 1개, 행 내 button/link 0, 가로 스크롤 없음, 이메일 말줄임 없음, 캡처).
- 확인: tsc·eslint 무오류, vitest(PowerShell) departments+components 20파일 257건 통과, Playwright 모달 spec 13건 통과(첫 실행 시 1건은 콜드스타트 로그인 타임아웃으로 실패 후 재실행 통과). 1024·1280·1440에서 가로 스크롤·이메일 잘림 없음. 개발 서버는 기존 3000/6000 사용, 별도 기동 없음. 비밀번호는 셸 로드만.
- 캡처: screenshots/fix6-1024.png, fix6-1280.png, fix6-1440.png.
- 남은 점: 부서 배지가 1024·1280에서 「開...」로 말줄임(Fix 4부터 동일 계열, 폭 5% 열 추가로 소폭 더 좁아짐; 부서명은 title로 확인 가능).
- 문서 갱신 예정: docs/04 SCR-010·docs/09 DepartmentMembersModal 구성에 "데스크톱 표도 각 행 오른쪽 끝에 장식 화살표(7번째 열, 헤더 비움)" 추가.

## Fix 7 — 部署 배지 잘림
- 원인: 部署 열 9%(약 67px)에서 td 패딩·배지 패딩을 빼면 「開発部」도 들어가지 않았고, 連絡先 38%는 여유가 컸음.
- 수정: `DepartmentMembersModal.tsx` colgroup 9/12/12/9/15/38/5% → **9/12/12/16/14/32/5%** (部署 +7, 役職 -1, 連絡先 -6). 모달 폭 xl·화살표 열·모바일 카드·페이지네이션·토큰·전역 CSS 변경 없음. 긴 부서명은 기존대로 말줄임+title.
- E2E: `e2e/departments-members-modal.spec.ts`의 `shouldShowDecorativeArrowOnEachDesktopRow_{1024,1280,1440}`에 部署 열 `span.truncate`가 `scrollWidth<=clientWidth`(말줄임 없음) 검증 추가. 기존 이메일 비말줄임·가로 스크롤 없음 검증은 유지.
- 확인: Playwright 3건 통과(--workers=1), tsc·eslint 오류 없음, vitest departments 3파일 71건 통과(첫 실행에서 1건 실패했으나 재실행 시 전부 통과, 열 폭과 무관한 불안정으로 보임). 캡처 fix7-1024/1280/1440.png 직접 확인: 「開発部」 온전히 표시, 이메일 전체 표시, 가로 스크롤 없음.
- 문서 갱신 예정: 없음.

## Fix 8 — 部署登録 모달 반응형 (코드 구현 완료 / 화면 검증 미완)
- 수정: `frontend/src/app/(app)/admin/departments/DepartmentFormModal.tsx`, `icons.tsx`(UserIcon·DocumentTextIcon 추가), `components/Modal.tsx`(`variant="form"`), `components/form.tsx`(`IconField`·`iconInputClass`·`iconInputTrailingClass`), `components/leave/ApproverSelect.tsx`(`leadingIcon?` — 지정 시 좌 아이콘+우 ▼), `messages/ja.ts`
- 신규 시스템 컴포넌트: `components/FormRow.tsx`(sm 이상 2열 / 미만 1열 행), `components/InfoNotice.tsx`(primary-30 안내 띠)
- 레이아웃: 하나의 모달에서 sm 기준 전환. Modal form variant = radius 16·제목 24/34(모바일 20/28)·설명문·xl(800). footer: sm 미만 2열 전폭(h-11), sm 이상 구분선 아래 우측정렬(h-12). 본문만 스크롤, 헤더·footer 고정(기존 구조).
- 문구: createTitle `部署登録`, 説明/部署責任者 라벨에서 「（任意）」 제거, placeholder 3종, 안내 `notice`, 등록 버튼 `登録`. 説明 카운터 `n / 500`(500 초과 시 danger). 신규 토큰 없음. 취소 버튼은 general-30 배경(`cancelButtonClass`, 모달 내 상수).
- 레퍼런스와 다른 점: (1) **部署コード 행 유지** — API·검증상 필수(CODE_PATTERN, POST code 필수)이므로 삭제 불가, 部署名 위에 `*` 표시로 배치(codeHint 유지). 수정 모달도 동일. (2) 기존 managerHint(「入力欄を空にすると未設定」) 삭제(레퍼런스에 없음), 責任者 검색 입력은 유지(placeholder만 변경). (3) 모달은 xl(800)로 구현(레퍼런스는 뷰포트 대비 과대 비율). 모바일은 중앙 다이얼로그(좌우 8px 여백), 앱 헤더가 비치는 시트형은 아님.
- 테스트: tsc 통과, eslint 통과, vitest(departments·components) 256 통과 / 1 실패 = `DepartmentMembersModal.test.tsx shouldShowJobTitleBadgeAndContactEmailWhenPresent`(`window.matchMedia is not a function`, 이번 변경과 무관한 직전 Fix 범위. 미수정).
- **미완: Playwright 화면 검증·스크린샷(fix8-*.png) 없음.** 로그인에 E2E_ADMIN_PASSWORD가 필요한데 셸에서 `frontend/.env.local` 로드가 권한 분류기에 거부됨(환경변수 미설정). 그래서 1440/390/375 캡처, 가로 overflow, 수정 모달 표시, 등록·취소 E2E 확인을 못 함. Tailwind 클래스 충돌·모바일 줄바꿈은 실화면 확인 필요.
- 문서 갱신 예정: docs/09_DESIGN_SYSTEM.md §6에 `FormRow`·`InfoNotice`·`IconField`·Modal `variant="form"`·ApproverSelect `leadingIcon` 추가, 화면명세 SCR-010 등록 모달 문구(部署登録, placeholder, 안내문, 0/500). (검증 전이라 09는 미수정)

### Fix 8 검증 결과 (재시도)
- 환경변수 로드 허용 후 Playwright 실행. 캡처: screenshots/fix8-1440.png, fix8-1440-edit.png, fix8-390.png, fix8-375.png, fix8-375-scroll.png (레퍼런스 refs/03·04와 비교). 임시 spec(zz-fix8-visual)은 삭제함.
- 1440: 모달 800×707 중앙, 2열(항목명|입력), 아이콘·▼·카운터·안내띠·구분선·우측 버튼 모두 레퍼런스와 일치. 차이: 部署コード 행 추가(필수 항목), 입력 테두리가 레퍼런스보다 약간 옅음(`input-border` 유지), 제목이 레퍼런스보다 가벼움(Bold 24).
- 390/375: 1열, 설명 placeholder 2줄 줄바꿈, 안내문 줄바꿈, 버튼 2열 전폭(375에서 높이 44). 문서·모달·본문 가로 overflow 없음. 375×520 짧은 뷰포트에서 본문만 세로 스크롤(bodyY=true), 헤더·버튼 고정.
- 수정 모달: 같은 레이아웃, 部署コード·기존값·責任者 표시 정상, 버튼 `保存する`.
- 회귀: `e2e/departments*` 35건 전부 통과(등록·수정·삭제·목록 갱신 `shouldCreateEditAndDeleteDepartment` 포함, 테스트 부서는 spec 내에서 삭제). 필수 입력·중복·취소·중복 클릭 방지는 단위 테스트(DepartmentFormModal 19건)로 확인.
- 단위 테스트 실패 원인: `DepartmentMembersModal.test.tsx` 단독 실행 3회 중 1회만 실패(2회 통과), departments 전체 71건 통과 → **간헐 실패(flaky)**. 이 파일은 Modal 기본 variant만 쓰고 이번 변경(variant·ApproverSelect·form.tsx)과 무관. afterEach의 `unstubAllGlobals` 직후 이전 테스트의 비동기 렌더 effect가 `matchMedia`를 호출하는 경합으로 추정. 직전 Fix(所属社員確認)의 테스트 문제로 기록만, 미수정.
- docs/09_DESIGN_SYSTEM.md §6 반영: Modal `variant="form"`, ApproverSelect `leadingIcon`, `FormRow`, `InfoNotice`, `IconField`. 그 외 SCR-010 화면명세 문구(部署登録·placeholder·안내문·0/500)는 문서 갱신 예정.

## Fix 9 — 부서관리 안내 메시지
- 요청: 部署管理 목록 아래 안내 메시지를 部署登録 모달과 같은 파란 배경 디자인으로.
- 수정: `DepartmentsView.tsx` — 기존 `bg-general-30` 회색 상자(InfoIcon+ul)를 공통 `InfoNotice`(primary-30 + 정보 아이콘)로 교체. 문구·줄 수(notes 3줄 + memberCountNote)·ul/li 목록 형태 유지, 아이콘 1개. 쓰지 않게 된 `InfoIcon` import 제거.
- `components/InfoNotice.tsx`: 루트 `<p>`→`<div>`, 내부 `<span>`→`<div>`로 변경(ul을 children으로 받을 수 있게 하기 위한 하위 호환 변경. 시각 변화 없음). 새 토큰·전역 CSS 없음.
- 확인: tsc·eslint 오류 없음, vitest(departments·Modal 7파일) 163건 통과(테스트 수정 불필요). Playwright 캡처 fix9-1440.png / fix9-375.png / fix9-form-regression-1440.png 직접 확인 — 파란 배경·아이콘 정상, 375에서 줄바꿈 자연스럽고 가로 overflow 없음(1440·375 모두 scrollWidth<=innerWidth 검증), 部署登録 모달 표시는 Fix 8과 동일. 임시 spec 삭제함.
- 문서 갱신 예정: 09_DESIGN_SYSTEM.md §6 InfoNotice — children에 목록(ul) 등 블록 요소 허용(루트 div).
