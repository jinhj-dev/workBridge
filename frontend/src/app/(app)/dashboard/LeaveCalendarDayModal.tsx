'use client';

import { Badge } from '@/components/Badge';
import { secondaryButtonClass } from '@/components/form';
import { Modal } from '@/components/Modal';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import type { HalfDay, LeaveCalendarDay } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { formatDate } from '@/lib/format';
import { messages } from '@/messages/ja';

const t = messages.dashboard.calendar;
const HALF_DAY_LABEL: Record<HalfDay, string> = {
  AM: messages.leave.types.HALF_AM,
  PM: messages.leave.types.HALF_PM,
};

// 開くたびに取り直すため、日付があるときだけ作る
function DayList({ date }: { date: string }) {
  const query = useApiQuery<LeaveCalendarDay>(`/dashboard/leave-calendar/day?date=${date}`);

  if (query.status === 'loading') return <SkeletonLines count={3} />;
  if (query.status === 'error' || !query.data) return <SectionError onRetry={query.reload} />;
  if (query.data.items.length === 0) {
    return <p className="py-4 text-center text-sm/5 text-general-80">{t.empty}</p>;
  }
  return (
    <ul className="max-h-80 divide-y divide-general-40 overflow-y-auto border-y border-general-40">
      {query.data.items.map((member) => (
        <li
          key={member.userId}
          className="flex flex-col gap-1 px-1 py-3 md:flex-row md:items-center md:gap-4"
        >
          <span className="text-sm/5 font-medium text-general-100">{member.name}</span>
          <span className="text-sm/5 text-general-80">{member.departmentName}</span>
          {member.halfDay && (
            <span className="self-start md:ml-auto">
              <Badge variant="neutral">{HALF_DAY_LABEL[member.halfDay]}</Badge>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

interface LeaveCalendarDayModalProps {
  // null のとき閉じる(API も呼ばない)
  date: string | null;
  onClose: () => void;
}

// SCR-002 §3-6 選択した日の休暇取得者(名前・所属部署・半休の区別のみ)
export function LeaveCalendarDayModal({ date, onClose }: LeaveCalendarDayModalProps) {
  return (
    <Modal
      open={date !== null}
      title={date ? t.dayTitle(formatDate(date)) : ''}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={`${secondaryButtonClass} h-10 px-4`}>
          {messages.common.close}
        </button>
      }
    >
      {date && <DayList date={date} />}
    </Modal>
  );
}
