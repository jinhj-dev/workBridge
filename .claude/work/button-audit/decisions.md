# 버튼 공통 패턴 — 사용자 결정 기록 (2026-11-13)

모든 항목을 사용자가 하나씩 확인했고, 모두 권장안으로 결정했다. 근거·조건은 docs/UI_BUTTON_PATTERNS.md §11.

| ID | 결정 | 비고 |
|---|---|---|
| B1 | `Button` 컴포넌트 + `buttonClass()`(Link용) | |
| B2 | Variant 이름은 기존 상수명 유지: primary·secondary·primaryOutline·danger·dangerOutline·ghost·text | |
| B3 | 44px 폐지: 休暇申請·部署を追加·出勤·退勤 → lg 48, 条件をクリア → md 40 | 조건: 단계 4에서 360 PageHeader 한 줄, 헤더 +8, 2px 어긋남, 출퇴근 카드 +4 캡처 확인 |
| B4 | sm 좌우 padding 12 | |
| B5 | lg 좌우 padding 24 | |
| B6 | 버튼 크기 토큰 도입, 별도 커밋, Playwright `toHaveCSS` 검증 | |
| B7 | 터치 영역: sm 36 / 모바일 단독 주 동작 40 / 텍스트·밀집 요소 히트 영역 24 | |
| B8 | 월 이동 버튼만 40으로 통일(간격·라벨 서체는 유지·기록) | |
| B9 | radius: ghost 아이콘(모달 X·벨)만 8, Pagination·StatusFilter·Notice X는 4 유지 + 09에 예외 명시 | |
| B10 | 표 안 수정 버튼은 primaryOutline + Pencil로 통일(勤怠 「修正」 회색 → 파란 테두리) | 조건: 폭 약 20px 증가를 360·1024 캡처로 확인 |
| B11 | 却下 버튼 색 현행 유지 | |
| B12 | 표 안 이름: 화면 이동 = text, 모달 여는 이름 = 현행 유지 | |
| B13 | active 스타일 추가하지 않음 | |
| B14 | 검색 버튼 3곳: lg, 아이콘 없음, `sm` 미만 전폭 | |
| B15 | 단계 1은 `form.tsx` 무변경 가산 | |
| B16 | `className` 오용 방지: ESLint `no-restricted-syntax` + 리뷰 체크리스트 | |
| B17 | `fullWidth` prop 두지 않음(`className="w-full"`) | |
