'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/Button';
import { EditButton } from '@/components/ActionButtons';
import { CharCount, FieldError, RequiredMark, inputClass } from '@/components/form';
import { JobTitleBadge } from '@/components/JobTitleBadge';
import { PlusIcon } from '@/components/leave/leaveIcons';
import { Modal } from '@/components/Modal';
import { Notice } from '@/components/Notice';
import { SectionError } from '@/components/SectionError';
import { SkeletonLines } from '@/components/Skeleton';
import { bandTdClass, bandThClass } from '@/components/table';
import { useToast } from '@/components/Toast';
import { ApiError, NetworkError, apiFetch } from '@/lib/api/client';
import type { JobTitle, JobTitleTone } from '@/lib/api/types';
import { useApiQuery } from '@/lib/api/useApiQuery';
import { messages } from '@/messages/ja';
import { TrashIcon } from '../departments/icons';
import { JobTitleTonePicker } from './JobTitleTonePicker';
import { PaletteIcon, TagIcon } from './icons';

const t = messages.jobTitles;
const NAME_MAX_LENGTH = 50;

type Step =
  | { kind: 'list' }
  | { kind: 'form'; target: JobTitle | null }
  | { kind: 'confirmDelete'; target: JobTitle };

interface JobTitlesModalProps {
  open: boolean;
  onClose: () => void;
  // 追加・更新・削除に成功したとき(社員一覧の再取得用)
  onChanged: () => void;
}

interface FieldErrors {
  name?: string;
  tone?: string;
}

// SCR-006 役職確認モーダル。同じ dialog の中で 一覧 → 入力 → 削除確認 と本文・フッターだけを切り替える。
// 親が開くたびに key を変えて作り直すので、状態は開くたびに初期化される
export function JobTitlesModal({ open, onClose, onChanged }: JobTitlesModalProps) {
  const { showToast } = useToast();
  const formId = useId();
  const query = useApiQuery<JobTitle[]>(open ? '/admin/job-titles' : null);
  const [step, setStep] = useState<Step>({ kind: 'list' });
  const [name, setName] = useState('');
  const [tone, setTone] = useState<JobTitleTone | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // 使用中の役職は削除できない(エラーコードで判定。表示文言には依存しない)
  const [deleteBlocked, setDeleteBlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);

  // 段階が変わったら、操作の起点へフォーカスを移す
  useEffect(() => {
    if (step.kind === 'form') nameRef.current?.focus();
    if (step.kind === 'confirmDelete') cancelDeleteRef.current?.focus();
  }, [step.kind]);

  const jobTitles = query.data ?? [];

  function backToList(): void {
    setStep({ kind: 'list' });
    setErrors({});
    setDeleteError(null);
    setDeleteBlocked(false);
  }

  function openForm(target: JobTitle | null): void {
    setName(target?.name ?? '');
    setTone(target?.tone ?? null);
    setErrors({});
    setStep({ kind: 'form', target });
  }

  function validate(trimmedName: string): FieldErrors {
    const next: FieldErrors = {};
    if (trimmedName === '') next.name = t.validation.nameRequired;
    else if (trimmedName.length > NAME_MAX_LENGTH) next.name = t.validation.nameLength;
    if (tone === null) next.tone = t.validation.toneRequired;
    return next;
  }

  // 対象が消えていたとき: 一覧を取り直して一覧へ戻る
  function handleNotFound(): void {
    showToast(t.notFound, 'error');
    backToList();
    query.reload();
    onChanged();
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (submittingRef.current || step.kind !== 'form') return;
    const trimmedName = name.trim();
    const found = validate(trimmedName);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      if (found.name) nameRef.current?.focus();
      return;
    }
    const target = step.target;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await apiFetch<JobTitle>(target ? `/admin/job-titles/${target.id}` : '/admin/job-titles', {
        method: target ? 'PATCH' : 'POST',
        body: JSON.stringify({ name: trimmedName, tone }),
      });
      showToast(target ? t.updated : t.created, 'success');
      backToList();
      query.reload();
      onChanged();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'DUPLICATE_JOB_TITLE_NAME') setErrors({ name: error.message });
        else if (error.statusCode === 404) handleNotFound();
        else if (error.statusCode === 400) {
          const detail = (field: string) => error.details.find((d) => d.field === field)?.message;
          setErrors({ name: detail('name') ?? error.message, tone: detail('tone') });
        } else showToast(error.message, 'error');
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

  async function handleDelete(): Promise<void> {
    if (submittingRef.current || step.kind !== 'confirmDelete') return;
    submittingRef.current = true;
    setSubmitting(true);
    setDeleteError(null);
    setDeleteBlocked(false);
    try {
      await apiFetch<void>(`/admin/job-titles/${step.target.id}`, { method: 'DELETE' });
      showToast(t.deleted, 'success');
      backToList();
      query.reload();
      onChanged();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'JOB_TITLE_IN_USE') {
          setDeleteError(t.inUse);
          setDeleteBlocked(true);
        } else if (error.statusCode === 404) handleNotFound();
        else setDeleteError(error.message);
      } else if (error instanceof NetworkError) {
        setDeleteError(error.message);
      } else {
        throw error;
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function renderList() {
    if (query.status === 'loading') return <SkeletonLines count={4} />;
    if (query.status === 'error') return <SectionError onRetry={query.reload} />;
    const editing = step.kind === 'form';
    return (
      <div className="flex flex-col gap-3">
        <h3 className="text-base/6 font-bold text-general-100">
          {t.listHeading(jobTitles.length)}
        </h3>
        {jobTitles.length === 0 ? (
          <p className="py-4 text-center text-sm/5 text-general-80">{t.empty}</p>
        ) : (
          <div className="max-h-72 overflow-auto rounded-lg border border-general-40 [&_tr:last-child_td]:border-b-0">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th scope="col" className={bandThClass}>
                    {t.name}
                  </th>
                  <th scope="col" className={`${bandThClass} w-28 text-right`}>
                    {t.actions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {jobTitles.map((jobTitle) => (
                  <tr key={jobTitle.id}>
                    <td className={`${bandTdClass} max-w-0`}>
                      <JobTitleBadge jobTitle={jobTitle} />
                    </td>
                    <td className={bandTdClass}>
                      <span className="flex justify-end gap-2">
                        <EditButton
                          iconOnly
                          aria-label={t.editLabel(jobTitle.name)}
                          disabled={editing}
                          onClick={() => openForm(jobTitle)}
                        />
                        <Button
                          size="sm"
                          variant="dangerOutline"
                          iconOnly
                          icon={<TrashIcon />}
                          aria-label={t.deleteLabel(jobTitle.name)}
                          disabled={editing}
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteBlocked(false);
                            setStep({ kind: 'confirmDelete', target: jobTitle });
                          }}
                        />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!editing && (
          <div className="flex justify-center">
            <Button variant="primary" icon={<PlusIcon />} onClick={() => openForm(null)}>
              {t.add}
            </Button>
          </div>
        )}
      </div>
    );
  }

  function renderForm() {
    const nameErrorId = `${formId}-name-error`;
    const toneErrorId = `${formId}-tone-error`;
    return (
      <form
        id={formId}
        noValidate
        onSubmit={(e) => void handleSubmit(e)}
        className="mt-5 flex flex-col gap-4 border-t border-general-40 pt-5"
      >
        <div>
          <label
            htmlFor={`${formId}-name`}
            className="mb-1 block text-sm/5 font-medium text-general-80"
          >
            {t.name}
            <RequiredMark />
          </label>
          <input
            id={`${formId}-name`}
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            autoComplete="off"
            aria-required="true"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={`${formId}-count${errors.name ? ` ${nameErrorId}` : ''}`}
            className={inputClass}
          />
          <CharCount
            id={`${formId}-count`}
            length={name.length}
            max={NAME_MAX_LENGTH}
            error={errors.name && <FieldError id={nameErrorId} message={errors.name} />}
          />
        </div>
        <div className="rounded-xl bg-linear-to-br from-primary-30 to-violet-30 p-4">
          <div className="flex items-center gap-2 text-sm/5 font-bold text-general-100">
            <span aria-hidden="true" className="size-5 text-general-80">
              <PaletteIcon />
            </span>
            {t.colorPanelTitle}
          </div>
          <p className="mt-1 text-xs/4 text-general-80">{t.colorPanelDescription}</p>
          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-center">
            <div className="md:flex-1">
              <JobTitleTonePicker
                value={tone}
                onChange={(next) => {
                  setTone(next);
                  setErrors((prev) => ({ ...prev, tone: undefined }));
                }}
                invalid={Boolean(errors.tone)}
                describedBy={errors.tone ? toneErrorId : undefined}
              />
              {errors.tone && <FieldError id={toneErrorId} message={errors.tone} />}
            </div>
            <div className="flex min-w-0 flex-col gap-2 border-t border-general-50 pt-3 md:w-40 md:border-t-0 md:border-l md:pt-0 md:pl-4">
              <span className="text-xs/4 font-medium text-general-80">{t.preview}</span>
              <JobTitleBadge
                jobTitle={{
                  name: name.trim() === '' ? t.previewPlaceholder : name.trim(),
                  tone: tone ?? 'GRAY',
                }}
              />
            </div>
          </div>
        </div>
        <Notice>{t.notice}</Notice>
      </form>
    );
  }

  function renderFooter() {
    if (step.kind === 'form') {
      return (
        <>
          <Button variant="secondary" disabled={submitting} onClick={backToList}>
            {t.cancel}
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={submitting}>
            {t.save}
          </Button>
        </>
      );
    }
    if (step.kind === 'confirmDelete') {
      return (
        <>
          <Button
            ref={cancelDeleteRef}
            variant="secondary"
            disabled={submitting}
            onClick={backToList}
          >
            {t.cancel}
          </Button>
          <Button
            variant="danger"
            loading={submitting}
            disabled={deleteBlocked}
            onClick={() => void handleDelete()}
          >
            {t.delete}
          </Button>
        </>
      );
    }
    return (
      <Button variant="secondary" onClick={onClose}>
        {t.close}
      </Button>
    );
  }

  return (
    <Modal
      open={open}
      title={t.title}
      description={t.description}
      icon={<TagIcon />}
      iconVariant="circle"
      size="lg"
      busy={submitting}
      onClose={onClose}
      footer={
        <div key={step.kind} className="contents">
          {renderFooter()}
        </div>
      }
    >
      {step.kind === 'confirmDelete' ? (
        <div className="flex flex-col gap-3">
          <p className="break-words text-general-100">{t.confirmDelete(step.target.name)}</p>
          {deleteError && <Notice variant="error">{deleteError}</Notice>}
        </div>
      ) : (
        <>
          {renderList()}
          {step.kind === 'form' && renderForm()}
        </>
      )}
    </Modal>
  );
}
