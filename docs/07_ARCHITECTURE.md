# 07. Architecture

## 1. Architecture Overview

본 시스템은 Frontend와 Backend를 분리한
웹 애플리케이션으로 구축한다.

Frontend:
- Next.js
- TypeScript
- Tailwind CSS

Backend:
- NestJS
- Prisma ORM

Database:
- PostgreSQL

## 2. Backend Architecture

Controller
    ↓
Service
    ↓
Repository
    ↓
Database

### Controller
- HTTP Request / Response 처리
- DTO Validation
- Service 호출

### Service
- 비즈니스 로직 처리
- 업무 규칙 검증
- Transaction 관리

### Repository
- DB 조회 및 저장
- Prisma Client 사용

## 3. Authentication

관련 요구사항: FR-AUTH-001, FR-AUTH-002, NFR-001

- JWT 기반 인증
- Access Token: 짧은 만료, `Authorization: Bearer` 헤더로 전달, 클라이언트 메모리에 보관
- Refresh Token: httpOnly·Secure 쿠키로 전달, 서버에는 해시로 저장(refresh_tokens), 유효 기간 7일, 갱신 시 회전, 로그아웃·비밀번호 변경·계정 비활성화 시 무효화(상세는 05_DATABASE_DESIGN.md §3)
- Access Token 만료 시 Refresh Token으로 1회 갱신 후 재요청, 실패하면 로그인 화면으로 이동
- 보호된 API에 Guard 적용
  - 인증 Guard: 토큰 검증, 비활성 계정 차단
  - Role Guard: `/admin/*` API는 ADMIN만. 경로 매칭이 아니라 `/admin/*` Controller에 `@AdminOnly()` 메타데이터를 부여하는 방식
  - 비밀번호 변경 Guard: `mustChangePassword = true`이면 `/auth/*` 외 API 차단
  - 호출 순서: 전역 인증 Guard(`JwtAuthGuard`)가 인증 → 비밀번호 변경 Guard → Role Guard 순으로 호출한다
- 리소스 단위 권한(휴가 승인자, 신청자 등)은 Service 계층에서 검증
- Frontend: 라우트 가드로 03_SCREEN_LIST의 Screen Access Rules를 적용하되, 최종 권한 판단은 서버가 한다.

## 4. Error Handling

- 공통 Error Response
- HTTP Status Code 통일
- 예외 처리 표준화

## 5. Security

- 비밀번호 해시 처리
- 인증 및 권한 검증
- DTO 입력값 검증
- 민감정보 로그 출력 금지

## 6. Deployment

- Frontend: Next.js
- Backend: NestJS
- Database: PostgreSQL
- Container: Docker
- CI/CD: GitHub Actions