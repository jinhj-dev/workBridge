import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tooltip } from './Tooltip';

const CONTENT = '管理者に退勤時刻の修正を依頼してください。';

// トリガーは tabIndex=0 の外側 span。子要素のテキストから辿って取得する
function renderTooltip(): HTMLElement {
  render(
    <Tooltip content={CONTENT}>
      <span>勤務中</span>
    </Tooltip>,
  );
  const trigger = screen.getByText('勤務中').closest('[tabindex="0"]');
  if (!(trigger instanceof HTMLElement)) {
    throw new Error('トリガー要素が見つかりません');
  }
  return trigger;
}

describe('Tooltip', () => {
  it('shouldNotRenderTooltipOrDescribedbyBeforeInteraction', () => {
    const trigger = renderTooltip();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });

  it('shouldShowTooltipOnHoverAndLinkAriaDescribedby', () => {
    const trigger = renderTooltip();
    fireEvent.mouseEnter(trigger);

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent(CONTENT);
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id);
  });

  it('shouldHideTooltipOnMouseLeave', () => {
    const trigger = renderTooltip();
    fireEvent.mouseEnter(trigger);
    fireEvent.mouseLeave(trigger);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });

  it('shouldShowTooltipOnFocusAndHideOnBlur', () => {
    const trigger = renderTooltip();
    fireEvent.focus(trigger);
    expect(screen.getByRole('tooltip')).toHaveTextContent(CONTENT);

    fireEvent.blur(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shouldCloseOnEscapeWhileHoveredAndRemoveDescribedby', () => {
    const trigger = renderTooltip();
    fireEvent.mouseEnter(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });

  it('shouldCloseOnEscapeWhileFocusedAndReopenOnRefocus', () => {
    const trigger = renderTooltip();
    fireEvent.focus(trigger);
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.blur(trigger);
    fireEvent.focus(trigger);
    expect(screen.getByRole('tooltip')).toHaveTextContent(CONTENT);
  });

  it('shouldKeepTooltipOpenWhenKeyOtherThanEscapePressed', () => {
    const trigger = renderTooltip();
    fireEvent.focus(trigger);
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });
});
