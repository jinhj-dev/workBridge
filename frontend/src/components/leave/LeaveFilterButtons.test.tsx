import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { LeaveType } from '@/lib/api/types';
import { LEAVE_TYPES } from '@/lib/leave-days';
import { messages } from '@/messages/ja';
import { LeaveFilterButtons } from './LeaveFilterButtons';

function renderButtons(selected: LeaveType[]) {
  const onChange = vi.fn();
  render(
    <LeaveFilterButtons
      idPrefix="test"
      label="種別"
      options={LEAVE_TYPES}
      optionLabel={(type) => messages.leave.types[type]}
      variantOf={() => 'neutral'}
      selected={selected}
      onChange={onChange}
      describedBy="hint"
    />,
  );
  return { onChange, ui: userEvent.setup() };
}

describe('LeaveFilterButtons', () => {
  it('shouldExposeGroupWithLabelAndDescription', () => {
    renderButtons([]);
    const group = screen.getByRole('group', { name: '種別' });
    expect(group).toHaveAttribute('aria-describedby', 'hint');
    expect(screen.getAllByRole('button')).toHaveLength(LEAVE_TYPES.length);
  });

  it('shouldMarkSelectedButtonsAsPressed', () => {
    renderButtons(['HALF_AM']);
    expect(screen.getByRole('button', { name: messages.leave.types.HALF_AM })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: messages.leave.types.ANNUAL })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('shouldAddInDisplayOrderWhenToggledOn', async () => {
    const { onChange, ui } = renderButtons(['OTHER']);
    await ui.click(screen.getByRole('button', { name: messages.leave.types.ANNUAL }));
    expect(onChange).toHaveBeenCalledWith(['ANNUAL', 'OTHER']);
  });

  it('shouldRemoveWhenToggledOff', async () => {
    const { onChange, ui } = renderButtons(['ANNUAL', 'OTHER']);
    await ui.click(screen.getByRole('button', { name: messages.leave.types.OTHER }));
    expect(onChange).toHaveBeenCalledWith(['ANNUAL']);
  });

  it('shouldShowCheckMarkOnlyOnSelectedButtons', () => {
    renderButtons(['HALF_PM']);
    expect(screen.getByRole('button', { name: messages.leave.types.HALF_PM })).toHaveTextContent(
      '✓',
    );
    expect(screen.getByRole('button', { name: messages.leave.types.ANNUAL })).not.toHaveTextContent(
      '✓',
    );
  });

  it('shouldUseButtonTypeToAvoidFormSubmit', () => {
    renderButtons([]);
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAttribute('type', 'button');
    }
  });
});
