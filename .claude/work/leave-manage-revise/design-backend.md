# design-backend: 내 휴가 이력 상태·휴가 종류 복수 필터

## 참조 문서
- `docs/06_API_SPECIFICATION.md` → §4 "API-LEAVE-003: 내 휴가 이력", §0 "공통 Error Response"
- `docs/06_API_SPECIFICATION.md` → "API-ATT-003" `status` 복수 지정 규칙(이번 형식의 기준)
- `docs/05_DATABASE_DESIGN.md` → `leaves` 테이블 `status`·`leave_type` 열. 스키마·마이그레이션 변경 없음

## API 계약 (API-LEAVE-003 변경)
`GET /api/v1/leaves/me` · USER
- `status`(변경): `PENDING` / `APPROVED` / `REJECTED` / `CANCELLED`를 쉼표로 구분해 복수 지정. 하나라도 일치하면 반환, 생략 시 전체, 중복은 하나로 봄 — **06 변경(기존 단일)**
- `leaveType`(신규): `ANNUAL` / `HALF_AM` / `HALF_PM` / `SPECIAL` / `OTHER` 쉼표 구분 복수. 규칙은 `status`와 동일 — **신규(06에 없음)**
- 조건 결합: `year` AND `status`(그룹 내 OR) AND `leaveType`(그룹 내 OR)
- 기존 단일 값(`status=APPROVED`)은 1개짜리 목록으로 그대로 동작(하위 호환)
- 예: `/leaves/me?year=2026&status=PENDING,APPROVED&leaveType=HALF_AM,HALF_PM&page=1&limit=20`
- 200: 기존과 같음 `Page<Leave>`, 신청일 내림차순(동순위 id 내림차순)
- 400 `VALIDATION_ERROR`: 목록 안에 미지 값이 하나라도 있거나 빈 값(`status=`, `status=A,`) → `details[{field:'status'|'leaveType', message}]`

## 처리 로직
- `dto/my-leaves-query.dto.ts`: `backend/src/modules/attendance/dto/attendance-history-query.dto.ts`의 `statusListSchema` 패턴(split(',') → `z.array(z.enum)` → Set 중복 제거)을 따른다. 같은 파일 안 두 필드에 쓰므로 파일 내 작은 함수(예: `commaSeparatedEnum(values)`) 1개로 만들고, 근태 DTO와의 공통화는 하지 않음
  - 출력 타입: `status?: LeaveStatus[]`, `leaveType?: LeaveType[]`
  - leaveType enum 값은 `create-leave.dto.ts` 정의를 재사용할 수 있으면 재사용
- `leaves.service.ts` `listMine`: `statuses`·`leaveTypes`를 repository로 전달
- `leaves.repository.ts` `findByUser`: params `statuses?: LeaveStatus[]`, `leaveTypes?: LeaveType[]`. 길이 > 0일 때만 `where.status = { in }`, `where.leaveType = { in }`
- 보안: 대상 사용자는 계속 토큰 본인(`user.id`)만. 새 권한·데이터 노출 없음. 인덱스 추가 안 함

## 생성·수정 파일
수정
- `backend/src/modules/leaves/dto/my-leaves-query.dto.ts`
- `backend/src/modules/leaves/leaves.service.ts` (`listMine`)
- `backend/src/modules/leaves/leaves.repository.ts` (`findByUser`)
- 테스트: `backend/test/leave-requests.e2e-spec.ts`(GET /leaves/me 블록), service spec이 있으면 `leaves.service.spec.ts`

참고: `attendance-history-query.dto.ts`(statusListSchema), `attendance.repository.ts` `findPageByUser`(복수 status 처리), `pending-approval-query.dto.ts`

## 문서 갱신 예정
- `docs/06_API_SPECIFICATION.md` API-LEAVE-003: `status` 쉼표 구분 복수, `leaveType` 신규(복수), 조건 결합 규칙, 400 대상에 `status`·`leaveType`
