MODE: FULL
BACKEND: REQUIRED
FRONTEND: REQUIRED
SECURITY_REVIEW: REQUIRED
PARALLEL: YES
DOC_ISSUES: (1) 사원 API-USER-001~004·SCR-006/007은 문서만 있고 코드 없음 → 이번에 신규 구현 (2) 초기 비밀번호: 문서대로 관리자 입력, 이미지와 다름(社員追加에 입력란 추가) (3) 入社日* 추가 (4) 社員ID 5자리 숫자 채번(WB 접두사 불가) (5) 削除 = 무효화 (6) 상세·편집 모달화, API-USER-005 범위 밖 (7) 休職中 없음 → 在籍中/入社予定/無効 (8) 등록 시 役職·メール 필수, 검색 통합 keyword+部署·役職·ステータス (9) 직책 관리 API 신설·tone 8색 (10) 모달 외형은 UI_MODAL_PATTERNS 유지 (11) 一覧 기본 ステータス 「すべて」 — (2)~(11) 모두 사용자 승인 완료
SUMMARY: SCR-006 社員管理를 레퍼런스대로 신규 구현(요약 3·검색/필터·10건 페이지네이션·상세/편집/삭제 모달)하고, 役職 관리 API·役職確認 모달(8색·공용 JobTitleBadge)과 社員追加 모달(자동 채번/직접 입력, 관리자가 초기 비밀번호 입력)을 추가한다.

## 승인용 설계 요약 (승인 완료, 피드백 Round 2 반영)
- 범위(함): 사원 목록·요약·채번 예정 번호·등록·상세·수정(무효화) API, 직책 CRUD API, tone enum 확장(값 추가만, 기존 4개 보존), SCR-006 페이지+모달 5종(役職確認·社員追加·社員詳細·社員編集·社員削除), 공용 `JobTitleBadge`(SCR-010 所属社員確認에도 적용), Playwright 4폭
- 범위(안 함): SCR-007 페이지, 부여 연차(API-USER-005), 초기 비밀번호 재발급·리셋, 메일 발송, 休職中, 물리 삭제, 직책 정렬 순서 편집
- 결정 1(확정): 社員追加에 「初期パスワード」* 입력(FR-AUTH-003 규칙, 서버는 기존 `checkPasswordPolicy` 재사용). bcrypt 해시만 저장, mustChangePassword=true, 응답·로그에 평문 없음. 성공 시 모달 닫고 토스트
- 결정 2(확정): 「入社日」* 입력 추가(기본값 없음, 미래 허용)
- 결정 3(확정): 자동 채번 = 기존 5자리 숫자 社員番号 최댓값+1(개발 DB 예상 `10101`), 등록 트랜잭션 advisory lock으로 확정. 예정 번호는 예약하지 않음
- 결정 4: 削除 = 무효화(PATCH isActive=false, PENDING 취소·책임자 해제·refresh token 폐기), 행은 「無効」으로 남음. 社員数·管理者数는 활성 기준(管理者 = 인증 Role ADMIN)
- 결정 5: 직책 색은 DB tone 8값, 색 정의는 `JobTitleBadge` 한 곳(신규 토큰 7개·Badge variant 2개). 직책 변경은 Role·권한 불변. 사용 중(비활성 포함) 삭제 409
- API: GET/POST `/admin/users`(001·002 개정), GET/PATCH `/admin/users/:id`(003·004 구현), 신규 GET `/admin/users/summary`(006)·`/admin/users/next-emp-id`(007, `{empId: string|null}`), 신규 GET/POST `/admin/job-titles`·PATCH/DELETE `/admin/job-titles/:id`(JOB-001~004)
- 화면: SCR-006 社員管理 `/admin/users` + 모달 役職確認·社員追加·社員詳細·社員編集·社員削除
- 변경 파일 수: 백엔드 약 25개(신규 약 21, 마이그레이션 1) / 프론트 약 22개(신규 13)
- 프로젝트 문서 갱신 예정: 02, 03, 04 SCR-006·007, 05, 06, 08, 09, 10

## 파일 소유 (PARALLEL: YES)
- backend: `backend/prisma/schema.prisma`, `backend/prisma/migrations/<ts>_extend_job_title_tone/`, `backend/prisma/e2e-users-cleanup.ts`, `backend/src/modules/{users,job-titles}/**`(spec 제외), `backend/src/common/validation/like-pattern.ts`, `backend/src/modules/departments/departments.service.ts`, `backend/src/app.module.ts`, `backend/package.json`(script만) — 상세는 design-backend.md 「생성·수정 파일」
- frontend: `frontend/src/app/(app)/admin/users/**`(test 제외), `frontend/src/components/{JobTitleBadge,Badge,StatCard,PageHeader,Pagination}.tsx`, `frontend/src/lib/password-policy.ts`, `frontend/src/app/password/PasswordChangeForm.tsx`, `frontend/src/app/globals.css`, `frontend/src/lib/api/types.ts`, `frontend/src/messages/ja.ts`, `frontend/src/app/(app)/admin/departments/DepartmentMembersModal.tsx`
- tester: `backend/src/modules/{users,job-titles}/**/*.spec.ts`, `backend/test/admin-users.e2e-spec.ts`·`admin-job-titles.e2e-spec.ts`, `backend/test/db/schema.e2e-spec.ts`·`db-helpers.ts`(필요 시), `frontend/src/**/*.test.ts(x)`, `frontend/e2e/users*.spec.ts`(+ 헬퍼)
- 예외: `departments.service.spec.ts`가 import 경로 변경으로 깨지면 tester가 수정. 루트 공용 파일 변경 없음(docker-compose.yml·환경 변수 변경 없음)

승인 피드백 Round 1: 초기 비밀번호를 서버 생성+관리자 메일 발송으로 변경(Round 2에서 철회)
승인 피드백 Round 2: 결정 1을 문서대로 관리자 입력으로 되돌림, 메일 모듈·MAIL_*·Mailpit·passwordMail·ADMIN_EMAIL_NOT_SET·재발급 API-USER-008 전부 삭제, API-USER-007을 `next-emp-id`로 확정, 파일 소유에서 docker-compose.yml·env·mail 삭제
