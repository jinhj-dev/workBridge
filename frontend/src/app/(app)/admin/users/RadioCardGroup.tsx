'use client';

interface RadioCardGroupProps<T extends string> {
  // 項目名の要素 id(radiogroup の名前に使う)
  labelId: string;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
}

// 2 択程度のラジオカード(社員IDの入力方式・権限・休暇承認・アカウント状態)。選択中は violet-30 の背景
export function RadioCardGroup<T extends string>({
  labelId,
  name,
  value,
  onChange,
  options,
}: RadioCardGroupProps<T>) {
  return (
    <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-2 gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={`flex h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm/5 font-medium text-general-100 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-100 ${
              selected ? 'border-primary-100 bg-violet-30' : 'border-input-border bg-white'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="size-4 accent-primary-100"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
