# frontend 구현 결과: 휴가 신청 공통 모달화 + 이력 상태·종류 토글 필터

## 파일 (frontend/)
신규: `src/components/leave/LeaveApplyModal.tsx`(+`.test.tsx`, 기존 LeaveApplyForm 테스트 이전·수정 + 라디오/취소/닫힘 시 승인자 미조회 4건 추가), `src/components/leave/LeaveFilterButtons.tsx`(+`.test.tsx` 4건)
삭제: `src/app/(app)/leaves/LeaveApplyForm.tsx`, `LeaveApplyForm.test.tsx`
수정: `leaves/LeavesView.tsx`(+test), `leaves/LeaveHistoryList.tsx`, `dashboard/LeaveBalanceSection.tsx`, `dashboard/DashboardView.test.tsx`, `src/lib/leave-days.ts`(+test), `src/messages/ja.ts`, `e2e/leaves.spec.ts`

## 구현 화면과 시스템 컴포넌트
- SCR-004 `/leaves`: Page Header(제목 + [休暇申請]) → 요약(StatCard) → 이력(Card, 연도 select + 상태 토글 + 종류 토글, 표/모바일 목록, Pagination) → LeaveDetailModal → LeaveApplyModal. 탭 삭제, `tab` 파라미터는 무시
- SCR-002 `/dashboard` 휴가 현황: 신청 Link → button, LeaveApplyModal 열기. 성공 시 모달 닫기 + 휴가 현황 reload, 화면 이동 없음
- 공통 휴가 신청 모달: 종류 Radio(fieldset/legend, 5종, 초기 미선택), 시작일·종료일, 理由, ApproverSelect. footer [キャンセル](textButtonClass) [申請する](primaryButtonClass, `form=` 연결, 요청 중 Spinner)
- 사용: Modal, Card, Badge(`BADGE_VARIANT_CLASS`), StatCard, Skeleton, SectionError, Pagination, ApproverSelect, form.tsx(labelClass/inputClass/textareaClass/selectClass/primaryButtonClass/textButtonClass/FieldError), Spinner, Toast, `LEAVE_STATUS_BADGE`
- 이동 규칙: 신청 성공 → 연도=시작일 연도, 상태·종류 필터 해제, 1페이지. 이동 URL이 현재와 같으면 `history.reload()`

## 새 시스템 컴포넌트
- `components/leave/LeaveApplyModal.tsx`, `components/leave/LeaveFilterButtons.tsx`

## 화면 리스트와 다른 점
- 종류 라벨: 설계는 「休暇の種類」였으나 기존 `leaves.apply.leaveType`(「休暇種別」)과 표 헤더 `leaves.history.leaveType`을 재사용(신규 문구 방지, 화면 내 용어 통일)
- 신청 버튼 문구: 모달 footer는 `leaves.apply.submit`을 「休暇を申請」→「申請する」로 변경(제목과 중복 회피). 대시보드 버튼은 기존 `dashboard.leave.apply` 유지
- 오류 표시: `aria-invalid`는 radio에 쓸 수 없어(lint) fieldset에 둠

## 문구 (ja.ts)
삭제 `leaves.tabsLabel/tabApply/tabHistory`, `apply.leaveTypePlaceholder`. 추가 `leaves.applyButton`, `leaves.apply.cancel`, `leaves.history.filterHint`. `leaves.history.status`는 토글 라벨로 재사용

## 문서 갱신 예정
- design-frontend.md "문서 갱신 예정" 전 항목 그대로(SCR-004 §1·3·3.2·3.3·4.1, SCR-002 §3-4, 03_SCREEN_LIST 3곳, 08 SCR-004 행, 10 로드맵)
- `docs/09_DESIGN_SYSTEM.md` §6 표 추가: `LeaveApplyModal({open,onClose,onApplied,onBalanceStale?})` — Modal 사용, 열 때마다 초기화하려면 사용처에서 `key` 변경, 후보 조회는 open 시에만, 종류 Radio는 20px(`size-5`)·`accent-primary-100`·focus-visible outline `primary-100`. `LeaveFilterButtons({idPrefix,label,options,optionLabel,variantOf,selected,onChange,describedBy?})` — StatusFilterButtons와 같은 스타일·접근성의 제네릭판(상태=배지색, 종류=neutral). §6 유틸 줄: `parseLeavesQuery`는 `{year,statuses,leaveTypes,page}`(`tab` 해석 삭제, `status`/`leaveType` 쉼표 구분), `LEAVE_TYPES` 추가. SCR-004 행의 탭 언급 삭제
- `docs/06_API_SPECIFICATION.md` API-LEAVE-003: backend.md 기재대로

## impeccable 점검
- 모바일: 헤더 버튼은 `sm` 미만에서 제목 아래 높이 48, 토글 그룹은 flex-wrap, 모달은 `calc(100%-2rem)`. 필터 안내는 두 그룹 공통 1개로 줄여 시각 소음 감소. 토큰 외 값 사용 없음
- 안내 문구는 두 그룹 아래에 두되 `-mt-2`로 그룹과 묶음

## 검증
- `tsc --noEmit` 통과, eslint 0 경고, vitest 22 파일 349 통과. Playwright(e2e)는 개발 서버·DB 필요로 미실행(spec만 수정)
- prettier --check는 기존 파일도 대량 경고(줄바꿈 CRLF 추정)라 판단 보류
- 화면 확인: 생략 (도구 없음). ApproverSelect 드롭다운이 `<dialog>` 안에서 잘리는지는 **미확인**(모달 폭 420 고정). 실화면에서 확인 필요
- 임시 처리: 없음. 백엔드 수정 필요: 없음(400 `details[].field`는 `status.N` 형식이나 이력 화면은 필드 오류를 표시하지 않아 영향 없음)

## Fix 1 (review.md frontend 担当: 高1・低4)
- [高] `LeavesView.tsx` handleApplied: 比較基準を URL 文字列から「履歴 API パス」に変更。`buildHistoryPath()` を切り出し、移動先 URL を `parseLeavesQuery` で解釈して現在の `historyPath` と同じなら `history.reload()`。URL が違えば別途 `router.push`(`?tab=apply` など旧 URL は整理される)。範囲外の年(低・65-70行)も解釈後は今年に戻るため同じ分岐で再取得される。テスト `shouldReloadHistoryAndCleanUrlWhenOldTabUrlHasSameHistoryPath` 追加
- [低] ja.ts: `leaves.apply.cancel` 削除、`LeaveApplyModal` と test は `messages.common.cancel` を使用
- [低] prettier: LeaveHistoryList / LeavesView(+test) / LeaveApplyModal に `prettier --write`(LF/CRLF は維持。変更は対象ファイルのみ)
- [見送り] LeaveApplyModal の「要求中に閉じて再度開く」: 旧インスタンスの `onApplied` を止めると、成功した申請の履歴・残日数の再取得が漏れるため。副作用(新しいモーダルが閉じる)は稀で軽微なので現状維持。必要なら別途、onApplied と onClose の分離で対応
- 検証: tsc 通過、eslint 0、vitest(leaves/components/leave/dashboard 7 ファイル 137 件)通過。e2e 未実行
- 文書: 更新予定の変更なし(09 の LeaveApplyModal 記述は不変)
