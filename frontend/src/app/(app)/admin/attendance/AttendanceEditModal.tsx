'use client';

import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  FieldError,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/components/form';
import { Modal } from '@/components/Modal';
import { Notice } from '@/components/Notice';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { ApiError, NetworkError, apiFetch } from '@/lib/api/client';
import type { Attendance } from '@/lib/api/types';
import { formatWorkDate, toTokyoDateTimeInput } from '@/lib/format';
import { messages } from '@/messages/ja';

const t = messages.adminAttendance.modal;

interface AttendanceEditModalProps {
  attendance: Attendance | null; // null のときは閉じている
  onClose: () => void;
  // 保存できた、または対象が見つからなかったとき(一覧の再取得用)
  onSaved: () => void;
}

type Step = 'input' | 'confirm';

// 入力値(東京の壁時計 YYYY-MM-DDTHH:mm)を API の日時にする
function toIso(local: string): string {
  return `${local}:00+09:00`;
}

// SCR-008 §5 勤怠修正モーダル。確認も同じモーダルの中で段階を切り替える(入れ子の dialog は使わない)。
// 親が attendance ごとに key を変えて作り直すので、入力値は開くたびに初期化される。
export function AttendanceEditModal({ attendance, onClose, onSaved }: AttendanceEditModalProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>('input');
  const [clockIn, setClockIn] = useState(() =>
    attendance ? toTokyoDateTimeInput(attendance.clockIn) : '',
  );
  const [clockOut, setClockOut] = useState(() =>
    attendance?.clockOut ? toTokyoDateTimeInput(attendance.clockOut) : '',
  );
  const [errors, setErrors] = useState<{ clockIn?: string; clockOut?: string; server?: string }>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);
  // state の更新は非同期なので、連続した送信は ref で確実に止める
  const submittingRef = useRef(false);

  function validate(): boolean {
    const next: typeof errors = {};
    if (clockIn === '') next.clockIn = t.validation.clockInRequired;
    else if (clockOut !== '' && clockOut <= clockIn) next.clockOut = t.validation.clockOutOrder;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!attendance || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await apiFetch<Attendance>(`/admin/attendance/${attendance.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          clockIn: toIso(clockIn),
          clockOut: clockOut === '' ? null : toIso(clockOut),
        }),
      });
      showToast(t.success, 'success');
      onClose();
      onSaved();
    } catch (error) {
      handleError(error);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleError(error: unknown) {
    if (error instanceof ApiError) {
      if (error.code === 'INVALID_TIME_RANGE') {
        setErrors({ server: t.invalidTimeRange });
        setStep('input');
      } else if (error.statusCode === 404) {
        showToast(t.notFound, 'error');
        onClose();
        onSaved();
      } else if (error.statusCode === 403) {
        showToast(error.message, 'error');
        onClose();
      } else {
        showToast(error.message, 'error');
      }
      return;
    }
    if (error instanceof NetworkError) {
      showToast(error.message, 'error');
      return;
    }
    throw error;
  }

  const buttonClass = 'flex h-10 items-center justify-center gap-2 px-4 text-sm/5';
  const subButtonClass = `${secondaryButtonClass} ${buttonClass}`;
  const submitButtonClass = `${primaryButtonClass} ${buttonClass} disabled:cursor-not-allowed disabled:bg-primary-60`;

  function renderFooter(): ReactNode {
    if (step === 'confirm') {
      return (
        <>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setStep('input')}
            className={subButtonClass}
          >
            {t.back}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit()}
            className={submitButtonClass}
          >
            {submitting && <Spinner />}
            {t.submit}
          </button>
        </>
      );
    }
    return (
      <>
        <button type="button" onClick={onClose} className={subButtonClass}>
          {messages.common.cancel}
        </button>
        <button
          type="button"
          onClick={() => {
            if (validate()) setStep('confirm');
          }}
          className={submitButtonClass}
        >
          {t.save}
        </button>
      </>
    );
  }

  function renderBody(): ReactNode {
    if (!attendance) return null;
    if (step === 'confirm') {
      return <p className="text-general-100">{t.confirm}</p>;
    }
    return (
      <div className="flex flex-col gap-4">
        {errors.server && (
          <Notice variant="error">{errors.server}</Notice>
        )}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm/5">
          <dt className="text-general-80">{t.employee}</dt>
          <dd className="min-w-0 break-words text-general-100">{attendance.user.name}</dd>
          <dt className="text-general-80">{t.workDate}</dt>
          <dd className="text-general-100 tabular-nums">{formatWorkDate(attendance.workDate)}</dd>
        </dl>
        <div>
          <label htmlFor="attendance-edit-clock-in" className={labelClass}>
            {t.clockIn}
          </label>
          <input
            id="attendance-edit-clock-in"
            type="datetime-local"
            value={clockIn}
            onChange={(e) => setClockIn(e.target.value)}
            aria-invalid={errors.clockIn ? true : undefined}
            aria-describedby={errors.clockIn ? 'attendance-edit-clock-in-error' : undefined}
            className={`${inputClass} tabular-nums`}
          />
          {errors.clockIn && (
            <FieldError id="attendance-edit-clock-in-error" message={errors.clockIn} />
          )}
        </div>
        <div>
          <label htmlFor="attendance-edit-clock-out" className={labelClass}>
            {t.clockOut}
          </label>
          <input
            id="attendance-edit-clock-out"
            type="datetime-local"
            value={clockOut}
            onChange={(e) => setClockOut(e.target.value)}
            aria-invalid={errors.clockOut ? true : undefined}
            aria-describedby={`attendance-edit-clock-out-hint${
              errors.clockOut ? ' attendance-edit-clock-out-error' : ''
            }`}
            className={`${inputClass} tabular-nums`}
          />
          <p id="attendance-edit-clock-out-hint" className="mt-1 text-xs/4 text-general-80">
            {t.clockOutHint}
          </p>
          {errors.clockOut && (
            <FieldError id="attendance-edit-clock-out-error" message={errors.clockOut} />
          )}
        </div>
      </div>
    );
  }

  return (
    <Modal open={attendance !== null} title={t.title} onClose={onClose} footer={renderFooter()}>
      {renderBody()}
    </Modal>
  );
}
