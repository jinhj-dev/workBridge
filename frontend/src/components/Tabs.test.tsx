import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from './Tabs';

const ITEMS = [
  { value: 'mine', label: '自分' },
  { value: 'all', label: '全体' },
];

describe('Tabs', () => {
  it('shouldMarkOnlySelectedTabAsTabbable', () => {
    render(<Tabs label="切り替え" items={ITEMS} value="mine" onChange={vi.fn()} />);
    expect(screen.getByRole('tablist', { name: '切り替え' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '自分' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '自分' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: '全体' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: '全体' })).toHaveAttribute('tabindex', '-1');
  });

  it('shouldCallOnChangeWhenClicked', async () => {
    const onChange = vi.fn();
    render(<Tabs label="切り替え" items={ITEMS} value="mine" onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: '全体' }));
    expect(onChange).toHaveBeenCalledWith('all');
  });

  it('shouldMoveWithArrowKeysAndWrapAround', async () => {
    const onChange = vi.fn();
    render(<Tabs label="切り替え" items={ITEMS} value="mine" onChange={onChange} />);
    screen.getByRole('tab', { name: '自分' }).focus();

    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('all');
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('all');
  });
});
