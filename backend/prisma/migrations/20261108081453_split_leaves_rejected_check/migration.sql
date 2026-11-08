-- leaves_rejected_state_check を設計書(05 §6)の項目どおり 2 つの CHECK に分ける。
-- 判定内容は変わらないため、既存データへの影響はない。
ALTER TABLE "leaves" DROP CONSTRAINT "leaves_rejected_state_check";

-- leaves: REJECTED は却下理由が必須
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_rejected_reason_check"
  CHECK ("status" <> 'REJECTED' OR "reject_reason" IS NOT NULL);

-- leaves: REJECTED は承認者が必須(却下は PENDING からのみ行われる)
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_rejected_approver_check"
  CHECK ("status" <> 'REJECTED' OR "approver_id" IS NOT NULL);
