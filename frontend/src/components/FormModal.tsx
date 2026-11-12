'use client';

import { useId } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { modalPrimaryButtonClass, modalSecondaryButtonClass } from '@/components/form';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
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
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className={modalSecondaryButtonClass}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            form={formId}
            disabled={submitting}
            className={modalPrimaryButtonClass}
          >
            {submitting && <Spinner />}
            {submitLabel}
          </button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
        {children}
      </form>
    </Modal>
  );
}
