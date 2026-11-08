# SCR-005: 휴가 승인

## 1. 기본 정보

| 항목 | 내용 |
|---|---|
| Screen ID | SCR-005 |
| 화면명 | 휴가 승인 |
| URL | /leaves/approvals (ADMIN 전체 보기: `?scope=all`) |
| 접근 권한 | 공통 |
| 관련 요구사항 | FR-LEAVE-002, FR-LEAVE-003, FR-LEAVE-005 |

## 2. 화면 목적

사용자가 본인에게 할당된 승인 대기 휴가를 조회하고 승인 또는 반려한다.
ADMIN은 다른 승인자에게 할당된 승인 대기 휴가도 조회하고 대리로 처리할 수 있다.

본인의 신청 이력은 SCR-004에서 조회한다.

## 3. 화면 구성

### 보기 전환 (ADMIN만 표시)

- 내게 할당된 요청(`scope=mine`, 기본) / 전체 승인 대기(`scope=all`)

EMPLOYEE는 항상 `scope=mine`으로 조회한다.

### 승인 대기 목록

신청일 내림차순으로 표시한다.

| 컬럼 | 설명 |
|---|---|
| 신청자 | 신청자 이름 |
| 부서 | 소속 부서 |
| 휴가 종류 | 휴가 종류 |
| 기간 | 시작일 ~ 종료일 |
| 일수 | 신청 일수 |
| 승인자 | 할당된 승인자 이름 (`scope=all`일 때만 표시) |
| 신청일 | 신청 등록일 |
| 처리 | [상세] [승인] [반려] |

- 본인이 신청한 건(ADMIN의 `scope=all`에서 보일 수 있음)은 [승인] [반려] 버튼을 비활성화한다.

## 4. 조회 조건

- `scope=mine`: approver_id가 로그인한 사용자 ID와 같고 status = PENDING
- `scope=all`: status = PENDING인 전체 (ADMIN만)
- 즉시 승인 건과 처리 완료(APPROVED, REJECTED, CANCELLED) 건은 표시하지 않는다.

## 5. 상세보기

- [상세] 클릭 시 휴가 상세 모달(SCR-004 4.4)을 표시하며, 모달에서도 승인·반려할 수 있다.

## 6. 승인 처리

1. [승인] 버튼 클릭
2. 확인 모달("{신청자}님의 휴가를 승인하시겠습니까?")
3. 승인 API 호출
4. 서버에서 처리 권한(할당된 승인자 또는 ADMIN, 본인 신청 아님)을 검증
5. 서버에서 현재 상태가 PENDING인지 조건부로 갱신
6. APPROVED로 변경, processed_by와 processed_at 저장
7. 토스트 "승인되었습니다."를 표시하고 목록 다시 조회

## 7. 반려 처리

1. [반려] 버튼 클릭
2. 반려 사유 입력 모달 표시
3. 반려 사유 입력(필수, 최대 500자)
4. [반려] 확인
5. 반려 API 호출
6. 서버에서 처리 권한과 PENDING 상태를 검증
7. REJECTED로 변경, processed_by, processed_at, reject_reason 저장
8. 토스트 "반려되었습니다."를 표시하고 목록 다시 조회

## 8. 유효성 검증

| 조건 | 메시지 |
|---|---|
| 반려 사유 필수 | 반려 사유를 입력해주세요. |
| 반려 사유 최대 500자 | 반려 사유는 500자 이내로 입력해주세요. |

서버 검증(FR-LEAVE-002): 본인에게 할당된 건 또는 ADMIN, PENDING 상태만, 본인 신청 불가

## 9. API

| 기능 | API |
|---|---|
| 승인 대기 목록 | `GET /leaves/pending-approval?scope=mine|all` (API-LEAVE-007) |
| 상세 | `GET /leaves/:id` (API-LEAVE-004) |
| 승인 | `PATCH /leaves/:id/approve` (API-LEAVE-008) |
| 반려 | `PATCH /leaves/:id/reject` (API-LEAVE-009) |

## 10. 상태 처리

공통 규칙(03 Common UI Rules)을 따르며 화면 고유 사항은 다음과 같다.

| 상황 | 처리 |
|---|---|
| Empty (`scope=mine`) | 승인 대기 중인 요청이 없습니다. |
| Empty (`scope=all`) | 전체 승인 대기 요청이 없습니다. |
| 409 ALREADY_PROCESSED | 이미 처리된 요청입니다. 목록을 새로고침합니다. (목록 다시 조회) |
| 403 FORBIDDEN | 처리 권한이 없습니다. (목록 다시 조회) |

## 11. 완료 조건

- 사용자는 본인에게 할당된 PENDING 신청만 조회하고 처리할 수 있다.
- ADMIN은 전체 PENDING 신청을 조회하고 대리 처리할 수 있다.
- 본인이 신청한 휴가는 처리할 수 없다.
- 반려 시 반려 사유가 저장된다.
- 처리 완료된 신청과 즉시 승인 건은 승인 대기 목록에 표시되지 않는다.
- 동시 처리 시 늦은 요청은 ALREADY_PROCESSED로 거부된다.
