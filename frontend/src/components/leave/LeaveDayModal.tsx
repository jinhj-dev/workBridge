'use client';

import { modalSecondaryButtonClass } from '@/components/form';
import { LeaveCategoryBadge } from '@/components/leave/LeaveCategoryBadge';
import { Modal } from '@/components/Modal';
import type { LeaveCalendarItem } from '@/lib/api/types';
import { formatLeavePeriod } from '@/lib/leave-calendar';
import { messages } from '@/messages/ja';

interface LeaveDayModalProps {
  open: boolean;
  title: string;
  items: readonly LeaveCalendarItem[];
  onClose: () => void;
}

const t = messages.leaveCalendar;

// カレンダーの棒・「+N件」を押したときの休暇予定の一覧(API は呼ばず、表示中のデータだけを使う)
export function LeaveDayModal({ open, title, items, onClose }: LeaveDayModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={modalSecondaryButtonClass}>
          {messages.common.close}
        </button>
      }
    >
      <ul className="divide-y divide-general-40">
        {items.map((item) => (
          <li
            key={`${item.empId}-${item.startDate}-${item.endDate}-${item.halfDay ?? ''}-${item.category}`}
            className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-base/6 font-bold text-general-100">
                {item.name}
              </span>
              <LeaveCategoryBadge category={item.category} />
            </span>
            <span className="text-sm/5 text-general-80">
              {t.empIdLine(item.empId, item.departmentName ?? t.noDepartment)}
            </span>
            <span className="text-sm/5 text-general-100 tabular-nums">
              {formatLeavePeriod(item)}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
