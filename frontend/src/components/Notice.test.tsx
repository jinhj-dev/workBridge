import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { messages } from '@/messages/ja';
import { Notice } from './Notice';
import type { NoticeVariant } from './Notice';

afterEach(cleanup);

const VARIANTS: NoticeVariant[] = ['info', 'success', 'warning', 'error'];

describe('Notice', () => {
  it.each(VARIANTS)('shouldApplyVariantTokensAndAriaHiddenIconWhen%s', (variant) => {
    const { container } = render(<Notice variant={variant}>本文</Notice>);
    const box = screen.getByText('本文').closest('div[class*="rounded-notice"]');
    expect(box).toHaveClass(`bg-notice-${variant}-bg`);
    expect(box?.className).not.toMatch(/(^|\s)border/);
    const icon = container.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveClass(`text-notice-${variant}-icon`);
  });

  it('shouldDefaultToInfoWithoutRole', () => {
    render(<Notice>本文</Notice>);
    const box = screen.getByText('本文').closest('div[class*="rounded-notice"]');
    expect(box).toHaveClass('bg-notice-info-bg');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shouldUseAlertRoleOnlyForError', () => {
    render(
      <>
        <Notice variant="warning">警告</Notice>
        <Notice variant="error">失敗</Notice>
      </>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('失敗');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('shouldRenderTitleAndActionWhenProvided', () => {
    render(
      <Notice title="見出し" action={<button type="button">再試行</button>}>
        本文
      </Notice>,
    );
    expect(screen.getByText('見出し')).toHaveClass('font-bold');
    expect(screen.getByText('本文')).toHaveClass('font-normal');
    expect(screen.getByRole('button', { name: '再試行' })).toBeInTheDocument();
  });

  it('shouldWrapLongTextWithoutOverflow', () => {
    render(<Notice>{'あ'.repeat(200)}</Notice>);
    const body = screen.getByText('あ'.repeat(200)).parentElement;
    expect(body).toHaveClass('min-w-0', 'wrap-break-word');
  });

  it('shouldShowCloseButtonOnlyWhenOnCloseGiven', async () => {
    const onClose = vi.fn();
    const { unmount } = render(<Notice>本文</Notice>);
    expect(screen.queryByRole('button')).toBeNull();
    unmount();
    render(<Notice onClose={onClose}>本文</Notice>);
    await userEvent.click(screen.getByRole('button', { name: messages.common.close }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
