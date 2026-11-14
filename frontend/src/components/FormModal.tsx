'use client';

import { useId } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { messages } from '@/messages/ja';

interface FormModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  icon: ReactNode;
  description: ReactNode;
  size?: 'lg' | 'xl';
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  cancelLabel?: string;
  submitting: boolean;
  children: ReactNode;
}

// 入力フォームを載せるモーダル(UI_MODAL_PATTERNS §4.7)。送信中は Esc・X・キャンセルを止める
export function FormModal({
  open,
  title,
  onClose,
  icon,
  description,
  size = 'lg',
  onSubmit,
  submitLabel,
  cancelLabel = messages.common.cancel,
  submitting,
  children,
}: FormModalProps) {
  const formId = useId();
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      icon={icon}
      size={size}
      busy={submitting}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" disabled={submitting} onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={submitting}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
        {children}
      </form>
    </Modal>
  );
}
