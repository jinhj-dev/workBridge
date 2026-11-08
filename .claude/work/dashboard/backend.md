# 대시보드 — 백엔드 구현 결과

## 파일 (모두 `backend/` 기준)
- 신규 공통: `src/common/time/{clock,time.module,tokyo-date}.ts`, `src/common/pagination/pagination.ts`(+`toSkipTake`), `src/common/mappers/user-summary.ts`(`USER_SUMMARY_SELECT`, `toUserSummary`)
- 신규 Role Guard: `src/modules/auth/decorators/admin-only.decorator.ts`, `src/modules/auth/guards/admin.guard.ts`
- 신규 모듈: `src/modules/attendance/`(module·controller·service·repository·mapper), `src/modules/leaves/`(module·controller·service·repository·leave.mapper·leave-rules, dto 3개), `src/modules/dashboard/`(module·admin-dashboard.controller·service·repository)
- 수정: `src/app.module.ts`, `src/modules/auth/auth.module.ts`, `src/modules/auth/guards/jwt-auth.guard.ts`(인증 → PasswordChange → Admin 순서)
- 미작성(테스트 담당): 설계의 `*.spec.ts`·`test/*.e2e-spec.ts`·`db-helpers` 헬퍼. **`guards.spec.ts`는 JwtAuthGuard 생성자 4번째 인자(AdminGuard)가 추가돼 tsc 오류 1건 + unit 2건 실패** → tester가 `new AdminGuard(new Reflector())` 전달로 갱신 필요
- 검증: build·eslint·prettier 통과, unit은 위 2건 외 통과. 임시 e2e 스모크(실행 후 삭제)로 9개 API의 정상·에러 응답 확인. `@Query({ schema })`는 Nest 기본 지원이라 파이프 추가 없음

## API 요약 (prefix `/api/v1`, 전부 Bearer 필수, mustChangePassword → 403 PASSWORD_CHANGE_REQUIRED)
- `GET /admin/dashboard/summary` ADMIN → `{date, clockedInCount, notClockedInCount, onLeaveCount, pendingLeaveCount}`. 비ADMIN 403 FORBIDDEN(`/ADMIN/...` 대소문자 변형도 403)
- `POST /attendance/clock-in` → 201 `Attendance` / 409 ALREADY_CLOCKED_IN(동시 요청 P2002도 동일)
- `POST /attendance/clock-out` → 200 `Attendance` / 409 NOT_CLOCKED_IN, ALREADY_CLOCKED_OUT
- `GET /attendance/today` → 200 `Attendance` 또는 본문 `null`(application/json)
- `GET /leaves/balance?year=` → `{year, grantedDays, approvedDays, pendingDays, remainingDays}` / year 2000~2100 정수 외 400
- `GET /leaves/pending-approval?scope=mine|all&page&limit` → 페이지네이션 `Leave[]`(created_at DESC, id DESC) / scope·limit 오류 400, 비ADMIN scope=all 403
- `GET /leaves/:id` → `Leave` / 비UUID·없음 404, 권한 없음 403
- `PATCH /leaves/:id/approve` → `Leave` / 404, 403(본인 신청 또는 비할당·비ADMIN), 409 ALREADY_PROCESSED
- `PATCH /leaves/:id/reject` body `{rejectReason}`(trim 후 1~500자, trim된 값 저장) → `Leave` / approve 에러 + 400(details field `rejectReason`)
- 에러 message: 설계 문구 그대로(ALREADY_CLOCKED_IN 등 4종)

## API 문서와 다른 점
- 없음(아래 DOC_ISSUES는 06에 명시가 없던 부분을 설계대로 정한 것)

## 문서 갱신 예정
- `docs/06_API_SPECIFICATION.md` §0 공통 객체 `Leave`: `processedBy`는 처리자 `UserSummary` 또는 null(즉시 승인 건은 신청자)
- 06 API-ATT-003: 미출근 시 응답 본문은 JSON 리터럴 `null`(200)
- 06 API-LEAVE-004/008/009: `:id`가 UUID 형식이 아니면 404 NOT_FOUND
- 06 API-LEAVE-006: `year`는 2000~2100 정수, 그 외 400 VALIDATION_ERROR. 기본값은 Asia/Tokyo 기준 올해
- 06 API-LEAVE-007: `scope`가 mine/all 외이면 400 VALIDATION_ERROR
- 06 API-LEAVE-009: rejectReason은 앞뒤 공백 제거 후 1~500자
- `docs/07_ARCHITECTURE.md` §3 Role Guard: `@AdminOnly()` 메타데이터 방식(경로 매칭 아님), JwtAuthGuard가 인증 → 비밀번호 변경 → Role 순으로 호출
- `docs/10_DEVELOPMENT_ROADMAP.md`: §4 Role Guard, §5 ATT-001~003·시계 유틸, §6 LEAVE-004·006, §7 LEAVE-007~009, §9 DASH-001 — 테스트·리뷰 통과 후 체크

## 프론트엔드가 알아야 할 것
- 환경변수·CORS 변경 없음. 인증은 기존 `apiFetch`(Bearer) 그대로
- `/attendance/today`는 `null`을 받을 수 있음(미출근). 일시는 `+09:00` 초 단위 문자열, 날짜는 `YYYY-MM-DD`
- 승인/반려 버튼 표시 규칙은 `canProcessLeave`와 동일: 본인 신청이 아니고(approverId = 나 또는 ADMIN) 그리고 status = PENDING

## 참고
- 새 시각은 `Clock`(전역 TimeModule) 주입으로 얻는다. 테스트에서 `overrideProvider(Clock)`로 고정 가능
- e2e 실행 시 pg의 `client.query() when already executing` DeprecationWarning이 1회 출력됨(동작 영향 없음, Prisma 어댑터 쪽)

## context.md 정정
- 없음(§41 "아직 없음" 중 Role Guard·시계·도쿄 날짜 유틸·페이지네이션 공통 처리는 이번에 추가됨 → 공용 모듈 목록 갱신 필요)
