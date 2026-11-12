import { describe, expect, it } from 'vitest';
import { toCalendarCategory, toHalfDay } from './leave-calendar-rules.js';

describe('toCalendarCategory', () => {
  it.each([
    ['ANNUAL', 'PAID'],
    ['HALF_AM', 'PAID'],
    ['HALF_PM', 'PAID'],
    ['SPECIAL', 'SPECIAL'],
    ['OTHER', 'OTHER'],
  ] as const)('shouldMap%sTo%s', (leaveType, expected) => {
    expect(toCalendarCategory(leaveType)).toBe(expected);
  });
});

describe('toHalfDay', () => {
  it.each([
    ['HALF_AM', 'AM'],
    ['HALF_PM', 'PM'],
    ['ANNUAL', null],
    ['SPECIAL', null],
    ['OTHER', null],
  ] as const)('shouldMap%sTo%s', (leaveType, expected) => {
    expect(toHalfDay(leaveType)).toBe(expected);
  });
});
