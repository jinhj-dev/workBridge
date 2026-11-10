import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MonthCalendar } from './MonthCalendar';

describe('MonthCalendar', () => {
  it('shouldRenderWeekdayHeadersStartingSundayAndMonthLabel', () => {
    render(<MonthCalendar month="2026-11" today="2026-11-09" onSelectDate={vi.fn()} />);

    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers).toEqual(['日', '月', '火', '水', '木', '金', '土']);
    expect(screen.getByRole('table', { name: '2026年11月' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(30);
  });

  it('shouldMarkTodayAndKeepPastDatesClickable', async () => {
    const onSelectDate = vi.fn();
    const ui = userEvent.setup();
    render(<MonthCalendar month="2026-11" today="2026-11-09" onSelectDate={onSelectDate} />);

    expect(screen.getByRole('button', { name: '2026/11/09' })).toHaveAttribute(
      'aria-current',
      'date',
    );
    const past = screen.getByRole('button', { name: '2026/11/03' });
    expect(past).toBeEnabled();
    expect(past).toHaveClass('bg-general-30');
    expect(screen.getByRole('button', { name: '2026/11/10' })).not.toHaveClass('bg-general-30');
    await ui.click(past);
    expect(onSelectDate).toHaveBeenCalledWith('2026-11-03');
  });

  it('shouldAppendDescriptionToAccessibleNameAndRenderDayContent', () => {
    render(
      <MonthCalendar
        month="2026-11"
        today="2026-11-09"
        onSelectDate={vi.fn()}
        renderDay={(date) => (date === '2026-11-10' ? <span>3名</span> : null)}
        getDayDescription={(date) => (date === '2026-11-10' ? '休暇 3名' : undefined)}
      />,
    );

    const cell = screen.getByRole('button', { name: '2026/11/10 休暇 3名' });
    expect(cell).toHaveTextContent('3名');
    expect(screen.getByRole('button', { name: '2026/11/11' })).toBeInTheDocument();
  });
});
