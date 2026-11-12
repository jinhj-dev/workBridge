import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { messages } from '@/messages/ja';
import { LeaveCategoryBadge } from './LeaveCategoryBadge';

describe('LeaveCategoryBadge(FC-09)', () => {
  it('shouldShowGenericLabelForOtherWithoutLeaveTypeName', () => {
    render(<LeaveCategoryBadge category="OTHER" />);
    expect(screen.getByText(messages.leaveCategory.OTHER)).toBeInTheDocument();
    expect(messages.leaveCategory.OTHER).toBe('休暇');
    // 休暇の種類の原文は表示しない(OTHER は「休暇」とだけ見せる)
    expect(screen.queryByText(messages.leave.types.OTHER)).not.toBeInTheDocument();
  });

  it.each([
    ['PAID', messages.leaveCategory.PAID],
    ['SPECIAL', messages.leaveCategory.SPECIAL],
  ] as const)('shouldShowLabelFor%s', (category, label) => {
    render(<LeaveCategoryBadge category={category} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('shouldKeepTextVisibleInCompactMode', () => {
    render(<LeaveCategoryBadge category="SPECIAL" compact />);
    expect(screen.getByText(messages.leaveCategory.SPECIAL)).toBeInTheDocument();
  });
});
