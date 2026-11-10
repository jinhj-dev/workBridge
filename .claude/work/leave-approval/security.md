SECURITY: PASS

치명 0 / 높음 0 / 중간 0 / 낮음 2

## 서버 측 인가 (기존 API, 변경 없음)
- GET /leaves/pending-approval: scope=all은 ADMIN 외 403 (leaves.service.ts:53). scope=mine은 approverId=user.id로 제한. 쿼리는 zod enum으로 검증.
- GET /leaves/:id: canViewLeave(신청자/지정 승인자/ADMIN)로 403 (leave-rules.ts:42). id는 UUID 검증 후 404.
- PATCH approve/reject: canProcessLeave는 본인 신청을 ADMIN이라도 거부 (leave-rules.ts:35). 지정 승인자 또는 ADMIN만 허용. 처리는 `where {id, status:'PENDING'}` 조건부 UPDATE라서 이중 승인은 409 (race 안전). reject 본문은 zod 스키마로 검증.
- 전역 JwtAuthGuard가 적용되어 모든 엔드포인트가 인증을 요구한다. 프론트의 승인 화면·배지는 표시용일 뿐이고 권한은 서버가 강제한다.

## E2E 도구
- e2e-attendance-reset.ts: DATABASE_URL이 localhost/127.0.0.1/::1이 아니면 중단하고, NODE_ENV=production이면 중단한다. 삭제 대상은 empId=900001이고 name='E2E管理者'도 일치하는 사용자의 attendance뿐이다. 이름이 다르거나 사용자가 없으면 deleteMany를 호출하지 않는다 (단위 테스트로도 확인). 운영 데이터나 타 사용자 데이터는 지워지지 않는다.
- resetE2eAccounts: 이름이 다른 기존 사용자는 덮어쓰지 않는다. refreshToken 삭제는 E2E 계정으로 한정된다.
- 비밀값 하드코딩 없음. 비밀번호는 E2E_ADMIN_PASSWORD / E2E_INITIAL_PASSWORD 환경변수로만 받고, 에러 메시지에 접속 문자열을 넣지 않는다.
- Playwright의 execSync는 고정 문자열 명령이라 입력이 섞이지 않고, 명령 인젝션 경로가 없다.

## 프론트엔드
- 변경 파일에서 dangerouslySetInnerHTML, innerHTML, localStorage 사용은 발견되지 않았다. React 기본 이스케이프로 신청 사유/거절 사유가 출력된다.

## 이슈
[낮음] [담당: backend] backend/prisma/e2e-account-data.ts:51 — 로컬 호스트 판정이 호스트명만 본다. 로컬 포트포워딩(SSH 터널)으로 localhost가 원격 DB를 가리키면 E2E 900001의 attendance 삭제와 E2E 계정 upsert가 원격에서도 실행될 수 있다. 다만 삭제 범위가 E2E 계정으로 한정되어 있어 피해는 작다. 수정 방향: 필요하면 DB 이름 allowlist(예: workbridge)를 추가한다.
[낮음] [담당: backend] backend/src/modules/leaves/leaves.service.ts:64 — 존재하지 않는 id는 404, 권한이 없는 id는 403이라 UUID의 존재 여부를 알 수 있다. UUID가 추측 불가능해서 악용 경로는 거의 없다. 수정 방향: 정책상 필요하면 권한 없음도 404로 통일한다.

## 권고
- 의존성 추가는 이번 변경 범위에서 확인되지 않았다 (backend/package.json은 스크립트 추가만 확인).
