'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/Badge';
import type { BadgeVariant } from '@/components/Badge';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/Button';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { ApiError, NetworkError, apiFetch } from '@/lib/api/client';
import type { Attendance } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { formatTokyoTime } from '@/lib/format';
import { workProgressPercent } from '@/lib/work-progress';
import { messages } from '@/messages/ja';
import { CheckIcon, ClockIcon, EnterIcon, ExitIcon, LaptopIcon } from './icons';

const t = messages.dashboard.attendance;

type WorkState = 'notClockedIn' | 'working' | 'done';
type ClockAction = 'clockIn' | 'clockOut';

const STATE_BADGE: Record<WorkState, BadgeVariant> = {
  notClockedIn: 'neutral',
  working: 'positive',
  done: 'dark',
};

// 勤務中の進捗を取り直す間隔(表示専用)
const PROGRESS_REFRESH_MS = 60_000;

// 409 のうち、表示中の状態が古いことを示すもの(今日の勤怠を取り直す)
const STALE_STATE_CODES = ['ALREADY_CLOCKED_IN', 'NOT_CLOCKED_IN', 'ALREADY_CLOCKED_OUT'];

// 応答が null(本文が空なら undefined)なら未出勤
function toWorkState(attendance: Attendance | null | undefined): WorkState {
  if (!attendance) return 'notClockedIn';
  return attendance.status === 'WORKING' ? 'working' : 'done';
}

const CONFIRM: Record<ClockAction, { title: string; body: string; success: string }> = {
  clockIn: { title: t.confirmClockInTitle, body: t.confirmClockIn, success: t.clockedIn },
  clockOut: { title: t.confirmClockOutTitle, body: t.confirmClockOut, success: t.clockedOut },
};

interface AttendanceSectionProps {
  // 出勤・退勤が成功したとき(全社・部署別・今月の集計を取り直すため)
  onClocked?: () => void;
}

// SCR-002 今日の出勤状況と出勤・退勤(§4)。ボタンは次にできる操作 1 つだけを出す
export function AttendanceSection({ onClocked }: AttendanceSectionProps) {
  const { showToast } = useToast();
  const query = useApiQuery<Attendance | null>('/attendance/today');
  const [pending, setPending] = useState<ClockAction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // state の更新は非同期なので、連続した送信は ref で確実に止める
  const submittingRef = useRef(false);
  const [now, setNow] = useState(() => new Date());

  const loaded = query.status === 'success';
  const state = toWorkState(query.data);

  // 勤務中だけ 1 分ごとに現在時刻を更新して進捗を動かす
  useEffect(() => {
    if (state !== 'working') return;
    // 勤務状態に入った直後に最新の時刻へ合わせ、その後は 1 分ごとに更新する
    const first = setTimeout(() => setNow(new Date()), 0);
    const timer = setInterval(() => setNow(new Date()), PROGRESS_REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [state]);

  async function handleConfirm() {
    if (!pending || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    const action = pending;
    try {
      const path = action === 'clockIn' ? '/attendance/clock-in' : '/attendance/clock-out';
      const attendance = await apiFetch<Attendance>(path, { method: 'POST' });
      query.setData(attendance);
      showToast(CONFIRM[action].success, 'success');
      onClocked?.();
    } catch (error) {
      if (!(error instanceof ApiError || error instanceof NetworkError)) throw error;
      showToast(error.message, 'error');
      if (error instanceof ApiError && STALE_STATE_CODES.includes(error.code)) query.reload();
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      setPending(null);
    }
  }

  function renderButton() {
    if (state === 'notClockedIn') {
      return (
        <Button
          variant="primary"
          size="lg"
          icon={<EnterIcon />}
          disabled={!loaded}
          onClick={() => setPending('clockIn')}
          className="w-full"
        >
          {t.clockInAction}
        </Button>
      );
    }
    const done = state === 'done';
    return (
      <Button
        variant="primaryOutline"
        size="lg"
        icon={<ExitIcon />}
        disabled={done}
        onClick={() => setPending('clockOut')}
        className="w-full"
      >
        {done ? t.doneAction : t.clockOutAction}
      </Button>
    );
  }

  function renderContent() {
    if (query.status === 'loading') return <SkeletonLines count={3} />;
    if (query.status === 'error') return <SectionError onRetry={query.reload} />;
    const attendance = query.data;
    const clockIn = attendance?.clockIn ?? null;
    const until = attendance?.clockOut ? new Date(attendance.clockOut) : now;
    const progress = workProgressPercent(clockIn, until);
    const valueClass = 'text-3xl/10 font-bold text-general-100 tabular-nums sm:text-stat';
    const labelClass = 'text-sm/5 text-general-80';
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4 sm:gap-6">
          <span
            aria-hidden="true"
            className="relative flex size-24 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary-30 to-primary-40 text-primary-90 sm:size-32"
          >
            <span className="size-12 sm:size-16 [&>svg]:size-full">
              <LaptopIcon />
            </span>
            {state !== 'notClockedIn' && (
              <span className="absolute right-1 bottom-2 flex size-6 items-center justify-center rounded-full bg-success-100 text-white ring-2 ring-white sm:right-2 sm:bottom-3 sm:size-8 [&>svg]:size-4 sm:[&>svg]:size-5">
                <CheckIcon />
              </span>
            )}
          </span>
          <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-1">
            <span className="col-start-1 row-start-1 justify-self-center">
              <Badge variant={STATE_BADGE[state]} shape="pill">
                {state === 'working' && (
                  <span aria-hidden="true" className="size-2 rounded-full bg-success-100" />
                )}
                {t[state]}
              </Badge>
            </span>
            <dl className="contents">
              <div className="col-start-1 row-start-2 flex flex-col-reverse items-center">
                <dt className={labelClass}>{t.clockInTime}</dt>
                <dd className={valueClass}>{clockIn ? formatTokyoTime(clockIn) : t.noTime}</dd>
              </div>
              <div
                aria-hidden="true"
                className="col-start-2 row-start-2 my-1 w-px self-stretch bg-general-50"
              />
              <div className="col-start-3 row-start-2 flex flex-col-reverse items-center">
                <dt className={`${labelClass} text-center`}>{t.clockOutTime}</dt>
                <dd className={valueClass}>
                  {attendance?.clockOut ? formatTokyoTime(attendance.clockOut) : t.noTime}
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm/5 text-general-80">{t.progress}</span>
          <div className="flex items-center gap-3">
            <div
              role="progressbar"
              aria-label={t.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-2 flex-1 overflow-hidden rounded-full bg-general-40"
            >
              <div
                className="h-full rounded-full bg-linear-to-r from-primary-80 to-violet-80"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm/5 font-medium text-general-100 tabular-nums">
              {t.progressValue(progress)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card title={t.title} icon={<ClockIcon />}>
      {/* 高さが余るときは本文側が受け、ボタンの下に空きを作らない */}
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-1 flex-col justify-center">{renderContent()}</div>
        {renderButton()}
      </div>

      <ConfirmDialog
        open={pending !== null}
        icon={pending === 'clockOut' ? <ExitIcon /> : <EnterIcon />}
        title={pending ? CONFIRM[pending].title : ''}
        message={pending ? CONFIRM[pending].body : ''}
        confirmLabel={t.confirm}
        submitting={submitting}
        onConfirm={() => void handleConfirm()}
        onClose={() => {
          if (!submittingRef.current) setPending(null);
        }}
      />
    </Card>
  );
}
