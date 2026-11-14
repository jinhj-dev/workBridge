import { Badge, type BadgeVariant } from '@/components/Badge';
import type { EmploymentStatus } from '@/lib/api/types';
import { messages } from '@/messages/ja';

const VARIANT: Record<EmploymentStatus, BadgeVariant> = {
  ACTIVE: 'positive',
  UPCOMING: 'info',
  INACTIVE: 'neutral',
};

// 在籍状況のバッジ(pill + 先頭の点)。状態は文言でも伝える
export function EmploymentStatusBadge({ status }: { status: EmploymentStatus }) {
  return (
    <Badge variant={VARIANT[status]} shape="pill">
      <span aria-hidden="true" className="text-xs/4">
        ●
      </span>
      {messages.users.status[status]}
    </Badge>
  );
}
