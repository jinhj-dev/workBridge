'use client';

import { inputClass } from '@/components/form';
import { SearchIcon } from '@/components/leave/leaveIcons';

interface SearchInputProps {
  id: string;
  label: string; // 画面には出さず(sr-only)、読み上げに使う
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

// 検索入力: 左に虫眼鏡、高さ 44、角丸 8
export function SearchInput({ id, label, value, onChange, placeholder }: SearchInputProps) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-general-70"
      >
        <SearchIcon />
      </span>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={`${inputClass} h-11 pl-10 text-sm/5 placeholder:text-general-70`}
      />
    </div>
  );
}
