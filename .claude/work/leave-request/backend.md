# backend 구현 기록: 휴가 신청·조회·취소

## 생성·수정 파일
수정 (모두 `backend/` 하위)
- `src/modules/leaves/leaves.controller.ts` — `create`, `listApprovers`, `listMine`, `cancel` 추가 (고정 경로 → `:id` 순)
- `src/modules/leaves/leaves.service.ts` — 위 4개 + `resolveApprover`(private)
- `src/modules/leaves/leaves.repository.ts` — `createWithUserLock`(FOR NO KEY UPDATE 트랜잭션, 콜백에 `LeaveCreationTx` 제공), `findApprovers`, `findByUser`, `cancelIfCancellable`; 합계 조회를 `groupDeductibleDays`로 공용화
- `src/modules/leaves/leave-rules.ts` — `countLeaveDays`, `validateLeavePeriod`, `isLeaveConflict`, `isDeductibleLeaveType`, `DEDUCTIBLE_LEAVE_TYPES`(repository에서 이동)
- `src/modules/leaves/leave-rules.spec.ts` — 규칙 단위 테스트 10건 추가
- `prisma/e2e-account-data.ts` — `resetE2eAdminLeaves`
- `package.json` — `db:e2e-leaves-reset`
신규
- `src/modules/leaves/dto/create-leave.dto.ts`, `my-leaves-query.dto.ts`, `approvers-query.dto.ts`
- `prisma/e2e-leaves-reset.ts`
- `test/leave-requests.e2e-spec.ts` (16건)

## API 요약 (06 §4와 일치)
- `POST /api/v1/leaves` → 201 `Leave`. 승인 필요: PENDING+approver. 불필요: APPROVED, approver=null, autoApproved=true, processedBy=신청자(approverId 무시)
  - 400 `VALIDATION_ERROR`(형식·존재하지 않는 날짜·reason trim 후 1~500자), 400 `INVALID_DATE_RANGE`(사유별 message), 400 `NO_WORKING_DAYS`, 400 `APPROVER_REQUIRED`, 400 `INVALID_APPROVER`(UUID 아님·본인·미존재·비활성), 401(잠금 후 비활성/행 없음), 409 `LEAVE_CONFLICT`, 422 `INSUFFICIENT_LEAVE_BALANCE`(message에 `(残り N 日)`)
- `GET /api/v1/leaves/approvers?keyword=` → 200 `UserSummary[]`(활성·본인 제외, 이름 대소문자 무시/사원번호 부분 일치, 사원번호 오름차순). keyword 101자 이상 400
- `GET /api/v1/leaves/me?page&limit&year&status` → 200 `Page<Leave>`(createdAt desc, id desc). year 2000~2100, status 4종 외 400. year 생략 시 전체
- `PATCH /api/v1/leaves/:id/cancel` → 200 `Leave`(CANCELLED, processedBy=본인). 404(UUID 아님 포함) → 403(신청자 아님, ADMIN 포함) → 409 `NOT_CANCELLABLE`
- 쿠키/토큰: 기존 Bearer Access Token만 사용, 변경 없음

## API 문서와 다른 점
- 없음. 사원번호 부분 일치는 대소문자를 구분한다(사원번호는 `EMP_ID_PATTERN` 형식이라 영향 적음. 설계의 "이름만 대소문자 무시"와 동일)

## 검증
- `npx tsc --noEmit`, `npm run lint` 통과 / unit 195건 통과 / e2e `leave-requests`(16) + 기존 `leaves`(46) 통과
- 동시 신청(잠금 경합) 자체를 검증하는 테스트는 작성하지 않음(미검증). 마이그레이션 없음

## 문서 갱신 예정
- `docs/06_API_SPECIFICATION.md` API-LEAVE-001: reason은 trim 후 1~500자로 저장, approverId 형식 오류·본인·미존재·비활성은 `INVALID_APPROVER`, 잠금 후 비활성/행 없음은 401, 시작일이 과거여도 허용
- 06 API-LEAVE-002: keyword는 이름(대소문자 무시)·사원번호 부분 일치, trim 후 최대 100자(초과 400), 사원번호 오름차순
- 06 API-LEAVE-003: year(2000~2100)·status 검증 400, year 생략 시 전체 연도, 정렬 createdAt desc, id desc
- 06 API-LEAVE-005: 404 행 추가
- `.claude/work/context.md` 명령어: `db:e2e-leaves-reset`(개발 DB 전용, E2E 관리자 900001이 신청자인 leaves만 삭제, localhost만·production 거부)
- `docs/10_DEVELOPMENT_ROADMAP.md` §6 백엔드 체크 항목 갱신

## 프론트엔드가 알아야 할 것
- 환경변수·CORS 변경 없음. 에러 message는 일본어 그대로 표시 가능(`INVALID_DATE_RANGE`는 사유별로 다름)
- `approvalRequired=false` 사용자의 응답은 즉시 APPROVED이므로 승인자 선택 UI 불필요(보내도 무시됨)

## context.md 정정
- 없음

## Fix 1
- review.md backend 담당 1건(낮음, 컨벤션) 수정: backend/src/modules/leaves/leaves.repository.ts:50 주석이 존재하지 않는 `lockUser()`를 가리키던 것을, `createWithUserLock`이 잠근 행을 콜백 인자로 넘긴다는 내용으로 변경 (주석만, 동작 변경 없음)
- API 변경·문서 갱신 예정·context.md 정정: 없음
