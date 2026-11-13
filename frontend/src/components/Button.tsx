import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Spinner } from './Spinner';

// 共通ボタン(docs/UI_BUTTON_PATTERNS.md)。<button> 用の Button と、<Link> 用の buttonClass() を提供する。
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'primaryOutline'
  | 'danger'
  | 'dangerOutline'
  | 'ghost'
  | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';

// text 以外のすべての variant に共通する土台
const BASE_CLASS =
  'inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed';

// 色・hover・フォーカス色・radius・文字の太さ・disabled。Tailwind の静的スキャン用に完全なリテラルで書く
const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'rounded-btn bg-primary-100 font-bold text-white hover:bg-primary-90 focus-visible:outline-primary-100 disabled:bg-primary-60',
  secondary:
    'rounded-btn border border-general-50 bg-white font-bold text-general-100 hover:bg-general-30 focus-visible:outline-primary-100 disabled:text-general-60 disabled:hover:bg-white',
  primaryOutline:
    'rounded-btn border border-primary-100 bg-white font-bold text-primary-100 hover:bg-primary-30 focus-visible:outline-primary-100 disabled:border-general-50 disabled:text-general-60 disabled:hover:bg-white',
  danger:
    'rounded-btn bg-danger-100 font-bold text-white hover:bg-danger-100/90 focus-visible:outline-danger-100 disabled:bg-danger-100/50',
  dangerOutline:
    'rounded-btn border border-danger-100 bg-white font-bold text-danger-100 hover:bg-danger-30 focus-visible:outline-danger-100 disabled:border-general-50 disabled:text-general-60 disabled:hover:bg-white',
  ghost:
    'rounded-btn text-general-80 hover:bg-general-30 focus-visible:outline-primary-100 disabled:text-general-60 disabled:hover:bg-transparent',
  // 文字だけの操作。枠・背景・高さを持たず、フォーカスリング用に rounded(4)
  text: 'rounded text-sm/5 font-medium text-primary-100 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100 disabled:text-general-60 disabled:hover:no-underline',
};

// 高さ・左右 padding・文字・アイコンとの間隔(sm のみ折り返し禁止)
const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-btn-sm gap-btn-gap-sm px-btn-x-sm text-sm/5 whitespace-nowrap',
  md: 'h-btn-md gap-btn-gap px-btn-x-md text-sm/5',
  lg: 'h-btn-lg gap-btn-gap px-btn-x-lg text-base/6',
};

// アイコン専用(正方形・padding なし)
const ICON_ONLY_CLASS: Record<ButtonSize, string> = {
  sm: 'size-btn-sm',
  md: 'size-btn-md',
  lg: 'size-btn-lg',
};

// アイコンスロットの大きさ(sm 16 / md・lg 20 / ghost のアイコン専用 24)
const ICON_SLOT_CLASS: Record<ButtonSize, string> = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-5',
};
const GHOST_ICON_ONLY_SLOT_CLASS = 'size-6';

type ButtonClassOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  // text variant でアイコンを付けるときだけ指定する(inline-flex で揃える)
  withIcon?: boolean;
};

// <Link> など button 以外の要素にも同じ見た目を当てるための className を返す
export function buttonClass({
  variant = 'secondary',
  size = 'md',
  iconOnly = false,
  withIcon = false,
}: ButtonClassOptions = {}): string {
  if (variant === 'text') {
    return withIcon ? `${VARIANT_CLASS.text} inline-flex items-center gap-1` : VARIANT_CLASS.text;
  }
  const sizeClass = iconOnly ? ICON_ONLY_CLASS[size] : SIZE_CLASS[size];
  return `${BASE_CLASS} ${VARIANT_CLASS[variant]} ${sizeClass}`;
}

type NativeButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children'>;

type ButtonOwnProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  // 配置用クラスのみ指定できる(UI_BUTTON_PATTERNS §4.6。ESLint で検出)
  className?: string;
};

// iconOnly: true のときは icon と aria-label が必須で、children は渡せない
type ButtonProps = NativeButtonProps &
  ButtonOwnProps &
  (
    | { iconOnly: true; icon: ReactNode; 'aria-label': string; children?: never }
    | { iconOnly?: false; children: ReactNode }
  );

export function Button({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  loading = false,
  icon,
  iconPosition = 'start',
  iconOnly,
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const slotClass =
    iconOnly && variant === 'ghost' ? GHOST_ICON_ONLY_SLOT_CLASS : ICON_SLOT_CLASS[size];
  const slotContent = loading ? <Spinner /> : icon;
  const slot =
    slotContent != null && slotContent !== false ? (
      <span aria-hidden="true" className={`inline-flex shrink-0 ${slotClass} [&>svg]:size-full`}>
        {slotContent}
      </span>
    ) : null;

  const classes = [
    buttonClass({ variant, size, iconOnly: Boolean(iconOnly), withIcon: slot !== null }),
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button {...rest} type={type} disabled={disabled || loading} className={classes}>
      {iconPosition === 'start' && slot}
      {children}
      {iconPosition === 'end' && slot}
    </button>
  );
}
