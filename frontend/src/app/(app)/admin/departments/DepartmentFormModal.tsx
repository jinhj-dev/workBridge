'use client';

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  FieldError,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/components/form';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { ApiError, NetworkError, apiFetch } from '@/lib/api/client';
import type { DepartmentDetail } from '@/lib/api/types';
import { messages } from '@/messages/ja';

const t = messages.departments.form;

const CODE_PATTERN = /^[A-Za-z0-9-]{1,20}$/;
const NAME_MAX_LENGTH = 100;
const FORM_ID = 'department-form';

interface DepartmentFormModalProps {
  open: boolean;
  // null のときは新規登録、値があるときは編集
  department: DepartmentDetail | null;
  onClose: () => void;
  // 登録・更新できた、または対象が見つからなかったとき(一覧の再取得用)
  onDone: () => void;
}

interface FieldErrors {
  code?: string;
  name?: string;
}

// SCR-010 部署の登録・編集モーダル。親が開くたびに key を変えて作り直すので、入力値は開くたびに初期化される。
export function DepartmentFormModal({
  open,
  department,
  onClose,
  onDone,
}: DepartmentFormModalProps) {
  const { showToast } = useToast();
  const [code, setCode] = useState(department?.code ?? '');
  const [name, setName] = useState(department?.name ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  // state の更新は非同期なので、連続した送信は ref で確実に止める
  const submittingRef = useRef(false);

  function validate(trimmedCode: string, trimmedName: string): FieldErrors {
    const next: FieldErrors = {};
    if (trimmedCode === '') next.code = t.validation.codeRequired;
    else if (!CODE_PATTERN.test(trimmedCode)) next.code = t.validation.codeFormat;
    if (trimmedName === '') next.name = t.validation.nameRequired;
    else if (trimmedName.length > NAME_MAX_LENGTH) next.name = t.validation.nameLength;
    return next;
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (submittingRef.current) return;
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    const found = validate(trimmedCode, trimmedName);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await apiFetch<DepartmentDetail>(
        department ? `/admin/departments/${department.id}` : '/admin/departments',
        {
          method: department ? 'PATCH' : 'POST',
          body: JSON.stringify({ code: trimmedCode, name: trimmedName }),
        },
      );
      showToast(department ? t.updated : t.created, 'success');
      onClose();
      onDone();
    } catch (error) {
      handleError(error);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleError(error: unknown): void {
    if (error instanceof ApiError) {
      if (error.code === 'DUPLICATE_DEPARTMENT_CODE') {
        setErrors({ code: error.message });
      } else if (error.code === 'DUPLICATE_DEPARTMENT_NAME') {
        setErrors({ name: error.message });
      } else if (
        error.statusCode === 403 ||
        error.statusCode === 404 ||
        error.code === 'PROTECTED_DEPARTMENT'
      ) {
        // 権限を失った・対象が消えた・保護対象になった: 閉じて最新の一覧を見せる
        showToast(error.message, 'error');
        onClose();
        onDone();
      } else {
        showToast(error.message, 'error');
      }
      return;
    }
    if (error instanceof NetworkError) {
      showToast(error.message, 'error');
      return;
    }
    throw error;
  }

  const buttonClass = 'flex h-10 items-center justify-center gap-2 px-4 text-sm/5';

  return (
    <Modal
      open={open}
      title={department ? t.editTitle : t.createTitle}
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
            type="submit"
            form={FORM_ID}
            disabled={submitting}
            className={`${primaryButtonClass} ${buttonClass} disabled:cursor-not-allowed disabled:bg-primary-60`}
          >
            {submitting && <Spinner />}
            {department ? t.save : t.create}
          </button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={(e) => void handleSubmit(e)}
        noValidate
        className="flex flex-col gap-4"
      >
        <div>
          <label htmlFor="department-code" className={labelClass}>
            {messages.departments.code}
          </label>
          <input
            id="department-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t.codePlaceholder}
            autoComplete="off"
            aria-invalid={errors.code ? true : undefined}
            aria-describedby={`department-code-hint${errors.code ? ' department-code-error' : ''}`}
            className={inputClass}
          />
          <p id="department-code-hint" className="mt-1 text-xs/4 text-general-80">
            {t.codeHint}
          </p>
          {errors.code && <FieldError id="department-code-error" message={errors.code} />}
        </div>
        <div>
          <label htmlFor="department-name" className={labelClass}>
            {messages.departments.name}
          </label>
          <input
            id="department-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'department-name-error' : undefined}
            className={inputClass}
          />
          {errors.name && <FieldError id="department-name-error" message={errors.name} />}
        </div>
      </form>
    </Modal>
  );
}
