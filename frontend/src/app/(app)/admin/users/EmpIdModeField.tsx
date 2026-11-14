'use client';

import { FieldError, FieldHint, inputClass } from '@/components/form';
import { messages } from '@/messages/ja';
import { InfoIcon } from './icons';
import { RadioCardGroup } from './RadioCardGroup';

const t = messages.users.createModal;

export type EmpIdMode = 'AUTO' | 'MANUAL';

// 自動採番の予定番号の取得状況(取得失敗は番号を「—」にするだけで、登録は続けられる)
export type PredictedEmpId =
  { status: 'loading' } | { status: 'error' } | { status: 'success'; empId: string | null };

interface EmpIdModeFieldProps {
  id: string;
  // 項目名の要素 id(ラジオグループと直接入力欄の名前に使う)
  labelId: string;
  mode: EmpIdMode;
  onModeChange: (mode: EmpIdMode) => void;
  predicted: PredictedEmpId;
  manualValue: string;
  onManualChange: (value: string) => void;
  error?: string;
}

const MODES: readonly { value: EmpIdMode; label: string }[] = [
  { value: 'AUTO', label: t.empIdAuto },
  { value: 'MANUAL', label: t.empIdManual },
];

// 社員IDの入力方式: 自動生成(予定番号を読み取り専用で表示)か直接入力か
export function EmpIdModeField({
  id,
  labelId,
  mode,
  onModeChange,
  predicted,
  manualValue,
  onManualChange,
  error,
}: EmpIdModeFieldProps) {
  const cannotGenerate = predicted.status === 'success' && predicted.empId === null;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  function predictedText(): string {
    if (predicted.status === 'loading') return t.empIdLoading;
    if (predicted.status === 'success' && predicted.empId !== null) return predicted.empId;
    return messages.common.noValue;
  }

  return (
    <div className="flex flex-col gap-2">
      <RadioCardGroup
        labelId={labelId}
        name={`${id}-mode`}
        value={mode}
        onChange={onModeChange}
        options={MODES}
      />
      {mode === 'AUTO' ? (
        <>
          <div className="flex h-12 items-center rounded-lg border border-input-border bg-general-30 px-4 text-base/6 text-general-80 tabular-nums">
            <span>{predictedText()}</span>
          </div>
          {cannotGenerate && <FieldError id={errorId} message={t.empIdUnavailable} />}
          <FieldHint id={hintId}>
            <span className="inline-flex items-start gap-1">
              <span aria-hidden="true" className="mt-0.5 shrink-0">
                <InfoIcon />
              </span>
              {t.empIdHint}
            </span>
          </FieldHint>
        </>
      ) : (
        <>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            value={manualValue}
            onChange={(e) => onManualChange(e.target.value)}
            placeholder={t.empIdPlaceholder}
            autoComplete="off"
            aria-labelledby={labelId}
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={inputClass}
          />
          {error && <FieldError id={errorId} message={error} />}
        </>
      )}
      {mode === 'AUTO' && error && !cannotGenerate && <FieldError id={errorId} message={error} />}
    </div>
  );
}
