import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DonutChart } from './DonutChart';

const SEGMENTS = [
  { value: 6, colorClass: 'text-primary-100', label: '出勤' },
  { value: 3, colorClass: 'text-general-50', label: '未出勤' },
  { value: 0, colorClass: 'text-general-40', label: '休暇' },
];

describe('DonutChart', () => {
  it('shouldExposeAriaLabelAndCenterTextAndDrawOnlyNonZeroSegments', () => {
    const { container } = render(
      <DonutChart segments={SEGMENTS} centerLabel="出勤率" centerValue="66.7%" ariaLabel="内訳" />,
    );
    expect(screen.getByRole('img', { name: '内訳' })).toBeInTheDocument();
    expect(screen.getByText('66.7%')).toBeInTheDocument();
    // 背景の輪 1 + 値のある区間 2
    expect(container.querySelectorAll('circle')).toHaveLength(3);
  });

  it('shouldDrawOnlyTrackWhenTotalIsZero', () => {
    const { container } = render(
      <DonutChart
        segments={SEGMENTS.map((s) => ({ ...s, value: 0 }))}
        centerLabel="出勤率"
        centerValue="—"
        ariaLabel="内訳"
      />,
    );
    expect(container.querySelectorAll('circle')).toHaveLength(1);
  });

  it('shouldSplitCircumferenceByRatio', () => {
    const { container } = render(
      <DonutChart segments={SEGMENTS} centerLabel="a" centerValue="b" ariaLabel="x" />,
    );
    const [, first, second] = Array.from(container.querySelectorAll('circle'));
    const circumference = 2 * Math.PI * 42;
    expect(Number(first.getAttribute('stroke-dasharray')?.split(' ')[0])).toBeCloseTo(
      (circumference * 2) / 3,
    );
    expect(Number(second.getAttribute('stroke-dashoffset'))).toBeCloseTo(-(circumference * 2) / 3);
  });
});
