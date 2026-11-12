# feature-dev 적응형 파이프라인 사용법

실행 규칙의 기준은 `SKILL.md`다. 이 문서는 사람이 읽는 요약이다.

## 호출 방법 (기존과 같음)

```
/feature-dev <요청>              ← 모드 자동 판별
/feature-dev FAST로 <요청>        ← 모드 지정 (FAST 금지 항목에 걸리면 자동으로 올림)
/feature-dev FULL로 <요청>        ← 기존 전체 파이프라인 강제
```

시작할 때 메인이 `MODE: STANDARD — 이유` 한 줄을 알린다. 판단이 다르면 그때 "FULL로"라고 답하면 된다.

## 모드 판별

| 모드 | 조건 | 예 |
|---|---|---|
| FULL | DB 스키마 / 인증·권한·개인정보·업로드 등 보안 / 근태·휴가 업무 규칙 / 데이터 정합성 / 대규모 리팩터링·공통 아키텍처 중 하나라도 해당 | 휴가 부여 규칙 변경, 사원 테이블 컬럼 추가, 비밀번호 정책 |
| STANDARD | FULL·FAST가 아닌 나머지 | 기존 API로 새 모달 추가, 목록 필터 추가, 기존 구조 안의 API 추가 |
| FAST | 단순 UI·스타일·텍스트 변경, 제한적인 프론트 버그 수정 + 수정 파일 3개 이하 + **FAST 금지 항목 없음** | 버튼 문구 수정, 간격 조정, 특정 화면의 표시 버그 |

FAST 금지 항목: API 계약 변경, DB 스키마, 인증·권한, 근태·휴가 업무 규칙, 다수 화면에 영향을 주는 공통 컴포넌트(`frontend/src/components/`, 레이아웃, 토큰, `globals.css`), 데이터 정합성, 보안 민감 기능.

애매하면 위 모드를 고른다. 사용자가 모드를 지정해도 FULL 조건이면 FULL, FAST 금지 항목이면 STANDARD 이상으로 올린다.

진행 중에 범위가 커지면(구현 에이전트의 `ESCALATE: STANDARD|FULL — 이유`, tester·reviewer 보고나 메인 diff 확인에서 금지 항목 발견, FAST 파일 수 초과) 자동으로 상위 모드로 올리고 알린다. FULL 조건이면 FULL, 그 외는 STANDARD. 아래로 내리지는 않는다. STANDARD 안에서 계획에 없던 변경이 필요하면 plan.md를 고쳐 다시 승인받는다.

## 모드별 호출 에이전트와 검증

| | FAST | STANDARD | FULL |
|---|---|---|---|
| 설계 | 없음 (메인이 대상 파일만 확인) | 메인 간이 설계 → `plan.md` 1개 | architect → plan.md + design-backend/frontend + test-plan |
| 승인 게이트 | 없음 (모드 알림만) | 있음 | 있음 |
| 구현 | frontend 또는 backend 1개 | backend·frontend 중 필요한 것 | backend·frontend 중 필요한 것 (`BACKEND: SKIP` 추가) |
| 테스트 | 구현 에이전트: eslint + tsc + `vitest related`. 버그 수정·관련 테스트 실패 시 tester | tester: 새 테스트 + 변경 패키지 unit 전체 + 관련 e2e | tester: 기존 그대로 (전체 스위트) |
| 리뷰 | 메인이 `git diff` 확인 + eslint·tsc 재실행 | 조건부 reviewer (아래), 아니면 메인 diff 확인 | reviewer |
| 보안 | 없음 (보안 관련이면 FULL) | 없음 (보안 관련이면 FULL) | 필요 시 security |
| 문서 반영 | "문서 갱신 예정" 있을 때 architect | 같음 | 같음 |
| 작업 기록 | 간이 frontend.md/backend.md (15줄) | plan.md + 구현 보고 + test-report | 기존 전부 |

STANDARD의 reviewer 필수 조건: API 추가·계약 변경, 공용 컴포넌트·레이아웃 신규·변경, 변경 파일 8개 이상, 새 공통 UI 패턴, 데이터 구조·상태 관리 방식 변경, 테스트 수정 루프 2회 소진.

모든 모드 공통: 실행하지 않은 테스트·생략한 단계는 완료 보고에 "미실행/생략 + 이유"로 적는다. 명령과 결과가 없는 검증은 성공으로 보고하지 않는다.

## 병렬 실행

```
FULL     : architect → [승인] → { backend ∥ frontend ∥ tester(준비) } → [화면 확인] → tester(통합 실행)
           → { reviewer ∥ security } → architect(문서 반영)
STANDARD : 메인 설계 → [승인] → { backend? ∥ frontend? ∥ tester(준비) } → [화면 확인] → tester(통합 실행) → reviewer?
FAST     : 병렬 없음 (에이전트 1~2개)
```

| 의존 관계 | 처리 |
|---|---|
| frontend → backend.md(API 요약) | 설계 단계의 **확정 API 계약**(design-backend.md "API 계약" / plan.md)으로 대체 → backend 완료를 기다리지 않음 |
| tester → 구현 완료 | 테스트 작성(PREPARE)은 설계 기준으로 병렬, 실행(RUN)만 구현 뒤 |
| security → reviewer 통과 | 둘 다 읽기 전용이라 같은 코드 스냅샷을 동시에 검토. 리뷰 중 구현 에이전트 호출 금지, 전후 해시 비교 |
| 화면 확인 → 새 API | 새 API에 의존하는 스크린샷만 구현 그룹 뒤로 미룸. 개발 서버 포트가 겹쳐 tester 실행과 동시에 하지 않음 |
| 수정 루프 | PARALLEL: YES면 backend·frontend 수정을 병렬(소유가 겹치지 않음), tester 재실행은 그 뒤. NO면 순차 |

병렬 여부는 설계 문서의 `PARALLEL: YES|NO`로 정한다. API 계약 확정, 파일 소유 분리, 공동 수정 파일 없음, 탐색적 작업 아님 — 모두 만족해야 YES. 아니면 기존 순차 실행.

### 파일 소유 (기본값, 설계 문서의 "파일 소유"에서 예외 지정)
| 담당 | 범위 |
|---|---|
| backend | `backend/**` (테스트 제외), `backend/prisma/**`, backend의 package.json·lockfile |
| frontend | `frontend/**` (테스트·`frontend/e2e/**` 제외), `messages/ja.ts`, frontend의 package.json·lockfile |
| tester | `backend/test/**`(헬퍼·fixture 포함), `*.spec.ts`, `*.test.ts(x)`, `frontend/e2e/**`, vitest·playwright 설정, 테스트 setup |
| architect | `docs/**`, `context.md`, 설계 문서 |
| 메인 | STANDARD plan.md, metrics.md |

루트 공용 파일(`package.json`, `docker-compose.yml` 등)은 설계에서 한 에이전트에만 배정한다. Git Worktree는 쓰지 않는다 (소유가 나뉘면 불필요하고, worktree마다 `npm install`·병합이 필요해 더 느림). 소유를 나눌 수 없으면 순차 실행한다.

### 충돌 방지와 결과 통합
- 그룹 시작 전 `git status` 기준선 → 그룹 전체 완료까지 대기 → 바뀐 파일이 각 담당의 소유 범위와 보고서 목록에 맞는지 확인. 어긋나면 병렬을 멈추고 순차로 정리.
- 계약 변경이 필요한 에이전트는 혼자 바꾸지 않고 `CONTRACT_CHANGE:`로 보고 → architect(FULL)·메인(STANDARD)이 계약 재확정 → 영향받는 에이전트만 재호출. 범위가 바뀌면 사용자 재승인.
- 병렬 중 다른 에이전트의 테스트 파일에서 나는 타입 오류는 각자 고치지 않고, 통합 실행에서 tester가 타입체크·lint까지 함께 확인.

### 실행 기록
메인이 `<작업폴더>/metrics.md`에 단계별 소요 시간·토큰(서브에이전트 완료 알림 값)·재작업 회차를 남기고, 병렬 그룹은 벽시계 시간과 순차였을 때의 합계를 함께 적는다. 기존 작업 폴더에는 시간 기록이 없어 과거 실행과의 직접 비교는 불가하며, 이 기록이 쌓인 뒤 비교한다.

## 기존 파이프라인 대비 변경점

발견한 시간 낭비 요인과 대응:

1. 작은 UI 변경도 9단계를 전부 거침 (예: `attendance-sheet-ui`, `leave-detail-modal`, `leave-application-modal-ui`는 프론트 전용인데 작업 문서가 350~420줄). → FAST/STANDARD 도입.
2. 3단계(backend)에 실행 조건이 없고, 프론트 전용에도 "변경 없음"만 적힌 `design-backend.md`를 만듦. → `BACKEND: REQUIRED|SKIP` 플래그, SKIP이면 문서도 만들지 않음 (FULL 포함).
3. 프론트 전용 변경에도 backend e2e 전체(385건)와 Playwright 다수를 돌림 (`attendance-sheet-ui` test-report). → STANDARD는 변경 패키지 + 관련 e2e만. FULL은 기존 기준 유지.
4. architect(opus)가 설계 문서 4개를 쓰고 backend·frontend·tester·reviewer가 각각 다시 읽음. → STANDARD는 plan.md 1개로 통합해 모든 에이전트가 같은 파일을 읽음.
5. frontend가 텍스트 변경에도 impeccable 스킬 로드 + 데스크톱·모바일 스크린샷. → FAST는 레이아웃이 바뀔 때만.
6. 기존의 "파이프라인을 쓰지 않는 경우"는 기준이 모호하고 기록이 남지 않음 (`notice-component`, `leave-sidebar-submenu`는 frontend.md만 존재). → FAST로 정식화하고 검증 결과를 반드시 기록.
7. 수정 루프가 길어짐 (`employee-position-contact` frontend.md에 회차 섹션 9개, `dashboard-renewal` test-report에 회차 섹션 9개). 기존 규칙에는 범위가 커졌을 때 설계로 되돌아가는 경로가 없음. → 승격 규칙 추가, STANDARD에서 수정 루프 2회 소진 시 reviewer 필수(원인이 FULL 조건이면 승격).
8. (예방) 같은 화면을 다시 고칠 때 이전 결정을 재분석하지 않도록, 모드 판별·간이 설계에서 이전 작업 폴더의 plan.md·decisions.md를 재사용하게 함.

Hooks: 프로젝트 hook은 impeccable 감지(SessionStart, Edit/Write 후 5초, Stop 시 30초)뿐이며 파이프라인 단계와 무관해 변경하지 않았다.

## 호환성

- 에이전트는 프롬프트에 `MODE:`가 없으면 FULL(기존 동작)로 동작한다. 기존 방식으로 직접 에이전트를 부르는 경우도 그대로 동작한다.
- FULL 모드의 단계 구성, 수정 루프 A/B/C의 상한, 테스트 범위, reviewer·security 기준은 바꾸지 않았다. 병렬화로 바뀐 것은 실행 순서뿐이며, security는 리뷰 수정으로 코드가 바뀌면 PASS였어도 수정 파일을 재점검한다(기존의 "security는 최종 코드를 본다" 보장 유지). tester 통합 실행에 타입체크·lint가 추가되었다(강화). FULL에 추가·변경된 것: `BACKEND: SKIP` 플래그(백엔드 변경이 없을 때 빈 단계와 빈 design-backend.md 생략, frontend·security는 없는 문서를 건너뜀), 프롬프트 첫 줄 `MODE: FULL`, architect의 승격 입력 처리, 8단계 실행 조건에 FAST·STANDARD 경우 문구 추가, 메인 규칙의 모드 공통/FULL 전용 분리 (FULL 전용 규칙 내용은 기존과 같음).
- 에이전트 역할 분담은 유지된다: 프로젝트 문서 수정은 architect만, 테스트 작성은 tester만, reviewer·security는 코드를 고치지 않는다.
- 삭제한 Skill·Agent 파일은 없다.
