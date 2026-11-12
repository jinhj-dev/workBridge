import { BagIcon, LeafIcon } from '@/components/leave/leaveIcons';
import type { LeaveCategory } from '@/lib/api/types';
import { messages } from '@/messages/ja';

// 休暇分類の配色(PAID・OTHER = 紫系 / SPECIAL = 緑系)
export const LEAVE_CATEGORY_CLASS: Record<LeaveCategory, string> = {
  PAID: 'bg-leave-paid-bg text-leave-paid-fg',
  OTHER: 'bg-leave-paid-bg text-leave-paid-fg',
  SPECIAL: 'bg-leave-special-bg text-leave-special-fg',
};

interface LeaveCategoryBadgeProps {
  category: LeaveCategory;
  // true: アイコン付きのチップ(モバイル)。既定は文言のみの pill
  compact?: boolean;
}

// 休暇分類のバッジ。色だけに頼らず文言(有給休暇 / 特別休暇 / 休暇)を必ず表示する
export function LeaveCategoryBadge({ category, compact = false }: LeaveCategoryBadgeProps) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-full px-3 text-sm/5 font-medium whitespace-nowrap ${LEAVE_CATEGORY_CLASS[category]}`}
    >
      {compact && (
        <span aria-hidden="true" className="size-4 shrink-0">
          {category === 'SPECIAL' ? <LeafIcon /> : <BagIcon />}
        </span>
      )}
      {messages.leaveCategory[category]}
    </span>
  );
}
