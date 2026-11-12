FRONTEND: REQUIRED
SECURITY_REVIEW: REQUIRED
DOC_ISSUES: NONE (아래 항목은 사용자 결정 Q1~Q5·R1~R4로 확정, 문서 반영 모드에서 갱신: 05·02 役職 마스터·連絡先 신규 / 직책 관리는 seed만(관리 화면·목록 API 미정) / FR-DEPT-001·API-DEPT-008·IT-DEPT-33 개정 / SCR-010 L125 문구 / SCR-006·007·API-USER-* 입력 항목은 구현 시 적용 / 보라·분홍 배지는 09 토큰·Badge variant 추가)
SUMMARY: 직책 마스터 job_titles와 users.job_title_id(FK)·contact_email을 추가하고, API-DEPT-008과 所属社員確認 모달(5열)에 레퍼런스 색의 직책 배지·연락처를 표시한다(기존 사원은 NULL →「—」).

## 확정 사항 (사용자 답변)
- Q1 役職: 직책 마스터 테이블 + users FK / Q2 連絡先: 사내 이메일만 `contact_email VARCHAR(254) NULL`(UNIQUE·DB 형식 검증 없음)
- Q3: 표시만 + 샘플·E2E 데이터. 실제 사원은 SCR-006·007 구현 전까지 「—」 / Q4: 入社日 제외, 모달 5열 / Q5: ADMIN 전용 API-DEPT-008에만 노출
- R1 테이블: `job_titles`(id UUID, name VARCHAR(50) NOT NULL UNIQUE, tone ENUM `job_title_tone` NOT NULL DEFAULT 'GRAY', created_at, updated_at) + `users.job_title_id UUID NULL` FK ON DELETE RESTRICT. sort_order·users(job_title_id) 인덱스 없음
- R2 관리: 운영 seed(initial-data.ts)가 4개를 이름 기준 중복 없이 등록(재실행 시 기존 행 불변). 샘플·E2E 스크립트는 이름으로 참조만
- R3 배지 색: 레퍼런스 재현. tone ENUM `GRAY|BLUE|VIOLET|PINK`, seed가 직책별 지정(이름으로 색 결정 안 함). マネージャー=VIOLET(보라), リーダー=BLUE(파랑), エンジニア=GRAY(회색), デザイナー=PINK(분홍). 보라·분홍은 globals.css `@theme`에 토큰 `violet-30`·`violet-110`·`pink-30`·`pink-110` 추가 + Badge variant `violet`·`pink` 추가(09 디자인 시스템 확장)
- R4 API: API-DEPT-008 항목에 `jobTitle: {id,name,tone} | null`, `contactEmail: string | null`

## 범위
- 함: 마이그레이션 1개(테이블·ENUM·컬럼 2개, 기존 행 NULL), seed 직책 4개, API-DEPT-008 응답, 색 토큰 4개·Badge variant 2개, 모달 5열(社員番号·氏名·部署·役職·連絡先, 빈 값 「—」, 모바일 표 가로 스크롤), 샘플 사원·E2E 계정 값
- 안 함: 직책 관리 화면·직책 목록 API, 사원 입력 UI·API, 검색 대상 변경(氏名만), mailto 링크, 入社日 열
- API: GET /admin/departments/:id/members(API-DEPT-008, 응답 필드 추가). 신규 없음 / 화면: SCR-010 所属社員確認 모달
- 변경 파일 수: 백엔드 약 16개(신규 마이그레이션 1) / 프론트 약 9개(신규 0)
- 프로젝트 문서 갱신 예정: 02(FR-DEPT-001, FR-USER-001·002), 05(§0 ENUM, job_titles 신규 절, §2 users, seed 설명), 06(API-DEPT-008, API-USER-001~004), 04 SCR-010·006·007, 08(5.6·DB), 09(§2.1 색 토큰, §5 예외 항목, §6 Badge variant·부서 관리 전용), 10
