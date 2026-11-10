import type { ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'success' | 'danger' | 'dark';

// 09 §2.1 のバッジ配色。success・danger の文字色は WCAG AA の対比を満たすため General 100 にする
export const BADGE_VARIANT_CLASS: Record<BadgeVariant, string> = {
  neutral: 'bg-general-40 text-general-80',
  success: 'bg-success-40 text-general-100',
  danger: 'bg-danger-30 text-general-100',
  dark: 'bg-general-80 text-white',
};

// 状態を表す小さなラベル(高さ 24, radius 4, 14px)。状態は色だけでなく文言でも伝える
export function Badge({ variant, children }: { variant: BadgeVariant; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded px-2 text-sm/5 font-medium whitespace-nowrap ${BADGE_VARIANT_CLASS[variant]}`}
    >
      {children}
    </span>
  );
}
