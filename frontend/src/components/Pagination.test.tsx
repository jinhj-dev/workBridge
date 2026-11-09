import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { messages } from '@/messages/ja';
import { Pagination } from './Pagination';

const t = messages.pagination;

function renderPagination(page: number, totalPages: number) {
  const onChange = vi.fn();
  render(
    <Pagination
      page={page}
      totalPages={totalPages}
      totalCount={totalPages * 20}
      onChange={onChange}
    />,
  );
  return onChange;
}

// ページ送りの操作ボタンの表示文言(前へ・番号・次へ)を順に返す
function buttonLabels(): string[] {
  const nav = screen.getByRole('navigation', { name: t.label });
  return within(nav)
    .getAllByRole('button')
    .map((button) => button.textContent ?? '');
}

describe('Pagination', () => {
  it('shouldRenderNoNavigationButTotalWhenSinglePage', () => {
    renderPagination(1, 1);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByText(t.total(20))).toBeInTheDocument();
  });

  it('shouldShowEllipsisOnlyAfterFirstPageWhenNearStart', () => {
    renderPagination(1, 10);
    expect(buttonLabels()).toEqual([t.previous, '1', '2', '10', t.next]);
    expect(screen.getAllByText('…')).toHaveLength(1);
  });

  it('shouldShowEllipsisOnBothSidesWhenInMiddle', () => {
    renderPagination(5, 10);
    expect(buttonLabels()).toEqual([t.previous, '1', '4', '5', '6', '10', t.next]);
    expect(screen.getAllByText('…')).toHaveLength(2);
  });

  it('shouldDisablePreviousOnFirstPage', () => {
    renderPagination(1, 3);
    expect(screen.getByRole('button', { name: t.previous })).toBeDisabled();
    expect(screen.getByRole('button', { name: t.next })).toBeEnabled();
  });

  it('shouldDisableNextOnLastPage', () => {
    renderPagination(3, 3);
    expect(screen.getByRole('button', { name: t.next })).toBeDisabled();
    expect(screen.getByRole('button', { name: t.previous })).toBeEnabled();
  });

  it('shouldMarkCurrentPageWithAriaCurrent', () => {
    renderPagination(2, 3);
    expect(screen.getByRole('button', { name: t.page(2) })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: t.page(1) })).not.toHaveAttribute('aria-current');
  });

  it('shouldCallOnChangeWithTargetPage', async () => {
    const user = userEvent.setup();
    const onChange = renderPagination(5, 10);
    await user.click(screen.getByRole('button', { name: t.page(6) }));
    await user.click(screen.getByRole('button', { name: t.next }));
    await user.click(screen.getByRole('button', { name: t.page(10) }));
    expect(onChange.mock.calls).toEqual([[6], [6], [10]]);
  });
});
