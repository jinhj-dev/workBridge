import { render, screen } from '@testing-library/react';
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

  it('shouldRenderIconOnlyWhenProvided', () => {
    const { unmount } = renderModal({ icon: <svg data-testid="icon-x" /> });
    const iconBox = screen.getByTestId('icon-x').parentElement;
    expect(iconBox).toHaveAttribute('aria-hidden', 'true');
    unmount();
    const plain = renderModal();
    expect(plain.container.querySelector('[aria-hidden="true"].bg-primary-30')).toBeNull();
  });

  it('shouldUseDefaultMdWidthAndLgWhenRequested', () => {
    const { unmount } = renderModal();
    expect(screen.getByRole('dialog')).toHaveClass('max-w-105');
    unmount();
    renderModal({ size: 'lg' });
    expect(screen.getByRole('dialog')).toHaveClass('max-w-160');
  });

  it('shouldScrollOnlyBodyAndKeepFooterWithDivider', () => {
    renderModal();
    const body = screen.getByText('本文').parentElement;
    expect(body).toHaveClass('overflow-y-auto');
    const footer = screen.getByRole('button', { name: '実行' }).parentElement;
    expect(footer).toHaveClass('border-t');
  });

  it('shouldNotCloseWhenBackdropClicked', async () => {
    const { onClose } = renderModal();
    // backdrop のクリックは <dialog> 要素自体へのクリックとして届く
    await userEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
