import { describe, expect, it } from 'vitest';
import { messages } from '@/messages/ja';
import { greetingOf } from './greeting';

const t = messages.dashboard.greeting;

// 東京(UTC+9)の時刻を UTC で指定する
function tokyo(hour: number, minute = 0): Date {
  return new Date(Date.UTC(2026, 10, 9, hour - 9, minute));
}

describe('greetingOf', () => {
  it('shouldReturnMorningFrom5To10', () => {
    expect(greetingOf(tokyo(5))).toBe(t.morning);
    expect(greetingOf(tokyo(10, 59))).toBe(t.morning);
  });

  it('shouldReturnAfternoonFrom11To17', () => {
    expect(greetingOf(tokyo(11))).toBe(t.afternoon);
    expect(greetingOf(tokyo(17, 59))).toBe(t.afternoon);
  });

  it('shouldReturnEveningOtherwise', () => {
    expect(greetingOf(tokyo(18))).toBe(t.evening);
    expect(greetingOf(tokyo(23, 30))).toBe(t.evening);
    expect(greetingOf(tokyo(0))).toBe(t.evening);
    expect(greetingOf(tokyo(4, 59))).toBe(t.evening);
  });
});
