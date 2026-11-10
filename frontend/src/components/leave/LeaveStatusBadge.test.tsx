import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { LeaveStatus } from '@/lib/api/types';
import { messages } from '@/messages/ja';
import { LeaveStatusBadge } from './LeaveStatusBadge';

const BG_CLASS: Record<LeaveStatus, string> = {
  PENDING: 'bg-warning-40',
  APPROVED: 'bg-success-40',
  REJECTED: 'bg-danger-30',
  CANCELLED: 'bg-general-40',
};

describe('LeaveStatusBadge', () => {
  it.each(Object.keys(BG_CLASS) as LeaveStatus[])(
    'shouldShowStatusLabelAndColorFor%s',
    (status) => {
      render(<LeaveStatusBadge status={status} />);
      const label = screen.getByText(messages.leave.statuses[status]);
      expect(label).toHaveClass(BG_CLASS[status]);
      expect(label).toHaveClass('rounded-full');
    },
  );

  it('shouldRenderDecorativeIconWithoutAffectingAccessibleName', () => {
    const { container } = render(<LeaveStatusBadge status="APPROVED" />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs).toHaveLength(1);
    expect(svgs[0]).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText(messages.leave.statuses.APPROVED)).toHaveTextContent(
      messages.leave.statuses.APPROVED,
    );
  });

  it('shouldReplaceLabelWithChildren', () => {
    render(<LeaveStatusBadge status="APPROVED">休暇 承認済み</LeaveStatusBadge>);
    expect(screen.getByText('休暇 承認済み')).toBeInTheDocument();
    expect(screen.queryByText(messages.leave.statuses.APPROVED)).not.toBeInTheDocument();
  });
});
