---
name: feature-dev
description: Use when the user asks to build a feature via feature-dev; picks FAST / STANDARD / FULL mode by risk, then runs only the needed subagents (architect, backend, frontend, tester, reviewer, security) on a feature branch — independent stages in parallel (implementation group, review group) with strict file ownership, dependent stages in sequence. FULL keeps the original stages, verification criteria and design approval gate.
---

# Feature Dev 파이프라인 (적응형 + 병렬)

요청의 변경 범위와 위험도로 **FAST / STANDARD / FULL** 중 하나를 고르고, 그 모드에 필요한 서브에이전트만 호출한다.
의존 관계가 없는 단계는 **병렬 그룹**(`{ }`)으로 동시에 실행하고, 의존 관계가 있는 단계만 순서대로 실행한다.

```
FAST     : 준비 → 구현(frontend|backend) → tester(버그 수정일 때만) → 메인 확인 → [문서 반영] → 보고      ← 병렬 없음
STANDARD : 준비 → 메인 간이 설계(plan.md, API 계약·파일 소유 확정) → [승인]
           → { backend? ∥ frontend? ∥ tester(준비) } → [화면 확인] → tester(통합 실행)
           → reviewer(조건부) 또는 메인 diff 확인 → [문서 반영] → 보고
FULL     : 준비 → architect(API 계약·파일 소유 확정) → [설계 승인]
           → { backend? ∥ frontend? ∥ tester(준비) } → [화면 확인] → tester(통합 실행)
           → { reviewer ∥ security? } → architect(문서 반영) → 보고
```
`PARALLEL: NO`로 판단된 경우 구현 그룹은 기존 순서(backend → frontend → tester)로 순차 실행한다.

사용법·판별 예시·기존 대비 변경점은 같은 폴더의 `README.md`에 있다 (사람용. 실행 중에는 읽지 않아도 된다).

## 모드 판별 (작업 시작 시 반드시)

1. 사용자 요청과 `.claude/work/context.md`, 관련 파일 몇 개(Grep으로 위치 확인 수준)만 보고 판별한다. 넓게 탐색하지 않는다.
2. 같은 화면·기능의 이전 작업 폴더(`.claude/work/<기존 slug>/`)가 있으면 그 plan.md·decisions.md를 재사용 근거로 삼는다 (다시 분석하지 않는다).
3. 판별 결과를 사용자에게 한 줄로 알린다: `MODE: STANDARD — 이유(예: 기존 API로 새 모달 추가, 공통 컴포넌트 변경 없음)`.

### FULL — 하나라도 해당하면
- DB 스키마·마이그레이션 변경
- 인증·인가·권한·세션·토큰·비밀번호, 개인정보, 결제, 파일 업로드 (= 기존 SECURITY_REVIEW 대상)
- 근태·휴가 등 핵심 업무 규칙(`docs/02_REQUIREMENTS.md`의 FR 규칙) 변경
- 데이터 정합성에 영향을 주는 처리 (일괄 갱신·삭제, 집계 기준 변경, 트랜잭션 경계 변경)
- 대규모 리팩터링, 공통 아키텍처 변경 (레이어 구조, 공용 모듈의 계약 변경)

### FAST — 아래를 모두 만족할 때만
- 단순 UI 수정, 스타일 변경, 텍스트 변경, 제한적인 프론트엔드 버그 수정
- 수정 파일이 테스트 제외 3개 이하로 예상된다
- **FAST 금지 항목에 하나도 해당하지 않는다**:
  API 계약 변경 / DB 스키마 변경 / 인증·권한 변경 / 근태·휴가 등 핵심 업무 규칙 변경 /
  다수 화면에 영향을 주는 공통 컴포넌트 변경(`frontend/src/components/` 공용 UI, 레이아웃, 디자인 토큰, `globals.css`) /
  데이터 정합성에 영향을 주는 처리 / 보안상 민감한 기능 변경

### STANDARD — FULL도 FAST도 아닌 나머지
기존 구조 안의 신규 기능, 화면·모달 추가, 기존 API를 활용하는 기능, 기존 구조 안의 API 추가·계약 변경(FULL 항목에 해당하지 않을 때, 이 경우 reviewer 필수), 공통 컴포넌트 변경(reviewer 필수) 등.

### 판별 규칙
- **애매하면 위 모드를 고른다** (FAST↔STANDARD 애매 → STANDARD, STANDARD↔FULL 애매 → FULL).
- 사용자가 모드를 지정하면 따른다 (예: "feature-dev FULL로", "FAST로"). 단, 지정 모드와 관계없이 FULL 조건에 해당하면 FULL, FAST 금지 항목에 해당하면 STANDARD 이상으로 올리고 이유를 알린다. 사용자가 지정한 상위 모드를 메인이 낮추지 않는다.
- 사용자가 "파이프라인 전체로" 등 기존 방식을 원하면 FULL.

### 모드 승격 (진행 중 자동)
초기 판단보다 실제 범위가 커지면 즉시 상위 모드로 바꾼다. 하위 모드로 내리지는 않는다.
- 승격 신호: backend·frontend 응답의 `ESCALATE: <STANDARD|FULL> — 이유` 줄 / tester·reviewer 보고나 메인 diff 확인에서 FULL 조건·FAST 금지 항목이 새로 드러남 (메인이 판단) / 변경 파일 수가 모드 상한을 넘음 (FAST 3개, STANDARD는 상한 없음)
- 승격 대상: FULL 조건(스키마, 인증·권한·보안, 업무 규칙, 데이터 정합성, 대규모 리팩터링)이면 FULL, 그 밖의 FAST 금지 항목·파일 수 초과면 STANDARD. 에이전트가 적은 대상과 이 기준이 다르면 높은 쪽을 따른다.
- 처리: 현재 단계를 멈추고 사용자에게 `MODE: FAST → STANDARD — 이유` 한 줄을 알린 뒤, 상위 모드의 **설계 단계부터** 이어 간다. 이미 바뀐 코드는 되돌리지 않고 설계 문서의 "이미 변경된 파일"에 적어 재사용한다.
  - FAST → STANDARD: 메인이 plan.md를 쓰고(S1 형식, "이미 변경된 파일" 포함) 승인 게이트를 거친 뒤 남은 STANDARD 단계를 진행한다. 구현 에이전트는 FAST 간이 보고서 아래에 "Fix N (STANDARD)" 섹션으로 FULL 형식 보고를 덧붙인다.
  - STANDARD 안에서 plan.md에 없는 변경(예: 계획에 없던 API 변경)이 필요해지면 (`ESCALATE: STANDARD`): 메인이 plan.md를 고치고 S2 승인을 다시 받은 뒤 그 에이전트 단계부터 다시 진행한다.
  - FAST/STANDARD → FULL: architect를 설계 모드로 호출한다. 프롬프트에 "승격: 이전 모드 산출물(plan.md 또는 frontend.md/backend.md)과 이미 변경된 파일을 재사용"을 적는다. 이후 FULL 단계를 전부 진행한다.

## 메인 에이전트 규칙 (모든 모드 공통)

- 순차 단계는 이전 단계가 끝난 뒤에만 다음을 호출한다. 병렬 그룹은 아래 "병렬 실행 규칙"을 따른다. 그 외의 병렬 호출은 하지 않는다.
- 서브에이전트 프롬프트 첫 줄에 **`MODE: FAST|STANDARD|FULL`**을 적는다. 각 에이전트는 모드에 맞는 읽기·검증 범위를 자기 정의 파일에서 따른다. (MODE가 없으면 에이전트는 FULL로 동작한다 — 기존 호출과 호환.)
- 서브에이전트 프롬프트에는 문서 내용을 붙여 넣지 말고 **경로만** 준다.
- 서브에이전트가 실패하거나 정해진 문서를 만들지 않으면 다음 단계로 넘어가지 않고 한 번 재호출한다. 그래도 안 되면 멈추고 사용자에게 보고한다.
- 메인은 코드·테스트를 직접 작성·수정하지 않고, 프로젝트 문서(`docs/`)를 수정하지 않는다 (문서는 architect만).
- 테스트 작성과, STANDARD·FULL의 테스트 실행은 `tester`가 한다. 메인이 직접 실행해도 되는 것은 FAST·STANDARD의 확인용 `git diff`, lint, 타입체크뿐이다.
- **검증하지 않은 것을 성공으로 보고하지 않는다.** 실행하지 않은 테스트·생략한 단계는 완료 보고에 "미실행/생략 + 이유"로 적는다. 서브에이전트 보고에 실행한 명령과 결과(통과·실패 개수 또는 exit code)가 없으면 검증되지 않은 것으로 본다.
- 커밋, push, 머지는 하지 않는다. 사용자가 확인한 뒤 직접 하도록 완료 보고에서 안내한다.
- FULL 전용 규칙: 메인은 **오케스트레이터만** 한다 (코드 탐색·설계·리뷰를 직접 하지 않는다). 산출 문서 본문은 읽지 않고, 서브에이전트의 마지막 응답과 문서 첫 줄(`RESULT:`, `VERDICT:`, `SECURITY:`)로 판단한다. 예외는 plan.md(승인용)이며, 그 외 확인은 Read `limit: 5`로만 한다.

## 병렬 실행 규칙 (STANDARD·FULL)

### 병렬 실행 여부 판단 — 설계 문서의 `PARALLEL: YES|NO`
설계(plan.md)에 아래가 **모두** 확정되어 있으면 `PARALLEL: YES`, 하나라도 아니면 `NO`(기존 순차 실행):
- API 계약: 엔드포인트별 메서드·경로·요청·응답 JSON·상태 코드·에러 코드 (frontend가 backend.md 없이 구현할 수 있을 만큼)
- 파일 소유: 이번에 바뀔 파일이 모두 한 에이전트에만 배정되어 있음 (아래 기본 소유 범위 + 예외)
- 두 에이전트가 함께 바꿔야 하는 파일이 없음 (있으면 한쪽에 배정하고 다른 쪽은 그 결과를 기다려야 하므로 NO)
- 구현해 봐야 계약을 정할 수 있는 탐색적 작업이 아님
진행 중 충돌·오류가 생겨 순차로 바꾼 경우, 그 실행에서는 다시 병렬로 돌아가지 않는다.

### 기본 파일 소유 범위 (설계 문서의 "파일 소유"에서 예외를 지정할 수 있다)
| 담당 | 수정할 수 있는 범위 |
|---|---|
| backend | `backend/**` (tester 범위 제외), `backend/prisma/**`, `backend/package.json`·lockfile |
| frontend | `frontend/**` (tester 범위 제외), `frontend/src/messages/ja.ts`, `frontend/package.json`·lockfile |
| tester | `backend/test/**`(헬퍼·fixture 포함), `backend/src/**/*.spec.ts`, `backend/vitest*.config.*`, `frontend/src/**/*.test.ts(x)`, `frontend/e2e/**`, `frontend/vitest*.config.*`, `frontend/playwright.config.*`, 테스트 setup 파일 |
| architect | `docs/**`, `.claude/work/context.md`, FULL 설계 문서 |
| 메인 | STANDARD plan.md, `<작업폴더>/metrics.md` |
- 루트 파일(`package.json`, `package-lock.json`, `docker-compose.yml` 등)과 패키지 경계를 넘는 공용 파일은 설계 문서에서 **한 에이전트만** 담당으로 지정한다. 지정이 없으면 아무도 수정하지 않는다.
- 각 에이전트는 자기 보고서(backend.md 등)만 쓴다.
- Git Worktree는 기본으로 쓰지 않는다. 소유 범위가 겹치지 않으면 같은 작업 트리에서 충돌이 없고, worktree마다 `npm install`과 병합이 필요해 오히려 느리기 때문이다. 소유를 나눌 수 없으면 worktree 대신 순차 실행(`PARALLEL: NO`)으로 한다.

### 병렬 그룹 실행 방법
1. 시작 전 `git status --porcelain -uall -- . ':!.claude/work'`를 기록한다 (기준선. `-uall`이 없으면 새 폴더가 `?? dir/`로 묶여 파일별 담당을 확인할 수 없다).
2. 그룹의 Agent 호출을 **한 메시지에서 동시에** 보낸다. 각 프롬프트에 `PARALLEL: YES`와 자기 소유 범위(설계 문서 경로)를 적는다.
3. **그룹의 모든 에이전트가 끝날 때까지** 다음 단계로 가지 않는다. 먼저 끝난 에이전트의 결과로 다른 에이전트를 추가 호출하지 않는다 (실행 중인 에이전트는 멈출 수 없으므로, `ESCALATE:`도 그룹이 끝난 뒤 처리한다).
4. 끝나면 결과를 통합한다. 아래 순서로 판단한다 (위가 우선):
   1. `ESCALATE:` (FULL 조건 발견 등) → 모드 승격. 그룹의 다른 결과는 승격 후 설계의 "이미 변경된 파일"로 넘긴다. 계약 변경만이 이유면 ESCALATE 대신 CONTRACT_CHANGE로 처리한다 (STANDARD 안의 계약 변경은 승격이 아니다).
   2. 같은 명령으로 바뀐 파일을 보고, 각 파일이 보고서에 적힌 담당과 소유 범위에 맞는지 확인한다. 소유 범위 밖 수정·두 에이전트가 같은 파일을 수정한 경우 → **병렬을 멈추고**(이후 `PARALLEL: NO`) 해당 파일의 소유 에이전트에게 순차로 정리시킨다.
   3. 보고서의 "소유 범위 밖 수정 필요" → 그 파일의 소유 에이전트(없으면 설계에서 담당을 정해서)에게 순차로 맡긴다.
   4. 응답 첫 줄의 `CONTRACT_CHANGE:` → 아래 "API 계약 변경".
   5. 실패·문서 미작성 에이전트는 그 에이전트만 한 번 재호출한다 (그룹 전체를 다시 돌리지 않는다).
5. **수정 루프의 병렬 호출**(루프 A·B·C, 계약 변경 반영)도 그룹으로 보고 1~4를 똑같이 적용한다. 단 `PARALLEL: YES`일 때만 병렬로 하고, NO면 backend → frontend → tester 순으로 호출한다. 병렬일 때 프롬프트에 `PARALLEL: YES`를 넣어 소유 범위 규칙과 "frontend는 backend.md 대신 계약을 읽는다" 규칙이 적용되게 한다.

### API 계약 변경
- backend·frontend는 확정된 계약을 혼자 바꾸지 않는다. 바꿔야 하면 계약에 영향이 없는 부분까지만 구현하고 응답 첫 줄에 `CONTRACT_CHANGE: <내용과 이유>`를 쓴다.
- 메인은 그룹이 끝난 뒤: FULL → architect를 "계약 재확정" 프롬프트로 호출해 design-backend.md(와 design-frontend.md·test-plan.md)를 고치게 한다 / STANDARD → 메인이 plan.md의 API 계약을 고친다. 승인된 범위가 바뀌면 (architect 응답의 `SCOPE_CHANGED:` 포함) 사용자 승인을 다시 받는다.
- 그 뒤 영향받는 에이전트(backend·frontend·tester 중)만 다시 호출한다. 프롬프트: 원래 프롬프트 + "계약 변경 반영: <설계 문서 경로>의 계약 변경 Round N을 반영하고 보고서에 Fix N으로 덧붙인다". tester는 `PHASE: PREPARE`로 테스트만 고친다.

### 화면 확인 (병렬 구현 뒤, 조건부)
frontend가 병렬 중에는 새 API가 아직 없어서 화면 확인(스크린샷)을 못 할 수 있다. frontend 보고에 "화면 확인: 보류(API 대기)"가 있으면 구현 그룹이 끝난 뒤 `frontend`를 "화면 확인만" 프롬프트로 한 번 더 호출한다. 개발 서버 포트(3000·6000)가 겹치므로 tester 통합 실행과 동시에 하지 않는다.

### 리뷰 그룹 (FULL의 reviewer ∥ security)
1. 시작 전 코드 스냅샷 해시를 기록한다: `{ git diff HEAD -- . ':!.claude/work' 2>/dev/null; git ls-files -z -o --exclude-standard -- . ':!.claude/work' | xargs -0 -r cat; } | git hash-object --stdin`
2. reviewer와 security를 한 메시지에서 동시에 호출한다. 두 에이전트는 코드를 수정하지 않고, 그동안 메인은 **어떤 구현·테스트 에이전트도 호출하지 않는다**.
3. 둘 다 끝나면 해시를 다시 계산해 같은지 확인한다. 다르면 두 리뷰 결과를 버리고 리뷰 그룹을 한 번만 다시 돌린다. 그래도 다르면 멈추고, 무엇이 코드를 바꿨는지(`git status`) 사용자에게 보고한다.

### 실행 기록 (metrics.md) — 메인이 작성
`<작업폴더>/metrics.md`에 단계마다 한 줄씩 남긴다. 서브에이전트 완료 알림의 소요 시간(duration_ms)과 토큰(subagent_tokens)을 그대로 옮긴다. 알림에 값이 없으면 `N/A`로 적고 추정값을 넣지 않는다 (소요 시간은 호출 직전·직후 `date +%s`로 잰 값을 대신 써도 된다 — 그때는 "(측정)"을 붙인다).
```
| 단계 | 에이전트 | 병렬 그룹 | 소요(초) | 토큰 | 결과 | 재작업 회차 |
```
- 병렬 그룹은 그룹 벽시계 시간(가장 긴 에이전트)과 순차였을 때의 합계를 함께 적는다 → 병렬 효과.
- 끝에 총 벽시계 시간, 총 토큰, 재작업(수정 루프) 횟수, 가장 오래 걸린 단계(병목)를 적는다.

## 문서 구조

```
.claude/work/
  context.md                ← 프로젝트 공통 (기능 간 재사용, architect만 작성)
  <slug>/
    plan.md                 ← STANDARD: 메인 작성(설계 전체) / FULL: architect 작성(플래그 + 승인용 요약)
    design-backend.md       ← FULL 전용, BACKEND: REQUIRED일 때만
    design-frontend.md      ← FULL 전용, FRONTEND: REQUIRED일 때만
    test-plan.md            ← FULL 전용
    backend.md              ← backend 산출 (문서 갱신 예정 포함, FAST는 간이 형식)
    frontend.md             ← frontend 산출 (문서 갱신 예정 포함, FAST는 간이 형식)
    screenshots/            ← frontend 화면 확인 (FAST는 레이아웃 변경 시만)
    test-report.md          ← tester 산출 (RESULT)
    review.md               ← reviewer 산출 (VERDICT)
    security.md             ← security 산출 (SECURITY, FULL 전용)
    docs-update.md          ← architect 문서 반영 결과
    metrics.md              ← 메인이 쓰는 단계별 소요 시간·토큰·재작업 기록 (STANDARD·FULL)
```

모드별 산출물: FAST = `frontend.md` 또는 `backend.md`(간이) [+ test-report.md] / STANDARD = plan.md + 구현 보고 + test-report.md [+ review.md] / FULL = 위 전부.

## 0단계: 준비 (모든 모드 공통)

1. 기능 이름으로 slug를 정한다 (예: 로그인 → `login`). 작업 폴더는 `.claude/work/<slug>/`.
2. **브랜치 준비** (git 저장소일 때):
   - `git status --porcelain`으로 작업 트리를 확인한다.
   - 커밋 안 된 변경이 있으면 멈추고 사용자에게 묻는다: 먼저 커밋 / stash / 그대로 진행. 임의로 stash하거나 버리지 않는다.
   - 깨끗하면 현재 브랜치 이름을 기록해 두고 `git checkout -b feature/<slug>`로 새 브랜치를 만든다. 같은 이름이 있으면 `feature/<slug>-2`처럼 번호를 붙인다.
   - git 저장소가 아니면 이 단계를 건너뛰고, 되돌릴 수단이 없다는 점을 완료 보고에 적는다.
3. 모드를 판별하고 한 줄로 알린다 (위 "모드 판별").
4. TaskCreate로 **그 모드에 있는 단계만** 작업 목록으로 만든다. 승격되면 그때 추가한다.

---

# FAST 모드

대상: 단순 UI 수정, 스타일·텍스트 변경, 제한적인 프론트엔드 버그 수정 (판별 조건은 위 참조).
설계 문서·승인 게이트·architect 설계·reviewer·security 단계가 없다. 대신 **메인이 diff와 검증 결과를 직접 확인**한다.

## F1. 구현

변경 대상에 맞는 에이전트 하나만 호출한다 (보통 `frontend`. `backend`는 응답 메시지 문구만 바꾸는 경우에 한한다 — 설정값·로직·응답 구조 변경은 STANDARD 이상). 프롬프트:
```
MODE: FAST
요청: <사용자 요청 원문>
작업 폴더: .claude/work/<slug>/
대상 파일(메인이 확인한 것): <경로 목록>
FAST 이유: <한 줄>
```
- 응답에 `ESCALATE:`가 있으면 "모드 승격"을 따른다.
- 보고(`frontend.md`/`backend.md`)에 lint·타입체크·관련 테스트의 **명령과 결과**가 없으면 그 항목만 다시 시킨다.

## F2. 테스트 (버그 수정이거나 F1에서 관련 테스트가 실패했을 때만)

버그 수정이면, 또는 F1 보고에 관련 테스트 실패(예: 바뀐 문구를 기대하는 기존 테스트)가 있으면 `tester`를 호출한다. 프롬프트: `MODE: FAST`, 작업 폴더, "frontend.md(또는 backend.md)의 버그 수정에 대한 재현 테스트를 추가하고 관련 테스트를 실행". 스타일·텍스트만 바뀐 경우는 생략한다 (F1의 관련 테스트로 충분).
- `RESULT: FAIL` → 담당 에이전트 수정 → tester 재실행, 최대 2회. 그래도 FAIL이면 멈추고 보고한다.

## F3. 메인 확인

1. `git diff --stat`과 `git diff`로 실제 변경을 확인한다:
   - 요청 범위를 벗어난 변경이 없는지, 수정 파일이 3개(테스트 제외) 이하인지
   - FAST 금지 항목에 해당하는 변경이 섞이지 않았는지 (공통 컴포넌트, API 호출부, 권한 분기 등)
   - 프론트 변경이면 하드코딩된 색상·px(`#[0-9a-fA-F]{3,6}`, `rgb(`, `[0-9]+px`)가 새로 들어가지 않았는지
2. 보고된 lint·타입체크 결과가 있어도, 메인은 변경 패키지(`frontend/` 또는 `backend/`)에서 `npx eslint <변경 파일>`과 `npx tsc --noEmit`을 한 번 직접 실행해 확인한다 (테스트는 재실행하지 않는다).
3. 문제가 있으면 담당 에이전트에 그 항목만 다시 시킨다 (최대 2회). 금지 항목이 섞였으면 승격한다.

## F4. 문서 반영 (조건부)

보고에 "문서 갱신 예정"이 있으면 (예: 화면 명세의 문구가 바뀜) FULL 8단계와 같이 `architect`를 문서 반영 모드로 호출한다. 없으면 생략.

## F5. 완료 보고

모드(FAST)와 이유 / 변경 요약 1~2줄 / 변경 파일 / 실행한 검증 명령과 결과 (메인 재확인 포함) / 생략한 단계(설계·리뷰)와 이유 / 문서 반영 여부 / 브랜치 안내 (FULL 9단계와 같은 형식).

---

# STANDARD 모드

대상: 기존 구조 안의 신규 기능, 화면·모달 추가, 기존 API 활용 기능 등.
architect 설계 대신 **메인이 간이 설계**를 하고, 설계 문서를 plan.md 하나로 합친다. reviewer는 조건부.

## S1. 메인 간이 설계 → plan.md

메인이 `.claude/work/context.md`(문서 맵 포함), 관련 프로젝트 문서의 **해당 섹션만**, 수정 대상 파일을 읽고 `<작업폴더>/plan.md`를 쓴다. 80줄 이내. 형식:
```
MODE: STANDARD
BACKEND: REQUIRED 또는 SKIP
FRONTEND: REQUIRED 또는 SKIP
REVIEW: REQUIRED 또는 SKIP (이유 한 줄)
PARALLEL: YES 또는 NO (NO면 이유 한 줄)
DOC_ISSUES: NONE 또는 한 줄씩
SUMMARY: 한 줄 요약

## 승인용 설계 요약
- 범위: 하는 것 / 하지 않는 것
- 핵심 결정 2~4개
- API: 사용(기존) / 추가·변경(있으면 06 문서의 ID와 함께)
- 화면: 화면 ID·이름

## 이미 변경된 파일 (FAST에서 승격된 경우만)
- 경로 — 변경 요약 (frontend.md/backend.md 참조)

## API 계약 (BACKEND·FRONTEND 둘 다 REQUIRED이고 API를 추가·변경할 때)
- 메서드 경로 — 요청(쿼리·바디 JSON) / 응답 JSON / 상태 코드 / 에러 코드. 기존 API만 쓰면 06 문서의 ID만 적는다.

## 파일 소유 (PARALLEL: YES일 때)
- backend: 수정·생성 파일 / frontend: 수정·생성 파일 / tester: 테스트 파일
- 기본 소유 범위의 예외·루트 공용 파일의 담당 (없으면 "예외 없음")

## 구현 지시
### backend (BACKEND: REQUIRED일 때)
- 참조 문서: 경로#섹션 / 수정·생성 파일 / 참고할 기존 파일 / 처리 요점
### frontend (FRONTEND: REQUIRED일 때)
- 참조 문서: 화면 명세 경로#섹션, 09_DESIGN_SYSTEM의 사용할 컴포넌트 / 수정·생성 파일 / 재사용할 기존 컴포넌트 / 상태·검증 요점

## 테스트 시나리오
- 정상 / 실패 / 엣지 각 1줄씩, 테스트 종류와 파일 위치
- 실행 범위: 변경 패키지의 unit·컴포넌트 전체 + 관련 e2e spec(파일명)
```
- 같은 화면의 이전 작업 폴더가 있으면 그 결정을 재사용하고 "참조: .claude/work/<slug>/decisions.md"처럼 적는다.
- **REVIEW: REQUIRED** 조건 (하나라도): API 추가·계약 변경 / `frontend/src/components/` 공용 컴포넌트·레이아웃의 신규·변경 / 변경 파일 8개 이상 예상 / 새 공통 UI 패턴 도입 / 기존 데이터 구조·상태 관리 방식 변경. 그 외는 SKIP.
- 설계 중 FULL 조건이 보이면 plan.md를 쓰지 말고 FULL로 승격한다.

## S2. 설계 승인

FULL 2단계와 같다 (plan.md의 승인용 설계 요약 + DOC_ISSUES를 보여 주고 AskUserQuestion). 수정 요청은 메인이 plan.md를 고쳐 다시 묻는다 (최대 3회).

## S3. 구현 그룹 (PARALLEL: YES면 병렬, NO면 backend → frontend → tester 순차)

"병렬 실행 규칙"대로 아래를 한 그룹으로 동시에 호출한다. 해당 없는 에이전트는 뺀다.
- `backend` (BACKEND: REQUIRED): `MODE: STANDARD`, `PARALLEL: YES`, 작업 폴더 경로, "plan.md의 구현 지시와 API 계약대로 구현하고 backend.md에 기록".
- `frontend` (FRONTEND: REQUIRED): `MODE: STANDARD`, `PARALLEL: YES`, 작업 폴더 경로, "plan.md의 구현 지시와 API 계약대로 구현하고 frontend.md에 기록. backend 완료를 기다리지 않는다".
- `tester`: `MODE: STANDARD`, `PHASE: PREPARE`, 작업 폴더 경로, "plan.md의 테스트 시나리오와 API 계약으로 테스트 코드를 작성. 실행은 통합 단계에서".

PARALLEL: NO면 기존처럼 backend → frontend(backend.md의 API 요약 사용) 순서로 호출하고, tester는 S4에서 작성·실행을 한 번에 한다 (`PHASE` 없이).
그룹이 끝나면 "병렬 실행 규칙 4"대로 통합하고, 필요하면 "화면 확인"을 한다.

## S4. tester (통합 실행)

Agent(`tester`). 프롬프트: `MODE: STANDARD`, `PHASE: RUN`, 작업 폴더 경로, "준비한 테스트를 구현에 맞춰 실행하고 test-report.md에 기록". PARALLEL: NO면 `PHASE`를 빼고 "plan.md의 테스트 시나리오대로 작성·실행하고 test-report.md에 기록"으로 호출한다.
- FAIL → FULL의 수정 루프 A와 같다 (최대 2회, 병렬 여부는 "병렬 실행 규칙 5"). 2회를 모두 썼는데 PASS하면 REVIEW를 REQUIRED로 바꾼다. 2회 후에도 FAIL이면 FULL과 같이 멈추고 보고한다. 실패 원인이 FULL 조건이면 승격한다.

## S5. 리뷰

- **REVIEW: REQUIRED** → Agent(`reviewer`), 프롬프트: `MODE: STANDARD`, 작업 폴더 경로. 리뷰 중에는 다른 에이전트를 호출하지 않는다. CHANGES_REQUESTED면 FULL의 수정 루프 B와 같다 (재실행 tester도 `MODE: STANDARD`, `PHASE: RUN`).
- **REVIEW: SKIP** → 메인이 F3과 같은 방식으로 `git diff`를 확인한다 (plan.md 범위 대비 누락·초과, 하드코딩 스타일, 공용 컴포넌트를 두고 중복 구현했는지). 문제가 있으면 담당 에이전트에 수정시키고 tester를 다시 돌린다. 구조적 문제·위험이 보이면 reviewer를 호출한다.

## S6. 문서 반영

FULL 8단계와 같다 ("문서 갱신 예정"이 있을 때만 architect 문서 반영 모드).

## S7. 완료 보고

FULL 9단계 형식에 맞추고, 맨 위에 `MODE: STANDARD — 이유`와 생략한 단계(architect 설계, reviewer, security)·이유, 병렬 여부(PARALLEL)를 적는다.

---

# FULL 모드 (기존 파이프라인)

기존 파이프라인의 단계·검증 기준·수정 루프 상한은 그대로다. 모든 서브에이전트 프롬프트 첫 줄에 `MODE: FULL`을 적는다 (생략해도 FULL로 동작).
변경점: `BACKEND: SKIP` 플래그, 구현 그룹(backend ∥ frontend ∥ tester 준비)과 리뷰 그룹(reviewer ∥ security)의 병렬 실행. `PARALLEL: NO`면 구현은 기존 순서대로 순차 실행한다.

## 1단계: architect (설계 모드)

Agent(`architect`) 호출. 프롬프트: `MODE: FULL`, 사용자 요청 원문 + 작업 폴더 경로. 승격으로 온 경우 이전 모드 산출물 경로와 이미 변경된 파일을 함께 적는다.

완료 후 plan.md의 플래그를 기록한다 (architect의 마지막 응답에 들어 있다):
- `BACKEND: SKIP` / `FRONTEND: SKIP` → 3단계 그룹에서 해당 에이전트를 뺀다
- `SECURITY_REVIEW: SKIP` → 6단계에서 security를 뺀다
- `PARALLEL: YES|NO` → 3단계를 병렬로 할지 순차로 할지

## 2단계: 설계 승인 (필수)

plan.md 전체를 읽고 사용자에게 승인을 받는다. 구현이 시작되기 전, 고치는 비용이 가장 싼 시점이다.

1. plan.md의 "승인용 설계 요약"을 그대로 보여 준다. `DOC_ISSUES`가 있으면 함께 보여 준다.
2. AskUserQuestion으로 묻는다:
   - **승인하고 진행**
   - **수정 후 진행** (사용자가 수정 내용을 적는다)
   - **중단**
   - `DOC_ISSUES`가 있으면 항목마다 선택지를 함께 묻는다: 프로젝트 문서대로 / 새로 정한 대로 / 문서를 먼저 고친 뒤 다시
3. 처리:
   - 승인 → 3단계
   - 수정 → architect를 "승인 피드백 반영" 모드로 재호출(프롬프트에 사용자 피드백 원문 포함)한 뒤, 다시 2단계. 최대 3회.
   - 중단 → 0단계에서 만든 브랜치와 작업 폴더를 그대로 둔 채 멈추고, 원래 브랜치로 돌아가는 방법을 알려 준다.
4. 사용자가 응답할 수 없는 상황(예약 실행 등)이면: DOC_ISSUES는 프로젝트 문서를 따르는 쪽으로 정하고, 설계대로 진행하되 완료 보고 맨 위에 "설계 승인 없이 진행함"과 핵심 결정을 적는다.

## 3단계: 구현 그룹 (PARALLEL: YES면 병렬)

"병렬 실행 규칙"대로 아래를 한 그룹으로 동시에 호출한다. 플래그가 SKIP인 에이전트는 뺀다.
- `backend` (BACKEND: REQUIRED): `MODE: FULL`, `PARALLEL: YES`, 작업 폴더 경로, "design-backend.md대로 구현하고 backend.md에 기록".
- `frontend` (FRONTEND: REQUIRED): `MODE: FULL`, `PARALLEL: YES`, 작업 폴더 경로, "design-frontend.md와 design-backend.md의 API 계약대로 구현하고 frontend.md에 기록. backend 완료를 기다리지 않는다".
- `tester`: `MODE: FULL`, `PHASE: PREPARE`, 작업 폴더 경로, "test-plan.md와 API 계약으로 테스트 코드를 작성. 실행은 5단계에서".

**PARALLEL: NO**면 기존 순서대로 순차 호출한다: `backend`("design-backend.md대로 구현하고 backend.md에 기록") → `frontend`("design-frontend.md와 backend.md의 API 요약(BACKEND: SKIP이면 design-frontend.md의 API 목록)대로 구현하고 frontend.md에 기록"). tester는 5단계에서 작성·실행을 한 번에 한다 (`PHASE` 없이).

그룹이 끝나면 "병렬 실행 규칙 4"대로 통합한다 (소유 범위 확인, `CONTRACT_CHANGE:` 처리).

## 4단계: 화면 확인 (조건부)

frontend 보고에 "화면 확인: 보류(API 대기)"가 있을 때만 `frontend`를 `MODE: FULL`, "화면 확인만"으로 호출한다 ("병렬 실행 규칙 — 화면 확인").

## 5단계: tester (통합 실행)

Agent(`tester`) 호출. 프롬프트: `MODE: FULL`, `PHASE: RUN`(PARALLEL: NO면 생략), 작업 폴더 경로, "test-plan.md대로 테스트를 실행(PARALLEL: NO면 작성·실행)하고 test-report.md에 기록".
실행 범위는 tester 정의의 FULL 기준 그대로다 (API 연동·unit·통합, Playwright E2E, 타입체크·lint, 전체 스위트 회귀).

- `RESULT: PASS` → 6단계
- `RESULT: FAIL` → **수정 루프 A** (최대 2회):
  1. 담당이 backend인 실패는 `backend`, frontend인 실패는 `frontend`에 맡긴다 ("test-report.md의 <담당> 항목 수정"). 둘 다 있으면 PARALLEL: YES일 때만 병렬, 아니면 backend → frontend ("병렬 실행 규칙 5").
  2. `tester` 재호출 ("재실행, Run N으로 덧붙이기", PARALLEL: YES였으면 `PHASE: RUN`). 구현 코드가 바뀌었으므로 영향받은 테스트를 포함해 다시 실행한다.
  - 2회 후에도 FAIL이면 멈추고 사용자에게 보고한다.

## 6단계: 리뷰 그룹 (reviewer ∥ security)

"병렬 실행 규칙 — 리뷰 그룹"대로 스냅샷 해시를 기록하고 동시에 호출한다. SECURITY_REVIEW: SKIP이면 reviewer만 호출한다.
- `reviewer`: `MODE: FULL`, 작업 폴더 경로, "구현과 테스트를 리뷰하고 review.md에 기록".
- `security` (SECURITY_REVIEW: REQUIRED): `MODE: FULL`, 작업 폴더 경로, "보안 점검하고 security.md에 기록".

둘 다 끝나고 해시가 같으면: `VERDICT: APPROVE`이고 (security를 했다면) `SECURITY: PASS` → 8단계. 아니면 7단계.

## 7단계: 리뷰 수정 루프 (수정 루프 B·C)

reviewer의 CHANGES_REQUESTED는 **수정 루프 B**(최대 2회), security의 FAIL은 **수정 루프 C**(최대 2회)로 각각 회차를 센다.
1. review.md·security.md의 이슈를 담당별로 모아 `backend`·`frontend` 중 해당 에이전트를 호출한다 ("review.md·security.md의 <담당> 항목 수정"). PARALLEL: YES면 병렬, 아니면 backend → frontend ("병렬 실행 규칙 5").
2. 모두 끝나면 `tester` 재실행 ("재실행, Run N으로 덧붙이기. review.md의 담당 tester 항목도 함께 수정", PARALLEL: YES였으면 `PHASE: RUN`. FAIL이면 루프 A 적용). 테스트 이슈 수정을 이 호출에 합쳐 tester를 한 번만 부른다.
3. 리뷰 그룹을 다시 돌린다 (스냅샷 해시 포함):
   - `reviewer`: CHANGES_REQUESTED였으면 재호출 ("재리뷰, 수정된 파일만, Round N").
   - `security`: FAIL이었으면 재호출 ("재점검, 수정된 파일만, Round N"). PASS였더라도 SECURITY_REVIEW: REQUIRED이고 이번 수정으로 코드가 바뀌었으면 수정된 파일만 재점검한다 (security가 최종 코드를 본다는 기존 보장 유지).
- 루프 B를 2회 써도 CHANGES_REQUESTED면 남은 이슈를 사용자에게 보고하고 계속할지 묻는다.
- 루프 C를 2회 써도 FAIL이면 멈추고 남은 취약점을 사용자에게 보고한다. 보안 FAIL 상태로 완료 처리하지 않는다.

## 8단계: architect (문서 반영 모드)

리뷰(와 보안 점검)를 통과했을 때만 실행한다. FAST·STANDARD에서 reviewer를 생략했으면 테스트 통과 + 메인 diff 확인 통과가 그 조건이다. 중간에 멈춘 경우에는 실행하지 않는다. 그래야 끝나지 않은 코드에 맞춰 프로젝트 문서가 바뀌는 일이 없다.

backend.md / frontend.md에 "문서 갱신 예정"이 하나라도 있으면 Agent(`architect`) 호출. 프롬프트: 작업 폴더 경로, "문서 반영 모드: backend.md와 frontend.md의 문서 갱신 예정을 프로젝트 문서에 반영하고 docs-update.md에 기록". 없으면 건너뛴다.

## 9단계: 완료 보고

서브에이전트들의 마지막 응답만 모아서 짧게 보고한다:
- 맨 위: `MODE: FULL — 이유` (승격으로 왔으면 `FAST → FULL`처럼 경로와 이유)
- (승인 없이 진행했으면 그 사실과 핵심 결정)
- 구현된 기능 요약 (2~3줄)
- 테스트 결과 (통과 개수), 리뷰 결과, 보안 점검 결과 (했을 경우)
- 화면 확인 여부 (frontend가 했는지, 생략했는지)
- 병렬 실행 여부와 metrics.md 요약 (총 벽시계 시간, 병렬 그룹의 순차 대비 절감, 총 토큰, 재작업 횟수, 병목 단계)
- 갱신된 프로젝트 문서 (docs-update.md 기준)
- 남은 낮은 심각도 제안이 있으면 개수와 문서 위치
- 작업 문서 위치: `.claude/work/<slug>/`
- **브랜치 안내**: 작업 브랜치 이름, 변경 확인 명령(`git diff <원래 브랜치>...feature/<slug>`), 문제가 있으면 되돌리는 방법(`git checkout <원래 브랜치>` 후 `git branch -D feature/<slug>`). 커밋은 사용자가 확인 후 직접 한다.

### 중간에 멈춘 경우의 보고
어느 단계에서 왜 멈췄는지, 지금 코드 상태(어디까지 구현됐는지), 프로젝트 문서는 바뀌지 않았다는 점, 브랜치 되돌리는 방법을 알려 준다.

단계별 과정을 되풀이하지 않는다.
