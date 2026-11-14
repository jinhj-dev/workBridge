| 단계 | 에이전트 | 병렬 그룹 | 소요(초) | 토큰 | 결과 | 재작업 회차 |
|---|---|---|---|---|---|---|
| 1 설계 | architect | - | 583 | 176831 | plan/design 작성 | 0 |
| 1' 승인 피드백 R1 | architect | - | 275 | 211656 | 메일 방식 반영 | 1 |
| 1'' 승인 피드백 R2 | architect | - | 265 | 267146 | 관리자 입력 방식 확정 | 2 |
| 3 구현 그룹 | backend ∥ frontend ∥ tester(PREPARE) | G1 | 벽시계 973 (순차 합 1918) | 141004+239640+151634 | 완료, 소유 범위 위반 없음 | 0 |
| 4 화면 확인 Fix1 | frontend | - | 164 | 80013 | 경미 수정, 미승인 차이 잔존 | 0 |
| 4' 화면 재현 Fix2 | frontend | - | 623 | 137286 | 참조 화상 재현(variant 추가) | 1 |
| 5 tester Run1 | tester | - | 3000 | 245821 | FAIL(개발DB 데이터 사고·기존 실패) | 0 |
| 루프A-1 | backend | - | 81 | 39464 | cleanup 강화 보고(실제 미반영) | 1 |
| 5 tester Run2 | tester | - | 3688 | 204779 | FAIL(cleanup 미반영 검출) | 1 |
| 루프A-2 | backend | - | 56 | 44943 | cleanup 실제 반영 | 2 |
| 5 tester Run3 | tester | - | N/A | N/A | PASS | 2 |
| 6 리뷰 그룹 R1 | reviewer ∥ security | G2 | 벽시계 340 (순차 합 408) | 199247+52860 | CHANGES_REQUESTED / PASS | 0 |
| 7 루프B-1 | frontend ∥ backend | G3 | 벽시계 355 (순차 합 490) | 129266+47791 | 수정 완료 | 1 |
| 7 tester Run4 | tester | - | 1421 | 173146 | FAIL(cleanup CHECK 제약) | 1 |
| 7 루프A(B 내) | backend | - | 53 | 55419 | 중단 방식으로 변경 | 1 |
| 7 tester Run5 | tester | - | 179 | 80678 | PASS | 1 |
| 6' 리뷰 그룹 R2 | reviewer ∥ security | G4 | 벽시계 164 (순차 합 211) | 252657+65578 | APPROVE / PASS | 1 |
| 8 문서 반영 | architect | - | N/A | N/A | 완료 | 0 |

총평: 재작업 = 수정 루프 A 3회(cleanup), 루프 B 1회, 설계 승인 피드백 2회. 병목 = tester 통합 실행(Run1·Run2 각 50~60분). 개발 DB 데이터 사고 1건(Run1, 사원 10085 휴가·근태 손실, 미복구).
