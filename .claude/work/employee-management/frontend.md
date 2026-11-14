# frontend — SCR-006 社員管理 (승인 피드백 Round 2 반영, PARALLEL)

## 생성·수정 파일
신규(`frontend/src/app/(app)/admin/users/`): page.tsx, UsersView, EmploymentStatusBadge, JobTitlesModal, JobTitleTonePicker, UserCreateModal, EmpIdModeField, UserDetailModal, UserEditModal, UserDeleteDialog, icons.tsx
신규(공용): `components/JobTitleBadge.tsx`(+`JOB_TITLE_TONES`), `lib/password-policy.ts`(`checkPasswordPolicy`)
수정: globals.css(토큰 7개), Badge(lavender·yellow), StatCard(tone violet), PageHeader(`description?`, 줄바꿈), Pagination(`pageSize?`+`messages.pagination.range`), lib/api/types.ts, messages/ja.ts(`users`·`jobTitles`), PasswordChangeForm(정책 검사 공유, 동작 불변), DepartmentMembersModal(공용 JobTitleBadge)

## 구현 화면 / 사용 시스템 컴포넌트
SCR-006 社員管理(메인, 役職確認, 社員追加, 社員詳細, 社員編集, 社員削除). Page/SCR-007 페이지는 만들지 않음.
PageHeader, StatCard, Card, SearchInput, Pagination, Button, Skeleton, SectionError, Modal, FormModal, ConfirmDialog, FormTable, DetailTable, Notice, Select, DateInput, Badge, form.tsx, table.ts(bandTh/Td), Toast, useApiQuery, useSyncedState, useMediaQuery.
신규 시스템 컴포넌트: `JobTitleBadge`(components/). users 폴더 로컬: EmploymentStatusBadge, JobTitleTonePicker, EmpIdModeField.

## 검증 (frontend/)
- `npm run lint`: exit 0 / `npx tsc --noEmit`: 제품 코드 오류 0, 오류 3건은 모두 tester 테스트 파일(`UserDetailModal.test.tsx`·`UserEditModal.test.tsx`의 `role: string` 리터럴 타입)
- `npx vitest run src/components src/app/password src/app/(app)/dashboard src/app/(app)/leaves src/app/(app)/admin/departments`: 전부 통과(JobTitleBadge.test·DepartmentMembersModal.test 포함)
- users 테스트는 아래 "테스트 파일 오류(참고)" 때문에 그대로는 실패. 임시 setup(next/navigation·matchMedia 모의)을 더해 돌리면 42건 중 40 통과, 2건은 테스트 쪽 기대 문제

## 테스트 파일 오류(참고, 고치지 않음 — tester 담당)
1. `JobTitlesModal/UserCreateModal/UserDetailModal/UserEditModal.test`에 `next/navigation`(useRouter) 모의 없음 → `useApiQuery`가 "app router not mounted"
2. `UsersView.test`에 `window.matchMedia` 스텁 없음(SCR-010 테스트 방식 참고). 표/카드는 `useMediaQuery('(min-width: 80rem)')`로 한쪽만 마운트(스텁이 false면 카드)
3. `shouldShowErrorSectionWhenSummaryFails`: 값 「—」은 카드 3개라 `findAllByText` 필요(설계: 값 「—」+SectionError)
4. `shouldShowSelectedJobTitleBadge`: 「マネージャー」가 select option과 배지 둘 다 → 배지 한정 조회 필요
5. 테스트 fixture의 `role: 'ADMIN'` 등은 `as const`/타입 지정 필요

## 설계와 다른 점 / 판단
- 編集·削除는 행 버튼에서 API-USER-003을 먼저 조회(承認待ち件数 포함)한 뒤 `UserEditModal`/`UserDeleteDialog`에 `user: UserDetail`로 전달(tester 테스트의 props 형태에 맞춤). 詳細 모달은 `userId`로 자체 조회
- 표는 xl(1280) 이상, 미만은 카드(design은 lg). lg에서는 사이드바 때문에 8열이 들어가지 않음
- 削除·編集의 LAST_ADMIN 오류: 削除는 토스트, 編集은 폼 위 Notice error(입력값 유지). 削除 확인 안의 Notice 표시는 `ConfirmDialog` 구조상 토스트로 대체
- 社員ID 自動生成의 읽기 전용 표시는 `<input disabled>`가 아닌 텍스트 div(UI_MODAL_PATTERNS 준수)
- 레퍼런스의 淡紫 원형 아이콘은 재현하지 않음(설계 결정). 이미지 파일 자체는 확인 불가, design-frontend.md 기술에 따름

## 문서 갱신 예정
- 09 §2.1: 토큰 `lavender-30/110/100`, `yellow-30/110/100`, `pink-100`(값 #e9eafd/#3f45b8/#8f8aea, #fff6cc/#854d0e/#e0a800, #ec4899). 배지 대비: lavender 6.41, yellow 6.30, 글자 대 흰 배경 7.62/6.85(실측)
- 09 §6: `JobTitleBadge`·`JOB_TITLE_TONES`, Badge variant `lavender`·`yellow`, StatCard tone `violet`, PageHeader `description`, Pagination `pageSize`, 09 §5 SCR-006 레퍼런스 재현 예외
- 04 SCR-006 재작성·SCR-007 모달로 대체, 03 SCR-006·007 행, 10 로드맵
- context.md: `lib/password-policy.ts`, `JobTitleBadge`

## impeccable 점검
Operate 모드(표·폼 중심)라 기존 토큰·패턴 우선. 스와치에 `ring-general-100/15` 안쪽 테두리를 더해 밝은 색(黄·薄紫)의 경계 확보, 선택은 체크+외곽선으로 색 외 신호 제공. 필터 select는 라벨을 위에 두고 높이 44(SearchInput과 정렬).

## 화면 확인
화면 확인: 보류(API 대기, 브라우저 도구 없음). 데스크톱/375px 스크린샷·레이아웃(StatCard 3열 375px, 필터 행, 표/카드 전환) 미확인.

## 소유 범위 밖 수정 필요
없음 (backend.md·API 계약 변경 없음. `CONTRACT_CHANGE` 없음)

## Fix 1 (화면 확인)
- 스크린샷: screenshots/r1-*(수정 전), r2-*(수정 후) — main/titles/create × 1440/1024/390/375. 기존 3000/6000 서버가 이미 기동 중이라 새로 띄우지 않았고 그대로 둠(정지 대상 없음).
- 수정(UsersView.tsx만): (1) 필터 select를 네이티브 화살표 → 공용 Select와 같은 `appearance-none`+커스텀 chevron으로 통일, (2) 필터 행 1행 배치 기준을 lg→xl로 변경(1024에서 검색창이 「社員ID・氏名・メール」로 잘리던 문제, 이제 검색창이 별도 행).
- 확인: 4개 폭 모두 가로 overflow 없음(scrollWidth=innerWidth). 모달은 viewport-32 높이 안에서 내부 스크롤(1440x900 社員追加 확인), 375에서 푸터 고정·본문 스크롤.
- 검증: eslint(UsersView) exit 0, tsc 제품 코드 오류 0(남은 건 tester 테스트 파일 role 타입).
- 남은 차이(의도/시스템 우선): 모달 폼은 FormTable 라벨 열(레퍼런스는 라벨 위 배치, UI_MODAL_PATTERNS 우선), 社員追加 하단 안내 Notice·役職 선택 옆 배지 미리보기 없음, 役職確認의 色選択 패널은 추가/편집 시에만 표시·保存 버튼 없음(승인 사항), Pagination은 번호 버튼 테두리 없는 공용 스타일, 統計 카드 색조는 레퍼런스보다 옅음, 淡紫 원형 아이콘 미재현(설계 결정). 모바일 카드의 이메일은 폭 좁을 때 break-all로 줄바꿈.

## Fix 2 (참조 화상 재현)
변경(모두 기존 외형 불변의 opt-in variant/prop): `Modal`/`FormModal` `iconVariant?:'square'|'circle'`(circle=淡紫 円形 48px), `FormTable.tsx`에 `FormStack`/`FormStackRow`(라벨 위 縦積み・赤 *), `Pagination` `variant?:'default'|'boxed'`(角丸正方形・現在ページ青塗り・< > アイコン(sr-only 文言あり)・左に「全 N 件中 a – b 件」), `StatCard` `iconCircle?`(白い円形台).
users: UserCreateModal을 FormStack으로(社員ID ラジオカード・読取専用欄・info 注記・役職 右にカプセル プレビュー・入社日/初期パスワードも縦積み・下部 Notice는 기존 문구 유지 — 「一覧の『編集』から変更できます」가 사실. 「社員情報」화면은 직원용이라 관리자 편집은 목록 편집), JobTitlesModal(円形アイコン・枠付きテーブル・淡青→淡紫グラデの色選択パネル・8色が1行に収まるスウォッチ(未選択は淡色、選択は濃色+チェック+外枠)・縦区切り+プレビュー), UsersView(編集ボタンを secondary アウトラインに、Pagination boxed、StatCard 円形アイコン台・3枚目は danger=淡ピンク).
확인: r3-main/titles/titleform/create/createbottom × 1440/375(+main·titles·create 1024/390). 4폭 모두 가로 overflow 없음, 모달 본문 내부 스크롤·푸터 고정 확인(社員追加/役職確認 폼 상태). 375 StatCard 라벨 줄바꿈 → 모바일은 아이콘 台 32px로 축소.
검증(frontend/): eslint src exit 0 / tsc 제품 코드 오류 0 / vitest src/components src/app: 662 통과, 40 실패는 모두 users 테스트 5파일(JobTitlesModal·UserCreateModal·UserDetailModal·UserEditModal·UsersView)의 기존 모의 누락(next/navigation·matchMedia, Fix 앞 "테스트 파일 오류"와 동일). Pagination·StatCard·Modal·FormModal·departments·leaves·dashboard 등 기존 회귀 없음.
문서 갱신 예정(09 §6): Modal·FormModal `iconVariant`, FormStack/FormStackRow, Pagination `variant`, StatCard `iconCircle`, 09 §5 SCR-006 레퍼런스 재현 항목.
잔차분: UserEditModal·UserDetailModal은 FormTable/기존 아이콘 그대로(요청 범위 밖, 추후 맞출지 결정 필요). 그 외 승인 사항(入社日・初期パスワード欄, 5桁ID, 休職中なし, 保存ボタンは入力中のみ 등)만.

## Fix 3 (review B1)
決定(ユーザー確認済み): 社員管理画面内でのみ円形アイコン+縦積みを維持し、画面内で統一。他画面は変更なし。
- 高: 社員編集は `Modal iconVariant="circle"` + `FormStack/FormStackRow`(FormTable 廃止)、社員詳細は `iconVariant="circle"`(表は DetailTable のまま、読み取り専用の詳細パターン)、社員削除は `ConfirmDialog` に任意 `iconVariant` を追加して circle を渡す(既定 square のため部署・ダッシュボードは不変)。
- 中: `Pagination` boxed が compact を無視する問題を修正(`boxedCompactCellClass` 追加、高さ36維持・幅縮小)。boxed・`StatCard iconCircle` は SCR-006 限定で維持。
- 中: `users/userFormRules.ts`(パターン・長さ・`validateEmpId/Name/Email`・`mapUserApiError`)を新設し作成/編集が共用。社員名の制御文字検証(サーバーと同じ)を両方に反映(ja.ts `nameInvalidCharacters` 追加)。`users/RadioCardGroup.tsx` を新設し `EmpIdModeField`・編集の旧 `RadioChoice` を統合。
- 低: StatCard `violet` tone 削除。色ラベルを `messages.jobTitles.tones` へ移し `JOB_TITLE_TONES` から `label` を削除。UsersView の `FilterSelect` は共通 `Select` を再利用(`Select` に `size?: 'md'|'sm'` 追加、sm=高さ44・text-sm)。JobTitlesModal の削除ボタン無効化は `deleteBlocked` 状態(エラーコード `JOB_TITLE_IN_USE`)で判定。
- 変更ファイル: components/{Select,StatCard,Pagination,ConfirmDialog,JobTitleBadge}.tsx, messages/ja.ts, users/{UserCreateModal,UserEditModal,UserDetailModal,UserDeleteDialog,EmpIdModeField,UsersView,JobTitlesModal,JobTitleTonePicker}.tsx, 新規 users/{userFormRules.ts,RadioCardGroup.tsx}
- 検証(frontend/): eslint src/components・users exit 0 / tsc の残りは tester のテストのみ / vitest src/components src/app/(app)/admin: 459 通過・9 失敗(すべて JobTitleBadge.test.tsx)
- tester へ: (1) `JobTitleBadge.test.tsx` は `JOB_TITLE_TONES[].label` を参照しているが削除済み。`messages.jobTitles.tones[tone]` で検証し直す(tsc 2件+実行失敗9件)。(2) `StatCard.test.tsx:22` の `tone="violet"` は型エラー(violet 削除)。(3) role・ラベル・props の変更なし(ラジオ・色スウォッチの accessible name は同じ文言)。
- 文書更新予定: UI_MODAL_PATTERNS I-4/D2/禁止リストに「社員管理(SCR-006: 作成・編集・詳細・削除・役職確認)限定の例外」= Modal/FormModal/ConfirmDialog `iconVariant='circle'`(淡紫円形48px)と `FormStack/FormStackRow`(ラベル上の縦積み)を新 variant として明記、適用範囲は users のみ。09 §3 Pagination `variant='boxed'`(compact 併用可、セル高36・幅最小32)と `pageSize`、09 §3 Select `size='sm'`、09 §6 StatCard `iconCircle`(violet は削除=前回の「StatCard tone violet」予定を取り消し)、`JobTitleBadge`/`messages.jobTitles.tones`、users 内 `userFormRules`・`RadioCardGroup`。09 §5 の SCR-006 レファレンス再現例外。
- impeccable 点検: 画面内でモーダルの構造(円形アイコン・縦積み・ラジオカード)を揃えた。フィルタは共通 Select に寄せ見た目は不変。
- 画面確認: screenshots/r4-{main,detail,edit,delete,create,titles}-{1440,375}.png。編集(縦積み・円形アイコン・本文内スクロール・フッター固定)・削除・一覧(フィルタ・boxed)を目視確認、崩れなし。一時 spec は削除済み。
