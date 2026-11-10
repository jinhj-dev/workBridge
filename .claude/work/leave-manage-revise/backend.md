# backend 구현 결과: 내 휴가 이력 status·leaveType 복수 필터

## 수정 파일
- `backend/src/modules/leaves/dto/my-leaves-query.dto.ts` — 파일 내 `commaSeparatedEnum(values)` 추가, `status`·`leaveType`을 쉼표 구분 복수(중복 제거)로. 출력 `LeaveStatus[]`/`LeaveType[]`
- `backend/src/modules/leaves/leaves.service.ts` — `listMine`이 `statuses`·`leaveTypes` 전달
- `backend/src/modules/leaves/leaves.repository.ts` — `findByUser` params `statuses`·`leaveTypes`, 길이 > 0일 때만 `in` 조건
- `backend/test/leave-requests.e2e-spec.ts` — 신규 2건(복수 필터 결합/하위 호환/중복, 400 케이스 5종)
- leaveType enum은 `create-leave.dto.ts`에 인라인 정의라 재사용 불가 → DTO 내 리터럴 정의(공통화 안 함)
- service spec은 없음(추가 안 함)

## API 요약
`GET /api/v1/leaves/me` (USER)
- `status`: PENDING/APPROVED/REJECTED/CANCELLED 쉼표 복수. 생략 시 전체. 단일 값은 그대로 동작
- `leaveType`(신규): ANNUAL/HALF_AM/HALF_PM/SPECIAL/OTHER 쉼표 복수
- 결합: year AND status(OR) AND leaveType(OR). 200 `Page<Leave>`, 신청일 내림차순(동순위 id 내림차순)
- 400 `VALIDATION_ERROR`: 미지 값·빈 값(`status=`, `status=A,`)
- 쿠키/토큰 변화 없음. 대상 사용자는 계속 토큰 본인

## API 문서와 다른 점
- 400 `details[].field`는 설계의 `status`/`leaveType`이 아니라 배열 요소 위치가 붙은 `status.1` 형식(예: `PENDING,X` → `status.1`, 빈 값 → `status.0`). API-ATT-003의 기존 구현(`statusListSchema`)과 동일한 동작이라 맞춤. 문서 기재 시 "`status.N`/`leaveType.N`"으로 하거나 프론트는 접두 일치로 처리 필요

## 문서 갱신 예정
- `docs/06_API_SPECIFICATION.md` §4 API-LEAVE-003: `status`를 쉼표 구분 복수(생략 시 전체, 중복은 하나로, 하나라도 일치하면 반환)로 변경, `leaveType`(ANNUAL/HALF_AM/HALF_PM/SPECIAL/OTHER, 쉼표 복수, 같은 규칙) 신규 추가, 조건 결합(year AND status AND leaveType, 그룹 내 OR) 명시, 400 대상에 `status`·`leaveType`(미지 값·빈 값, field는 `status.N` 형식) 추가, 예시 쿼리 `?year=2026&status=PENDING,APPROVED&leaveType=HALF_AM,HALF_PM`

## 프론트엔드가 알아야 할 것
- 쿼리 값은 쉼표 구분 문자열(URL 인코딩 `%2C`도 동일 동작). 환경변수·CORS 변경 없음

## 검증
- `tsc --noEmit`, eslint 통과 / unit 199 통과 / `leave-requests.e2e-spec.ts` 42 통과

## context.md 정정
- 없음
