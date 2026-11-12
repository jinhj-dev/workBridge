'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  FieldError,
  IconField,
  iconInputClass,
  inputClass,
  primaryButtonClass,
  textareaClass,
} from '@/components/form';
import { FormRow } from '@/components/FormRow';
import { InfoNotice } from '@/components/InfoNotice';
import { ApproverSelect } from '@/components/leave/ApproverSelect';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import { useToast } from '@/components/Toast';
import { ApiError, NetworkError, apiFetch } from '@/lib/api/client';
import type { DepartmentDetail, UserSummary } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { messages } from '@/messages/ja';
import { BuildingIcon, DocumentTextIcon, UserIcon } from './icons';

const t = messages.departments.form;

const CODE_PATTERN = /^[A-Za-z0-9-]{1,20}$/;
const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;
// API-DEPT-009 の返却上限
const CANDIDATE_LIMIT = 100;
// 責任者の検索はこの時間入力が止まってからサーバーへ問い合わせる
const SEARCH_DEBOUNCE_MS = 300;
const FORM_ID = 'department-form';
// 参照デザインのキャンセル(薄いグレー地 + 枠)。secondaryButtonClass の白地と背景が衝突するため別に定義する
const cancelButtonClass =
  'rounded-lg border border-general-50 bg-general-30 font-bold text-general-100 hover:bg-general-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100';

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
  description?: string;
  manager?: string;
}

// 編集対象の現在の責任者を選択済みの値にする(候補に含まれなくても表示できる。部署名は不明なので出さない)
function toManagerValue(department: DepartmentDetail | null): UserSummary | null {
  const manager = department?.manager;
  return manager
    ? { id: manager.id, empId: manager.empId, name: manager.name, departmentName: null }
    : null;
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
  const [description, setDescription] = useState(department?.description ?? '');
  const [manager, setManager] = useState<UserSummary | null>(toManagerValue(department));
  // 入力中の検索語(searchKeyword はデバウンス後にサーバーへ送る値)
  const [rawKeyword, setRawKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  // state の更新は非同期なので、連続した送信は ref で確実に止める
  const submittingRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearchKeyword(rawKeyword.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [rawKeyword]);

  const candidates = useApiQuery<UserSummary[]>(
    open
      ? `/admin/departments/manager-candidates${
          searchKeyword ? `?keyword=${encodeURIComponent(searchKeyword)}` : ''
        }`
      : null,
    { keepPreviousData: true },
  );

  function validate(
    trimmedCode: string,
    trimmedName: string,
    trimmedDescription: string,
  ): FieldErrors {
    const next: FieldErrors = {};
    if (trimmedCode === '') next.code = t.validation.codeRequired;
    else if (!CODE_PATTERN.test(trimmedCode)) next.code = t.validation.codeFormat;
    if (trimmedName === '') next.name = t.validation.nameRequired;
    else if (trimmedName.length > NAME_MAX_LENGTH) next.name = t.validation.nameLength;
    if (trimmedDescription.length > DESCRIPTION_MAX_LENGTH) {
      next.description = t.validation.descriptionLength;
    }
    return next;
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (submittingRef.current) return;
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const found = validate(trimmedCode, trimmedName, trimmedDescription);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    submittingRef.current = true;
    setSubmitting(true);
    // 編集で責任者を変えていなければ送らない(候補の取得状況や責任者の状態変化に左右されないため)
    const managerUnchanged =
      department !== null && (manager?.id ?? null) === (department.manager?.id ?? null);
    try {
      await apiFetch<DepartmentDetail>(
        department ? `/admin/departments/${department.id}` : '/admin/departments',
        {
          method: department ? 'PATCH' : 'POST',
          body: JSON.stringify({
            code: trimmedCode,
            name: trimmedName,
            description: trimmedDescription === '' ? null : trimmedDescription,
            ...(managerUnchanged ? {} : { managerId: manager?.id ?? null }),
          }),
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
      } else if (error.code === 'INVALID_MANAGER') {
        setErrors({ manager: error.message });
        candidates.reload();
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

  const buttonClass =
    'flex h-11 items-center justify-center gap-2 px-4 text-base/6 sm:h-12 sm:min-w-32';
  const descriptionLength = description.length;

  return (
    <Modal
      open={open}
      title={department ? t.editTitle : t.createTitle}
      subtitle={department ? t.editDescription : t.createDescription}
      size="xl"
      variant="form"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={`${cancelButtonClass} ${buttonClass}`}>
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
        className="flex flex-col gap-5 sm:gap-6"
      >
        <FormRow label={messages.departments.code} htmlFor="department-code" required>
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
        </FormRow>
        <FormRow label={messages.departments.name} htmlFor="department-name" required>
          <IconField icon={<BuildingIcon />}>
            <input
              id="department-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              autoComplete="off"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? 'department-name-error' : undefined}
              className={`${inputClass} ${iconInputClass}`}
            />
          </IconField>
          {errors.name && <FieldError id="department-name-error" message={errors.name} />}
        </FormRow>
        <FormRow label={t.manager} htmlFor="department-manager">
          <ApproverSelect
            id="department-manager"
            value={manager}
            onChange={(next) => {
              setManager(next);
              setErrors((prev) => ({ ...prev, manager: undefined }));
            }}
            error={errors.manager}
            candidates={candidates.data ?? []}
            status={candidates.status}
            onRetry={candidates.reload}
            texts={t.managerSelect}
            onSearch={setRawKeyword}
            leadingIcon={<UserIcon />}
          />
          {(candidates.data?.length ?? 0) >= CANDIDATE_LIMIT && (
            <p className="mt-1 text-xs/4 text-general-80">{t.managerLimitHint}</p>
          )}
        </FormRow>
        <FormRow label={t.description} htmlFor="department-description">
          <IconField icon={<DocumentTextIcon />} align="top">
            <textarea
              id="department-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.descriptionPlaceholder}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={`department-description-count${
                errors.description ? ' department-description-error' : ''
              }`}
              className={`${textareaClass} ${iconInputClass} min-h-28`}
            />
          </IconField>
          <p
            id="department-description-count"
            className={`mt-2 text-right text-sm/5 tabular-nums ${
              descriptionLength > DESCRIPTION_MAX_LENGTH ? 'text-danger-100' : 'text-general-80'
            }`}
          >
            {descriptionLength} / {DESCRIPTION_MAX_LENGTH}
          </p>
          {errors.description && (
            <FieldError id="department-description-error" message={errors.description} />
          )}
        </FormRow>
        <InfoNotice>{t.notice}</InfoNotice>
      </form>
    </Modal>
  );
}
