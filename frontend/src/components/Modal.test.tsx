import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { messages } from '@/messages/ja';
import { Modal } from './Modal';

function renderModal(props: Partial<Parameters<typeof Modal>[0]> = {}) {
  const onClose = vi.fn();
  const result = render(
    <Modal
      open
      title="テスト見出し"
      onClose={onClose}
      icon={<svg data-testid="icon-x" />}
      footer={<button type="button">実行</button>}
      {...props}
    >
      <p>本文</p>
    </Modal>,
  );
  return { onClose, ...result };
}

describe('Modal', () => {
  it('shouldNameDialogByTitleAndCloseByXButton', async () => {
    const { onClose } = renderModal();
    expect(screen.getByRole('dialog', { name: 'テスト見出し' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: messages.common.close }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shouldRenderDecorativeIconBoxAlways', () => {
    renderModal();
    const iconBox = screen.getByTestId('icon-x').parentElement;
    expect(iconBox).toHaveAttribute('aria-hidden', 'true');
  });

  it('shouldUseDefaultMdWidthAndLgWhenRequested', () => {
    const { unmount } = renderModal();
    expect(screen.getByRole('dialog')).toHaveClass('max-w-105');
    unmount();
    renderModal({ size: 'lg' });
    expect(screen.getByRole('dialog')).toHaveClass('max-w-160');
  });

  it('shouldUseXlWidthWhenRequested', () => {
    renderModal({ size: 'xl' });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('max-w-200');
    expect(dialog).not.toHaveClass('max-w-160');
    expect(dialog).not.toHaveClass('max-w-105');
  });

  it('shouldScrollOnlyBodyAndKeepFooterWithDivider', () => {
    renderModal();
    const body = screen.getByText('本文').parentElement;
    expect(body).toHaveClass('overflow-y-auto');
    const footer = screen.getByRole('button', { name: '実行' }).parentElement;
    // 区切り線は sm 以上だけ(モバイルは 2 列の全幅ボタン)
    expect(footer).toHaveClass('sm:border-t');
  });

  it('shouldNotCloseWhenBackdropClicked', async () => {
    const { onClose } = renderModal();
    // backdrop のクリックは <dialog> 要素自体へのクリックとして届く
    await userEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shouldDescribeDialogWhenDescriptionGiven', () => {
    const { unmount } = renderModal({ description: '説明文' });
    const dialog = screen.getByRole('dialog');
    const desc = screen.getByText('説明文');
    expect(dialog).toHaveAttribute('aria-describedby', desc.id);
    unmount();
    renderModal();
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-describedby');
  });

  it('shouldDisableCloseButtonAndPreventCancelWhenBusy', () => {
    renderModal({ busy: true });
    expect(screen.getByRole('button', { name: messages.common.close })).toBeDisabled();
    const cancel = new Event('cancel', { cancelable: true });
    screen.getByRole('dialog').dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
  });

  it('shouldNotPreventCancelWhenNotBusy', () => {
    renderModal();
    const cancel = new Event('cancel', { cancelable: true });
    screen.getByRole('dialog').dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(false);
  });

  it('shouldReopenAndNotCallOnCloseWhenClosedEventFiresWhileBusy', () => {
    const { onClose } = renderModal({ busy: true });
    const dialog = screen.getByRole('dialog');
    dialog.removeAttribute('open'); // ブラウザが Esc で閉じた状態を再現
    fireEvent(dialog, new Event('close'));
    expect(dialog).toHaveAttribute('open');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shouldCallOnCloseOnceWhenClosedEventFiresAndNotBusy', () => {
    const { onClose } = renderModal();
    const dialog = screen.getByRole('dialog');
    dialog.removeAttribute('open');
    fireEvent(dialog, new Event('close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shouldNotReopenWhenParentClosesWhileStillBusy', () => {
    const onClose = vi.fn();
    const footer = <button type="button">実行</button>;
    const { rerender } = render(
      <Modal open busy title="t" icon={<svg />} onClose={onClose} footer={footer}>
        <p>本文</p>
      </Modal>,
    );
    rerender(
      <Modal open={false} busy title="t" icon={<svg />} onClose={onClose} footer={footer}>
        <p>本文</p>
      </Modal>,
    );
    const dialog = document.querySelector('dialog');
    expect(dialog).not.toHaveAttribute('open');
  });

  it('shouldFocusElementWithDataAutofocusWhenOpened', () => {
    render(
      <Modal
        open
        title="t"
        icon={<svg />}
        onClose={vi.fn()}
        footer={
          <button type="button" data-autofocus>
            主操作
          </button>
        }
      >
        <p>本文</p>
      </Modal>,
    );
    expect(screen.getByRole('button', { name: '主操作' })).toHaveFocus();
  });

  it('shouldOpenWithoutErrorWhenNoAutofocusElement', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toHaveAttribute('open');
  });
});
