# design-frontend: 所属社員確認 모달 役職·連絡先 열 (employee-position-contact)

plan.md 확정 사항(Q3 표시만, Q4 5열, R3 레퍼런스 색 재현·토큰 추가, R4) 기준. 입력 UI·직책 관리 화면 없음.

## 참조 문서
- `docs/04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md` §5 「소속 사원 확인 (所属社員確認 모달)」
- `docs/09_DESIGN_SYSTEM.md` §2.1 「추가 토큰」 표들(형식 참고), §5 예외 항목 6·7(참조 디자인 재현 예외의 선례), §6 「부서 관리 전용」 행(DepartmentMembersModal 구성), `Badge` 행
- 레퍼런스: `.claude/work/employee-position-contact/refs/01-members-modal.png`
- 직전 구현: `.claude/work/department-redesign/frontend.md` Fix 4

## 화면: SCR-010 部署管理 > 所属社員確認 모달 (라우트 `/admin/departments`, 변경은 모달만)
- 열 순서: 社員番号 / 氏名 / 部署 / 役職 / 連絡先 (入社日 없음, Q4 확정)
- 役職: `jobTitle`이 있으면 `Badge`(`variant`는 `jobTitle.tone` 매핑, 텍스트 `jobTitle.name`). 없으면 텍스트 `messages.common.noValue`(「—」)
  - 매핑 상수 `JOB_TITLE_TONE_BADGE: Record<JobTitleTone, BadgeVariant>` = `GRAY→neutral`, `BLUE→info`, `VIOLET→violet`(신규), `PINK→pink`(신규). 모달 로컬(사용처 1곳)에 둔다. shape는 部署 열 Badge와 같은 기본값(`rounded`)
  - 직책명 → 색 고정 매핑은 하지 않는다(색은 서버 tone이 결정). seed 기준 マネージャー=violet, リーダー=info, エンジニア=neutral, デザイナー=pink — 레퍼런스 `refs/01-members-modal.png`와 동일
  - 部署 열도 `info` 배지라 リーダー와 같은 색 — 레퍼런스도 같은 계열, 열이 달라 구분 가능, 허용

## 디자인 시스템 확장 (R3, 사용자 지시 — 09 §5 "새 색 추가 금지"의 예외, 문서 반영 필요)
- 색 토큰 `frontend/src/app/globals.css` `@theme`에 새 블록 추가(주석 「役職バッジ(SCR-010 所属社員確認の参照デザイン再現)」). Hex는 여기에만 쓰고 컴포넌트에는 Tailwind 토큰 클래스만 사용
  | 토큰 | 값 | 용도 | 흰 배경 대비 | 자기 배경 대비 |
  |---|---|---|---|---|
  | `violet-30` | `#F1EBFD` | 보라 배지 배경 | - | - |
  | `violet-110` | `#6D28D9` | 보라 배지 글자 | 약 7.1:1 | 약 6.1:1 (`violet-30` 위) |
  | `pink-30` | `#FBE8FA` | 분홍 배지 배경 | - | - |
  | `pink-110` | `#A21CAF` | 분홍 배지 글자 | 약 6.3:1 | 약 5.4:1 (`pink-30` 위) |
  - 둘 다 WCAG AA 4.5:1 충족. 기존 `violet-100`·`violet-80`은 값·용도 그대로(새 토큰은 같은 계열의 30/110 단계, `success-30/110` 명명 관례)
  - 구현 시 대비를 실제 계산 도구로 재확인하고 결과를 frontend.md에 기록
- `frontend/src/components/Badge.tsx`: `BadgeVariant`에 `'violet' | 'pink'` 추가, `BADGE_VARIANT_CLASS`에 `violet: 'bg-violet-30 text-violet-110'`, `pink: 'bg-pink-30 text-pink-110'`. 테두리 없음(레퍼런스 배지에 테두리 없음, 기존 variant와 동일). 주석에 용도(役職 배지) 한 줄
- 기존 variant·토큰 값 변경 없음 → 다른 화면 영향 없음(추가만)
- 連絡先: 메일 아이콘(16px, `aria-hidden`, `text-general-80`) + 주소 텍스트(`break-all`). 링크(mailto) 아님. 없으면 「—」만(아이콘 없음)
- 빈 값 규칙은 SCR-010 기존 관례(部署責任者·説明 「—」)와 동일
- 헤더 행 sticky·내부 스크롤·로딩/Empty/검색 결과 없음/Error·404 처리는 기존 그대로. 상태 행의 `colSpan`은 열 수 상수(`COLUMN_COUNT = 5`)로 바꿔 열 수와 함께 관리
- 검색: 기존대로 氏名만(placeholder 「社員名で検索」 유지). 役職·連絡先은 검색 대상 아님
- 모바일(`sm` 미만 포함 375px): 표에 최소 폭(예 `min-w-[40rem]`)을 주고 기존 `overflow-auto` 래퍼에서 가로 스크롤. 페이지(`document`) 가로 넘침 없음 유지, 다이얼로그는 뷰포트 안. 카드형 전환은 하지 않는다
- 데스크톱(1440): 모달 `size="lg"` 그대로. 連絡先이 길면 줄바꿈되어도 행이 깨지지 않게 `break-all`

## 사용할 시스템 컴포넌트 (09 §6 이름 그대로)
- `Modal`(size lg, icon, subtitle), `SearchInput`, `Badge`(info: 部署, 役職: tone 매핑 neutral·info·violet·pink), `thClass`/`tdClass`, `SkeletonLines`, `SectionError`, `modalSecondaryButtonClass`, `useToast`
- 신규 컴포넌트 없음(Badge variant 2개만 추가). 메일 아이콘은 화면 로컬 `app/(app)/admin/departments/icons.tsx`에 `MailIcon` 추가(기존 규칙: 24 viewBox·`currentColor`·선 1.75·`aria-hidden`)

## 상태·데이터
- 타입 `frontend/src/lib/api/types.ts`: `JobTitleTone = 'GRAY' | 'BLUE' | 'VIOLET' | 'PINK'`, `DepartmentMember`에 `jobTitle: { id: string; name: string; tone: JobTitleTone } | null`, `contactEmail: string | null`
- 조회 흐름(전 페이지 수집·id 중복 제거·스냅샷)은 변경 없음
- 문구 `frontend/src/messages/ja.ts` `departments.membersModal`에 `jobTitle: '役職'`, `contact: '連絡先'`(필요 시 `contactIconLabel` 없이 아이콘은 장식). 하드코딩 금지

## 호출 API
- `GET /admin/departments/:id/members`(API-DEPT-008) — 항목에 `jobTitle {id,name,tone} | null`·`contactEmail | null` 추가. 상세는 design-backend.md

## 생성·수정할 파일
- 수정: `frontend/src/app/globals.css`(토큰 4개), `frontend/src/components/Badge.tsx`(variant 2개), `frontend/src/app/(app)/admin/departments/DepartmentMembersModal.tsx`, `.../DepartmentMembersModal.test.tsx`, `.../icons.tsx`(MailIcon), `frontend/src/lib/api/types.ts`, `frontend/src/messages/ja.ts`, `frontend/e2e/departments-members-modal.spec.ts`(열 수 3→5, 주석 "役職・連絡先・入社日の列は無い" 수정, 스크린샷 경로를 `../.claude/work/employee-position-contact/screenshots`로)
- 재사용: `components/table.ts`, `components/Modal.tsx`
- 영향 확인: `BadgeVariant`를 `Record`로 망라하는 곳(Grep `Record<BadgeVariant`·`BADGE_VARIANT_CLASS`)이 있으면 타입 오류 없는지 `tsc`로 확인

## 문서 갱신 예정 (frontend.md에 구현 결과 기준으로 기록)
- 04 SCR-010 所属社員確認 표 열 구성·빈 값·모바일 가로 스크롤, L125 "범위 밖" 문구 정리(入社日만 범위 밖으로)
- 09 §2.1: 「추가 토큰 (SCR-010 所属社員確認 役職 배지 재현용, 2026-11)」 표 신규 — `violet-30`·`violet-110`·`pink-30`·`pink-110` 값·용도·대비(기존 추가 토큰 표 형식)
- 09 §5: 예외 항목 추가(다음 번호) — 사용자 지시로 役職 배지 레퍼런스 색 재현을 위해 색 토큰 4개·Badge variant 2개 추가
- 09 §6 `Badge` 행: variant 목록에 `violet`·`pink`(배경·글자 토큰)와 사용처(役職) 추가 / 「부서 관리 전용」 icons 목록에 `MailIcon`, DepartmentMembersModal 구성에 役職 `Badge`(tone→variant 매핑표 GRAY·BLUE·VIOLET·PINK)
- (Q3) 04 SCR-006 등록 모달·SCR-007 기본 정보에 役職(직책 목록에서 선택, 선택)·連絡先(선택) 입력 항목과 검증 문구 추가 — 미구현 화면이므로 구현 시 적용(직책 목록 API는 미정)
