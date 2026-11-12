import { selectClass } from '@/components/form';

interface SelectProps<T extends string> {
  id: string;
  value: T | '';
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean; // モーダルを開いた直後の初期フォーカス(data-autofocus。React の autoFocus は開く前に確定して効かない)
}

// 09 §3 Dropdown(Regular)。ネイティブ select に右端の矢印を重ねる
export function Select<T extends string>({
  id,
  value,
  onChange,
  options,
  placeholder,
  invalid,
  describedBy,
  required,
  disabled,
  autoFocus,
}: SelectProps<T>) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        disabled={disabled}
        data-autofocus={autoFocus ? '' : undefined}
        className={`${selectClass} appearance-none pr-10 disabled:cursor-not-allowed disabled:bg-general-30 disabled:text-general-80`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-general-80"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}
