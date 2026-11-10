import { BADGE_VARIANT_CLASS } from '@/components/Badge';
import type { BadgeVariant } from '@/components/Badge';
import { labelClass } from '@/components/form';

interface LeaveFilterButtonsProps<T extends string> {
  idPrefix: string;
  label: string;
  options: readonly T[];
  optionLabel: (value: T) => string;
  variantOf: (value: T) => BadgeVariant;
  selected: T[];
  onChange: (next: T[]) => void;
  // 案内文(選択なし = すべて)の要素 id
  describedBy?: string;
}

const buttonClass =
  'h-10 rounded border px-4 text-sm/5 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100';
// 選択中は枠と太字とチェックで示す(色だけに頼らない)
const selectedClass = 'border-general-100 font-bold';
const unselectedClass = 'border-transparent font-medium hover:border-general-50';

// 休暇履歴(SCR-004)の複数選択トグル。StatusFilterButtons と同じ操作・見た目で、状態・休暇種別の両方に使う。
// 選択なしは「すべて」。押した時点で反映する(反映は呼び出し側)
export function LeaveFilterButtons<T extends string>({
  idPrefix,
  label,
  options,
  optionLabel,
  variantOf,
  selected,
  onChange,
  describedBy,
}: LeaveFilterButtonsProps<T>) {
  const labelId = `${idPrefix}-label`;

  function toggle(value: T) {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    // 選択順に関わらず表示順で保持し、URL を安定させる
    onChange(options.filter((item) => next.includes(item)));
  }

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={describedBy}>
      <span id={labelId} className={labelClass}>
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {options.map((value) => {
          const pressed = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={pressed}
              onClick={() => toggle(value)}
              className={`${buttonClass} ${BADGE_VARIANT_CLASS[variantOf(value)]} ${
                pressed ? selectedClass : unselectedClass
              }`}
            >
              {pressed && <span aria-hidden="true">✓ </span>}
              {optionLabel(value)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
