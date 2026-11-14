import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CharCount, FieldHint, confirmMessageClass } from './form';

describe('FieldHint', () => {
  it('shouldRenderHintWithGivenId', () => {
    render(<FieldHint id="h">補足</FieldHint>);
    expect(screen.getByText('補足')).toHaveAttribute('id', 'h');
  });
});

describe('CharCount', () => {
  it('shouldShowCountWithoutSpacesAndNormalToneWhenWithinMax', () => {
    render(<CharCount id="c" length={3} max={10} />);
    const count = screen.getByText('3/10');
    expect(count).toHaveAttribute('id', 'c');
    expect(count).toHaveClass('text-general-80');
    expect(count).not.toHaveClass('text-danger-100');
  });

  it('shouldShowDangerToneWhenOverMax', () => {
    render(<CharCount id="c" length={11} max={10} />);
    expect(screen.getByText('11/10')).toHaveClass('text-danger-100');
  });

  it('shouldKeepNormalToneWhenExactlyMax', () => {
    render(<CharCount id="c" length={10} max={10} />);
    expect(screen.getByText('10/10')).toHaveClass('text-general-80');
  });

  it('shouldRenderErrorInLeftSlot', () => {
    render(<CharCount id="c" length={1} max={10} error={<p>エラー</p>} />);
    expect(screen.getByText('エラー')).toBeInTheDocument();
  });
});

describe('確認文のクラス', () => {
  it('shouldUseConfirmMessageClass', () => {
    expect(confirmMessageClass).toBe('break-words text-general-100');
  });
});
