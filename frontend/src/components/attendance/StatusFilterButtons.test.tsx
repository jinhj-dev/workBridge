import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { messages } from '@/messages/ja';
import { StatusFilterButtons } from './StatusFilterButtons';

const t = messages.attendance;

describe('StatusFilterButtons', () => {
  it('shouldListAllStatusesAsButtonsInGroupWithLabel', () => {
    render(<StatusFilterButtons idPrefix="test" selected={[]} onChange={vi.fn()} />);

    const group = screen.getByRole('group', { name: t.status });
    expect(group).toHaveAccessibleDescription(t.statusHint);
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      t.statuses.WORKING,
      t.statuses.DONE,
      t.statuses.MISSING_CLOCK_OUT,
    ]);
  });

  it('shouldMarkSelectedStatusesAsPressed', () => {
    render(<StatusFilterButtons idPrefix="test" selected={['DONE']} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: t.statuses.DONE })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: t.statuses.WORKING })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('shouldAddStatusInDisplayOrderWhenUnselectedButtonClicked', async () => {
    const onChange = vi.fn();
    render(
      <StatusFilterButtons idPrefix="test" selected={['MISSING_CLOCK_OUT']} onChange={onChange} />,
    );

    await userEvent.click(screen.getByRole('button', { name: t.statuses.WORKING }));
    expect(onChange).toHaveBeenCalledWith(['WORKING', 'MISSING_CLOCK_OUT']);
  });

  it('shouldRemoveStatusWhenSelectedButtonClicked', async () => {
    const onChange = vi.fn();
    render(
      <StatusFilterButtons idPrefix="test" selected={['WORKING', 'DONE']} onChange={onChange} />,
    );

    await userEvent.click(screen.getByRole('button', { name: t.statuses.WORKING }));
    expect(onChange).toHaveBeenCalledWith(['DONE']);
  });

  it('shouldNotSubmitEnclosingForm', async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <StatusFilterButtons idPrefix="test" selected={[]} onChange={vi.fn()} />
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: t.statuses.DONE }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
