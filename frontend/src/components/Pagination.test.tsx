import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { messages } from '@/messages/ja';
import { Pagination } from './Pagination';

const t = messages.pagination;

function renderPagination(page: number, totalPages: number, compact = false) {
  const onChange = vi.fn();
  render(
    <Pagination
      page={page}
      totalPages={totalPages}
      totalCount={totalPages * 20}
      onChange={onChange}
      compact={compact}
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

  it('shouldShowOnlyEdgesAndCurrentPageWhenCompactInMiddle', () => {
    renderPagination(5, 10, true);
    expect(buttonLabels()).toEqual([t.previous, '1', '5', '10', t.next]);
    expect(screen.getAllByText('…')).toHaveLength(2);
  });

  it('shouldKeepSecondPageReachableWhenCompactOnFirstAndLastPage', () => {
    renderPagination(1, 10, true);
    expect(buttonLabels()).toEqual([t.previous, '1', '2', '10', t.next]);
  });

  it('shouldKeepPreviousOfLastPageReachableWhenCompactOnLastPage', () => {
    renderPagination(10, 10, true);
    expect(buttonLabels()).toEqual([t.previous, '1', '9', '10', t.next]);
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

// pageSize を渡すと件数の範囲を表示する(社員管理の一覧用)
describe('Pagination(pageSize 指定)', () => {
  it('shouldShowRangeTextWhenPageSizeGiven', () => {
    render(
      <Pagination page={2} totalPages={12} totalCount={120} pageSize={10} onChange={vi.fn()} />,
    );
    expect(screen.getByText('全 120 件中 11 – 20 件を表示')).toBeInTheDocument();
  });

  it('shouldClampRangeEndToTotalOnLastPage', () => {
    render(
      <Pagination page={12} totalPages={12} totalCount={115} pageSize={10} onChange={vi.fn()} />,
    );
    expect(screen.getByText('全 115 件中 111 – 115 件を表示')).toBeInTheDocument();
  });

  it('shouldKeepLegacyTextWhenPageSizeOmitted', () => {
    render(<Pagination page={1} totalPages={1} totalCount={120} onChange={vi.fn()} />);
    expect(screen.getByText(t.total(120))).toBeInTheDocument();
  });
});
