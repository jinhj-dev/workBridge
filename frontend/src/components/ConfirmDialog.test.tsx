import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { messages } from '@/messages/ja';
import { ConfirmDialog } from './ConfirmDialog';

function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  const result = render(
    <ConfirmDialog
      open
      icon={<svg data-testid="icon" />}
      title="確認の見出し"
      message="実行しますか？"
      confirmLabel="実行する"
      submitting={false}
      onConfirm={onConfirm}
      onClose={onClose}
      {...props}
    />,
  );
  return { onConfirm, onClose, ...result };
}

describe('ConfirmDialog', () => {
  it('shouldShowTitleMessageAndDefaultCancelLabel', () => {
    renderDialog();
    expect(screen.getByRole('dialog', { name: '確認の見出し' })).toBeInTheDocument();
    expect(screen.getByText('実行しますか？')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: messages.common.cancel })).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('shouldCallOnConfirmAndOnCloseFromFooterButtons', async () => {
    const { onConfirm, onClose } = renderDialog();
    await userEvent.click(screen.getByRole('button', { name: '実行する' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: messages.common.cancel }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shouldShowNoticeOnlyWhenProvided', () => {
    const { unmount } = renderDialog();
    expect(screen.queryByText('注意書き')).toBeNull();
    unmount();
    renderDialog({ notice: '注意書き' });
    expect(screen.getByText('注意書き')).toBeInTheDocument();
  });

  it('shouldFocusConfirmWhenPrimaryAndCancelWhenDanger', () => {
    const { unmount } = renderDialog();
    expect(screen.getByRole('button', { name: '実行する' })).toHaveFocus();
    unmount();
    renderDialog({ tone: 'danger' });
    expect(screen.getByRole('button', { name: messages.common.cancel })).toHaveFocus();
  });

  it('shouldUseDangerStyleOnlyWhenToneIsDanger', () => {
    const { unmount } = renderDialog();
    expect(screen.getByRole('button', { name: '実行する' })).not.toHaveClass('bg-danger-100');
    unmount();
    renderDialog({ tone: 'danger' });
    expect(screen.getByRole('button', { name: '実行する' })).toHaveClass('bg-danger-100');
  });

  it('shouldDisableAllClosingPathsWhenSubmitting', () => {
    renderDialog({ submitting: true });
    expect(screen.getByRole('button', { name: messages.common.cancel })).toBeDisabled();
    expect(screen.getByRole('button', { name: '実行する' })).toBeDisabled();
    expect(screen.getByRole('button', { name: messages.common.close })).toBeDisabled();
    const cancelEvent = new Event('cancel', { cancelable: true });
    fireEvent(screen.getByRole('dialog'), cancelEvent);
    expect(cancelEvent.defaultPrevented).toBe(true);
  });

  it('shouldShowSpinnerInConfirmButtonOnlyWhenSubmitting', () => {
    const { unmount } = renderDialog({ submitting: true });
    expect(
      screen.getByRole('button', { name: '実行する' }).querySelector('svg.animate-spin'),
    ).not.toBeNull();
    unmount();
    renderDialog({ submitting: false });
    expect(
      screen.getByRole('button', { name: '実行する' }).querySelector('svg.animate-spin'),
    ).toBeNull();
  });
});
