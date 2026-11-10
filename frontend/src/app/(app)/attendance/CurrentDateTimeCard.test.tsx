import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrentDateTimeCard } from './CurrentDateTimeCard';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CurrentDateTimeCard', () => {
  it('shouldShowTokyoDateAndTimeSeparately', () => {
    // UTC 00:14 = 東京 09:14
    vi.setSystemTime(new Date('2026-11-10T00:14:20Z'));
    render(<CurrentDateTimeCard />);
    expect(screen.getByText('2026年')).toBeInTheDocument();
    expect(screen.getByText('11月10日(火)')).toBeInTheDocument();
    expect(screen.getByText('09:14')).toBeInTheDocument();
  });

  it('shouldUpdateAtNextMinuteBoundary', () => {
    vi.setSystemTime(new Date('2026-11-10T00:14:50Z'));
    render(<CurrentDateTimeCard />);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText('09:15')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText('09:16')).toBeInTheDocument();
  });

  it('shouldNotRenderClockButtons', () => {
    vi.setSystemTime(new Date('2026-11-10T00:14:20Z'));
    render(<CurrentDateTimeCard />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shouldRollOverToNextTokyoDayAfterUtcMidnightPlusNine', () => {
    vi.setSystemTime(new Date('2026-11-09T15:00:00Z'));
    render(<CurrentDateTimeCard />);
    expect(screen.getByText('11月10日(火)')).toBeInTheDocument();
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });
});

describe('CurrentDateTimeCard(タイマーの後始末)', () => {
  it('shouldClearAllTimersOnUnmount', () => {
    vi.setSystemTime(new Date('2026-11-10T00:14:50Z'));
    const { unmount } = render(<CurrentDateTimeCard />);
    expect(vi.getTimerCount()).toBe(1);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    // 分の境目を過ぎると 60 秒ごとの interval に置き換わる
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
