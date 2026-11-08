# 대시보드 — 프로젝트 문서 반영 결과

근거: backend.md / frontend.md(Fix 1 포함) "문서 갱신 예정", test-report.md Run 2. 반영 전에 해당 코드를 확인함.

## docs/06_API_SPECIFICATION.md
- §0 공통 객체 `Leave`: `processedBy` 설명 추가(처리자 UserSummary 또는 null, 즉시 승인 건은 신청자)
- API-ATT-003: 미출근 시 본문 JSON 리터럴 `null`(application/json)
- API-LEAVE-004: 404에 비UUID `:id` 포함
- API-LEAVE-006: `year` 기본 Asia/Tokyo 올해, 2000~2100 정수, 그 외 400 VALIDATION_ERROR
- API-LEAVE-007: `scope`가 mine/all 외이면 400 VALIDATION_ERROR
- API-LEAVE-008: 에러 표에 404 NOT_FOUND(비UUID 포함) 행 추가(009는 "008과 같음"으로 상속)
- API-LEAVE-009: rejectReason 앞뒤 공백 제거 후 1~500자, 공백 제거한 값 저장

## docs/07_ARCHITECTURE.md
- §3 Authentication: Role Guard는 `@AdminOnly()` 메타데이터 방식, 호출 순서 인증 → 비밀번호 변경 → Role

## docs/09_DESIGN_SYSTEM.md
- §6 표: Modal 행에 제목 id `useId()` 추가. 신규 행 Card, Skeleton/SkeletonLines, SectionError, Badge, StatCard, AppShell, SidebarNav, TopBar, LeaveDetailModal
- §6 하단: `useApiQuery` 설명, Badge 글자색·사이드바 그룹 라벨 대비 결정, 타이포 토큰 `text-h5`·`text-h6`

## docs/03_SCREEN_LIST.md
- 전역 내비게이션: `lg` 미만 햄버거 드로어(배경 클릭·Esc·메뉴 선택 시 닫힘)

## docs/04_SCREEN_SPECIFICATIONS/SCR-002_DASHBOARD.md
- §3: "전역 헤더" → 사이드바+상단바, 좁은 폭 배치(stats 2열/`xl` 4열, 승인 대기 `md` 미만 목록)
- §7: 부여 연차 미등록 판정 `grantedDays === 0`

## docs/10_DEVELOPMENT_ROADMAP.md
- §1 요약표: 인증 완료, 권한 프론트 진행 중, 근태 백엔드 진행 중, 휴가 신청 백엔드·프론트 진행 중, 휴가 승인 백엔드 완료, 대시보드 완료
- §3 로그아웃 UI·로그인 후 이동 [x] → 인증 완료
- §4 Role Guard [x], 라우트 가드는 비관리자 `/admin/*` 미구현이라 [ ] 유지(진행 메모 추가)
- §5 ATT-001~003·시계 유틸 [x], §6 LEAVE-004·006 [x](SCR-004에 상세 모달 완료 메모), §7 LEAVE-007~009 [x], §9 DASH-001·SCR-002 [x]
- §10 화면 테스트: SCR-002 Vitest 51건(화면 19·모달 19·셸 13), Playwright 5건
- §10 화면 테스트: SCR-001 Vitest 18건 → 51건(LoginForm.test.tsx 25·redirect.test.ts 26, 파일에서 it/it.each 케이스 수 확인). 사용자 승인 후 반영
- §3 갱신 이력 1행 추가

## .claude/work/context.md
- 공용 모듈: "아직 없음" 항목을 이번에 추가된 공통 모듈로 갱신(backend.md "context.md 정정")
