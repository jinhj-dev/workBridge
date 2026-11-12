'use client';

import { Fragment, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  FieldError,
  FieldHint,
  confirmMessageClass,
  inputClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
} from '@/components/form';
import { DateInput } from '@/components/DateInput';
import { FormTable, FormTableRow } from '@/components/FormTable';
import { ClockIcon } from '@/components/layout/navIcons';
import { Modal } from '@/components/Modal';
import { Notice } from '@/components/Notice';
import { ReadOnlySummary, ReadOnlySummaryItem } from '@/components/ReadOnlySummary';
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

  function renderFooter(): ReactNode {
    if (step === 'confirm') {
      return (
        <>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setStep('input')}
            className={modalSecondaryButtonClass}
          >
            {t.back}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit()}
            autoFocus
            data-autofocus=""
            className={modalPrimaryButtonClass}
          >
            {submitting && <Spinner />}
            {t.submit}
          </button>
        </>
      );
    }
    return (
      <>
        <button type="button" onClick={onClose} className={modalSecondaryButtonClass}>
          {messages.common.cancel}
        </button>
        <button
          type="button"
          onClick={() => {
            if (validate()) setStep('confirm');
          }}
          className={modalPrimaryButtonClass}
        >
          {t.save}
        </button>
      </>
    );
  }

  function renderBody(): ReactNode {
    if (!attendance) return null;
    if (step === 'confirm') {
      return <p className={confirmMessageClass}>{t.confirm}</p>;
    }
    return (
      <div className="flex flex-col gap-6">
        {errors.server && <Notice variant="error">{errors.server}</Notice>}
        <ReadOnlySummary>
          <ReadOnlySummaryItem label={t.employee}>{attendance.user.name}</ReadOnlySummaryItem>
          <ReadOnlySummaryItem label={t.workDate}>
            <span className="tabular-nums">{formatWorkDate(attendance.workDate)}</span>
          </ReadOnlySummaryItem>
        </ReadOnlySummary>
        <FormTable>
          <FormTableRow label={t.clockIn} htmlFor="attendance-edit-clock-in" required>
            <DateInput
              id="attendance-edit-clock-in"
              type="datetime-local"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              aria-invalid={errors.clockIn ? true : undefined}
              aria-required="true"
              aria-describedby={errors.clockIn ? 'attendance-edit-clock-in-error' : undefined}
              autoFocus
              data-autofocus=""
              className={`${inputClass} tabular-nums`}
            />
            {errors.clockIn && (
              <FieldError id="attendance-edit-clock-in-error" message={errors.clockIn} />
            )}
          </FormTableRow>
          <FormTableRow label={t.clockOut} htmlFor="attendance-edit-clock-out">
            <DateInput
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
            <FieldHint id="attendance-edit-clock-out-hint">{t.clockOutHint}</FieldHint>
            {errors.clockOut && (
              <FieldError id="attendance-edit-clock-out-error" message={errors.clockOut} />
            )}
          </FormTableRow>
        </FormTable>
      </div>
    );
  }

  return (
    <Modal
      open={attendance !== null}
      title={t.title}
      description={t.description}
      size="lg"
      icon={<ClockIcon />}
      onClose={onClose}
      // 段階ごとに key を変えてフッターのボタンを作り直す(同じ DOM が再利用されて autoFocus が効かなくなるのを防ぐ)
      footer={<Fragment key={step}>{renderFooter()}</Fragment>}
      busy={submitting}
    >
      {renderBody()}
    </Modal>
  );
}
