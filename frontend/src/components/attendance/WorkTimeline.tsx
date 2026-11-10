import { MINUTES_PER_DAY } from '@/lib/attendance-sheet';
import type { TimelineSegment } from '@/lib/attendance-sheet';

// 時間軸の目盛り(2 時間ごと)。0 と 24 は両端
const TICK_HOURS = Array.from({ length: 13 }, (_, i) => i * 2);

function percent(minute: number): string {
  return `${(Math.min(Math.max(minute, 0), MINUTES_PER_DAY) / MINUTES_PER_DAY) * 100}%`;
}

// 時間軸の見出し(0〜24 時、2 時間間隔)。表の見出し行の「時間帯」列に置く
export function WorkTimelineAxis() {
  return (
    <div aria-hidden="true" className="relative h-5 text-xs/4 font-normal text-general-80">
      {TICK_HOURS.map((hour) => (
        <span
          key={hour}
          style={{ left: percent(hour * 60) }}
          className={`absolute top-0 tabular-nums ${
            hour === 0 ? '' : hour === 24 ? '-translate-x-full' : '-translate-x-1/2'
          }`}
        >
          {hour}
        </span>
      ))}
    </div>
  );
}

interface WorkTimelineProps {
  segments: TimelineSegment[];
  // 出勤時刻だけが分かる日(勤務中・退勤漏れ)の目印
  markerMinute?: number;
  label: string;
}

const SEGMENT_CLASS: Record<TimelineSegment['kind'], string> = {
  work: 'bg-primary-100',
  break: 'bg-general-50',
};

// 1 日(0〜24 時)の勤務・休憩を横棒で示す。1440 分を超える部分は切り捨てる
export function WorkTimeline({ segments, markerMinute, label }: WorkTimelineProps) {
  return (
    <div role="img" aria-label={label} className="relative h-6 w-full">
      {TICK_HOURS.map((hour) => (
        <span
          key={hour}
          aria-hidden="true"
          style={{ left: percent(hour * 60) }}
          className="absolute inset-y-0 w-px bg-general-40"
        />
      ))}
      {segments.map((segment) => {
        const start = Math.min(Math.max(segment.startMinute, 0), MINUTES_PER_DAY);
        const end = Math.min(segment.endMinute, MINUTES_PER_DAY);
        if (end <= start) return null;
        return (
          <span
            key={`${segment.kind}-${segment.startMinute}`}
            data-kind={segment.kind}
            style={{ left: percent(start), width: percent(end - start) }}
            className={`absolute top-1/2 h-3 -translate-y-1/2 ${SEGMENT_CLASS[segment.kind]}`}
          />
        );
      })}
      {markerMinute !== undefined && markerMinute >= 0 && markerMinute < MINUTES_PER_DAY && (
        <span
          data-kind="marker"
          style={{ left: percent(markerMinute) }}
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-100"
        />
      )}
    </div>
  );
}
