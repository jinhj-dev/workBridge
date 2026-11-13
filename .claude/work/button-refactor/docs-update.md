# docs-update — 버튼 공통 UI 패턴 리팩터링 (문서 반영 모드, 2026-11-14)

근거: frontend.md C1~C9·C5 Fix 1·Review Fix 1의 "문서 갱신 예정", design-frontend.md "문서 갱신 예정" 1~4, UI_BUTTON_PATTERNS §10, review.md Round 2(#5), test-report.md Run 1~11. 값은 `Button.tsx`·`form.tsx`·`SearchInput.tsx`·`Modal.tsx`·`globals.css`·`leaveIcons.tsx`로 확인했다.

## docs/09_DESIGN_SYSTEM.md
- §2.3 컨트롤 radius: 예외 추가(Pagination 셀·StatusFilterButtons radius 4, text 버튼 포커스 링 radius 4, B9)
- §2.3 버튼 높이: "Large 48 / Medium 40 / Small 36, `Button` size lg/md/sm, 44 사용 안 함"으로 교체(SCR-004 44 문구 삭제, B3)
- §2.3 신규 행 "버튼 크기 토큰"(`--spacing-btn-*`·`--radius-btn`, B6)
- §3 컴포넌트 Button 행: 구현 variant 7종·size·Light 미구현·UI_BUTTON_PATTERNS 참조로 교체
- §5 10항 "버튼" 줄: 모달 버튼 클래스 → 공통 `Button`(secondary/danger)으로 교체(상수 삭제로 코드와 불일치하게 되어 함께 고침)
- §5 신규 11항 "버튼 공통 패턴(B1~B17)" 요약
- §6 `form.tsx`: `inputClass` 행을 `inputBaseClass`·`inputClass` 행으로 갱신. 버튼 상수 행 삭제(`primaryButtonClass`·`secondaryButtonClass`·`dangerOutlineButtonClass`·`textButtonClass`·`modal*ButtonClass`)
- §6 신규 행 `components/Button.tsx`(`Button`·`buttonClass`·props·크기·토큰·색·접근성, variant/size 의미 차이 주석)
- §6 `Modal`(X = ghost 아이콘 전용 radius 8, footer 판정 표기 `has-[>:only-child]`·`has-[>:nth-child(3)]`), `ConfirmDialog`·`FormModal`(Button 사용), `SearchInput`(44·`inputBaseClass`·pl 40/pr 16·text-sm/5·사용처·사용자 결정), `SectionError`(Button secondary sm), `TopBar`(벨 ghost iconOnly 40·radius 8), `MonthNavigator`(Button secondary iconOnly), `LeaveDayModal`(Button secondary), `leaveIcons`(`PencilIcon` 추가·이동 기록)
- §6 부속 문단: 대시보드 `CardLink`(buttonClass text withIcon), 부서 `icons.tsx` 목록에서 `PencilIcon` 삭제, `DepartmentDetailModal`·`DepartmentMembersModal`의 모달 버튼 클래스 표기 → `Button`

## docs/UI_BUTTON_REFACTOR_PLAN.md
- 머리 상태: v4 단계 1~8 완료
- §8 진행 상태 신설(8.1 단계별 결과 C1~C9·C5 Fix 1(SearchInput 44 사용자 결정)·Review Fix 1, 8.2 단계 7 결과 요약, 8.3 머지 전 미검증 항목, 8.4 후속 과제). 기존 §8 변경 이력은 §9로 이동, v4 행 추가

## docs/10_DEVELOPMENT_ROADMAP.md
- 최종 갱신 2026-11-14
- §2 #10 테스트·품질: 버튼 리팩터링 항목 `[ ]` 추가(테스트 결과, 머지 전 미검증 ①~④, 후속 과제 4건)
- §3 갱신 이력: 2026-11-14 행 추가(미검증 항목 명시)

## docs/04_SCREEN_SPECIFICATIONS (SCR-001·002·003·004·008·009·010)
- 변경 없음. 바뀐 버튼 크기·색 표기가 명세에 없음(SCR-010 행 버튼 36px은 불변, SCR-002 [退勤する] 흰색 아웃라인은 primaryOutline과 일치, SCR-004의 44 표기는 09 §2.3에만 있었음)

## .claude/work/context.md
- 공용 모듈 form.tsx 줄: `inputBaseClass`·`inputClass` 정의 추가, 버튼 상수·`primaryOutlineButtonClass`(미기록) 표기 제거
- 신규 줄: `Button`·`buttonClass`(variant·size·토큰·UI_BUTTON_PATTERNS 준수)
- 휴가 줄: `leaveIcons`에 `PencilIcon` 명시
