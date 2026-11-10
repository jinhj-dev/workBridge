# docs-update (employee-hire-date)

기준: docs-proposal.md(1/7~7/7, 문서별 사용자 승인). 제안에 없는 변경은 하지 않았다.

| # | 문서 | 반영한 섹션 |
|---|---|---|
| 1 | docs/05_DATABASE_DESIGN.md | §2 users 컬럼 표(hire_date 행), §2 Constraints 아래 2026-01-01 메모, §9 DATE 컬럼 목록([선택] 승인) |
| 2 | docs/06_API_SPECIFICATION.md | §5 API-USER-001(Query·hireDateFrom/To 규칙·정렬·응답 예시), API-USER-002(Request 예시·필수·hireDate 규칙), API-USER-004(Request·hireDate 규칙). API-USER-003 변경 없음 |
| 3 | docs/02_REQUIREMENTS.md | FR-USER-001(검색 조건·등록 항목·입사일 필수 1줄), FR-USER-002(수정 항목) |
| 4 | docs/04_SCREEN_SPECIFICATIONS/SCR-006_USER_LIST.md | §3 입사일 기간 행, §4 정렬, §5 사원 조회 5번(초안 4항목 → §3 참조), §5 등록 입사일 설명, §6 시작일 ≤ 종료일([선택] 승인), §10 정렬. 사용자 초안의 나머지는 유지 |
| 5 | docs/04_SCREEN_SPECIFICATIONS/SCR-007_USER_DETAIL.md | §3.1 입사일 행, §6 입사일 필수 |
| 6 | docs/08_TEST_PLAN.md | §7 SCR-006 행, SCR-007 행([선택] 승인). MIG 확인은 넣지 않음(안 1) |
| 7 | docs/10_DEVELOPMENT_ROADMAP.md | §3 갱신 이력 1행 추가만. 체크박스·§1·기능 8 상태·최종 갱신일 변경 없음 |

작업 문서: test-plan.md SEED-HD-01 기대 결과를 고정 2026-01-01로 수정.
context.md 문서 맵: 새 문서 없음 → 변경 없음.
