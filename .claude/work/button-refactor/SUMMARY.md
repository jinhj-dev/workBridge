# 버튼 리팩터링 — 아침 확인용 요약 (2026-11-14)

> MODE: FULL(공통 컴포넌트·토큰·대규모). 설계는 사용자 승인 후 진행. 사용자 취침 중 "끝나면 커밋·푸시·PR" 지시에 따라 PR까지 작성.
> 브랜치 `feature/button-refactor` (기준 main). 청크마다 로컬 커밋.

## 결과
| 단계 | 결과 |
|---|---|
| 설계 | architect: C1~C9 청크, BACKEND·SECURITY SKIP, PARALLEL NO |
| 구현 | C1 Button·ESLint → C2 토큰 → C3 SectionError → C4 모달 → C5 페이지 주 버튼 → C6 표 안 버튼·링크 → C7 벨·월 이동 → C8 4폭 검증(수정 없음) → C9 form.tsx 버튼 상수 삭제 |
| 테스트 | Run 1~11 최종 PASS: Vitest 54파일 801건, tsc·lint 0, 읽기 전용 Playwright 6 spec 68건 |
| 리뷰 | Round 1 CHANGES_REQUESTED(중간 5·낮음 4) → 수정 → Round 2 APPROVE |
| 보안 | SKIP (UI만) |
| 문서 | 09, UI_BUTTON_REFACTOR_PLAN v4, 10 로드맵, context.md (docs-update.md) |

## 진행 중 사용자 결정
- C5: 검색창(SearchInput)이 코드상 44px인데 클래스 충돌로 실제 48px였던 기존 문제 → "코드 의도대로 44px"로 수정

## 머지 전 미검증 (리뷰 #5, 개발 DB 쓰기 승인 없음)
1. DB에 쓰는 e2e: login, password, dashboard, dashboard-renewal, approvals, departments 계열 5개, leaves, leave-management, leave-calendar-mobile, attendance, attendance-status
2. `npm run test:e2e` 전체
3. E4 키보드 도달 확인
4. `npm run build` (C2 시점 1회만 통과. 이때 frontend가 3000 dev 서버의 `.next`를 덮어썼을 수 있음 → 이상하면 dev 서버 재시작)

## 후속 과제 (범위 밖, 기록만)
- `LeaveHistoryList` `dateInputClass`가 `inputClass`와 클래스 충돌(h-11 vs h-12 등)
- `iconInputClass` `pl-11`과 `inputClass` `px-4` 중복
- leave-visual `shouldCaptureScrolledBottomAtPc1440` 간헐 실패(변경 전부터)
- SCR-009 キャンセル이 제출 중에도 활성
- 미측정: 승인·부서 카드형 행 줄바꿈, 모달 9종 중 5종, 긴 확정 문구 줄바꿈

## 문서 위치
- `.claude/work/button-refactor/` (plan, design-frontend, test-plan, frontend, test-report, review, docs-update, metrics)
- 측정 원본 `screenshots/c8/measurements.jsonl` (PNG는 git 무시)
