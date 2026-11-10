'use client';

import { useId, useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { ErrorIcon, FieldError, inputClass, secondaryButtonClass } from '@/components/form';
import { Skeleton } from '@/components/Skeleton';
import type { UserSummary } from '@/lib/api/types';
import { messages } from '@/messages/ja';

const t = messages.leaves.approverSelect;

interface ApproverSelectProps {
  id: string;
  value: UserSummary | null;
  onChange: (value: UserSummary | null) => void;
  error?: string | null;
  candidates: UserSummary[];
  status: 'loading' | 'error' | 'success';
  onRetry: () => void;
}

function optionLabel(user: UserSummary): string {
  return t.option(user.name, user.empId, user.departmentName);
}

// 09 §3 Autocomplete 相当。承認者の候補を氏名・社員番号で絞り込んで選ぶ(ARIA combobox)
export function ApproverSelect({
  id,
  value,
  onChange,
  error,
  candidates,
  status,
  onRetry,
}: ApproverSelectProps) {
  const listId = useId();
  // 入力中の文字。null のときは選択済みの承認者を表示する
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  if (status === 'loading') {
    return <Skeleton className="h-12 w-full rounded" />;
  }
  if (status === 'error') {
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert" className="flex items-start gap-1.5 text-sm/5 text-general-100">
          <ErrorIcon />
          {t.loadError}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className={`${secondaryButtonClass} h-9 px-4 text-sm/5`}
        >
          {messages.common.retry}
        </button>
        {error && <FieldError id={`${id}-error`} message={error} />}
      </div>
    );
  }
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="flex items-start gap-1.5 text-sm/5 text-general-100">
          <ErrorIcon />
          {t.empty}
        </p>
        {error && <FieldError id={`${id}-error`} message={error} />}
      </div>
    );
  }

  const keyword = (editing ?? '').trim().toLowerCase();
  const filtered = keyword
    ? candidates.filter((c) => c.name.toLowerCase().includes(keyword) || c.empId.includes(keyword))
    : candidates;
  const active = Math.min(activeIndex, Math.max(filtered.length - 1, 0));
  const optionId = (index: number) => `${listId}-option-${index}`;

  function select(user: UserSummary) {
    onChange(user);
    setEditing(null);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      if (filtered.length > 0) setActiveIndex((active + step + filtered.length) % filtered.length);
    } else if (event.key === 'Enter') {
      // 候補を開いている間だけ選択する(開いていなければフォーム送信を妨げない)
      if (open && filtered[active]) {
        event.preventDefault();
        select(filtered[active]);
      }
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      setEditing(null);
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setOpen(false);
    setEditing(null);
  }

  return (
    <div className="relative" onBlur={handleBlur}>
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[active] ? optionId(active) : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        placeholder={t.placeholder}
        value={editing ?? (value ? optionLabel(value) : '')}
        onChange={(e) => {
          setEditing(e.target.value);
          setActiveIndex(0);
          setOpen(true);
          if (value) onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className={inputClass}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={t.listLabel}
        hidden={!open}
        className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded bg-white py-1 shadow-card"
      >
        {filtered.length === 0 && (
          <li role="presentation" className="px-4 py-3 text-sm/5 text-general-80">
            {t.noMatch}
          </li>
        )}
        {filtered.map((user, index) => (
          <li
            key={user.id}
            id={optionId(index)}
            role="option"
            aria-selected={value?.id === user.id}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => select(user)}
            onMouseMove={() => setActiveIndex(index)}
            className={`cursor-pointer px-4 py-2.5 text-sm/5 text-general-100 ${
              value?.id === user.id
                ? 'bg-primary-30 font-medium'
                : index === active
                  ? 'bg-general-30'
                  : ''
            }`}
          >
            {optionLabel(user)}
          </li>
        ))}
      </ul>
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  );
}
