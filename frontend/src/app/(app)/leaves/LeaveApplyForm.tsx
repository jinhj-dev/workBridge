'use client';

import { useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Card } from '@/components/Card';
import {
  FieldError,
  inputClass,
  labelClass,
  primaryButtonClass,
  selectClass,
  textareaClass,
} from '@/components/form';
import { ApproverSelect } from '@/components/leave/ApproverSelect';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { ApiError, NetworkError, apiFetch } from '@/lib/api/client';
import type { Leave, LeaveType, UserSummary } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatDays } from '@/lib/format';
import { countLeaveDays, isHalfDay } from '@/lib/leave-days';
import { messages } from '@/messages/ja';

const t = messages.leaves.apply;
const REASON_MAX = 500;
const LEAVE_TYPES = Object.keys(messages.leave.types) as LeaveType[];

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

interface LeaveApplyFormProps {
  // 申請が受け付けられたとき(要約の再取得・履歴への移動は呼び出し側)
  onApplied: (leave: Leave) => void;
  // 残日数が変わっていた可能性があるとき(422)
  onBalanceStale: () => void;
}

// SCR-004 §3.2 休暇申請フォーム
export function LeaveApplyForm({ onApplied, onBalanceStale }: LeaveApplyFormProps) {
  const { user: me } = useAuth();
  const { showToast } = useToast();
  const baseId = useId();
  const approvalRequired = me?.approvalRequired === true;
  const approvers = useApiQuery<UserSummary[]>(approvalRequired ? '/leaves/approvers' : null);

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
    if (approvalRequired && !approver) found.approver = t.validation.approver;
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
      if (error.code === 'INSUFFICIENT_LEAVE_BALANCE') onBalanceStale();
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

  const periodDescribedBy = errors.period ? `${ids.startDate}-error` : undefined;

  return (
    <Card title={t.title}>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid max-w-3xl gap-x-6 gap-y-5 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <label htmlFor={ids.leaveType} className={labelClass}>
            {t.leaveType}
          </label>
          <select
            id={ids.leaveType}
            value={leaveType}
            onChange={(e) => {
              setLeaveType(e.target.value as LeaveType | '');
              clearError('leaveType');
              clearError('period');
            }}
            aria-invalid={errors.leaveType ? true : undefined}
            aria-describedby={errors.leaveType ? `${ids.leaveType}-error` : undefined}
            className={selectClass}
          >
            <option value="">{t.leaveTypePlaceholder}</option>
            {LEAVE_TYPES.map((type) => (
              <option key={type} value={type}>
                {messages.leave.types[type]}
              </option>
            ))}
          </select>
          {errors.leaveType && (
            <FieldError id={`${ids.leaveType}-error`} message={errors.leaveType} />
          )}
        </div>

        <div>
          <label htmlFor={ids.startDate} className={labelClass}>
            {t.startDate}
          </label>
          <input
            id={ids.startDate}
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              clearError('period');
            }}
            aria-invalid={errors.period ? true : undefined}
            aria-describedby={periodDescribedBy}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={ids.endDate} className={labelClass}>
            {t.endDate}
          </label>
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
            aria-describedby={periodDescribedBy}
            className={`${inputClass} disabled:cursor-not-allowed disabled:bg-general-30 disabled:text-general-80`}
          />
        </div>
        {errors.period && (
          <div className="-mt-3 sm:col-span-2">
            <FieldError id={`${ids.startDate}-error`} message={errors.period} />
          </div>
        )}

        <p className="text-sm/5 text-general-80 sm:col-span-2" aria-live="polite">
          {t.days}:{' '}
          <span className="font-bold text-general-100 tabular-nums">
            {days === null ? messages.common.noValue : formatDays(days)}
          </span>
          <span className="block text-xs/4">{t.daysHint}</span>
        </p>

        <div className="sm:col-span-2">
          <label htmlFor={ids.reason} className={labelClass}>
            {t.reason}
          </label>
          <textarea
            id={ids.reason}
            rows={4}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              clearError('reason');
            }}
            aria-invalid={errors.reason ? true : undefined}
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
        </div>

        <div className="sm:col-span-2">
          {approvalRequired ? (
            <>
              <label htmlFor={ids.approver} className={labelClass}>
                {t.approver}
              </label>
              <ApproverSelect
                id={ids.approver}
                value={approver}
                onChange={(next) => {
                  setApprover(next);
                  clearError('approver');
                }}
                error={errors.approver}
                candidates={approvers.data ?? []}
                status={approvers.status}
                onRetry={approvers.reload}
              />
            </>
          ) : (
            <p className="text-sm/5 text-general-80">{t.autoApprove}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className={`${primaryButtonClass} flex h-12 w-full items-center justify-center gap-2 px-6 text-base/6 disabled:cursor-not-allowed disabled:bg-primary-60 sm:w-auto`}
          >
            {submitting && <Spinner />}
            {t.submit}
          </button>
        </div>
      </form>
    </Card>
  );
}
