'use client';

import { useRef, useState } from 'react';
import { Badge } from '@/components/Badge';
import type { BadgeVariant } from '@/components/Badge';
import { Card } from '@/components/Card';
import { primaryButtonClass, secondaryButtonClass } from '@/components/form';
import { Modal } from '@/components/Modal';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { ApiError, NetworkError, apiFetch } from '@/lib/api/client';
import type { Attendance } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { formatTokyoTime } from '@/lib/format';
import { messages } from '@/messages/ja';

const t = messages.dashboard.attendance;

type WorkState = 'notClockedIn' | 'working' | 'done';
type ClockAction = 'clockIn' | 'clockOut';

const STATE_BADGE: Record<WorkState, BadgeVariant> = {
  notClockedIn: 'neutral',
  working: 'success',
  done: 'dark',
};

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

// SCR-002 §3-3 勤怠状況と出勤・退勤(§4)
export function AttendanceSection() {
  const { showToast } = useToast();
  const query = useApiQuery<Attendance | null>('/attendance/today');
  const [pending, setPending] = useState<ClockAction | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // state の更新は非同期なので、連続した送信は ref で確実に止める
  const submittingRef = useRef(false);

  const loaded = query.status === 'success';
  const state = toWorkState(query.data);

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

  function renderButton(action: ClockAction, enabled: boolean) {
    // 押せるほうを Primary、押せないほうを White(無効)で表示して、次の操作を明確にする
    const className = enabled
      ? `${primaryButtonClass} h-12 flex-1 px-6 text-base/6`
      : `${secondaryButtonClass} h-12 flex-1 px-6 text-base/6 disabled:cursor-not-allowed disabled:text-general-60 disabled:hover:bg-white`;
    return (
      <button
        type="button"
        disabled={!enabled}
        onClick={() => setPending(action)}
        className={className}
      >
        {action === 'clockIn' ? t.clockIn : t.clockOut}
      </button>
    );
  }

  function renderContent() {
    if (query.status === 'loading') return <SkeletonLines count={3} />;
    if (query.status === 'error') return <SectionError onRetry={query.reload} />;
    const attendance = query.data;
    return (
      <dl className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <dt className="text-sm/5 text-general-80">{t.status}</dt>
          <dd>
            <Badge variant={STATE_BADGE[state]}>{t[state]}</Badge>
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm/5 text-general-80">{t.clockInTime}</dt>
          <dd className="text-h6 font-bold text-general-100 tabular-nums">
            {attendance ? formatTokyoTime(attendance.clockIn) : messages.common.noValue}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-sm/5 text-general-80">{t.clockOutTime}</dt>
          <dd className="text-h6 font-bold text-general-100 tabular-nums">
            {attendance?.clockOut ? formatTokyoTime(attendance.clockOut) : messages.common.noValue}
          </dd>
        </div>
      </dl>
    );
  }

  return (
    <Card title={t.title}>
      <div className="flex flex-col gap-6">
        {renderContent()}
        <div className="flex gap-3">
          {renderButton('clockIn', loaded && state === 'notClockedIn')}
          {renderButton('clockOut', loaded && state === 'working')}
        </div>
      </div>

      <Modal
        open={pending !== null}
        title={pending ? CONFIRM[pending].title : ''}
        onClose={() => {
          if (!submittingRef.current) setPending(null);
        }}
        footer={
          <>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setPending(null)}
              className={`${secondaryButtonClass} h-10 px-4 text-sm/5`}
            >
              {messages.common.cancel}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirm}
              className={`${primaryButtonClass} flex h-10 items-center justify-center gap-2 px-4 text-sm/5 disabled:cursor-not-allowed disabled:bg-primary-60`}
            >
              {submitting && <Spinner />}
              {t.confirm}
            </button>
          </>
        }
      >
        {pending && <p className="text-general-100">{CONFIRM[pending].body}</p>}
      </Modal>
    </Card>
  );
}
