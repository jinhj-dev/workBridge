FRONTEND: REQUIRED
SECURITY_REVIEW: SKIP
DOC_ISSUES: SCR-004 §4.4 "처리자/처리 시간은 처리된 건만 표시"가 요청(항상 표시, 미처리 「—」)과 충돌(D4) / 09 §2.1에 Yellow(경고)는 있으나 `globals.css` @theme·Badge variant에 없음(D1) / 09 §6 Modal은 폭 420 고정이고 배경 스크롤 잠금·내부 스크롤·바깥 클릭 정책이 문서에 없음(D7·D8) / 09에 상세 정보 표(Detail Table) 규칙 없음(09 §4 SCR-004 "상세 모달 레이아웃 없음") / 기간 구분자: 요청 「～」 vs 현행 `formatPeriod` "~"(D6)
SUMMARY: 休暇詳細 모달을 이미지 기준 2열 상세 표 + 아이콘 헤더 + 상태 Badge(아이콘·pill)로 개편하고, Modal·Badge 확장과 DetailTable·LeaveStatusBadge 공통화를 프론트만으로 한다.

## 승인용 설계 요약
- 범위(함): LeaveDetailModal 상세 단계 UI 개편, 공통 Modal 확장(헤더 아이콘·폭 lg·푸터 구분선·본문 내부 스크롤·배경 스크롤 잠금), Badge `warning` variant, `DetailTable` 신규, `LeaveStatusBadge` 신규(휴가 이력·출근부·필터·모달이 공유), 상태 문구 `取消`→`取消済み`
- 범위(안 함): 백엔드·DB·API, 휴가 신청·승인·취소 로직과 버튼 표시 조건, 승인 목록·대시보드 승인 대기 표(상태 열 없음), 이미지의 보라색 브랜드·큰 radius·짙은 그림자(토큰에 없음)
- 핵심 결정(추천안, decisions.md 참조)
  1. 상태 색: 承認待ち=신규 `warning`(Yellow 40 배경 + 주황 아이콘), 取消済み=`neutral`(회색), 承認済み `success`, 却下 `danger`. 모든 휴가 상태 표시에 동일 적용(D1·D2)
  2. 承認者: `autoApproved`면 「自動承認」, 아니면 `approver.name`(기존 필드, 추가 데이터 불필요). 処理者·処理日時는 항상 표시, 미처리 「—」(D4)
  3. 却下理由 행은 REJECTED일 때만 마지막에 유지(D5). 기간 구분자는 `formatPeriod`를 「～」로 전역 변경(D6)
  4. Modal 공통 변경(내부 스크롤·스크롤 잠금·푸터 구분선)은 전 모달 7곳에 적용, 폭 lg·아이콘은 선택 prop(D7·D8). 바깥 클릭으로 닫지 않는 현행 유지(D9)
- API: 변경 없음(GET /leaves/:id 기존 응답 재사용)
- 화면: SCR-004 §4.4 휴가 상세 모달(호출처 SCR-002·003·004·005), 상태 Badge 영향 SCR-003·004
- 변경 파일 수: 백엔드 0 / 프론트 약 10(신규 2: DetailTable, LeaveStatusBadge) + 테스트
- 프로젝트 문서 갱신 예정: 09_DESIGN_SYSTEM(§2.1·§6), SCR-004(§4.4), 10_DEVELOPMENT_ROADMAP
