# 사용자 결정 (설계 승인, 2026-11-14)
- 설계 승인: 승인하고 진행. DB에 쓰는 E2E(attendance·departments·leaves)는 개발 DB에서 실행 허가(기존 E2E 계정·정리 절차 사용, 기존 샘플 사원 편집·삭제 금지).
- Q1 SCR-008 확인 단계 [修正する] (AttendanceEditModal.tsx:122): **그대로 둔다 (B)**.
- Q2 役職確認 아이콘 전용 편집 버튼 (JobTitlesModal.tsx:203): **A — primaryOutline 아이콘 전용** (EditButton iconOnly).
- Q3 SCR-008 표의 sr-only 열 제목 「修正」 (AdminAttendanceView.tsx:149): **B — 「編集」으로 변경** (plan.md 권장 A와 다름. editColumn 키 신설 대신 공통 edit 문구 사용 가능).
- Q4 部署詳細 하단 [この部署を編集]: **A — primaryOutline + Pencil로 변경**.
- Q5 (구현 후) 360px 部署詳細 하단 [この部署を編集] 2줄 줄바꿈: **버튼 문구를 「編集」으로** (EditButton 기본 문구 사용). aria-label에 부서명 포함 가능.
- Q6 (Run 1 후) 768px 部署一覧 操作列이 가로 스크롤 뒤에 있음(변경 전부터 표 762px>670px, 이번 변경으로 +20px): **이번에 표 레이아웃 수정**. 768px에서 가로 스크롤 없이 操作列이 보이게.
- Q7 (Run 4 후) SCR-005 休暇承認 표 768·1024px에서 [詳細][承認][却下] 우측이 overflow hidden으로 잘림: **部署一覧과 같은 방식으로 수정** (표/카드 전환점 상향, 디자인 불변).
