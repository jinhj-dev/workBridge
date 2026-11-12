import type { InputHTMLAttributes, MouseEvent, ReactElement } from 'react';
import { messages } from '@/messages/ja';

type DateInputType = 'date' | 'datetime-local';

interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> {
  type?: DateInputType;
  value: string;
  // 一覧の絞り込み欄など、余白・文字が小さい入力欄(px-3 text-sm)に合わせるとき
  compact?: boolean;
}

// 入力値(YYYY-MM-DD / YYYY-MM-DDTHH:mm)を「YYYY年MM月DD日」「HH時MM分」(24時間表記)にする。形が合わなければ null
export function formatDateInputValue(value: string, type: DateInputType): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const date = messages.dateInput.date(year, month, day);
  if (type === 'date') return date;
  if (hour === undefined || minute === undefined) return null;
  return `${date} ${messages.dateInput.time(hour, minute)}`;
}

// 日付・日時の入力欄。ブラウザ標準の入力欄は表示形式を変えられないため、
// 標準の文字を透明にして、その上に「YYYY年MM月DD日」「HH時MM分」の表示を重ねる。
// 選択はブラウザ標準のカレンダー(showPicker)を使い、ラベル・aria 属性は標準の入力欄にそのまま付く。
export function DateInput({
  type = 'date',
  value,
  compact = false,
  className = '',
  onClick,
  disabled,
  ...rest
}: DateInputProps): ReactElement {
  const formatted = formatDateInputValue(value, type);
  const placeholder =
    type === 'date' ? messages.dateInput.datePlaceholder : messages.dateInput.dateTimePlaceholder;

  function handleClick(e: MouseEvent<HTMLInputElement>): void {
    onClick?.(e);
    // クリックした位置に関係なくカレンダーを開く(未対応のブラウザ・テスト環境では何もしない)
    if (!e.defaultPrevented && typeof e.currentTarget.showPicker === 'function') {
      try {
        e.currentTarget.showPicker();
      } catch {
        // ユーザー操作として扱われない場合などは標準の動作に任せる
      }
    }
  }

  return (
    <div className="relative w-full min-w-0">
      <input
        {...rest}
        type={type}
        value={value}
        disabled={disabled}
        onClick={handleClick}
        className={`${className} cursor-pointer text-transparent! [&::-webkit-datetime-edit]:opacity-0`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 right-9 flex items-center overflow-hidden whitespace-nowrap tabular-nums ${
          compact ? 'pl-3 text-sm/5' : 'pl-4 text-base/6'
        } ${
          formatted === null
            ? 'text-general-70'
            : disabled
              ? 'text-general-80'
              : 'text-general-100'
        }`}
      >
        {formatted ?? placeholder}
      </span>
    </div>
  );
}
