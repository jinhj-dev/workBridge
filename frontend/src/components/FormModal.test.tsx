import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { messages } from '@/messages/ja';
import { FormModal } from './FormModal';

function renderModal(props: Partial<Parameters<typeof FormModal>[0]> = {}) {
  const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
  const onClose = vi.fn();
  const result = render(
    <FormModal
      open
      title="入力の見出し"
      description="入力の説明文"
      icon={<svg data-testid="icon" />}
      submitLabel="登録する"
      submitting={false}
      onSubmit={onSubmit}
      onClose={onClose}
      {...props}
    >
      <label>
        名前
        <input />
      </label>
    </FormModal>,
  );
  return { onSubmit, onClose, ...result };
}

describe('FormModal', () => {
  it('shouldShowTitleDescriptionAndDefaultCancelLabel', () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: '入力の見出し' });
    expect(dialog).toHaveAccessibleDescription('入力の説明文');
    expect(screen.getByRole('button', { name: messages.common.cancel })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登録する' })).toBeInTheDocument();
  });

  it('shouldSubmitFormFromFooterButtonAndCloseFromCancel', async () => {
    const { onSubmit, onClose } = renderModal();
    await userEvent.click(screen.getByRole('button', { name: '登録する' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: messages.common.cancel }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shouldDisableButtonsAndBlockEscapeWhenSubmitting', () => {
    renderModal({ submitting: true });
    expect(screen.getByRole('button', { name: messages.common.cancel })).toBeDisabled();
    expect(screen.getByRole('button', { name: '登録する' })).toBeDisabled();
    const dialog = screen.getByRole('dialog', { name: '入力の見出し' });
    const cancel = new Event('cancel', { cancelable: true });
    fireEvent(dialog, cancel);
    expect(cancel.defaultPrevented).toBe(true);
  });

  it('shouldSubmitWhenEnterPressedInInput', async () => {
    const { onSubmit } = renderModal();
    await userEvent.type(screen.getByLabelText('名前'), '{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shouldShowSpinnerInSubmitButtonOnlyWhenSubmitting', () => {
    const { unmount } = renderModal({ submitting: true });
    expect(
      screen.getByRole('button', { name: '登録する' }).querySelector('svg.animate-spin'),
    ).not.toBeNull();
    unmount();
    renderModal({ submitting: false });
    expect(
      screen.getByRole('button', { name: '登録する' }).querySelector('svg.animate-spin'),
    ).toBeNull();
  });

  it('shouldEnableSubmitAgainWhenSubmittingEndsAfterFailure', () => {
    const props = {
      open: true,
      title: '入力の見出し',
      description: '入力の説明文',
      icon: <svg />,
      submitLabel: '登録する',
      onSubmit: vi.fn(),
      onClose: vi.fn(),
      children: <input aria-label="名前" />,
    };
    const { rerender } = render(<FormModal {...props} submitting />);
    expect(screen.getByRole('button', { name: '登録する' })).toBeDisabled();
    rerender(<FormModal {...props} submitting={false} />);
    const submit = screen.getByRole('button', { name: '登録する' });
    expect(submit).toBeEnabled();
    expect(submit.querySelector('svg.animate-spin')).toBeNull();
    expect(screen.getByRole('button', { name: messages.common.cancel })).toBeEnabled();
  });

  it('shouldDisableCloseIconWhenSubmitting', () => {
    renderModal({ submitting: true });
    expect(screen.getByRole('button', { name: messages.common.close })).toBeDisabled();
  });

  it('shouldUseCustomCancelLabel', () => {
    renderModal({ cancelLabel: '閉じる操作' });
    expect(screen.getByRole('button', { name: '閉じる操作' })).toBeInTheDocument();
  });
});
