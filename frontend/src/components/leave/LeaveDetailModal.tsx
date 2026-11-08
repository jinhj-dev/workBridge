'use client';

import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/Badge';
import type { BadgeVariant } from '@/components/Badge';
import {
  FieldError,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/components/form';
import { Modal } from '@/components/Modal';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { ApiError, NetworkError, apiFetch } from '@/lib/api/client';
import type { Leave, LeaveStatus } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatDays, formatPeriod, formatTokyoDateTime } from '@/lib/format';
import { messages } from '@/messages/ja';

const t = messages.leave;
const REJECT_REASON_MAX = 500;

export const LEAVE_STATUS_BADGE: Record<LeaveStatus, BadgeVariant> = {
  PENDING: 'neutral',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'dark',
};

// detail: 詳細表示 / approve: 承認の確認 / reject: 却下理由の入力
type Step = 'detail' | 'approve' | 'reject';

interface LeaveDetailModalProps {
  leaveId: string | null; // null のときは閉じている
  onClose: () => void;
  // 承認・却下が終わった、または対象が処理できなくなったとき(一覧の再取得用)
  onProcessed: () => void;
}

// SCR-004 §4.4 休暇詳細モーダル。承認・却下(SCR-005 §6〜8)も同じモーダルの中で段階を切り替えて行う
export function LeaveDetailModal({ leaveId, onClose, onProcessed }: LeaveDetailModalProps) {
  const { user: me } = useAuth();
  const { showToast } = useToast();
  // 詳細の取得で 403・404 なら、モーダルを閉じて一覧を再取得する(03 共通規則)
  const query = useApiQuery<Leave>(leaveId ? `/leaves/${leaveId}` : null, {
    onError: (error) => {
      if (error instanceof ApiError && (error.statusCode === 403 || error.statusCode === 404)) {
        showToast(error.message, 'error');
        finish();
      }
    },
  });
  const [step, setStep] = useState<Step>('detail');
  const [rejectReason, setRejectReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // state の更新は非同期なので、連続した送信は ref で確実に止める
  const submittingRef = useRef(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  const leave = query.status === 'success' ? query.data : undefined;

  function handleClose() {
    setStep('detail');
    setRejectReason('');
    setReasonError(null);
    onClose();
  }

  function finish() {
    handleClose();
    onProcessed();
  }

  function handleProcessError(error: unknown) {
    if (error instanceof ApiError) {
      if (error.code === 'VALIDATION_ERROR') {
        const detail = error.details.find((d) => d.field === 'rejectReason');
        setReasonError(detail?.message ?? error.message);
        reasonRef.current?.focus();
        return;
      }
      // 403・404・409 はもう処理できないので、閉じて一覧を再取得する
      if ([403, 404, 409].includes(error.statusCode)) {
        showToast(error.code === 'FORBIDDEN' ? t.forbidden : error.message, 'error');
        finish();
        return;
      }
      showToast(error.message, 'error');
      return;
    }
    if (error instanceof NetworkError) {
      showToast(error.message, 'error');
      return;
    }
    throw error;
  }

  async function submit(path: string, body: object | undefined, successMessage: string) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await apiFetch<Leave>(path, {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      });
      showToast(successMessage, 'success');
      finish();
    } catch (error) {
      handleProcessError(error);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleReject() {
    const trimmed = rejectReason.trim();
    let error: string | null = null;
    if (trimmed === '') error = t.reject.validation.required;
    else if ([...trimmed].length > REJECT_REASON_MAX) error = t.reject.validation.tooLong;
    setReasonError(error);
    if (error) {
      reasonRef.current?.focus();
      return;
    }
    void submit(`/leaves/${leaveId}/reject`, { rejectReason: trimmed }, t.reject.success);
  }

  const canProcess =
    !!leave &&
    !!me &&
    leave.status === 'PENDING' &&
    leave.user.id !== me.id &&
    (leave.approver?.id === me.id || me.role === 'ADMIN');

  const title =
    step === 'approve' ? t.approve.title : step === 'reject' ? t.reject.title : t.detail.title;

  const submitButtonClass = `${primaryButtonClass} flex h-10 items-center justify-center gap-2 px-4 text-sm/5 disabled:cursor-not-allowed disabled:bg-primary-60`;
  const subButtonClass = `${secondaryButtonClass} h-10 px-4 text-sm/5`;

  function renderFooter(): ReactNode {
    if (step === 'approve' || step === 'reject') {
      return (
        <>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setStep('detail');
              setReasonError(null);
            }}
            className={subButtonClass}
          >
            {messages.common.cancel}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={
              step === 'approve'
                ? () => void submit(`/leaves/${leaveId}/approve`, undefined, t.approve.success)
                : handleReject
            }
            className={submitButtonClass}
          >
            {submitting && <Spinner />}
            {step === 'approve' ? t.approve.submit : t.reject.submit}
          </button>
        </>
      );
    }
    return (
      <>
        <button type="button" onClick={handleClose} className={subButtonClass}>
          {messages.common.close}
        </button>
        {canProcess && (
          <>
            <button type="button" onClick={() => setStep('reject')} className={subButtonClass}>
              {t.detail.reject}
            </button>
            <button type="button" onClick={() => setStep('approve')} className={submitButtonClass}>
              {t.detail.approve}
            </button>
          </>
        )}
      </>
    );
  }

  function renderBody(): ReactNode {
    if (query.status === 'loading') return <SkeletonLines count={6} />;
    if (!leave) return <SectionError onRetry={query.reload} />;

    if (step === 'approve') {
      return <p className="text-general-100">{t.approve.confirm(leave.user.name)}</p>;
    }

    if (step === 'reject') {
      const length = [...rejectReason].length;
      return (
        <div>
          <label htmlFor="rejectReason" className={labelClass}>
            {t.reject.reasonLabel}
          </label>
          <textarea
            ref={reasonRef}
            id="rejectReason"
            autoFocus
            required
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            aria-invalid={reasonError ? true : undefined}
            aria-describedby={`rejectReason-count${reasonError ? ' rejectReason-error' : ''}`}
            className="w-full resize-y rounded border border-input-border bg-white px-4 py-3 text-base/6 text-general-100 outline-none focus-visible:border-primary-100 focus-visible:ring-2 focus-visible:ring-primary-100 focus-visible:ring-inset aria-invalid:border-danger-100 aria-invalid:focus-visible:ring-danger-100"
          />
          <div className="flex items-start justify-between gap-3">
            <div>{reasonError && <FieldError id="rejectReason-error" message={reasonError} />}</div>
            <p
              id="rejectReason-count"
              className={`mt-1 shrink-0 text-sm/5 tabular-nums ${
                length > REJECT_REASON_MAX ? 'font-medium text-danger-100' : 'text-general-80'
              }`}
            >
              {t.reject.count(length, REJECT_REASON_MAX)}
            </p>
          </div>
        </div>
      );
    }

    const d = t.detail;
    const applicant = [`${leave.user.name} (${leave.user.empId})`, leave.user.departmentName]
      .filter(Boolean)
      .join(' / ');
    return (
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm/5">
        <DetailRow label={d.applicant}>{applicant}</DetailRow>
        <DetailRow label={d.leaveType}>{t.types[leave.leaveType]}</DetailRow>
        <DetailRow label={d.period}>{formatPeriod(leave.startDate, leave.endDate)}</DetailRow>
        <DetailRow label={d.days}>{formatDays(leave.days)}</DetailRow>
        <DetailRow label={d.reason}>
          <span className="break-words whitespace-pre-wrap">{leave.reason}</span>
        </DetailRow>
        <DetailRow label={d.approver}>{leave.approver?.name ?? d.autoApproved}</DetailRow>
        <DetailRow label={d.status}>
          <Badge variant={LEAVE_STATUS_BADGE[leave.status]}>{t.statuses[leave.status]}</Badge>
        </DetailRow>
        {leave.processedAt && (
          <>
            <DetailRow label={d.processedBy}>
              {leave.processedBy?.name ?? messages.common.noValue}
            </DetailRow>
            <DetailRow label={d.processedAt}>{formatTokyoDateTime(leave.processedAt)}</DetailRow>
          </>
        )}
        {leave.status === 'REJECTED' && (
          <DetailRow label={d.rejectReason}>
            <span className="break-words whitespace-pre-wrap">
              {leave.rejectReason ?? messages.common.noValue}
            </span>
          </DetailRow>
        )}
      </dl>
    );
  }

  return (
    <Modal open={leaveId !== null} title={title} onClose={handleClose} footer={renderFooter()}>
      {renderBody()}
    </Modal>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-general-80">{label}</dt>
      <dd className="min-w-0 text-general-100">{children}</dd>
    </>
  );
}
