import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { messages } from '@/messages/ja';
import { JOB_TITLE_TONES, JobTitleBadge } from './JobTitleBadge';

const TONE_CASES: { tone: (typeof JOB_TITLE_TONES)[number]['tone']; cls: string }[] = [
  { tone: 'VIOLET', cls: 'bg-violet-30' },
  { tone: 'BLUE', cls: 'bg-primary-30' },
  { tone: 'GRAY', cls: 'bg-general-40' },
  { tone: 'LAVENDER', cls: 'bg-lavender-30' },
  { tone: 'GREEN', cls: 'bg-success-30' },
  { tone: 'YELLOW', cls: 'bg-yellow-30' },
  { tone: 'ORANGE', cls: 'bg-warning-30' },
  { tone: 'PINK', cls: 'bg-pink-30' },
];

describe('JobTitleBadge', () => {
  it('shouldRenderEightTonesWithDistinctColorNames', () => {
    expect(JOB_TITLE_TONES).toHaveLength(8);
    const names = JOB_TITLE_TONES.map((item) => messages.jobTitles.tones[item.tone]);
    expect(new Set(names).size).toBe(8);
    expect(names.every((name) => name.length > 0)).toBe(true);
  });

  it.each(TONE_CASES)('shouldApplyVariantClassForTone($tone)', ({ tone, cls }) => {
    render(<JobTitleBadge jobTitle={{ name: '課長', tone }} />);
    const badge = screen.getByText('課長');
    expect(badge.className).toContain(cls);
    expect(badge.className).toContain('rounded-full');
  });

  it('shouldRenderEmDashWhenJobTitleIsNull', () => {
    render(<JobTitleBadge jobTitle={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
