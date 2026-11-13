import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { messages } from '@/messages/ja';
import { SectionError } from './SectionError';

afterEach(cleanup);

describe('SectionError', () => {
  it('shouldShowDefaultLoadErrorMessageWhenMessageOmitted', () => {
    render(<SectionError onRetry={vi.fn()} />);
    expect(screen.getByText(messages.common.loadError)).toBeInTheDocument();
  });

  it('shouldShowGivenMessageWhenMessageProvided', () => {
    render(<SectionError onRetry={vi.fn()} message="独自の失敗文言" />);
    expect(screen.getByText('独自の失敗文言')).toBeInTheDocument();
  });

  it('shouldRenderSmallButtonWithTypeButtonWhenRetryShown', () => {
    render(<SectionError onRetry={vi.fn()} />);
    const button = screen.getByRole('button', { name: messages.common.retry });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('h-btn-sm');
  });

  it('shouldCallOnRetryOnceWhenRetryClicked', async () => {
    const onRetry = vi.fn();
    render(<SectionError onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: messages.common.retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
