SECURITY: PASS

# 보안 점검: 휴가 신청·조회·취소 (Round 1)

치명 0 / 높음 0 / 중간 0 / 낮음 3

## 이슈
[낮음] [담당: backend] backend/src/modules/leaves/leaves.repository.ts:136 — `contains` 검색에서 LIKE 와일드카드(`%`, `_`)가 이스케이프되지 않는다. / 악용 시나리오: keyword `%`로 전체 후보를 열람. 어차피 keyword 없이도 전체 목록이 반환되므로 추가 노출은 없다. / 수정 방향: 필요하면 keyword의 `%`·`_`·`\`를 이스케이프하거나 현상 유지.
[낮음] [담당: backend] backend/src/modules/leaves/leaves.service.ts:180 — `GET /leaves/approvers`는 인증된 모든 사용자에게 활성 사용자 전원의 이름·사원번호·부서를 페이지네이션과 호출 제한 없이 반환한다. / 악용 시나리오: 일반 사용자가 조직 명부를 한 번에 수집한다. / 수정 방향: 설계상 의도(UserSummary만 반환)이므로 허용. 사용자 수가 늘면 상한 또는 keyword 최소 길이를 검토한다.
[낮음] [담당: backend] backend/src/modules/leaves/leaves.service.ts:153 — 승인자로 일반 USER(권한 없는 사원)도 지정할 수 있고, `canProcessLeave`는 `approverId === user.id`면 승인을 허용한다. / 악용 시나리오: 승인 필요 사용자가 친한 동료를 승인자로 지정해 승인을 받는다. 문서(API-LEAVE-002)가 후보를 활성 사용자 전원으로 정의하므로 업무 규칙이다. / 수정 방향: 정책상 승인자를 제한하려면 문서 변경 후 후보 조건과 `isActiveUser`를 함께 수정한다.

## 점검 결과(문제 없음)
- 인가: 대상 사용자는 항상 `@CurrentUser().id`로 정한다. 본문·Query로 userId를 받지 않는다. 취소는 서비스에서 신청자를 확인(403)하고 UPDATE의 `userId` 조건도 있어 이중으로 막는다. 상세는 `canViewLeave`로 신청자·지정 승인자·ADMIN만 허용한다. 승인·반려는 본인 신청을 거부한다(`canProcessLeave`).
- 인젝션: raw SQL은 잠금 1건뿐이며 태그드 템플릿으로 바인딩하고 `::uuid` 캐스트를 쓴다. 그 외는 Prisma 쿼리이고, `:id`와 `approverId`는 UUID 검증 후 사용한다(DB 500 방지).
- 입력 검증: zod로 leaveType enum, 실존 날짜 형식, reason trim 1~500자, keyword 100자 이하, year 범위를 검증한다. 페이지네이션은 기존 공용 스키마를 쓴다.
- 신청 판단 신뢰원: 잠금한 users 행의 `is_active`·`approval_required`를 다시 읽어 쓴다(토큰 값은 사용하지 않음). 비활성이면 401이다. 동시 신청은 FOR NO KEY UPDATE로 직렬화되어 중복·잔여 초과를 막는다.
- 정보 노출: 응답은 `UserSummary` 필드만 포함하고 해시·권한은 노출하지 않는다. 승인자 오류는 `INVALID_APPROVER` 하나로 통일해 존재·비활성 여부를 구분하지 못하게 한다.
- 프론트엔드: `dangerouslySetInnerHTML`·`innerHTML`이 없다(React 이스케이프 적용). 토큰을 localStorage/sessionStorage에 저장하지 않고 메모리에만 둔다. 신규 코드에서 사용자 입력을 href에 넣는 곳은 없다.
- E2E 초기화 스크립트(`backend/prisma/e2e-leaves-reset.ts`)는 localhost DB 외에는 거부하고 production 실행도 거부하며, 삭제 대상은 900001이 신청한 건으로 한정된다.
- 의존성: 이번 변경에서 신규 패키지는 확인되지 않았다(`backend/package.json` 변경은 스크립트 추가만). 알려진 취약점 조회는 하지 않았다.
- 비고: 신청·취소에 전용 rate limit은 없다. 인증된 사용자 한정이고 중복·잔여 검사가 있어 악용 경로가 제한적이므로 이슈로 올리지 않았다.
