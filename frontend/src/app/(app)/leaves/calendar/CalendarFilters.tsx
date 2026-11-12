'use client';

import { MonthNavigator } from '@/components/leave/MonthNavigator';
import { SearchInput } from '@/components/SearchInput';
import { Select } from '@/components/Select';
import type { Department } from '@/lib/api/types';
import { messages } from '@/messages/ja';

const t = messages.leaveCalendar;
const ALL = 'ALL';

interface CalendarFiltersProps {
  month: string;
  onMonthChange: (delta: -1 | 1) => void;
  departments: readonly Department[];
  departmentId: string; // 空は「全ての部署」
  onDepartmentChange: (departmentId: string) => void;
  name: string;
  empId: string;
  onNameChange: (value: string) => void;
  onEmpIdChange: (value: string) => void;
  // true: モバイル(検索条件は常に表示、縦に積む)
  mobile: boolean;
}

// 月の移動・部署・名前・社員番号の絞り込み
export function CalendarFilters({
  month,
  onMonthChange,
  departments,
  departmentId,
  onDepartmentChange,
  name,
  empId,
  onNameChange,
  onEmpIdChange,
  mobile,
}: CalendarFiltersProps) {
  const options = [
    { value: ALL, label: t.allDepartments },
    ...departments.map((department) => ({ value: department.id, label: department.name })),
  ];
  const departmentSelect = (
    <>
      <label htmlFor="calendar-department" className="sr-only">
        {t.departmentLabel}
      </label>
      <Select
        id="calendar-department"
        value={departmentId === '' ? ALL : departmentId}
        onChange={(value) => onDepartmentChange(value === ALL ? '' : value)}
        options={options}
      />
    </>
  );
  const nameInput = (
    <SearchInput
      id="calendar-name"
      label={t.nameSearch}
      value={name}
      onChange={onNameChange}
      placeholder={t.nameSearch}
    />
  );
  const empIdInput = (
    <SearchInput
      id="calendar-emp-id"
      label={t.empIdSearch}
      value={empId}
      onChange={onEmpIdChange}
      placeholder={t.empIdSearch}
    />
  );

  if (!mobile) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <MonthNavigator month={month} onChange={onMonthChange} />
          <div className="w-68 max-w-full [&_select]:h-11 [&_select]:text-sm/5">{departmentSelect}</div>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-[18.75rem_18.75rem]">
          {nameInput}
          {empIdInput}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center">
        <MonthNavigator month={month} onChange={onMonthChange} />
      </div>
      <div className="[&_select]:h-11 [&_select]:text-sm/5">{departmentSelect}</div>
      <div className="grid grid-cols-2 gap-2">
        {nameInput}
        {empIdInput}
      </div>
    </div>
  );
}
