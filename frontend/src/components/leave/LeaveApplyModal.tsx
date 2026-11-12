'use client';

import { useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarIcon } from '@/components/CalendarIcon';
import { FormTable, FormTableRow } from '@/components/FormTable';
import { Modal } from '@/components/Modal';
import {
  FieldError,
  inputClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
  textareaClass,
} from '@/components/form';
import { ApproverSelect } from '@/components/leave/ApproverSelect';
import { Select } from '@/components/Select';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { ApiError, NetworkError, apiFetch } from '@/lib/api/client';
import type { Leave, LeaveType, UserSummary } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatDays } from '@/lib/format';
import { LEAVE_TYPES, countLeaveDays, isHalfDay } from '@/lib/leave-days';
import { messages } from '@/messages/ja';

const t = messages.leaves.apply;
const REASON_MAX = 500;

type FieldName = 'leaveType' | 'period' | 'reason' | 'approver';
type FieldErrors = Partial<Record<FieldName, string>>;

// サーバーの details[].field → 画面の入力欄
const SERVER_FIELD: Record<string, FieldName> = {
  leaveType: 'leaveType',
  startDate: 'period',
  endDate: 'period',
  reason: 'reason',
  approverId: 'approver',
};

interface LeaveApplyModalProps {
  open: boolean;
  onClose: () => void;
  // 申請が受け付けられたとき(閉じる・要約の再取得などは呼び出し側)
  onApplied: (leave: Leave) => void;
  // 残日数が変わっていた可能性があるとき(422)
  onBalanceStale?: () => void;
}

// SCR-004 §3.2 / SCR-002 §3-4 共通の休暇申請モーダル。開くたびに初期状態にするには呼び出し側で key を変える
export function LeaveApplyModal({
  open,
  onClose,
  onApplied,
  onBalanceStale,
}: LeaveApplyModalProps) {
  const { user: me } = useAuth();
  const { showToast } = useToast();
  const baseId = useId();
  const approvalRequired = me?.approvalRequired === true;
  const approvers = useApiQuery<UserSummary[]>(
    open && approvalRequired ? '/leaves/approvers' : null,
  );

  const [leaveType, setLeaveType] = useState<LeaveType | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [approver, setApprover] = useState<UserSummary | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  // state の更新は非同期なので、連続した送信は ref で確実に止める
  const submittingRef = useRef(false);

  const ids = {
    leaveType: `${baseId}-leaveType`,
    startDate: `${baseId}-startDate`,
    endDate: `${baseId}-endDate`,
    reason: `${baseId}-reason`,
    approver: `${baseId}-approver`,
  };
  const formId = `${baseId}-form`;
  const half = isHalfDay(leaveType);
  // 半休は終了日を開始日に固定する
  const effectiveEnd = half ? startDate : endDate;
  const days = countLeaveDays(leaveType, startDate, effectiveEnd);
  const reasonLength = [...reason].length;

  function clearError(field: FieldName) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function validate(): FieldErrors {
    const found: FieldErrors = {};
    if (leaveType === '') found.leaveType = t.validation.leaveType;
    if (startDate === '' || effectiveEnd === '') found.period = t.validation.period;
    else if (startDate > effectiveEnd) found.period = t.validation.order;
    else if (days === 0) found.period = t.validation.noWorkingDays;
    const trimmed = reason.trim();
    if (trimmed === '') found.reason = t.validation.reasonRequired;
    else if ([...trimmed].length > REASON_MAX) found.reason = t.validation.reasonTooLong;
    if (approverRequired && !approver) found.approver = t.validation.approver;
    return found;
  }

  function focusFirst(found: FieldErrors) {
    const order: [FieldName, string][] = [
      ['leaveType', ids.leaveType],
      ['period', ids.startDate],
      ['reason', ids.reason],
      ['approver', ids.approver],
    ];
    const first = order.find(([field]) => found[field]);
    if (first) document.getElementById(first[1])?.focus();
  }

  function handleServerError(error: unknown) {
    if (error instanceof NetworkError) {
      showToast(error.message, 'error');
      return;
    }
    if (!(error instanceof ApiError)) throw error;

    const found: FieldErrors = {};
    if (error.code === 'VALIDATION_ERROR') {
      for (const detail of error.details) {
        const field = SERVER_FIELD[detail.field];
        if (field && !found[field]) found[field] = detail.message;
      }
    } else if (error.code === 'INVALID_DATE_RANGE' || error.code === 'NO_WORKING_DAYS') {
      found.period = error.message;
    } else if (
      approvalRequired &&
      (error.code === 'APPROVER_REQUIRED' || error.code === 'INVALID_APPROVER')
    ) {
      found.approver = t.reselectApprover;
      setApprover(null);
      approvers.reload();
    } else {
      // 409 LEAVE_CONFLICT・422 など。承認者欄がないのに承認者エラーが返った場合もここ
      showToast(error.message, 'error');
      if (error.code === 'INSUFFICIENT_LEAVE_BALANCE') onBalanceStale?.();
      return;
    }
    if (Object.values(found).some(Boolean)) {
      setErrors(found);
      focusFirst(found);
    } else {
      showToast(error.message, 'error');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const found = validate();
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      focusFirst(found);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const leave = await apiFetch<Leave>('/leaves', {
        method: 'POST',
        body: JSON.stringify({
          leaveType,
          startDate,
          endDate: effectiveEnd,
          reason: reason.trim(),
          ...(approvalRequired && approver ? { approverId: approver.id } : {}),
        }),
      });
      showToast(leave.status === 'APPROVED' ? t.approvedSuccess : t.pendingSuccess, 'success');
      onApplied(leave);
    } catch (error) {
      handleServerError(error);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  // 承認者欄の * は、入力を検証する条件(validate)と同じ変数で決める
  const approverRequired = approvalRequired;
  const periodDescribedBy = errors.period ? `${ids.startDate}-error` : undefined;

  return (
    <Modal
      open={open}
      title={t.title}
      onClose={onClose}
      icon={<CalendarIcon />}
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className={modalSecondaryButtonClass}>
            {messages.common.cancel}
          </button>
          <button
            type="submit"
            form={formId}
            disabled={submitting}
            className={modalPrimaryButtonClass}
          >
            {submitting && <Spinner />}
            {t.submit}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate>
        <FormTable>
          <FormTableRow label={t.leaveType} htmlFor={ids.leaveType} required>
            <Select<LeaveType>
              id={ids.leaveType}
              value={leaveType}
              onChange={(next) => {
                setLeaveType(next);
                clearError('leaveType');
                clearError('period');
              }}
              options={LEAVE_TYPES.map((type) => ({
                value: type,
                label: messages.leave.types[type],
              }))}
              placeholder={messages.common.selectPlaceholder}
              invalid={!!errors.leaveType}
              describedBy={errors.leaveType ? `${ids.leaveType}-error` : undefined}
              required
            />
            {errors.leaveType && (
              <FieldError id={`${ids.leaveType}-error`} message={errors.leaveType} />
            )}
          </FormTableRow>

          <FormTableRow label={t.startDate} htmlFor={ids.startDate} required>
            <input
              id={ids.startDate}
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                clearError('period');
              }}
              aria-invalid={errors.period ? true : undefined}
              aria-required="true"
              aria-describedby={periodDescribedBy}
              className={inputClass}
            />
          </FormTableRow>

          <FormTableRow label={t.endDate} htmlFor={ids.endDate} required>
            <input
              id={ids.endDate}
              type="date"
              value={effectiveEnd}
              disabled={half}
              onChange={(e) => {
                setEndDate(e.target.value);
                clearError('period');
              }}
              aria-invalid={errors.period ? true : undefined}
              aria-required="true"
              aria-describedby={periodDescribedBy}
              className={`${inputClass} disabled:cursor-not-allowed disabled:bg-general-30 disabled:text-general-80`}
            />
            {errors.period && <FieldError id={`${ids.startDate}-error`} message={errors.period} />}
          </FormTableRow>

          <FormTableRow label={t.days} labelId={`${baseId}-days-label`}>
            <div
              aria-live="polite"
              aria-labelledby={`${baseId}-days-label`}
              className="rounded bg-general-30 px-4 py-3 text-base/6 font-bold text-general-100 tabular-nums"
            >
              {days === null ? messages.common.noValue : formatDays(days)}
            </div>
            <p className="mt-1 text-xs/4 text-general-80">{t.daysHint}</p>
          </FormTableRow>

          <FormTableRow label={t.reason} htmlFor={ids.reason} required>
            <textarea
              id={ids.reason}
              rows={4}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                clearError('reason');
              }}
              aria-invalid={errors.reason ? true : undefined}
              aria-required="true"
              aria-describedby={`${ids.reason}-count${errors.reason ? ` ${ids.reason}-error` : ''}`}
              className={textareaClass}
            />
            <div className="flex items-start justify-between gap-3">
              <div>
                {errors.reason && <FieldError id={`${ids.reason}-error`} message={errors.reason} />}
              </div>
              <p
                id={`${ids.reason}-count`}
                className={`mt-1 shrink-0 text-sm/5 tabular-nums ${
                  reasonLength > REASON_MAX ? 'font-medium text-danger-100' : 'text-general-80'
                }`}
              >
                {t.count(reasonLength, REASON_MAX)}
              </p>
            </div>
          </FormTableRow>

          {approverRequired ? (
            <FormTableRow label={t.approver} htmlFor={ids.approver} required>
              <ApproverSelect
                id={ids.approver}
                value={approver}
                onChange={(next) => {
                  setApprover(next);
                  clearError('approver');
                }}
                error={errors.approver}
                required
                candidates={approvers.data ?? []}
                status={approvers.status}
                onRetry={approvers.reload}
              />
            </FormTableRow>
          ) : (
            <FormTableRow label={t.approver} labelId={`${baseId}-approver-label`}>
              <p className="flex min-h-12 items-center text-sm/5 text-general-80">
                {t.autoApprove}
              </p>
            </FormTableRow>
          )}
        </FormTable>
      </form>
    </Modal>
  );
}
