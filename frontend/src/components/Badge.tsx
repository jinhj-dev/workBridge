import type { ReactNode } from 'react';

export type BadgeVariant = 'neutral' | 'success' | 'danger' | 'dark';
export type BadgeShape = 'rounded' | 'pill';

// 09 §2.1 のバッジ配色。success・danger の文字色は WCAG AA の対比を満たすため General 100 にする
export const BADGE_VARIANT_CLASS: Record<BadgeVariant, string> = {
  neutral: 'bg-general-40 text-general-80',
  success: 'bg-success-40 text-general-100',
  danger: 'bg-danger-30 text-general-100',
  dark: 'bg-general-80 text-white',
};

const BADGE_SHAPE_CLASS: Record<BadgeShape, string> = {
  rounded: 'rounded px-2',
  pill: 'rounded-full px-3',
};

// 状態を表す小さなラベル(高さ 24, 14px)。形は rounded(radius 4)か pill(完全な丸み)。状態は色だけでなく文言でも伝える
export function Badge({
  variant,
  shape = 'rounded',
  children,
}: {
  variant: BadgeVariant;
  shape?: BadgeShape;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex h-6 items-center text-sm/5 font-medium whitespace-nowrap ${BADGE_SHAPE_CLASS[shape]} ${BADGE_VARIANT_CLASS[variant]}`}
    >
      {children}
    </span>
  );
}
