'use client';

import { Badge } from '@/components/Badge';
import { secondaryButtonClass } from '@/components/form';
import { Modal } from '@/components/Modal';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { tdClass, thClass } from '@/components/table';
import type { HalfDay, LeaveCalendarDay } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { formatDateJa } from '@/lib/format';
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
    <div className="flex flex-col gap-2">
      <div className="max-h-80 overflow-y-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-white">
            <tr>
              <th scope="col" className={thClass}>
                {t.empId}
              </th>
              <th scope="col" className={thClass}>
                {t.employeeName}
              </th>
              <th scope="col" className={thClass}>
                {t.department}
              </th>
            </tr>
          </thead>
          <tbody>
            {query.data.items.map((member) => (
              <tr key={member.userId}>
                <td className={`${tdClass} tabular-nums`}>{member.empId}</td>
                <td className={tdClass}>
                  {/* 半休の区分は社員名の後ろに添える */}
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium">{member.name}</span>
                    {member.halfDay && (
                      <Badge variant="neutral">{HALF_DAY_LABEL[member.halfDay]}</Badge>
                    )}
                  </span>
                </td>
                <td className={`${tdClass} text-general-80`}>{member.departmentName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-right text-sm/5 font-medium text-general-100 tabular-nums">
        {t.total(query.data.items.length)}
      </p>
    </div>
  );
}

interface LeaveCalendarDayModalProps {
  // null のとき閉じる(API も呼ばない)
  date: string | null;
  onClose: () => void;
}

// SCR-002 §3-6 選択した日の休暇取得者(社員番号・名前・所属部署・半休の区別のみ)
export function LeaveCalendarDayModal({ date, onClose }: LeaveCalendarDayModalProps) {
  return (
    <Modal
      open={date !== null}
      title={date ? t.dayTitle(formatDateJa(date)) : ''}
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
