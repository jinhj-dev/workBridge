import { DateInput } from '@/components/DateInput';
import { FieldError, inputClass, labelClass } from '@/components/form';
import { messages } from '@/messages/ja';

interface DateRangeFieldsProps {
  idPrefix: string;
  startDate: string;
  endDate: string;
  onChange: (patch: { startDate?: string; endDate?: string }) => void;
  error: string | null;
}

// 照会期間の入力(開始日・終了日)。誤りは 1 つの FieldError にまとめ、両方の入力に結び付ける
export function DateRangeFields({
  idPrefix,
  startDate,
  endDate,
  onChange,
  error,
}: DateRangeFieldsProps) {
  const t = messages.dateRange;
  const errorId = `${idPrefix}-range-error`;
  const invalid = error ? true : undefined;
  return (
    <div className="sm:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-start`} className={labelClass}>
            {t.startDate}
          </label>
          <DateInput
            id={`${idPrefix}-start`}
            value={startDate}
            onChange={(e) => onChange({ startDate: e.target.value })}
            aria-invalid={invalid}
            aria-describedby={error ? errorId : undefined}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-end`} className={labelClass}>
            {t.endDate}
          </label>
          <DateInput
            id={`${idPrefix}-end`}
            value={endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
            aria-invalid={invalid}
            aria-describedby={error ? errorId : undefined}
            className={inputClass}
          />
        </div>
      </div>
      {error && <FieldError id={errorId} message={error} />}
    </div>
  );
}
