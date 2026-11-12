SECURITY: PASS

# 보안 점검: dashboard-renewal (Round 1)

대상: 브랜치 feature/dashboard-redesign (미커밋). 코드 수정 없음.

## 이슈 (심각도별)

[중간] [담당: backend] backend/src/modules/dashboard/dashboard.service.ts:65-74, dashboard.repository.ts:29-61 — 인원 1~2명 부서에서 개인의 출근·休暇·未出勤 상태가 추정된다 (D7). / 악용 시나리오: 1명 부서는 `memberCount=1`이고 3분류 중 정확히 하나가 1이므로 해당 사원의 오늘 상태가 그대로 드러난다. 같은 부서가 아닌 일반 사원도 부서명으로 대상을 특정할 수 있고, 수 분 간격 폴링으로 출근 시각과 지각 여부까지 알 수 있다. 2명 부서는 본인 상태를 아는 동료가 상대방 상태를 확정할 수 있다. / 수정 방향: 사용자가 공개를 결정했으므로 현 구현은 허용한다. 완화안은 (a) memberCount가 N 미만(권장 N=3 이하)인 부서는 EMPLOYEE 응답에서 3분류를 null로 마스킹(ADMIN은 `/admin/dashboard/summary`와 `/admin/attendance`로 이미 열람 가능), (b) EMPLOYEE는 본인 부서만 열람, (c) `休暇`와 `未出勤`을 합쳐 「不在」로 표시. 정책 결정 사항이므로 사용자 판단을 요청한다.

[낮음] [담당: backend] backend/src/modules/dashboard/dashboard.controller.ts:10 — `GET /dashboard/department-status`에 호출 빈도 제한이 없다. / 악용 시나리오: 위 D7 추정을 위한 고빈도 폴링이 가능하다. 다만 인증된 사용자만 호출할 수 있고, 다른 API도 rate limit이 없는 기존 정책과 같다. / 수정 방향: 필요하면 다른 API와 함께 전역 throttling을 도입한다. 이번 작업에서 필수는 아니다.

[낮음] [담당: backend] backend/src/modules/dashboard/dashboard.service.ts:89 — `departmentId`(부서 UUID)를 전 사용자에게 공개한다. / 악용 시나리오: 부서 UUID는 개인정보가 아니고 추측이 불가능하며, 부서 ID만으로 얻는 권한이 없다. 悪用 경로 없음. / 수정 방향: 프런트가 id를 쓰지 않으면 응답에서 제거해도 된다(권고).

## 중점 항목별 판정

(1) department-status
- 응답 필드는 `date, isWorkday, departments[{departmentId|null, departmentName, memberCount, clockedInCount, onLeaveCount, notClockedInCount, attendanceRate}]`뿐이다. 이름·사원번호·userId·休暇の種類는 없다. 리포지토리 SQL이 GROUP BY 집계만 SELECT하고, `applyWorkday`가 항상 새 객체를 반환해 `departmentCode`가 새지 않는다(e2e가 필드 집합을 검증한다고 backend.md에 기록).
- SQL은 `$queryRaw` 태그 템플릿이라 `today`가 파라미터 바인딩된다. 사용자 입력은 없다(Query 없음). 인젝션 경로 없음.
- 인증은 전역 `APP_GUARD`(JwtAuthGuard, auth.module.ts:30)로 적용된다. `@Public()`은 health와 auth에만 있다. 따라서 이 엔드포인트는 인증이 필요하고 PASSWORD_CHANGE_REQUIRED도 기존 가드가 처리한다.
- D7 수치 평가:
  - 인원 1명 부서: 노출 정확도 100%(상태 3종 모두 확정). 영향은 전 사용자에게 미친다.
  - 인원 2명 부서: 부서 동료에게는 상대방 상태가 100% 확정된다. 그 외 사용자에게는 {2,0,0}, {0,0,2}처럼 같은 상태인 경우에만 확정되고 {1,1,0}이면 어느 쪽인지 알 수 없다.
  - 인원 3명 이상: 본인을 제외하면 부분 추정만 가능하다(같은 상태 3명이 모두 같을 때는 확정).
  - 가장 민감한 정보는 未出勤이다. 지각, 무단결근, 휴가 사유 추정으로 이어질 수 있다. 休暇는 종류 없이 개수만 나오지만 1명 부서에서는 休暇 사실 자체가 공개된다.
  - 판정: 사용자가 의도적으로 결정한 공개 범위이고, 이름·ID가 없어 직접 식별은 불가능하다. 위험은 중간이다. 마스킹이 필요한지는 조직 규모를 아는 사용자가 정해야 하므로, 최소 인원 마스킹(N 미만 부서 3분류를 비공개)을 권장하고 차단 사유(FAIL)로는 하지 않는다.

(2) GET /admin/dashboard/summary
- 컨트롤러 클래스에 `@AdminOnly()`가 있고, `AdminGuard`가 `user.role !== 'ADMIN'`이면 403, 미인증이면 401로 fail-closed 처리한다. 판정은 경로 문자열이 아니라 메타데이터 기반이다. 서버 검증 OK.
- 응답은 집계 수치와 `pendingLeaveCount`뿐이다. 개인 식별 정보 없음.

(3) 승인 미리보기
- 새 승인 경로 없음. 프런트는 기존 `GET /leaves/pending-approval`과 기존 승인·반려 API(`PATCH /leaves/:id/approve|reject`)를 재사용한다. 백엔드에서 leaves 모듈 변경 없음(git status에도 leaves 파일 없음).
- `scope=all`은 `leaves.service.ts:229`에서 ADMIN이 아니면 403(서버 검증). `scope=mine`은 `approverId: user.id`로 필터링(leaves.service.ts:233, leaves.repository.ts:216)되어 본인 할당 건만 반환한다.
- 승인·반려는 `canProcessLeave`(본인 신청 불가, 할당 승인자 또는 ADMIN)를 확인한 뒤 조건부 UPDATE로 0건이면 409 `ALREADY_PROCESSED`를 반환해 중복 처리를 막는다(leaves.service.ts:258-282).
- 상세 조회는 `canViewLeave`(신청자·할당 승인자·ADMIN)로 제한된다.

(4) 제거된 휴가 캘린더 API
- `dashboard.controller.ts`에는 `department-status` 핸들러만 있다. src 전체에서 `leave-calendar` 참조가 없다. 리포지토리·서비스의 캘린더 메서드도 제거됐다. e2e(dashboard-department-status.e2e-spec.ts:282-283)가 두 경로의 404를 확인한다. 다른 공개 경로는 남아 있지 않다. 이전에 전 사용자에게 공개되던 타인의 이름·사원번호·휴가일 노출이 사라져 노출이 줄었다.

(5) 공통 모듈 이동
- `calendar-rules.ts`(`isWeekend`, `monthRange`)와 `today-status-rules.ts`는 순수 함수 모듈로 인증·인가 로직이 없다. 이동은 import 경로만 바꿨다. 출근부의 월 검증은 `attendance-monthly-query.dto.ts`로 옮겼는데 규칙이 같다고 backend.md가 밝혔고, 보안 가드는 변경이 없다. 권한 우회 경로 없음.

(6) 프런트
- `isAdmin = user?.role === 'ADMIN'`은 호출 대상 API와 카드 표시를 고르는 용도일 뿐이다. 서버가 `@AdminOnly`·`scope=all` 검증으로 최종 권한을 가진다. 변조해도 EMPLOYEE의 `/admin/dashboard/summary`와 `scope=all` 요청은 403이 된다.
- 승인 버튼은 대시보드에 직접 없고 기존 `LeaveDetailModal`의 `canProcess` 안에서만 노출된다(D8 확정). 서버가 `canProcessLeave`로 다시 검증하므로 표시 제어가 우회되어도 영향이 없다.
- 대시보드 소스에 `localStorage`, `sessionStorage`, `console.*`, `dangerouslySetInnerHTML` 사용이 없다(grep 결과 0건). 개인정보의 과도한 클라이언트 저장·로그 출력 없음. 토큰 처리는 변경 없음.
- 이름·부서 등 사용자 데이터는 React의 기본 이스케이프로 렌더링되므로 XSS 경로가 없다.

(7) 의존성
- backend/package.json, frontend/package.json, 루트 package.json 모두 git status의 변경 목록에 없다(알파벳순 목록에서 해당 위치에 부재). 신규 패키지 없음. 도넛 차트도 정적 SVG라 라이브러리를 추가하지 않았다. 이 작업으로 인한 의존성 취약점 위험 없음. (git 명령을 실행하지 못해 status 목록과 각 파일의 존재 여부로 확인했다.)

## 개수
치명 0 / 높음 0 / 중간 1 / 낮음 2
