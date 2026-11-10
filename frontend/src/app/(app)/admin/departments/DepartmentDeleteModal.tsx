'use client';

import { useRef, useState } from 'react';
import { primaryButtonClass, secondaryButtonClass } from '@/components/form';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { ApiError, NetworkError, apiFetch } from '@/lib/api/client';
import type { DepartmentDetail } from '@/lib/api/types';
import { messages } from '@/messages/ja';

const t = messages.departments.deleteModal;

interface DepartmentDeleteModalProps {
  department: DepartmentDetail | null; // null のときは閉じている
  onClose: () => void;
  // 削除できた、または状況が変わって削除できなかったとき(一覧の再取得用)
  onDone: () => void;
}

// SCR-010 部署の削除確認モーダル
export function DepartmentDeleteModal({ department, onClose, onDone }: DepartmentDeleteModalProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function submit(): Promise<void> {
    if (!department || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await apiFetch<void>(`/admin/departments/${department.id}`, { method: 'DELETE' });
      showToast(t.success, 'success');
      onClose();
      onDone();
    } catch (error) {
      if (error instanceof ApiError) {
        showToast(error.message, 'error');
        // 確認中に状況が変わった(権限の喪失・社員の配属・対象の消滅など): 閉じて最新の一覧を見せる
        if (error.statusCode === 403 || error.statusCode === 404 || error.statusCode === 409) {
          onClose();
          onDone();
        }
      } else if (error instanceof NetworkError) {
        showToast(error.message, 'error');
      } else {
        throw error;
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const buttonClass = 'flex h-10 items-center justify-center gap-2 px-4 text-sm/5';

  return (
    <Modal
      open={department !== null}
      title={t.title}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className={`${secondaryButtonClass} ${buttonClass}`}
          >
            {messages.common.cancel}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit()}
            className={`${primaryButtonClass} ${buttonClass} disabled:cursor-not-allowed disabled:bg-primary-60`}
          >
            {submitting && <Spinner />}
            {t.submit}
          </button>
        </>
      }
    >
      {department && (
        <div className="flex flex-col gap-2">
          <p className="break-words text-general-100">{t.confirm(department.name)}</p>
          {department.inactiveMemberCount > 0 && (
            <p className="text-sm/5 text-general-80">
              {t.inactiveNote(department.inactiveMemberCount)}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
