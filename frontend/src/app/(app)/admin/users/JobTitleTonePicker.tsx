'use client';

import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { JOB_TITLE_TONES } from '@/components/JobTitleBadge';
import type { JobTitleTone } from '@/lib/api/types';
import { messages } from '@/messages/ja';
import { CheckIcon } from './icons';

interface JobTitleTonePickerProps {
  value: JobTitleTone | null;
  onChange: (tone: JobTitleTone) => void;
  describedBy?: string;
  invalid?: boolean;
}

// 役職の色を選ぶ円形スウォッチ(radiogroup)。矢印キーで移動・選択。未選択のときは先頭だけ Tab で入れる
export function JobTitleTonePicker({
  value,
  onChange,
  describedBy,
  invalid,
}: JobTitleTonePickerProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusIndex = Math.max(
    JOB_TITLE_TONES.findIndex((item) => item.tone === value),
    0,
  );

  function handleKeyDown(event: KeyboardEvent, index: number): void {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = (index + step + JOB_TITLE_TONES.length) % JOB_TITLE_TONES.length;
    onChange(JOB_TITLE_TONES[next].tone);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={messages.jobTitles.colorGroup}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className="flex flex-wrap gap-2.5"
    >
      {JOB_TITLE_TONES.map((item, index) => {
        const selected = item.tone === value;
        return (
          <button
            key={item.tone}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={messages.jobTitles.tones[item.tone]}
            tabIndex={index === focusIndex ? 0 : -1}
            onClick={() => onChange(item.tone)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`flex size-9 items-center justify-center rounded-full text-white ring-1 ring-general-100/15 ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100 ${item.swatchClass} ${
              selected
                ? 'outline-2 outline-offset-2 outline-general-100'
                : 'opacity-50 hover:opacity-80'
            }`}
          >
            {selected && <CheckIcon />}
          </button>
        );
      })}
    </div>
  );
}
