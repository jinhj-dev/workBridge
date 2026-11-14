'use client';

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { DateInput } from '@/components/DateInput';
import { FieldError, FieldHint, inputClass } from '@/components/form';
import { FormModal } from '@/components/FormModal';
import { FormStack, FormStackRow } from '@/components/FormTable';
import { JobTitleBadge } from '@/components/JobTitleBadge';
import { Notice } from '@/components/Notice';
import { Select } from '@/components/Select';
import { useToast } from '@/components/Toast';
import { ApiError, NetworkError, apiFetch } from '@/lib/api/client';
import type {
  Department,
  JobTitle,
  NextEmpId,
  UserCreateRequest,
  UserDetail,
} from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { checkPasswordPolicy } from '@/lib/password-policy';
import { messages } from '@/messages/ja';
import { EmpIdModeField } from './EmpIdModeField';
import type { EmpIdMode, PredictedEmpId } from './EmpIdModeField';
import { UserPlusIcon } from './icons';
import { mapUserApiError, validateEmail, validateEmpId, validateName } from './userFormRules';
import type { UserFieldErrors, UserFieldName } from './userFormRules';

const t = messages.users.createModal;

type FieldName = UserFieldName;
type FieldErrors = UserFieldErrors;

interface UserCreateModalProps {
  open: boolean;
  onClose: () => void;
  // 登録できたとき(一覧・要約の再取得用)
  onCreated: () => void;
}

// SCR-006 社員追加モーダル(単一フォーム。完了段階なし)。
// 親が開くたびに key を変えて作り直すので、入力値(初期パスワードを含む)は閉じるたびに破棄される
export function UserCreateModal({ open, onClose, onCreated }: UserCreateModalProps) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<EmpIdMode>('AUTO');
  const [manualEmpId, setManualEmpId] = useState('');
  const [name, setName] = useState('');
  const [jobTitleId, setJobTitleId] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // state の更新は非同期なので、連続した送信は ref で確実に止める
  const submittingRef = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const nextEmpId = useApiQuery<NextEmpId>(open ? '/admin/users/next-emp-id' : null);
  const jobTitles = useApiQuery<JobTitle[]>(open ? '/admin/job-titles' : null);
  const departments = useApiQuery<Department[]>(open ? '/departments' : null);

  const predicted: PredictedEmpId =
    nextEmpId.status === 'success' && nextEmpId.data
      ? { status: 'success', empId: nextEmpId.data.empId }
      : { status: nextEmpId.status === 'error' ? 'error' : 'loading' };
  const selectedJobTitle = jobTitles.data?.find((item) => item.id === jobTitleId) ?? null;

  function clearError(field: FieldName): void {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): FieldErrors {
    const v = t.validation;
    const found: FieldErrors = {};
    if (mode === 'MANUAL') {
      const message = validateEmpId(manualEmpId);
      if (message) found.empId = message;
    } else if (predicted.status === 'success' && predicted.empId === null) {
      // 自動採番できない: 直接入力へ切り替えるまで進めない(メッセージは欄に常時表示)
      found.empId = t.empIdUnavailable;
    }
    const nameMessage = validateName(name);
    if (nameMessage) found.name = nameMessage;
    if (jobTitleId === '') found.jobTitleId = v.jobTitleRequired;
    const emailMessage = validateEmail(contactEmail, true);
    if (emailMessage) found.contactEmail = emailMessage;
    if (departmentId === '') found.departmentId = v.departmentRequired;
    if (hireDate === '') found.hireDate = v.hireDateRequired;
    if (initialPassword === '') found.initialPassword = v.passwordRequired;
    else {
      const violation = checkPasswordPolicy(initialPassword);
      if (violation === 'tooLong') found.initialPassword = v.passwordTooLong;
      else if (violation === 'policy') found.initialPassword = v.passwordPolicy;
    }
    return found;
  }

  // 最初の誤り項目へフォーカスを移す(エラー描画後に aria-invalid を探す)
  function focusFirstInvalid(): void {
    setTimeout(() => {
      bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }, 0);
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (submittingRef.current) return;
    const found = validate();
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid();
      return;
    }

    const request: UserCreateRequest = {
      empIdMode: mode,
      empId: mode === 'MANUAL' ? manualEmpId.trim() : null,
      name: name.trim(),
      initialPassword,
      jobTitleId,
      contactEmail: contactEmail.trim(),
      departmentId,
      hireDate,
      role: 'EMPLOYEE',
      approvalRequired: true,
    };
    submittingRef.current = true;
    setSubmitting(true);
    let registered = false;
    try {
      const created = await apiFetch<UserDetail>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      showToast(t.success(created.empId), 'success');
      onClose();
      onCreated();
      registered = true;
    } catch (error) {
      handleError(error);
    } finally {
      // 登録済みなら、閉じるまでの間の再送信は受け付けない
      if (!registered) submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleError(error: unknown): void {
    if (error instanceof NetworkError) {
      setFormError(error.message);
      return;
    }
    if (!(error instanceof ApiError)) throw error;
    const result = mapUserApiError(error);
    if (result.kind === 'form') {
      setFormError(result.message);
      return;
    }
    setErrors(result.errors);
    if (result.reload === 'departments') departments.reload();
    if (result.reload === 'jobTitles') jobTitles.reload();
    focusFirstInvalid();
  }

  const jobTitleOptions = (jobTitles.data ?? []).map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const departmentOptions = (departments.data ?? []).map((item) => ({
    value: item.id,
    label: item.name,
  }));

  function describedBy(field: FieldName, id: string, extra?: string): string | undefined {
    const ids = [extra, errors[field] ? `${id}-error` : undefined].filter(Boolean);
    return ids.length > 0 ? ids.join(' ') : undefined;
  }

  return (
    <FormModal
      open={open}
      title={t.title}
      description={t.description}
      icon={<UserPlusIcon />}
      iconVariant="circle"
      onClose={onClose}
      onSubmit={(e) => void handleSubmit(e)}
      submitLabel={t.submit}
      submitting={submitting}
    >
      <div ref={bodyRef} className="flex flex-col gap-6">
        {formError && <Notice variant="error">{formError}</Notice>}
        <FormStack>
          <FormStackRow label={t.empId} labelId="user-create-empid-label" required>
            <EmpIdModeField
              id="user-create-empid"
              labelId="user-create-empid-label"
              mode={mode}
              onModeChange={(next) => {
                setMode(next);
                clearError('empId');
              }}
              predicted={predicted}
              manualValue={manualEmpId}
              onManualChange={(value) => {
                setManualEmpId(value);
                clearError('empId');
              }}
              error={errors.empId}
            />
          </FormStackRow>
          <FormStackRow label={t.name} htmlFor="user-create-name" required>
            <input
              id="user-create-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError('name');
              }}
              placeholder={t.namePlaceholder}
              autoComplete="off"
              aria-required="true"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={describedBy('name', 'user-create-name')}
              className={inputClass}
            />
            {errors.name && <FieldError id="user-create-name-error" message={errors.name} />}
          </FormStackRow>
          <FormStackRow label={t.jobTitle} htmlFor="user-create-job-title" required>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="min-w-0 md:flex-1">
                <Select
                  id="user-create-job-title"
                  value={jobTitleId}
                  onChange={(value) => {
                    setJobTitleId(value);
                    clearError('jobTitleId');
                  }}
                  options={jobTitleOptions}
                  placeholder={t.jobTitlePlaceholder}
                  invalid={Boolean(errors.jobTitleId)}
                  describedBy={describedBy('jobTitleId', 'user-create-job-title')}
                  required
                />
              </div>
              {selectedJobTitle && <JobTitleBadge jobTitle={selectedJobTitle} />}
            </div>
            {errors.jobTitleId && (
              <FieldError id="user-create-job-title-error" message={errors.jobTitleId} />
            )}
          </FormStackRow>
          <FormStackRow label={t.email} htmlFor="user-create-email" required>
            <input
              id="user-create-email"
              type="email"
              value={contactEmail}
              onChange={(e) => {
                setContactEmail(e.target.value);
                clearError('contactEmail');
              }}
              placeholder={t.emailPlaceholder}
              autoComplete="off"
              aria-required="true"
              aria-invalid={errors.contactEmail ? true : undefined}
              aria-describedby={describedBy('contactEmail', 'user-create-email')}
              className={inputClass}
            />
            {errors.contactEmail && (
              <FieldError id="user-create-email-error" message={errors.contactEmail} />
            )}
          </FormStackRow>
          <FormStackRow label={t.department} htmlFor="user-create-department" required>
            <Select
              id="user-create-department"
              value={departmentId}
              onChange={(value) => {
                setDepartmentId(value);
                clearError('departmentId');
              }}
              options={departmentOptions}
              placeholder={t.departmentPlaceholder}
              invalid={Boolean(errors.departmentId)}
              describedBy={describedBy('departmentId', 'user-create-department')}
              required
            />
            {errors.departmentId && (
              <FieldError id="user-create-department-error" message={errors.departmentId} />
            )}
          </FormStackRow>
          <FormStackRow label={t.hireDate} htmlFor="user-create-hire-date" required>
            <DateInput
              id="user-create-hire-date"
              value={hireDate}
              onChange={(e) => {
                setHireDate(e.target.value);
                clearError('hireDate');
              }}
              aria-required="true"
              aria-invalid={errors.hireDate ? true : undefined}
              aria-describedby={describedBy('hireDate', 'user-create-hire-date')}
              className={inputClass}
            />
            {errors.hireDate && (
              <FieldError id="user-create-hire-date-error" message={errors.hireDate} />
            )}
          </FormStackRow>
          <FormStackRow label={t.initialPassword} htmlFor="user-create-password" required>
            <input
              id="user-create-password"
              type="password"
              value={initialPassword}
              onChange={(e) => {
                setInitialPassword(e.target.value);
                clearError('initialPassword');
              }}
              placeholder={t.initialPasswordPlaceholder}
              autoComplete="new-password"
              aria-required="true"
              aria-invalid={errors.initialPassword ? true : undefined}
              aria-describedby={describedBy(
                'initialPassword',
                'user-create-password',
                'user-create-password-hint',
              )}
              className={inputClass}
            />
            <FieldHint id="user-create-password-hint">{t.initialPasswordHint}</FieldHint>
            {errors.initialPassword && (
              <FieldError id="user-create-password-error" message={errors.initialPassword} />
            )}
          </FormStackRow>
        </FormStack>
        <Notice>{t.notice}</Notice>
      </div>
    </FormModal>
  );
}
