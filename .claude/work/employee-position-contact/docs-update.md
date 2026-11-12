# 문서 반영 결과: 사원 役職·連絡先 (employee-position-contact)

반영 전 확인한 코드: `backend/prisma/schema.prisma`, 마이그레이션 `20261112113554_add_job_titles_and_users_contact/migration.sql`, `prisma/initial-data.ts`(JOB_TITLES), `departments/department.mapper.ts`, `test/admin-departments.e2e-spec.ts`(IT-DEPT-37), `test/db/schema.e2e-spec.ts`, `frontend/src/app/globals.css`, `components/Badge.tsx`, `components/Modal.tsx`, `admin/departments/DepartmentMembersModal.tsx`, `messages/ja.ts`(noValue 「—」).

## 갱신한 문서·섹션
- `docs/02_REQUIREMENTS.md`
  - FR-USER-001: 役職(직책 목록에서 선택, 선택)·連絡先(이메일 형식·254자·빈 값 NULL·중복 허용) 입력 규칙, 직책 마스터는 seed만(관리 화면·목록 API 미정). 구현 시 적용 명시
  - FR-USER-002: 役職·連絡先 수정·해제(구현 시 적용)
  - FR-DEPT-001: 소속 활성 사원 목록 항목에 役職·連絡先, ADMIN 전용·미설정 「—」
- `docs/05_DATABASE_DESIGN.md`
  - §0 ENUM 표: `job_title_tone`
  - §2 users: `job_title_id`·`contact_email` 컬럼, Constraints(FK RESTRICT·인덱스 없음, UNIQUE·형식 제약 없음), 마이그레이션 설명
  - §2-1 job_titles 신규(기존 절 번호 유지): 컬럼·제약·seed 4개(tone 표)·"seed로만 관리"
  - §7 Index: job_titles(name) UNIQUE
  - ERD: 05에 ERD가 없어 해당 없음
- `docs/06_API_SPECIFICATION.md`
  - API-DEPT-008: 응답 예시·`jobTitle`·`contactEmail` 설명, 다른 API 미노출
  - API-USER-001·003 응답, API-USER-002·004 Request: `jobTitle`/`jobTitleId`·`contactEmail`(구현 시 적용, 서버 검증 필수 — 보안 점검 낮음 1건 반영). 직책 목록 API 미정
- `docs/04_SCREEN_SPECIFICATIONS/SCR-010_DEPARTMENTS.md` 所属社員確認 모달: Modal size `xl`, 5열·役職 tone 배지·連絡先·빈 값 「—」·표 최소 폭 640·모바일 가로 스크롤, "범위 밖" 문구를 入社日·검색 대상만으로 정리
- `docs/04_SCREEN_SPECIFICATIONS/SCR-006_USER_LIST.md` 등록 모달 항목, `SCR-007_USER_DETAIL.md` 3.1 기본 정보: 役職·連絡先(구현 시 적용)
- `docs/08_TEST_PLAN.md` §5.6: IT-DEPT-33 개정, IT-DEPT-37(공개 범위)·IT-DEPT-38(DB 제약) 신규 / §7 SCR-010 所属社員確認 5열·배지·「—」
- `docs/09_DESIGN_SYSTEM.md`
  - §2.1: 추가 토큰 표(SCR-010 役職 배지, `violet-30/110`·`pink-30/110`, 대비)
  - §5: 8항 신설(사용자 지시에 따른 예외)
  - §6: `Modal` 행 `size`(md/lg/xl — xl 기록을 위해 미기록이던 md·lg 값도 함께 적음), `Badge` 행 variant `violet`·`pink`, 부서 관리 전용 `MailIcon`·`DepartmentMembersModal`(size xl, 5열, tone→variant 매핑)
- `docs/10_DEVELOPMENT_ROADMAP.md`: §2 #2 데이터베이스(테이블 7개·ENUM 4개, 마이그레이션 항목), §2 #8 완료 항목 추가·기존 후속 과제 제거, 후속 과제 2건(SCR-006·007·API-USER 입력 경로·서버 검증 / 리뷰 Round 2 낮음 1건), §3 갱신 이력

## 기타
- `.claude/work/context.md`: Modal size xl, Badge violet·pink, JOB_TITLES·createJobTitle·스크립트 선행 조건(backend.md "context.md 정정")
- 새 문서 없음(문서 맵 변경 없음)
