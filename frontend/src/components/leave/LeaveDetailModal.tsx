'use client';

import { Fragment, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/Button';
import { CalendarIcon } from '@/components/CalendarIcon';
import { DetailTable, DetailTableRow } from '@/components/DetailTable';
import {
  CharCount,
  FieldError,
  confirmMessageClass,
  labelClass,
  textareaClass,
} from '@/components/form';
import { LeaveStatusBadge } from '@/components/leave/LeaveStatusBadge';
import { Modal } from '@/components/Modal';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import { ApiError, NetworkError, apiFetch } from '@/lib/api/client';
import type { Leave } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { useAuth } from '@/lib/auth/AuthProvider';
import { tokyoToday } from '@/lib/date-range';
import { formatDays, formatPeriod, formatTokyoDateTime } from '@/lib/format';
import { messages } from '@/messages/ja';

const t = messages.leave;
const REJECT_REASON_MAX = 500;

// detail: 詳細表示 / approve: 承認の確認 / reject: 却下理由の入力 / cancel: 取消の確認(本人のみ)
type Step = 'detail' | 'approve' | 'reject' | 'cancel';
// 呼び出し側が最初の段階として指定できるもの(取消は詳細の [取消] からだけ開く)
type InitialStep = Exclude<Step, 'cancel'>;

interface LeaveDetailModalProps {
  leaveId: string | null; // null のときは閉じている
  onClose: () => void;
  // 承認・却下が終わった、または対象が処理できなくなったとき(一覧の再取得用)
  onProcessed: () => void;
  // 開いたときの段階(一覧の [承認] [却下] から直接確認段階を開く)。呼び出し側で key を変えてリセットする
  initialStep?: InitialStep;
}

// SCR-004 §4.4 休暇詳細モーダル。承認・却下(SCR-005 §6〜8)も同じモーダルの中で段階を切り替えて行う
export function LeaveDetailModal({
  leaveId,
  onClose,
  onProcessed,
  initialStep = 'detail',
}: LeaveDetailModalProps) {
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
  const [step, setStep] = useState<Step>(initialStep);
  const [rejectReason, setRejectReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 確認段階から詳細へ戻るとき、直前に押した操作ボタンへフォーカスを戻す(ボタンが作り直されてフォーカスが失われるのを防ぐ)
  const [returnFocus, setReturnFocus] = useState<Step | null>(null);
  // state の更新は非同期なので、連続した送信は ref で確実に止める
  const submittingRef = useRef(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  const leave = query.status === 'success' ? query.data : undefined;

  function handleClose() {
    setStep(initialStep);
    setReturnFocus(null);
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
        const message =
          error.code === 'FORBIDDEN'
            ? t.forbidden
            : error.code === 'ALREADY_PROCESSED'
              ? t.alreadyProcessed
              : error.code === 'NOT_CANCELLABLE'
                ? t.cancel.notCancellable
                : error.message;
        showToast(message, 'error');
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

  // 本人の取消(05 §6): 承認待ち、または自動承認で開始日がまだ先の申請
  const canCancel =
    !!leave &&
    !!me &&
    leave.user.id === me.id &&
    (leave.status === 'PENDING' ||
      (leave.autoApproved &&
        leave.status === 'APPROVED' &&
        leave.startDate > tokyoToday(new Date())));

  // 既に処理済み・権限なしの場合は確認段階ではなく詳細を見せる
  const shownStep: Step =
    step === 'cancel' ? (canCancel ? 'cancel' : 'detail') : canProcess ? step : 'detail';
  const title =
    shownStep === 'approve'
      ? t.approve.title
      : shownStep === 'reject'
        ? t.reject.title
        : shownStep === 'cancel'
          ? t.cancel.title
          : t.detail.title;

  function renderFooter(): ReactNode {
    if (shownStep === 'cancel') {
      return (
        <>
          <Button
            variant="secondary"
            disabled={submitting}
            onClick={() => {
              setReturnFocus('cancel');
              setStep('detail');
            }}
            autoFocus
            data-autofocus=""
          >
            {t.cancel.back}
          </Button>
          <Button
            variant="danger"
            loading={submitting}
            onClick={() => void submit(`/leaves/${leaveId}/cancel`, undefined, t.cancel.success)}
          >
            {t.cancel.submit}
          </Button>
        </>
      );
    }
    if (shownStep === 'approve' || shownStep === 'reject') {
      return (
        <>
          <Button
            variant="secondary"
            disabled={submitting}
            onClick={() => {
              if (initialStep === 'detail') {
                setReturnFocus(shownStep);
                setStep('detail');
                setReasonError(null);
              } else {
                handleClose();
              }
            }}
          >
            {messages.common.cancel}
          </Button>
          <Button
            variant="primary"
            loading={submitting}
            onClick={
              shownStep === 'approve'
                ? () => void submit(`/leaves/${leaveId}/approve`, undefined, t.approve.success)
                : handleReject
            }
            {...(shownStep === 'approve' ? { autoFocus: true, 'data-autofocus': '' } : {})}
          >
            {shownStep === 'approve' ? t.approve.submit : t.reject.submit}
          </Button>
        </>
      );
    }
    return (
      <>
        <Button variant="secondary" onClick={handleClose}>
          {messages.common.close}
        </Button>
        {canCancel && (
          <Button
            variant="secondary"
            onClick={() => setStep('cancel')}
            autoFocus={returnFocus === 'cancel'}
          >
            {t.detail.cancel}
          </Button>
        )}
        {canProcess && (
          <>
            <Button
              variant="secondary"
              onClick={() => setStep('reject')}
              autoFocus={returnFocus === 'reject'}
            >
              {t.detail.reject}
            </Button>
            <Button
              variant="primary"
              onClick={() => setStep('approve')}
              autoFocus={returnFocus === 'approve'}
            >
              {t.detail.approve}
            </Button>
          </>
        )}
      </>
    );
  }

  function renderBody(): ReactNode {
    if (query.status === 'loading') return <SkeletonLines count={6} />;
    if (!leave) return <SectionError onRetry={query.reload} />;

    if (shownStep === 'approve') {
      return <p className={confirmMessageClass}>{t.approve.confirm(leave.user.name)}</p>;
    }

    if (shownStep === 'cancel') {
      return <p className={confirmMessageClass}>{t.cancel.confirm}</p>;
    }

    if (shownStep === 'reject') {
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
            data-autofocus=""
            required
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t.reject.reasonPlaceholder}
            aria-invalid={reasonError ? true : undefined}
            aria-describedby={`rejectReason-count${reasonError ? ' rejectReason-error' : ''}`}
            className={textareaClass}
          />
          <CharCount
            id="rejectReason-count"
            length={length}
            max={REJECT_REASON_MAX}
            error={reasonError && <FieldError id="rejectReason-error" message={reasonError} />}
          />
        </div>
      );
    }

    const d = t.detail;
    const department = leave.user.departmentName ?? d.unassigned;
    const applicant = `${leave.user.name} (${leave.user.empId}) / ${department}`;
    return (
      <DetailTable>
        <DetailTableRow label={d.applicant}>{applicant}</DetailTableRow>
        <DetailTableRow label={d.leaveType}>{t.types[leave.leaveType]}</DetailTableRow>
        <DetailTableRow label={d.period}>
          {formatPeriod(leave.startDate, leave.endDate)}
        </DetailTableRow>
        <DetailTableRow label={d.days}>{formatDays(leave.days)}</DetailTableRow>
        <DetailTableRow label={d.reason}>
          <span className="break-words whitespace-pre-wrap">{leave.reason}</span>
        </DetailTableRow>
        <DetailTableRow label={d.approver}>
          {leave.autoApproved ? d.autoApproved : (leave.approver?.name ?? messages.common.noValue)}
        </DetailTableRow>
        <DetailTableRow label={d.status}>
          <LeaveStatusBadge status={leave.status} />
        </DetailTableRow>
        <DetailTableRow label={d.processedBy}>
          {leave.processedBy?.name ?? messages.common.noValue}
        </DetailTableRow>
        <DetailTableRow label={d.processedAt}>
          {leave.processedAt ? formatTokyoDateTime(leave.processedAt) : messages.common.noValue}
        </DetailTableRow>
        {leave.status === 'REJECTED' && (
          <DetailTableRow label={d.rejectReason}>
            <span className="break-words whitespace-pre-wrap">
              {leave.rejectReason ?? messages.common.noValue}
            </span>
          </DetailTableRow>
        )}
      </DetailTable>
    );
  }

  return (
    <Modal
      open={leaveId !== null}
      title={title}
      onClose={handleClose}
      // 段階ごとに key を変えてフッターのボタンを作り直す(同じ DOM が再利用されて autoFocus が効かなくなるのを防ぐ)
      footer={<Fragment key={shownStep}>{renderFooter()}</Fragment>}
      icon={<CalendarIcon />}
      busy={submitting}
      size="lg"
    >
      {renderBody()}
    </Modal>
  );
}
