'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/Button';
import { confirmMessageClass } from '@/components/form';
import { Modal } from '@/components/Modal';
import { Notice } from '@/components/Notice';
import { messages } from '@/messages/ja';

interface ConfirmDialogProps {
  open: boolean;
  icon: ReactNode;
  iconVariant?: 'square' | 'circle'; // Modal の iconVariant をそのまま渡す(社員管理のみ circle)
  title: string;
  message: ReactNode;
  notice?: ReactNode; // 確認文の下に出す注意(warning)
  confirmLabel: string;
  cancelLabel?: string;
  // danger: 取り返しのつかない操作(削除など)。誤操作を避けるため初期フォーカスは [キャンセル]
  tone?: 'primary' | 'danger';
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// 確認だけを行う小さなモーダル(UI_MODAL_PATTERNS §4.6)。送信中は Esc・X・キャンセルを止める
export function ConfirmDialog({
  open,
  icon,
  iconVariant,
  title,
  message,
  notice,
  confirmLabel,
  cancelLabel = messages.common.cancel,
  tone = 'primary',
  submitting,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const danger = tone === 'danger';
  return (
    <Modal
      open={open}
      title={title}
      icon={icon}
      iconVariant={iconVariant}
      size="md"
      busy={submitting}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={submitting}
            onClick={onClose}
            data-autofocus={danger ? '' : undefined}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            loading={submitting}
            onClick={onConfirm}
            data-autofocus={danger ? undefined : ''}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <p className={confirmMessageClass}>{message}</p>
        {notice && <Notice variant="warning">{notice}</Notice>}
      </div>
    </Modal>
  );
}
