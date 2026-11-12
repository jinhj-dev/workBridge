'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent, ReactNode } from 'react';
import {
  FieldError,
  IconField,
  iconInputClass,
  iconInputTrailingClass,
  inputClass,
} from '@/components/form';
import { Notice } from '@/components/Notice';
import { SectionError } from '@/components/SectionError';
import { Skeleton } from '@/components/Skeleton';
import type { UserSummary } from '@/lib/api/types';
import { messages } from '@/messages/ja';

const defaultTexts = messages.leaves.approverSelect;

// 文言の差し替え用(省略時は承認者向け)
export interface ApproverSelectTexts {
  placeholder: string;
  listLabel: string;
  empty: string;
  noMatch: string;
  loadError: string;
}

interface ApproverSelectProps {
  id: string;
  value: UserSummary | null;
  onChange: (value: UserSummary | null) => void;
  error?: string | null;
  required?: boolean;
  candidates: UserSummary[];
  status: 'loading' | 'error' | 'success';
  onRetry: () => void;
  texts?: ApproverSelectTexts;
  // 指定すると候補の絞り込みをサーバー側で行う: 入力中の文字を通知し(確定・取消時は空文字)、
  // candidates は絞り込み済みとして扱う。0 件でも入力欄は残す
  onSearch?: (keyword: string) => void;
  // 指定すると入力欄の左にアイコン、右に開閉の矢印を付ける(SCR-010 部署責任者)
  leadingIcon?: ReactNode;
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function optionLabel(user: UserSummary): string {
  return defaultTexts.option(user.name, user.empId, user.departmentName);
}

// 09 §3 Autocomplete 相当。承認者の候補を氏名・社員番号で絞り込んで選ぶ(ARIA combobox)
export function ApproverSelect({
  id,
  value,
  onChange,
  error,
  required,
  candidates,
  status,
  onRetry,
  texts,
  onSearch,
  leadingIcon,
}: ApproverSelectProps) {
  const t = texts ?? defaultTexts;
  const listId = useId();
  // 入力中の文字。null のときは選択済みの承認者を表示する
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  // 入力で選択が外れる直前の値(onSearch 指定時のみ、確定せずに離れたとき復元する)
  const previousValueRef = useRef<UserSummary | null>(null);

  // 候補一覧はフロー内に置くため、開いた直後に Modal 本文のスクロール内で見える位置へ寄せる
  useEffect(() => {
    if (open) listRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [open]);

  if (status === 'loading') {
    return <Skeleton className="h-12 w-full rounded" />;
  }
  if (status === 'error') {
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="w-full">
          <SectionError message={t.loadError} onRetry={onRetry} />
        </div>
        {error && <FieldError id={`${id}-error`} message={error} />}
      </div>
    );
  }
  if (candidates.length === 0 && !onSearch) {
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="w-full">
          <Notice variant="warning">{t.empty}</Notice>
        </div>
        {error && <FieldError id={`${id}-error`} message={error} />}
      </div>
    );
  }

  const keyword = (editing ?? '').trim().toLowerCase();
  const filtered =
    keyword && !onSearch
      ? candidates.filter(
          (c) => c.name.toLowerCase().includes(keyword) || c.empId.includes(keyword),
        )
      : candidates;
  const active = Math.min(activeIndex, Math.max(filtered.length - 1, 0));
  const optionId = (index: number) => `${listId}-option-${index}`;

  function stopEditing() {
    setEditing(null);
    onSearch?.('');
  }

  function select(user: UserSummary) {
    previousValueRef.current = null;
    onChange(user);
    stopEditing();
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
      stopEditing();
    }
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setOpen(false);
    // 入力文字が残ったまま選ばずに離れた場合は元の選択を戻す(空欄にした場合は意図的な解除として維持)
    if (onSearch && !value && previousValueRef.current && (editing ?? '').trim() !== '') {
      onChange(previousValueRef.current);
    }
    previousValueRef.current = null;
    stopEditing();
  }

  const input = (
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
      aria-required={required || undefined}
      aria-describedby={error ? `${id}-error` : undefined}
      placeholder={t.placeholder}
      value={editing ?? (value ? optionLabel(value) : '')}
      onChange={(e) => {
        setEditing(e.target.value);
        onSearch?.(e.target.value);
        setActiveIndex(0);
        setOpen(true);
        if (value) {
          previousValueRef.current = value;
          onChange(null);
        }
      }}
      onFocus={() => setOpen(true)}
      onClick={() => setOpen(true)}
      onKeyDown={handleKeyDown}
      className={
        leadingIcon ? `${inputClass} ${iconInputClass} ${iconInputTrailingClass}` : inputClass
      }
    />
  );

  return (
    <div onBlur={handleBlur}>
      {leadingIcon ? (
        <IconField icon={leadingIcon} trailing={<ChevronDownIcon open={open} />}>
          {input}
        </IconField>
      ) : (
        input
      )}
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={t.listLabel}
        hidden={!open}
        className="mt-1 max-h-60 w-full overflow-y-auto rounded bg-white py-1 shadow-card"
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
