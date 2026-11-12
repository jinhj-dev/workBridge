import type { LeaveType } from '../../generated/prisma/client.js';

// 画面には「休暇」としか見せない区分(種類の詳細は共有しない)
export type CalendarCategory = 'PAID' | 'SPECIAL' | 'OTHER';
export type CalendarHalfDay = 'AM' | 'PM' | null;

export interface CalendarItem {
  name: string;
  empId: string;
  departmentName: string;
  startDate: string;
  endDate: string;
  category: CalendarCategory;
  halfDay: CalendarHalfDay;
}

export interface CalendarResponse {
  month: string;
  holidays: { date: string; name: string }[];
  items: CalendarItem[];
}

export function toCalendarCategory(leaveType: LeaveType): CalendarCategory {
  switch (leaveType) {
    case 'ANNUAL':
    case 'HALF_AM':
    case 'HALF_PM':
      return 'PAID';
    case 'SPECIAL':
      return 'SPECIAL';
    case 'OTHER':
      return 'OTHER';
  }
}

export function toHalfDay(leaveType: LeaveType): CalendarHalfDay {
  if (leaveType === 'HALF_AM') {
    return 'AM';
  }
  return leaveType === 'HALF_PM' ? 'PM' : null;
}
