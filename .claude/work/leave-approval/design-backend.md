# design-backend: 휴가 승인

## 결론: 백엔드 변경 없음
API-LEAVE-004·007·008·009는 대시보드 작업에서 이미 구현·테스트 완료(10_DEVELOPMENT_ROADMAP §7 백엔드 [x]). 이번 작업은 프론트엔드만 바꾼다.
backend 에이전트는 코드를 고치지 않는다. 아래 계약이 실제 코드와 같은지만 확인해 두면 된다.

## 참조 문서
- `docs/06_API_SPECIFICATION.md` → "API-LEAVE-004: 휴가 상세", "API-LEAVE-007: 승인 대기 목록", "API-LEAVE-008: 휴가 승인", "API-LEAVE-009: 휴가 반려", §0 "공통 객체"(`Leave`), "페이지네이션"
- `docs/02_REQUIREMENTS.md` → FR-LEAVE-002, FR-LEAVE-003

## 계약 요약 (프론트가 의존하는 부분)
| API | 요청 | 성공 | 실패 |
|---|---|---|---|
| GET /leaves/pending-approval | `scope=mine\|all`(기본 mine), `page`, `limit`(≤100) | 200 `Paginated<Leave>`, 신청일 내림차순 | 400 VALIDATION_ERROR(scope 외 값), 403 FORBIDDEN(비관리자 all) |
| GET /leaves/:id | - | 200 `Leave` | 403, 404 |
| PATCH /leaves/:id/approve | 본문 없음 | 200 `Leave` | 403(권한 없음·본인 신청), 404, 409 ALREADY_PROCESSED |
| PATCH /leaves/:id/reject | `{ "rejectReason": "..." }` trim 후 1~500자 | 200 `Leave` | 400 VALIDATION_ERROR(`details[].field = "rejectReason"`), 403, 404, 409 |

- 409 서버 message: `すでに処理された申請です。`(`leaves.service.ts`). 프론트는 SCR-005 문구를 위해 code 기준으로 자체 문구를 쓴다(design-frontend 참조).
- 배지용 호출 `scope=mine&limit=1`은 기존 페이지네이션 스키마로 허용됨(`totalCount`만 사용).

## 기존 파일 (확인용)
- `backend/src/modules/leaves/leaves.controller.ts`, `leaves.service.ts`(listPendingApproval, process), `leave-rules.ts`(canProcessLeave), `dto/pending-approval-query.dto.ts`, `dto/reject-leave.dto.ts`
- 테스트: `backend/test/leaves.e2e-spec.ts`(409 동시 처리 포함), `src/modules/leaves/leave-rules.spec.ts`

## 문서 갱신 예정
없음
