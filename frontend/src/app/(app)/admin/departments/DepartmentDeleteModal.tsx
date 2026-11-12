'use client';

import { useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { ApiError, NetworkError, apiFetch } from '@/lib/api/client';
import type { DepartmentDetail } from '@/lib/api/types';
import { messages } from '@/messages/ja';
import { TrashIcon } from './icons';

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

  return (
    <ConfirmDialog
      open={department !== null}
      tone="danger"
      icon={<TrashIcon />}
      title={t.title}
      message={department ? t.confirm(department.name) : ''}
      notice={
        department && department.inactiveMemberCount > 0
          ? t.inactiveNote(department.inactiveMemberCount)
          : undefined
      }
      confirmLabel={t.submit}
      submitting={submitting}
      onConfirm={() => void submit()}
      onClose={onClose}
    />
  );
}
