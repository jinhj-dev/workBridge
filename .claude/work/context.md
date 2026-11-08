# workBridge 공통 컨텍스트

## 기술 스택
- 모노레포(npm, 루트 package.json은 명령 모음만). Node `^20.19 || ^22.12 || >=24`
- Backend: NestJS 12, TypeScript 6, ESM(`"type": "module"`, import에 `.js` 확장자 필수), Prisma 7.10(@prisma/adapter-pg, 생성물 `src/generated/prisma`), PostgreSQL(docker compose), zod 4(입력 검증), bcrypt 6(cost 12), @nestjs/jwt(HS256), cookie-parser
- Frontend: Next.js 16.4(App Router, `cacheComponents`), React 19.3, Tailwind 4(토큰은 `src/app/globals.css` `@theme`), 상태관리 라이브러리 없음(React Context)
- 테스트: backend Vitest 4 + Supertest(e2e는 실제 테스트 DB `workbridge_test`), frontend Vitest + Testing Library(jsdom) + Playwright(실제 백엔드·개발 DB 연동)

## 폴더 구조
- `docs/` 기준 문서(02 요구사항, 03 화면목록·공통 UI 규칙, 04 화면명세, 05 DB, 06 API, 07 아키텍처, 08 테스트, 09 디자인, 10 로드맵)
- `backend/src/modules/<domain>/` controller / service / repository / dto / guards / decorators
- `backend/src/common/` exceptions(AppException), filters(AllExceptionsFilter), pipes(zod 검증), security(credentials)
- `backend/src/config/` env 검증(zod), `backend/src/prisma/` PrismaService
- `backend/prisma/` schema.prisma, migrations, seed.ts
- `backend/test/` e2e(`*.e2e-spec.ts`), `test/db/db-helpers.ts`(createTestPrisma, TestDataTracker, uniqueSuffix)
- `frontend/src/app/<route>/` page.tsx(서버, metadata) + 클라이언트 폼 컴포넌트(`'use client'`) + `*.test.tsx`
- `frontend/src/components/` 공용 UI, `frontend/src/lib/` api·auth, `frontend/src/messages/ja.ts` 표시 문구 사전
- `frontend/e2e/` Playwright

## 컨벤션
- 코드 주석·UI 문구·에러 message·커밋은 **일본어**. 문서(docs, .claude/work)는 한국어. 식별자는 영어
- Controller는 HTTP만, Service는 업무 로직, Repository만 Prisma 접근(Controller → Repository 직접 호출 금지)
- 입력 검증: zod 스키마를 `dto/*.dto.ts`에 두고 `@Body({ schema })`로 적용. 실패 시 400 `VALIDATION_ERROR` + `details[{field,message}]`
- 업무 에러: `throw new AppException(code, HttpStatus.X, '日本語メッセージ')` → `{statusCode, code, message, details}`
- 인증 실패는 `UnauthorizedException`(401, 사유 비공개)
- API: prefix `/api/v1`, JSON camelCase, 204는 본문 없음
- 전역 Guard: `JwtAuthGuard`(APP_GUARD) → 내부에서 `PasswordChangeGuard` 호출. 공개 API는 `@Public()`, 비밀번호 변경 필요 사용자 허용은 `@AllowPasswordChangeRequired()`(AuthController 클래스에 이미 부여)
- 프론트 문구는 반드시 `messages`(ja.ts)에서 참조. 하드코딩 금지
- 테스트 이름: `shouldXxxWhenYyy` 또는 일본어 설명(기존 spec 참고)

## 공용 모듈
- `backend/src/common/exceptions/app.exception.ts` AppException, ErrorDetail
- `backend/src/common/security/credentials.ts` BCRYPT_COST, DUMMY_PASSWORD_HASH, EMP_ID_PATTERN
- `backend/src/modules/auth/decorators/current-user.decorator.ts` `@CurrentUser()` → AuthUser
- `backend/src/modules/auth/auth.constants.ts` 토큰 TTL, Refresh 쿠키 이름·옵션(path `/api/v1/auth`)
- `backend/src/modules/auth/auth.service.ts` `hashRefreshToken(token)` (SHA-256 hex)
- `frontend/src/lib/api/client.ts` `apiFetch<T>(path, init)`(401 시 1회 refresh 후 재시도), `ApiError{statusCode,code,message,details}`, `NetworkError`
- `frontend/src/lib/auth/AuthProvider.tsx` `useAuth()` → `{status:'loading'|'authenticated'|'unauthenticated', user, login, logout}`
- `frontend/src/components/` Logo, Modal(`<dialog>`), Spinner
- 아직 없음: Toast, 전역 내비게이션(사이드바·상단바), 라우트 가드, /dashboard

## 명령어
- DB: 루트 `npm run db:up` / backend `npm run db:migrate`, `npm run db:migrate:test`(e2e 전 필요), `npm run db:seed`
- Backend(`backend/`): `npm run build`, `npm run lint`, 타입체크 `npx tsc --noEmit`, `npm test`(unit), `npm run test:e2e`
- Backend 단일 파일: `npx vitest run src/modules/auth/auth.service.spec.ts`, e2e `npx vitest run --config ./vitest.config.e2e.ts test/auth.e2e-spec.ts`
- Frontend(`frontend/`): `npm run build`, `npm run lint`, 타입체크 `npx tsc --noEmit`, `npm test`, 단일 `npx vitest run src/app/login/LoginForm.test.tsx`, `npm run test:e2e`(E2E_ADMIN_PASSWORD 필요, 미설정 시 skip)
- 포맷: 루트 `npm run format` / `npm run format:check`
