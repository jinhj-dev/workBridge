import type { ReactNode } from 'react';

export type BadgeVariant =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'dark'
  | 'info'
  | 'positive'
  | 'caution'
  | 'violet'
  | 'pink'
  | 'lavender'
  | 'yellow';
export type BadgeShape = 'rounded' | 'pill';

// 09 §2.1 のバッジ配色。success・danger の文字色は WCAG AA の対比を満たすため General 100 にする
export const BADGE_VARIANT_CLASS: Record<BadgeVariant, string> = {
  neutral: 'bg-general-40 text-general-80',
  success: 'bg-success-40 text-general-100',
  warning: 'bg-warning-40 text-general-100',
  danger: 'bg-danger-30 text-general-100',
  dark: 'bg-general-80 text-white',
  info: 'bg-primary-30 text-primary-100',
  // 参照デザインの淡い緑・橙(文字色も有彩色)。勤務中・承認済み・申請中の表示用
  positive: 'bg-success-30 text-success-110',
  caution: 'bg-warning-30 text-warning-110',
  // 役職バッジ用(SCR-010 所属社員確認)。tone の VIOLET・PINK に対応
  violet: 'bg-violet-30 text-violet-110',
  pink: 'bg-pink-30 text-pink-110',
  // 役職の tone LAVENDER・YELLOW(SCR-006 役職確認)
  lavender: 'bg-lavender-30 text-lavender-110',
  yellow: 'bg-yellow-30 text-yellow-110',
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
      className={`inline-flex h-6 items-center gap-1 text-sm/5 font-medium whitespace-nowrap ${BADGE_SHAPE_CLASS[shape]} ${BADGE_VARIANT_CLASS[variant]}`}
    >
      {children}
    </span>
  );
}
