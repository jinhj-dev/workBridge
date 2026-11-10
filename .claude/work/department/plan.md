FRONTEND: REQUIRED
SECURITY_REVIEW: REQUIRED
DOC_ISSUES: 05 §1 "부서 관리 화면은 범위 밖·seed로만 등록"과 §0 "departments는 물리 삭제하지 않는다"가 이번 요구(부서 CRUD·삭제)와 충돌 / 05 §2 users.department_id NULL 허용, 06 API-USER-002 "departmentId 선택", SCR-006·007 부서 "필수 X"가 "사원은 반드시 1개 부서 소속"과 충돌 / 02에 부서 관리 FR 없음(FR-DEPT-001 신설 필요) / 05 §1에 부서 코드·시스템 부서(未所属) 정의 없음 / 사원 관리 API·화면(API-USER-001~005, SCR-006·007)은 문서만 있고 코드 미구현
SUMMARY: ADMIN 전용 부서 관리 화면 SCR-010(/admin/departments)과 API-DEPT-002~006을 추가하고, 부서 코드(UNIQUE)·시스템 부서 未所属을 도입하며 users.department_id를 NOT NULL로 바꾼다.

## 승인용 설계 요약
- 범위(함): departments.code 추가, 未所属 부서 생성, users.department_id NOT NULL 마이그레이션, 부서 목록·상세·등록·수정·삭제 API(ADMIN), SCR-010 화면, 사이드바 메뉴, seed·E2E 계정·테스트 헬퍼의 부서 지정
- 범위(안 함): 사원 관리 API·화면 구현 — 부서 필수화는 06·SCR-006·007 문서에만 반영(Q1-A)
- 핵심 결정
  1. 소속 사원 = 활성 사원(Q4-B). 활성 1명 이상이면 409 DEPARTMENT_HAS_MEMBERS. 비활성 사원은 삭제 트랜잭션 안에서 未所属으로 이동 후 물리 삭제(부서 행 FOR UPDATE 잠금 후 재확인)
  2. 시스템 부서 未所属: 고정 코드 `UNASSIGNED`, 마이그레이션·seed가 항상 생성, 수정·삭제 금지 409 PROTECTED_DEPARTMENT(Q9-A 가정)
  3. 부서 코드: 영숫자·하이픈 1~20자, 대문자 정규화, DB UNIQUE + 409 DUPLICATE_DEPARTMENT_CODE. 부서명 UNIQUE 유지
  4. 마이그레이션: 기존 4개 부서 코드 부여(GA/DEV/SALES/HR, 그 외 D0001~), 부서 없는 사원은 未所属로 이동 후 NOT NULL
  5. 문구: 삭제 불가 「所属する社員が存在するため、部署を削除できません。」 / 확인 모달 「無効の社員 {n} 名は「未所属」部署に移動されます。」
- API: GET /departments(기존, 변경 없음) / 신규 GET·POST /admin/departments, GET·PATCH·DELETE /admin/departments/:id
- 화면: SCR-010 部署管理(신규, /admin/departments, 관리자) + 등록·수정 모달·삭제 확인 모달
- 변경 파일 수: 백엔드 약 18개(신규 8) / 프론트 약 8개(신규 6)
- 프로젝트 문서 갱신 예정: 02, 03, 04(SCR-010 신규·SCR-006·007), 05, 06, 08, 10
- 확정 Q1~Q8, 확인 필요 Q9·Q10: `.claude/work/department/decisions.md`
