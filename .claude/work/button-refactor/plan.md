MODE: FULL
BACKEND: SKIP
FRONTEND: REQUIRED
SECURITY_REVIEW: SKIP
PARALLEL: NO (청크별 순차 커밋이고, Button.test.tsx 기대값이 C1(h-10)→C2(h-btn-md)로, form.test.tsx가 C9에서 바뀌는 등 테스트 갱신이 청크 순서에 묶임 → 청크마다 frontend → tester → 검증 → 커밋 순으로 진행)
DOC_ISSUES: NONE
SUMMARY: 버튼 53건을 공통 `Button`/`buttonClass()`로 이행한다(UI_BUTTON_REFACTOR_PLAN v3 단계 1~8, 결정 B1~B17). 동작·로직·문구 변경 없음, 크기·일부 색만 표준화.

## 승인용 설계 요약
- 범위: 공통 `components/Button.tsx` 신설 → 버튼 크기 토큰(B6, 별도 커밋) → SectionError → 모달 → 페이지 주 동작 → 표 안 버튼·텍스트 링크 → 아이콘 버튼 → 모바일 검증 → `form.tsx` 버튼 상수 삭제. 하지 않는 것: 동작 변경(SCR-009 キャンセル 제출 중 활성 유지), Notice X(BT63), 대상 외 V8~V11·BT16·34·40, 출근부 월 라벨 간격·서체(B8), 09 문서 수정(마지막 문서 반영 모드에서)
- 핵심 결정
  1. 청크 9개(C1~C9), 청크 = 커밋 1개. 토큰 치환은 C2 단독 커밋(B6)
  2. 모든 청크에서 클릭·제출(`type="submit"`·`form`)·이동·권한·disabled 조건·aria-label·포커스·배치 클래스를 그대로 유지하고, 제출 버튼은 Enter 제출 테스트로 확인
  3. `className`은 배치 전용, ESLint `no-restricted-syntax`로 강제(C1에서 규칙 추가, B16)
  4. 勤怠 「修正」용 Pencil 아이콘은 `components/leave/leaveIcons.tsx`로 이동(이미 SearchInput·部署管理가 공용으로 쓰는 파일, 라우트 간 import 회피)
  5. B3(44 폐지)·B10(修正 아이콘) 조건은 360/768/1024/1440 캡처로 확인: frontend 화면 확인 + tester Playwright(API는 route mock, 개발 DB 업무 데이터 쓰기 없음)
- API: 없음
- 화면: SCR-001·002·003·004·008·009·010, 모달 9종(M01~M09), 상단바
- 변경 파일 수: 백엔드 0 / 프론트 구현 28개(신규 1: Button.tsx) + 테스트(신규 Button.test.tsx·e2e `button-visual.spec.ts`, 수정 form.test.tsx 등)
- 프로젝트 문서 갱신 예정: 09_DESIGN_SYSTEM(§2.3·§3·§5·§6), context.md 공용 모듈, 10_DEVELOPMENT_ROADMAP 변경 이력, UI_BUTTON_REFACTOR_PLAN 진행 상태

## 파일 소유 (참고, PARALLEL: NO)
- frontend: 구현 파일(design-frontend.md 청크별 목록), `eslint.config.mjs`, `globals.css`
- tester: `*.test.tsx` 전부(신규 `components/Button.test.tsx` 포함), `frontend/e2e/*.spec.ts`
- 예외: 없음. 단 구현 변경으로 기존 테스트가 깨지면 frontend는 고치지 않고 원인을 frontend.md에 적어 tester에게 넘긴다
