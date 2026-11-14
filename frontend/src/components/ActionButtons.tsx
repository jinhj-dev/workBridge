import type { ComponentPropsWithRef, ReactNode } from 'react';
import { messages } from '@/messages/ja';
import { Button } from './Button';
import { EyeIcon, PencilIcon } from './leave/leaveIcons';

// 「詳細」「編集」ボタンの共通プリセット(docs/UI_BUTTON_PATTERNS.md §2.1)。
// 見た目は Button の variant・size だけで決まり、ここでは役割(variant・アイコン・既定文言)を固定する。
type PresetNativeProps = Omit<ComponentPropsWithRef<'button'>, 'children' | 'className' | 'type'>;

type PresetCommonProps = {
  // 行内は sm、モーダル footer は md
  size?: 'sm' | 'md';
  // 配置用クラスのみ(UI_BUTTON_PATTERNS §4.6。ESLint で検出)
  className?: string;
};

type DetailButtonProps = PresetNativeProps & PresetCommonProps & { children?: ReactNode };

// 詳細: secondary + 目アイコン
export function DetailButton({
  size = 'sm',
  children,
  ...rest
}: DetailButtonProps): React.JSX.Element {
  return (
    <Button variant="secondary" size={size} icon={<EyeIcon />} {...rest}>
      {children ?? messages.common.detail}
    </Button>
  );
}

// アイコン専用のときは aria-label が必須で、文言は渡せない
type EditButtonProps = PresetNativeProps &
  PresetCommonProps &
  (
    | { iconOnly?: false; children?: ReactNode }
    | { iconOnly: true; 'aria-label': string; children?: never }
  );

// 編集: primaryOutline + 鉛筆アイコン
export function EditButton({
  size = 'sm',
  iconOnly,
  children,
  ...rest
}: EditButtonProps): React.JSX.Element {
  if (iconOnly) {
    const iconOnlyProps = rest as PresetNativeProps & PresetCommonProps & { 'aria-label': string };
    return (
      <Button
        variant="primaryOutline"
        size={size}
        iconOnly
        icon={<PencilIcon />}
        {...iconOnlyProps}
      />
    );
  }
  return (
    <Button variant="primaryOutline" size={size} icon={<PencilIcon />} {...rest}>
      {children ?? messages.common.edit}
    </Button>
  );
}
