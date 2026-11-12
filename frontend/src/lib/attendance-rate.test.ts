import { describe, expect, it } from 'vitest';
import { formatPercent, shareOf } from './attendance-rate';

describe('shareOf', () => {
  it('shouldReturnNullWhenDenominatorIsZero', () => {
    expect(shareOf(0, 0)).toBeNull();
  });

  it('shouldRoundToOneDecimal', () => {
    expect(shareOf(1, 3)).toBe(33.3);
    expect(shareOf(2, 3)).toBe(66.7);
    expect(shareOf(3, 3)).toBe(100);
    expect(shareOf(0, 5)).toBe(0);
  });
});

describe('formatPercent', () => {
  it('shouldShowDashWhenNull', () => {
    expect(formatPercent(null)).toBe('—');
  });

  it('shouldShowOneDecimalWithPercent', () => {
    expect(formatPercent(83.3)).toBe('83.3%');
    expect(formatPercent(100)).toBe('100.0%');
  });
});
