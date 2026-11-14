'use client';

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/Button';
import { DateInput } from '@/components/DateInput';
import { FieldError, confirmMessageClass, inputClass } from '@/components/form';
import { FormStack, FormStackRow } from '@/components/FormTable';
import { Modal } from '@/components/Modal';
import { Notice } from '@/components/Notice';
import { Select } from '@/components/Select';
import { useToast } from '@/components/Toast';
import { ApiError, NetworkError, apiFetch } from '@/lib/api/client';
import type { Department, JobTitle, UserDetail, UserRole } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { messages } from '@/messages/ja';
import { PencilIcon } from '@/components/leave/leaveIcons';
import { RadioCardGroup } from './RadioCardGroup';
import { mapUserApiError, validateEmail, validateEmpId, validateName } from './userFormRules';
import type { UserFieldErrors, UserFieldName } from './userFormRules';

const t = messages.users;
const e = messages.users.editModal;
const c = messages.users.createModal;
const detail = messages.users.detailModal;

// 役職の「未設定」を表す選択肢の値(送信時は null)
const NO_JOB_TITLE = '';

type FieldName = Exclude<UserFieldName, 'initialPassword'>;
type FieldErrors = UserFieldErrors;

interface UserEditModalProps {
  open: boolean;
  // 編集対象(API-USER-003 の最新値。親が取得して渡す)
  user: UserDetail;
  onClose: () => void;
  // 保存できたとき(一覧・要約の再取得用)
  onSaved: () => void;
}

type Step = 'form' | 'confirmDeactivate';

// SCR-006 社員編集モーダル。変更した項目だけを PATCH し、有効 → 無効の保存は確認段階を挟む。
// 親が開くたびに key を変えて作り直すので、入力値は開くたびに初期化される
export function UserEditModal({ open, user, onClose, onSaved }: UserEditModalProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>('form');
  const [empId, setEmpId] = useState(user.empId);
  const [name, setName] = useState(user.name);
  const [jobTitleId, setJobTitleId] = useState(user.jobTitle?.id ?? NO_JOB_TITLE);
  const [contactEmail, setContactEmail] = useState(user.contactEmail ?? '');
  const [departmentId, setDepartmentId] = useState(user.departmentId);
  const [hireDate, setHireDate] = useState(user.hireDate);
  const [role, setRole] = useState<UserRole>(user.role);
  const [approvalRequired, setApprovalRequired] = useState<'yes' | 'no'>(
    user.approvalRequired ? 'yes' : 'no',
  );
  const [isActive, setIsActive] = useState<'active' | 'inactive'>(
    user.isActive ? 'active' : 'inactive',
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const jobTitles = useApiQuery<JobTitle[]>(open ? '/admin/job-titles' : null);
  const departments = useApiQuery<Department[]>(open ? '/departments' : null);

  // 変更のあった項目だけを送る(メールアドレスの空欄は未設定 = null)
  function buildChanges(): Record<string, unknown> {
    const changes: Record<string, unknown> = {};
    if (empId.trim() !== user.empId) changes.empId = empId.trim();
    if (name.trim() !== user.name) changes.name = name.trim();
    if (jobTitleId !== (user.jobTitle?.id ?? NO_JOB_TITLE)) {
      changes.jobTitleId = jobTitleId === NO_JOB_TITLE ? null : jobTitleId;
    }
    if (contactEmail.trim() !== (user.contactEmail ?? '')) {
      changes.contactEmail = contactEmail.trim() === '' ? null : contactEmail.trim();
    }
    if (departmentId !== user.departmentId) changes.departmentId = departmentId;
    if (hireDate !== user.hireDate) changes.hireDate = hireDate;
    if (role !== user.role) changes.role = role;
    if ((approvalRequired === 'yes') !== user.approvalRequired) {
      changes.approvalRequired = approvalRequired === 'yes';
    }
    if ((isActive === 'active') !== user.isActive) changes.isActive = isActive === 'active';
    return changes;
  }

  const changes = buildChanges();
  const hasChanges = Object.keys(changes).length > 0;

  function clearError(field: FieldName): void {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): FieldErrors {
    const v = c.validation;
    const found: FieldErrors = {};
    const empIdMessage = validateEmpId(empId);
    if (empIdMessage) found.empId = empIdMessage;
    const nameMessage = validateName(name);
    if (nameMessage) found.name = nameMessage;
    const emailMessage = validateEmail(contactEmail, false);
    if (emailMessage) found.contactEmail = emailMessage;
    if (departmentId === '') found.departmentId = v.departmentRequired;
    if (hireDate === '') found.hireDate = v.hireDateRequired;
    return found;
  }

  function focusFirstInvalid(): void {
    setTimeout(() => {
      bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }, 0);
  }

  async function save(): Promise<void> {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      await apiFetch<UserDetail>(`/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });
      showToast(e.saved, 'success');
      onClose();
      onSaved();
    } catch (error) {
      setStep('form');
      handleError(error);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    if (submittingRef.current || !hasChanges) return;
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid();
      return;
    }
    // 有効 → 無効は、ログイン不可・申請中の休暇の取り消しを伴うので確認を挟む
    if (user.isActive && isActive === 'inactive') {
      setStep('confirmDeactivate');
      return;
    }
    void save();
  }

  function handleError(error: unknown): void {
    if (error instanceof NetworkError) {
      setFormError(error.message);
      return;
    }
    if (!(error instanceof ApiError)) throw error;
    if (error.statusCode === 404 || error.statusCode === 403) {
      showToast(error.message, 'error');
      onClose();
      onSaved();
      return;
    }
    const result = mapUserApiError(error);
    if (result.kind === 'form') {
      // LAST_ADMIN など: 入力値は残したまま理由を示す
      setFormError(result.message);
      return;
    }
    setErrors(result.errors);
    if (result.reload === 'departments') departments.reload();
    if (result.reload === 'jobTitles') jobTitles.reload();
    focusFirstInvalid();
  }

  const jobTitleOptions = [
    { value: NO_JOB_TITLE, label: t.unset },
    ...(jobTitles.data ?? []).map((item) => ({ value: item.id, label: item.name })),
  ];
  const departmentOptions = (departments.data ?? []).map((item) => ({
    value: item.id,
    label: item.name,
  }));

  function describedBy(field: FieldName, id: string): string | undefined {
    return errors[field] ? `${id}-error` : undefined;
  }

  const formId = 'user-edit-form';

  return (
    <Modal
      open={open}
      title={e.title}
      description={e.description}
      icon={<PencilIcon />}
      iconVariant="circle"
      size="lg"
      busy={submitting}
      onClose={onClose}
      footer={
        <div key={step} className="contents">
          {step === 'form' ? (
            <>
              <Button variant="secondary" disabled={submitting} onClick={onClose}>
                {t.cancel}
              </Button>
              <Button
                variant="primary"
                type="submit"
                form={formId}
                loading={submitting}
                disabled={!hasChanges}
              >
                {e.save}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                disabled={submitting}
                data-autofocus=""
                onClick={() => setStep('form')}
              >
                {t.cancel}
              </Button>
              <Button variant="danger" loading={submitting} onClick={() => void save()}>
                {e.disable}
              </Button>
            </>
          )}
        </div>
      }
    >
      {step === 'form' ? (
        <form id={formId} noValidate onSubmit={handleSubmit}>
          <div ref={bodyRef} className="flex flex-col gap-4">
            {formError && <Notice variant="error">{formError}</Notice>}
            <FormStack>
              <FormStackRow label={t.columns.empId} htmlFor="user-edit-empid" required>
                <input
                  id="user-edit-empid"
                  type="text"
                  inputMode="numeric"
                  value={empId}
                  onChange={(event) => {
                    setEmpId(event.target.value);
                    clearError('empId');
                  }}
                  autoComplete="off"
                  aria-required="true"
                  aria-invalid={errors.empId ? true : undefined}
                  aria-describedby={describedBy('empId', 'user-edit-empid')}
                  className={inputClass}
                />
                {errors.empId && <FieldError id="user-edit-empid-error" message={errors.empId} />}
              </FormStackRow>
              <FormStackRow label={c.name} htmlFor="user-edit-name" required>
                <input
                  id="user-edit-name"
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    clearError('name');
                  }}
                  autoComplete="off"
                  aria-required="true"
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={describedBy('name', 'user-edit-name')}
                  className={inputClass}
                />
                {errors.name && <FieldError id="user-edit-name-error" message={errors.name} />}
              </FormStackRow>
              <FormStackRow label={c.jobTitle} htmlFor="user-edit-job-title">
                <Select
                  id="user-edit-job-title"
                  value={jobTitleId}
                  onChange={(value) => {
                    setJobTitleId(value);
                    clearError('jobTitleId');
                  }}
                  options={jobTitleOptions}
                  invalid={Boolean(errors.jobTitleId)}
                  describedBy={describedBy('jobTitleId', 'user-edit-job-title')}
                />
                {errors.jobTitleId && (
                  <FieldError id="user-edit-job-title-error" message={errors.jobTitleId} />
                )}
              </FormStackRow>
              <FormStackRow label={c.email} htmlFor="user-edit-email">
                <input
                  id="user-edit-email"
                  type="email"
                  value={contactEmail}
                  onChange={(event) => {
                    setContactEmail(event.target.value);
                    clearError('contactEmail');
                  }}
                  placeholder={c.emailPlaceholder}
                  autoComplete="off"
                  aria-invalid={errors.contactEmail ? true : undefined}
                  aria-describedby={describedBy('contactEmail', 'user-edit-email')}
                  className={inputClass}
                />
                {errors.contactEmail && (
                  <FieldError id="user-edit-email-error" message={errors.contactEmail} />
                )}
              </FormStackRow>
              <FormStackRow label={c.department} htmlFor="user-edit-department" required>
                <Select
                  id="user-edit-department"
                  value={departmentId}
                  onChange={(value) => {
                    setDepartmentId(value);
                    clearError('departmentId');
                  }}
                  options={departmentOptions}
                  placeholder={c.departmentPlaceholder}
                  invalid={Boolean(errors.departmentId)}
                  describedBy={describedBy('departmentId', 'user-edit-department')}
                  required
                />
                {errors.departmentId && (
                  <FieldError id="user-edit-department-error" message={errors.departmentId} />
                )}
              </FormStackRow>
              <FormStackRow label={c.hireDate} htmlFor="user-edit-hire-date" required>
                <DateInput
                  id="user-edit-hire-date"
                  value={hireDate}
                  onChange={(event) => {
                    setHireDate(event.target.value);
                    clearError('hireDate');
                  }}
                  aria-required="true"
                  aria-invalid={errors.hireDate ? true : undefined}
                  aria-describedby={describedBy('hireDate', 'user-edit-hire-date')}
                  className={inputClass}
                />
                {errors.hireDate && (
                  <FieldError id="user-edit-hire-date-error" message={errors.hireDate} />
                )}
              </FormStackRow>
              <FormStackRow label={detail.role} labelId="user-edit-role-label" required>
                <RadioCardGroup
                  labelId="user-edit-role-label"
                  name="user-edit-role"
                  value={role}
                  onChange={setRole}
                  options={[
                    { value: 'ADMIN', label: detail.roleAdmin },
                    { value: 'EMPLOYEE', label: detail.roleEmployee },
                  ]}
                />
              </FormStackRow>
              <FormStackRow
                label={detail.approvalRequired}
                labelId="user-edit-approval-label"
                required
              >
                <RadioCardGroup
                  labelId="user-edit-approval-label"
                  name="user-edit-approval"
                  value={approvalRequired}
                  onChange={setApprovalRequired}
                  options={[
                    { value: 'yes', label: detail.approvalRequiredYes },
                    { value: 'no', label: detail.approvalRequiredNo },
                  ]}
                />
              </FormStackRow>
              <FormStackRow label={e.accountStatus} labelId="user-edit-status-label" required>
                <RadioCardGroup
                  labelId="user-edit-status-label"
                  name="user-edit-status"
                  value={isActive}
                  onChange={setIsActive}
                  options={[
                    { value: 'active', label: e.accountActive },
                    { value: 'inactive', label: e.accountInactive },
                  ]}
                />
              </FormStackRow>
            </FormStack>
          </div>
        </form>
      ) : (
        <p className={confirmMessageClass}>{e.disableMessage}</p>
      )}
    </Modal>
  );
}
