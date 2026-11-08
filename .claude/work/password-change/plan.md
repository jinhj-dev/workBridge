FRONTEND: REQUIRED
SECURITY_REVIEW: REQUIRED
SUMMARY: PATCH /auth/password(현재 비밀번호 확인, 규칙 8자 이상·영문+숫자·72바이트 이하, 해시 갱신·mustChangePassword 해제·현재 세션 외 Refresh Token 무효화)와 /password 화면 SCR-009(최초 로그인 강제 시 취소 숨김, 로그인 후 mustChangePassword면 /password 이동, 성공 토스트 후 /dashboard) 구현, docs 02·08·SCR-009·10 갱신
