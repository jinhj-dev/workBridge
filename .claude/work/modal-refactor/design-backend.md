# design-backend — modal-refactor

**변경 없음.** 이번 작업은 프론트엔드 모달의 디자인·접근성·제출 중(busy) 동작 리팩터링이다.

- API·요청 본문·응답·에러 코드·DB 스키마·마이그레이션 변경 없음.
- 호출되는 기존 API(참고만): API-DEPT(부서 등록·수정·삭제·manager-candidates·members), API-LEAVE(신청·상세·승인·반려·취소), API-ATT(관리자 근태 수정, 출근·퇴근). 계약은 `docs/06_API_SPECIFICATION.md` 그대로.
- backend 에이전트 호출 불필요.
