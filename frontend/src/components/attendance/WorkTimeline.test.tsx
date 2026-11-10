import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkTimeline, WorkTimelineAxis } from './WorkTimeline';

describe('WorkTimeline', () => {
  it('shouldPlaceSegmentsByPercentOfDay', () => {
    render(
      <WorkTimeline
        label="09:00〜18:00 勤務"
        segments={[
          { startMinute: 540, endMinute: 720, kind: 'work' },
          { startMinute: 720, endMinute: 780, kind: 'break' },
        ]}
      />,
    );
    const root = screen.getByRole('img', { name: '09:00〜18:00 勤務' });
    const work = root.querySelector('[data-kind="work"]') as HTMLElement;
    const rest = root.querySelector('[data-kind="break"]') as HTMLElement;
    expect(work.style.left).toBe('37.5%');
    expect(work.style.width).toBe('12.5%');
    expect(rest.style.left).toBe('50%');
  });

  it('shouldClipSegmentsBeyondMidnight', () => {
    render(
      <WorkTimeline label="x" segments={[{ startMinute: 1200, endMinute: 1560, kind: 'work' }]} />,
    );
    const work = screen.getByRole('img').querySelector('[data-kind="work"]') as HTMLElement;
    expect(work.style.width).toBe('16.6667%');
  });

  it('shouldDrawOnlyMarkerWhenMarkerMinuteGiven', () => {
    render(<WorkTimeline label="x" segments={[]} markerMinute={540} />);
    const root = screen.getByRole('img');
    expect(root.querySelector('[data-kind="marker"]')).not.toBeNull();
    expect(root.querySelector('[data-kind="work"]')).toBeNull();
  });
});

describe('WorkTimelineAxis', () => {
  it('shouldShowTwoHourLabelsFromZeroToTwentyFour', () => {
    const { container } = render(<WorkTimelineAxis />);
    const labels = Array.from(container.querySelectorAll('span')).map((el) => el.textContent);
    expect(labels).toEqual([
      '0',
      '2',
      '4',
      '6',
      '8',
      '10',
      '12',
      '14',
      '16',
      '18',
      '20',
      '22',
      '24',
    ]);
  });
});

describe('WorkTimeline(区間の配置の追加シナリオ)', () => {
  const pct = (value: string): number => Number.parseFloat(value);

  it('shouldPlaceWorkBreakWorkSegmentsForNineToEighteenWithLunchBreak', () => {
    render(
      <WorkTimeline
        label="09:00〜18:00 勤務、13:00〜14:00 休憩"
        segments={[
          { startMinute: 540, endMinute: 780, kind: 'work' },
          { startMinute: 780, endMinute: 840, kind: 'break' },
          { startMinute: 840, endMinute: 1080, kind: 'work' },
        ]}
      />,
    );
    const root = screen.getByRole('img');
    const works = root.querySelectorAll<HTMLElement>('[data-kind="work"]');
    const rest = root.querySelector<HTMLElement>('[data-kind="break"]') as HTMLElement;
    expect(works).toHaveLength(2);
    expect(pct(works[0]?.style.left ?? '')).toBeCloseTo(37.5);
    expect(pct(works[0]?.style.width ?? '')).toBeCloseTo(16.6667, 3);
    expect(pct(rest.style.left)).toBeCloseTo(54.1667, 3);
    expect(pct(rest.style.width)).toBeCloseTo(4.1667, 3);
    expect(pct(works[1]?.style.left ?? '')).toBeCloseTo(58.3333, 3);
    expect(pct(works[1]?.style.width ?? '')).toBeCloseTo(16.6667, 3);
  });

  it('shouldShowOnlyAxisTicksWhenNoSegmentsAndNoMarker', () => {
    render(<WorkTimeline label="勤務記録なし" segments={[]} />);
    const root = screen.getByRole('img', { name: '勤務記録なし' });
    expect(root.querySelector('[data-kind]')).toBeNull();
    // 目盛りは 0〜24 時の 13 本
    expect(root.querySelectorAll('span[aria-hidden="true"]')).toHaveLength(13);
  });
});
