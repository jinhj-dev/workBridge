'use client';

import { useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { ApiError, NetworkError, apiFetch } from '@/lib/api/client';
import type { UserDetail } from '@/lib/api/types';
import { messages } from '@/messages/ja';
import { TrashIcon } from '../departments/icons';

const t = messages.users.deleteDialog;

interface UserDeleteDialogProps {
  open: boolean;
  // 承認待ち件数(pendingApprovalCount)を含む最新の詳細。親が開く前に取得して渡す
  user: UserDetail | null;
  onClose: () => void;
  onDeleted: () => void;
}

// SCR-006 社員削除の確認。削除は isActive = false への論理削除(無効化)
export function UserDeleteDialog({ open, user, onClose, onDeleted }: UserDeleteDialogProps) {
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  async function handleConfirm(): Promise<void> {
    if (!user || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await apiFetch<UserDetail>(`/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      });
      showToast(t.success, 'success');
      onClose();
      onDeleted();
    } catch (caught) {
      if (caught instanceof ApiError) {
        showToast(caught.message, 'error');
        // 対象が消えた・権限を失った: 最新の一覧を見せる
        if (caught.statusCode === 404 || caught.statusCode === 403) {
          onClose();
          onDeleted();
        }
      } else if (caught instanceof NetworkError) {
        showToast(caught.message, 'error');
      } else {
        throw caught;
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const pending = user?.pendingApprovalCount ?? 0;
  return (
    <ConfirmDialog
      open={open}
      tone="danger"
      icon={<TrashIcon />}
      iconVariant="circle"
      title={t.title}
      message={user ? t.message(user.name) : ''}
      notice={pending > 0 ? t.pendingNotice(pending) : undefined}
      confirmLabel={t.confirm}
      submitting={submitting}
      onConfirm={() => void handleConfirm()}
      onClose={onClose}
    />
  );
}
