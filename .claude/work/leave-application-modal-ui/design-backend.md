# design-backend — leave-application-modal-ui

## 변경 없음 (SKIP)

- 참조: `docs/06_API_SPECIFICATION.md` API-LEAVE-001(`POST /leaves`), API-LEAVE-002(`GET /leaves/approvers`)
- 근거: 休暇種別 5종이 `backend/prisma/schema.prisma` `enum LeaveType`·`backend/src/modules/leaves/dto/create-leave.dto.ts`와 그대로 일치하고, 요청 본문(`leaveType,startDate,endDate,reason,approverId?`)·에러 코드 처리도 바뀌지 않는다. UI 표시 방식(Radio→Select, 레이아웃, 필수 *)만 바뀐다.
- backend 에이전트는 이번 기능에서 작업하지 않는다.
