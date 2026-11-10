import { ATTENDANCE_STATUS_BADGE } from '@/components/attendance/attendanceStatus';
import { BADGE_VARIANT_CLASS } from '@/components/Badge';
import { labelClass } from '@/components/form';
import type { AttendanceStatus } from '@/lib/api/types';
import { ATTENDANCE_STATUSES } from '@/lib/date-range';
import { messages } from '@/messages/ja';

interface StatusFilterButtonsProps {
  idPrefix: string;
  selected: AttendanceStatus[];
  onChange: (next: AttendanceStatus[]) => void;
}

const buttonClass =
  'h-10 rounded border px-4 text-sm/5 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100';
// 選択中は枠と太字とチェックで示す(色だけに頼らない)。色は一覧の状態バッジと同じ
const selectedClass = 'border-general-100 font-bold';
const unselectedClass = 'border-transparent font-medium hover:border-general-50';

// 勤怠の状態の絞り込み(SCR-003)。ボタンを押すごとに選択・解除し、複数選択できる(選択なしは「すべて」)。
// 押した時点で絞り込みを反映する(反映は呼び出し側)
export function StatusFilterButtons({ idPrefix, selected, onChange }: StatusFilterButtonsProps) {
  const t = messages.attendance;
  const labelId = `${idPrefix}-status-label`;
  const hintId = `${idPrefix}-status-hint`;

  function toggle(status: AttendanceStatus) {
    const next = selected.includes(status)
      ? selected.filter((value) => value !== status)
      : [...selected, status];
    // 選択順に関わらず表示順で保持し、URL を安定させる
    onChange(ATTENDANCE_STATUSES.filter((value) => next.includes(value)));
  }

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={hintId}>
      <span id={labelId} className={labelClass}>
        {t.status}
      </span>
      <div className="flex flex-wrap gap-2">
        {ATTENDANCE_STATUSES.map((status) => {
          const pressed = selected.includes(status);
          return (
            <button
              key={status}
              type="button"
              aria-pressed={pressed}
              onClick={() => toggle(status)}
              className={`${buttonClass} ${BADGE_VARIANT_CLASS[ATTENDANCE_STATUS_BADGE[status]]} ${
                pressed ? selectedClass : unselectedClass
              }`}
            >
              {pressed && <span aria-hidden="true">✓ </span>}
              {t.statuses[status]}
            </button>
          );
        })}
      </div>
      <p id={hintId} className="mt-1 text-xs/4 text-general-80">
        {t.statusHint}
      </p>
    </div>
  );
}
