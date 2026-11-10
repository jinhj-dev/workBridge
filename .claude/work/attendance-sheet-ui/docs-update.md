# docs-update — 出勤簿 UI/UX 수정 (attendance-sheet-ui)

근거: frontend.md "문서 갱신 예정" + Fix 1 (4). 반영 전 `AttendanceSheetView.tsx`·`Badge.tsx`·`table.ts`·`workPattern.ts`·`lib/attendance-sheet.ts`·`lib/useHorizontalOverflow.ts`·`e2e/attendance-sheet-layout.spec.ts`·`backend/package.json`을 직접 확인.

## 반영한 문서·섹션
- `docs/04_SCREEN_SPECIFICATIONS/SCR-003_ATTENDANCE.md` §4 月間表
  - 日付 행: `11/2(月)` → `2日（月）`(월 없음·앞자리 0 없음·전각 괄호)
  - 勤務パターン 행: Pill 배지와 색(通常 neutral / 休日·祝日 danger / 휴가 success)
  - 申請 행: `종류 상태` → `休暇 {상태}`(종류명은 勤務パターン에만)
  - 마지막 bullet(가로 스크롤) 교체 → 3개 bullet: 좌우 2표·時間帯 영역만 스크롤·2px `general-60` 구분선·행 높이 44/36·왼쪽 줄바꿈 금지 / 오른쪽 행 클릭 선택·그래프 이름 날짜 접두·넘칠 때만 `tabIndex=0` / 바깥 안전망·1024px 2단 스크롤
- `docs/09_DESIGN_SYSTEM.md`
  - §2.3 표 행(compact 36), 배지 행(Pill)
  - §6 `Badge.tsx` 행(`shape`, `BadgeShape`), `table.ts` 행(`compactTdClass`·`compactTdBaseClass`), `attendance/workPattern.ts` 행 신규
  - §6 출근부 유틸 bullet(`formatSheetDate` 형식, `workPatternOf`·`WorkPattern`·`approvedFullDayLeave`·`SheetRequestKind`), 가로 넘침 훅 bullet 신규(`useHorizontalOverflow`)
- `docs/08_TEST_PLAN.md` §7 SCR-003 행: `e2e/attendance-sheet-layout.spec.ts` 검증 항목 추가
- `docs/10_DEVELOPMENT_ROADMAP.md`
  - 최종 갱신일 2026-11-11
  - §2 #5 프론트엔드 SCR-003 항목: UI 개편·Playwright 통과 사실 반영, `[ ]` 유지(리뷰 미해결)
  - §2 #5 후속 과제 4건 추가(`[ ]`): Fix 1 미검증, 스크린샷 경로 `testInfo.outputPath`, 768 시각 확인 근거 없음, E3·E7·헬퍼·224행 주석
  - §2 #10 화면 테스트 SCR-003 부분, E2E 하네스 정비(attendance-status 6건 해소, `db:e2e-leaves-reset` main에도 없음 확인)
  - §3 갱신 이력 2026-11-11 행
- `.claude/work/context.md`: 공용 모듈 53행에 workPattern·Badge pill·compactTdClass·useHorizontalOverflow 추가, 61행 아래 6000 bad port 주의 1줄

## 포트 4000 표기
- `docs/`·README·`.claude/work/context.md`에는 남은 4000 표기 없음(Grep 확인). `.github/workflows/ci.yml:23`은 지시대로 미수정. `.claude/work/*/test-report.md` 등 과거 기록은 이력이라 제외.
