# backend 구현 결과: 휴가관리 통합

## 생성·수정 파일 (모두 backend/)
- 신규 `src/modules/leaves/dto/leave-calendar-query.dto.ts`, `dto/comma-separated-enum.ts`, `leave-calendar-rules.ts`, `leave-calendar-rules.spec.ts`
- 수정 `src/modules/leaves/leaves.controller.ts`, `leaves.service.ts`, `leaves.repository.ts`, `dto/my-leaves-query.dto.ts`, `dto/pending-approval-query.dto.ts`
- 수정 `src/common/time/tokyo-date.ts`: `tokyoDayStart(ymd)`, `tokyoNextDayStart(ymd)` 추가 (신청일 도쿄 날짜 범위 변환용. 설계의 "tokyo-date.ts 변환 사용"을 위한 최소 추가)
- 신규 `test/leave-calendar.e2e-spec.ts`(17건: 캘린더 + 승인 목록 status + 이력 신청일 범위)
- 신규 `prisma/e2e-leave-calendar-fixture.ts` + `package.json` `db:e2e-leave-calendar-fixture` (`-- --month=YYYY-MM`, 기본 이번 달)
- DB 변경·마이그레이션 없음

## API 요약
- `GET /leaves/calendar` (로그인 전원). Query `month`(YYYY-MM, 2000~2100, 생략 시 도쿄 이번 달)·`departmentId`(UUID)·`name`(trim, 최대 100, 대소문자 무시 부분 일치)·`empId`(trim, 최대 50, 부분 일치), AND 결합
  - 200 `{month, holidays[{date,name}], items[{name,empId,departmentName,startDate,endDate,category(PAID|SPECIAL|OTHER),halfDay(AM|PM|null)}]}`. 페이지네이션 없음
  - 대상: APPROVED + 활성 사원 + 월과 기간 겹침. 정렬 startDate → empId → endDate → leaveType. SELECT 단계에서 공개 7필드만 읽음
  - 에러: 400 VALIDATION_ERROR(field=month/departmentId/name/empId), 401, 403 PASSWORD_CHANGE_REQUIRED
- `GET /leaves/pending-approval` 확장: `status`(PENDING/APPROVED/REJECTED 쉼표 복수, 생략 시 PENDING). `CANCELLED`·미정의 값은 400(`status.N`). `scope=all`은 `approverId IS NOT NULL` 추가(즉시 승인 제외). 권한 판정 코드 불변
- `GET /leaves/me` 확장: `appliedFrom`/`appliedTo`(실재 YYYY-MM-DD, 양끝 포함, 한쪽만 가능, 도쿄 날짜 기준 created_at). from > to이면 400(field `appliedTo`). `year`·status·leaveType 호환 유지
- 쿠키/토큰 처리 변경 없음

## API 문서와 다른 점
- 없음

## 문서 갱신 예정
- `docs/06_API_SPECIFICATION.md` §4: API-LEAVE-010 신규 추가(위 요약 그대로, 권한 USER, NFR-002 페이지네이션 예외 명기). API-LEAVE-007에 Query `status` 및 `scope=all` 조건 추가. API-LEAVE-003에 Query `appliedFrom`/`appliedTo` 및 400 조건 추가
- `docs/02_REQUIREMENTS.md`: FR-LEAVE-005에 공유 캘린더 공개 규칙(APPROVED·활성 사원만, 공개 7필드, category 마스킹으로 휴가 종류 비공개). FR-LEAVE-003에 처리 완료 목록(status) 조회 범위(본인 할당분, ADMIN 전체는 승인자 있는 건)
- `docs/08_TEST_PLAN.md`: API-LEAVE-010 IT 케이스(401/403/400/비공개 상태 제외/비활성 제외/월 걸침/필터 AND/부서 미존재)와 권한 매트릭스 추가
- `docs/10_DEVELOPMENT_ROADMAP.md`는 reviewer 후 architect가 갱신

## 프론트엔드가 알아야 할 것
- 환경변수·CORS·인증 헤더 변경 없음
- 승인 탭 건수는 `status=X&limit=1`의 `totalCount`로 조회. 월 걸침 휴가는 `startDate`/`endDate`가 월 밖일 수 있음
- 개발 확인: `npm run db:sample-users` → `db:e2e-accounts` → `db:e2e-leave-calendar-fixture`(미실행, 개발 DB 필요)

## 검증
- `npx tsc --noEmit`, `npm run lint` 통과. 단위(leaves) 33건 통과. e2e: leave-calendar 17건 + leaves + leave-requests 통과(전체 106건 중 이 3파일 실행)
- 픽스처 스크립트는 타입체크·lint만 통과, 실제 DB 실행은 하지 않음

## context.md 정정
- 없음 (추가: `common/time/tokyo-date.ts`에 `tokyoDayStart`·`tokyoNextDayStart`, `leaves/dto/comma-separated-enum.ts`, `leaves/leave-calendar-rules.ts`)
