# 03. Screen List

| ID | 화면명 | URL | 권한 | 기능 | 관련 요구사항 |
|---|---|---|---|---|---|
| SCR-001 | 로그인 | /login | 비로그인 | 로그인 | FR-AUTH-001, FR-AUTH-002 |
| SCR-002 | 대시보드 | /dashboard | 공통 | 출퇴근 등록, 개인 근태·휴가 현황, 승인 대기 현황, (ADMIN) 오늘 전체 현황 | FR-DASH-001, FR-ATT-001, FR-ATT-002, FR-LEAVE-001, FR-LEAVE-002, FR-LEAVE-003, FR-LEAVE-006 |
| SCR-003 | 근태 관리 | /attendance | 공통 | 개인 근태 이력 조회 | FR-ATT-003 |
| SCR-004 | 휴가 관리 | /leaves | 공통 | 휴가 신청, 내 신청 이력 조회·상세·취소 | FR-LEAVE-001, 004, 005, 006 |
| SCR-005 | 휴가 승인 | /leaves/approvals | 공통 | 승인 대기 목록 조회, 승인·반려 | FR-LEAVE-002, 003, 005 |
| SCR-006 | 사원 관리 | /admin/users | 관리자 | 사원 목록 조회 및 신규 등록 | FR-USER-001 |
| SCR-007 | 사원 상세 | /admin/users/:id | 관리자 | 사원 정보 수정, 승인 정책·계정 상태·부여 연차 관리 | FR-USER-002, FR-LEAVE-006 |
| SCR-008 | 전체 근태 관리 | /admin/attendance | 관리자 | 전체 근태 조회·검색, 근태 수정 | FR-ATT-004, FR-ATT-005 |
| SCR-009 | 비밀번호 변경 | /password | 공통 | 비밀번호 변경(최초 로그인 시 강제) | FR-AUTH-001, FR-AUTH-003 |

## Screen Access Rules

- 비로그인: 로그인하지 않은 사용자. 로그인한 사용자가 접근하면 `/dashboard`로 이동한다.
- 공통: 로그인한 모든 사용자(ADMIN, EMPLOYEE)
- 관리자: `role = ADMIN`인 사용자만. `/admin/*` 경로는 모두 관리자 전용이다.
- 승인자는 별도 권한이 아니다. SCR-005에서 본인에게 할당된 승인 요청만 조회·처리한다(ADMIN은 전체, FR-LEAVE-002·003).
- 화면 접근 권한과 데이터 조회 권한은 서버에서도 검증한다(NFR-001).

## Common UI Rules

모든 화면에 공통으로 적용한다. 각 화면명세에는 화면 고유의 문구와 예외만 적는다.

### 인증 및 권한 처리

| 상황 | 처리 |
|---|---|
| 미인증 사용자가 보호된 화면에 접근 | `/login?redirect={원래 URL}`로 이동 |
| API 401(토큰 만료) | Refresh Token으로 1회 갱신 후 재시도. 실패하면 `/login?redirect=...`로 이동 |
| `mustChangePassword = true` 사용자 | `/password` 외 모든 화면 접근 시 `/password`로 이동 |
| 비관리자가 `/admin/*`에 접근 (페이지 진입 시 권한 없음) | `/dashboard`로 이동하고 "접근 권한이 없습니다." 토스트 표시 |
| API 403 `PASSWORD_CHANGE_REQUIRED` | `/password`로 이동 |
| API 403 `FORBIDDEN` (화면 안의 동작·모달) | 화면에 머무르고 토스트 표시, 필요 시 목록 다시 조회. 모달에서 발생하면 모달을 닫고 토스트 표시 |
| API 404 `NOT_FOUND` (모달 안 상세) | 모달을 닫고 목록 다시 조회 후 토스트 표시 |
| 앱 최초 로드 (새로고침 포함) | `POST /auth/refresh`로 Access Token 발급 → `GET /auth/me`로 사용자 정보 조회 → 이후 위 규칙 적용. 실패 시 `/login?redirect=...` |

### 상태 처리

| 상태 | 처리 |
|---|---|
| Loading | 목록·카드 영역에 스켈레톤 표시. 버튼 요청 중에는 버튼 비활성화와 스피너 표시 |
| Empty | 영역 안에 안내 문구 표시(문구는 화면별로 정의) |
| Error (조회 실패) | 영역 안에 "데이터를 불러오지 못했습니다." 문구와 [다시 시도] 버튼 |
| Error (처리 실패) | 서버 응답 `message`를 토스트로 표시. 입력 폼의 필드 오류는 해당 필드 아래 표시 |
| 네트워크 오류 | "네트워크 연결을 확인해주세요." 토스트 |
| 중복 제출 | 요청이 끝날 때까지 제출 버튼 비활성화 |

### 목록

- 페이지당 20건, 이전/다음 및 페이지 번호 이동
- 검색 조건을 바꾸면 1페이지로 이동
- 검색 조건과 페이지는 URL Query에 유지하여 뒤로 가기·새로고침 시 복원한다.

### 모달

- 휴가 상세는 모든 화면에서 같은 "휴가 상세 모달"을 사용한다(SCR-004 4.4 참조).
- 확인이 필요한 처리(출근, 퇴근, 취소, 승인, 반려, 비활성화)는 확인 모달을 거친다.

### 전역 내비게이션

로그인 후 모든 화면의 좌측 사이드바에 메뉴를 표시하고, 상단바에는 사용자 메뉴를 표시한다(09_DESIGN_SYSTEM 참조).

| 메뉴 | URL | 표시 대상 |
|---|---|---|
| 대시보드 | /dashboard | 공통 |
| 근태 관리 | /attendance | 공통 |
| 휴가 관리 | /leaves | 공통 |
| 휴가 승인 | /leaves/approvals | 공통 (배지: 본인에게 할당된 승인 대기 건수, `GET /leaves/pending-approval?scope=mine&limit=1`의 `totalCount`. ADMIN도 동일 기준) |
| 사원 관리 | /admin/users | 관리자 |
| 전체 근태 | /admin/attendance | 관리자 |
| 사용자 메뉴: 이름, 비밀번호 변경(/password), 로그아웃 | - | 공통 |

- 로그아웃: `POST /auth/logout` 호출 후 `/login`으로 이동한다(API 실패 시에도 로컬 인증 정보를 지우고 이동).
- `mustChangePassword = true`인 사용자: 상단바에 로그아웃만 표시하고 사이드바 메뉴는 숨긴다(SCR-009).

### 표시 언어

- 화면에 표시되는 모든 문구(라벨, 버튼, 토스트, 오류 메시지)는 **일본어**로 표시한다.
- 이 문서와 각 화면명세의 한국어 문구는 의미를 나타내는 기준이며, 실제 일본어 문구는 구현 시 표시 문자열 사전 한 곳에서 관리한다.

## Screen Flow

```
/login ──(성공)──> mustChangePassword ? /password : (redirect 또는 /dashboard)
/password ──(변경 완료)──> /dashboard
/dashboard ──[휴가 신청]──> /leaves?tab=apply
/dashboard ──[승인 대기 전체보기]──> /leaves/approvals
/dashboard ──[승인 대기 항목]──> 휴가 상세 모달(승인·반려)
/leaves ──[상세]──> 휴가 상세 모달(취소)
/leaves/approvals ──[상세]──> 휴가 상세 모달
/admin/users ──[상세보기]──> /admin/users/:id ──[목록으로]──> /admin/users(검색 조건 유지)
/admin/attendance ──[사원명]──> /admin/users/:id
```
