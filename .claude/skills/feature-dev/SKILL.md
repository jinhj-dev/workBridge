---
name: feature-dev
description: Use when the user asks to build a feature via feature-dev; runs architect, backend, frontend, tester, reviewer and (if needed) security subagents in sequence on a feature branch, with a design approval gate, main agent only orchestrating.
---

# Feature Dev 파이프라인

사용자가 요청한 기능을 아래 순서의 서브에이전트에게 **한 번에 하나씩, 순서대로** 위임해서 구현한다.

```
준비(브랜치) → architect → [설계 승인] → backend → frontend(조건부) → tester
→ reviewer → security(조건부) → architect(문서 반영) → 완료 보고
```

## 메인 에이전트 규칙 (가장 중요)

- 메인은 **오케스트레이터만** 한다. 코드 탐색, 설계, 코드 작성·수정, 테스트 작성·실행, 리뷰, 프로젝트 문서 수정을 직접 하지 않는다. 메인이 직접 하는 일은 git 브랜치 준비, 사용자 승인 받기, 진행 판단뿐이다.
- 테스트 명령(`npm test`, `pytest` 등)을 메인이 실행하지 않는다. 테스트는 반드시 `tester`가 한다.
- Agent 도구로 한 단계씩 호출하고, 이전 단계가 끝난 뒤에만 다음을 호출한다. 병렬 호출 금지, `run_in_background: false`.
- **토큰 절약**: 메인은 산출 문서 본문을 읽지 않는다. 판단에 필요한 것은 서브에이전트의 마지막 응답과 문서 첫 줄(`RESULT:`, `VERDICT:`, `SECURITY:`)뿐이다. 예외는 plan.md(승인용)다. 그 외에 확인이 필요하면 Read를 `limit: 5`로만 쓴다.
- 서브에이전트 프롬프트에는 문서 내용을 붙여 넣지 말고 **경로만** 준다. 각 에이전트는 자기 정의 파일에 정해진 문서만 읽는다.
- 서브에이전트가 실패하거나 정해진 문서를 만들지 않으면 다음 단계로 넘어가지 않고 한 번 재호출한다. 그래도 안 되면 멈추고 사용자에게 보고한다.
- 커밋, push, 머지는 하지 않는다. 사용자가 확인한 뒤 직접 하도록 완료 보고에서 안내한다.

## 이 파이프라인을 쓰지 않는 경우

아래에 모두 해당하면 파이프라인을 돌리지 않고, 사용자에게 "작은 변경이라 파이프라인 없이 진행한다"고 한 줄 알린 뒤 일반 방식으로 처리한다 (테스트 실행은 그래도 `tester`에게 맡긴다).
- 수정 파일이 2~3개 이하로 예상된다
- 새 API, DB 스키마 변경, 새 화면이 없다
- 인증·권한·결제·개인정보와 관련이 없다

예: 문구 수정, 스타일 조정, 작은 버그 수정, 설정값 변경. 애매하면 파이프라인을 쓴다. 사용자가 명시적으로 파이프라인을 원하면 크기와 관계없이 쓴다.

## 문서 구조

```
.claude/work/
  context.md                ← 프로젝트 공통 (기능 간 재사용, architect만 작성)
  <slug>/
    plan.md                 ← 플래그 + 승인용 설계 요약 (메인이 읽음)
    design-backend.md       ← backend용
    design-frontend.md      ← frontend용
    test-plan.md            ← tester용
    backend.md              ← backend 산출 (문서 갱신 예정 포함)
    frontend.md             ← frontend 산출 (문서 갱신 예정 포함)
    screenshots/            ← frontend 화면 확인 (선택)
    test-report.md          ← tester 산출 (RESULT)
    review.md               ← reviewer 산출 (VERDICT)
    security.md             ← security 산출 (SECURITY)
    docs-update.md          ← architect 문서 반영 결과
```

## 0단계: 준비

1. 기능 이름으로 slug를 정한다 (예: 로그인 → `login`). 작업 폴더는 `.claude/work/<slug>/`.
2. **브랜치 준비** (git 저장소일 때):
   - `git status --porcelain`으로 작업 트리를 확인한다.
   - 커밋 안 된 변경이 있으면 멈추고 사용자에게 묻는다: 먼저 커밋 / stash / 그대로 진행. 임의로 stash하거나 버리지 않는다.
   - 깨끗하면 현재 브랜치 이름을 기록해 두고 `git checkout -b feature/<slug>`로 새 브랜치를 만든다. 같은 이름이 있으면 `feature/<slug>-2`처럼 번호를 붙인다.
   - git 저장소가 아니면 이 단계를 건너뛰고, 되돌릴 수단이 없다는 점을 완료 보고에 적는다.
3. TaskCreate로 작업 목록을 만든다: 설계 / 설계 승인 / 백엔드 / 프론트엔드 / 테스트 / 리뷰 / 보안 점검 / 문서 반영 / 완료 보고. 건너뛰는 단계는 나중에 deleted로 바꾼다.

## 1단계: architect (설계 모드)

Agent(`architect`) 호출. 프롬프트: 사용자 요청 원문 + 작업 폴더 경로.

완료 후 plan.md의 플래그를 기록한다 (architect의 마지막 응답에 들어 있다):
- `FRONTEND: SKIP` → 4단계 건너뜀
- `SECURITY_REVIEW: SKIP` → 7단계 건너뜀

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

## 3단계: backend

Agent(`backend`) 호출. 프롬프트: 작업 폴더 경로, "design-backend.md대로 구현하고 backend.md에 기록".

## 4단계: frontend (FRONTEND: REQUIRED일 때만)

Agent(`frontend`) 호출. 프롬프트: 작업 폴더 경로, "design-frontend.md와 backend.md의 API 요약대로 구현하고 frontend.md에 기록".

## 5단계: tester

Agent(`tester`) 호출. 프롬프트: 작업 폴더 경로, "test-plan.md대로 테스트 작성·실행하고 test-report.md에 기록".

- `RESULT: PASS` → 6단계
- `RESULT: FAIL` → **수정 루프 A** (최대 2회):
  1. 담당이 backend인 실패가 있으면 `backend` 호출 ("test-report.md의 backend 담당 항목 수정")
  2. 담당이 frontend인 실패가 있으면 `frontend` 호출
  3. `tester` 재호출 ("재실행, Run N으로 덧붙이기")
  - 2회 후에도 FAIL이면 멈추고 사용자에게 보고한다.

## 6단계: reviewer

Agent(`reviewer`) 호출. 프롬프트: 작업 폴더 경로, "구현과 테스트를 리뷰하고 review.md에 기록".

- `VERDICT: APPROVE` → 7단계
- `VERDICT: CHANGES_REQUESTED` → **수정 루프 B** (최대 2회):
  1. review.md의 담당별로 `backend` → `frontend` → `tester` 순서로, 해당 항목이 있는 에이전트만 호출
  2. 코드가 바뀌었으므로 `tester` 재실행 (FAIL이면 루프 A 적용)
  3. `reviewer` 재호출 ("재리뷰, 수정된 파일만, Round N")
  - 2회 후에도 CHANGES_REQUESTED면 남은 이슈를 사용자에게 보고하고 계속할지 묻는다.

## 7단계: security (SECURITY_REVIEW: REQUIRED일 때만)

Agent(`security`) 호출. 프롬프트: 작업 폴더 경로, "보안 점검하고 security.md에 기록".

- `SECURITY: PASS` → 8단계
- `SECURITY: FAIL` → **수정 루프 C** (최대 2회):
  1. security.md의 담당별로 `backend` / `frontend` 호출
  2. `tester` 재실행 (FAIL이면 루프 A)
  3. `security` 재호출 ("재점검, 수정된 파일만, Round N")
  - 2회 후에도 FAIL이면 멈추고 남은 취약점을 사용자에게 보고한다. 보안 FAIL 상태로 완료 처리하지 않는다.

## 8단계: architect (문서 반영 모드)

리뷰(와 보안 점검)를 통과했을 때만 실행한다. 중간에 멈춘 경우에는 실행하지 않는다. 그래야 끝나지 않은 코드에 맞춰 프로젝트 문서가 바뀌는 일이 없다.

backend.md / frontend.md에 "문서 갱신 예정"이 하나라도 있으면 Agent(`architect`) 호출. 프롬프트: 작업 폴더 경로, "문서 반영 모드: backend.md와 frontend.md의 문서 갱신 예정을 프로젝트 문서에 반영하고 docs-update.md에 기록". 없으면 건너뛴다.

## 9단계: 완료 보고

서브에이전트들의 마지막 응답만 모아서 짧게 보고한다:
- (승인 없이 진행했으면 맨 위에 그 사실과 핵심 결정)
- 구현된 기능 요약 (2~3줄)
- 테스트 결과 (통과 개수), 리뷰 결과, 보안 점검 결과 (했을 경우)
- 화면 확인 여부 (frontend가 했는지, 생략했는지)
- 갱신된 프로젝트 문서 (docs-update.md 기준)
- 남은 낮은 심각도 제안이 있으면 개수와 문서 위치
- 작업 문서 위치: `.claude/work/<slug>/`
- **브랜치 안내**: 작업 브랜치 이름, 변경 확인 명령(`git diff <원래 브랜치>...feature/<slug>`), 문제가 있으면 되돌리는 방법(`git checkout <원래 브랜치>` 후 `git branch -D feature/<slug>`). 커밋은 사용자가 확인 후 직접 한다.

### 중간에 멈춘 경우의 보고
어느 단계에서 왜 멈췄는지, 지금 코드 상태(어디까지 구현됐는지), 프로젝트 문서는 바뀌지 않았다는 점, 브랜치 되돌리는 방법을 알려 준다.

단계별 과정을 되풀이하지 않는다.
