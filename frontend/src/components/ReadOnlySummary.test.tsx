import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReadOnlySummary, ReadOnlySummaryItem } from './ReadOnlySummary';

describe('ReadOnlySummary', () => {
  it('shouldRenderLabelAndValueAsTermAndDefinition', () => {
    const { container } = render(
      <ReadOnlySummary className="extra">
        <ReadOnlySummaryItem label="社員名">山田 太郎</ReadOnlySummaryItem>
        <ReadOnlySummaryItem label="勤務日">2026年11月2日</ReadOnlySummaryItem>
      </ReadOnlySummary>,
    );
    const dl = container.querySelector('dl');
    expect(dl).toHaveClass('extra');
    expect(container.querySelectorAll('dt')).toHaveLength(2);
    expect(screen.getByText('社員名').tagName).toBe('DT');
    expect(screen.getByText('山田 太郎').tagName).toBe('DD');
    expect(screen.getByText('山田 太郎')).toHaveClass('wrap-anywhere');
  });
});
