import type { ReactNode } from 'react';
import { messages } from '@/messages/ja';

export type NoticeVariant = 'info' | 'success' | 'warning' | 'error';

interface NoticeProps {
  // 省略時は info
  variant?: NoticeVariant;
  // 見出し(任意)。ある場合は本文を通常の太さにする
  title?: string;
  children: ReactNode;
  // 本文の下に置く操作(再試行ボタンなど)
  action?: ReactNode;
  // 渡すと閉じるボタンを出す。表示の切り替えは呼び出し側が持つ
  onClose?: () => void;
  // 外側の余白など配置だけを指定する(色・大きさは variant に任せる)
  className?: string;
}

// 色は 09 §2.1 の Notice トークン(globals.css)。文字は全 variant 共通で notice-text
const VARIANT_CLASS: Record<NoticeVariant, { box: string; icon: string }> = {
  info: { box: 'bg-notice-info-bg', icon: 'text-notice-info-icon' },
  success: {
    box: 'bg-notice-success-bg',
    icon: 'text-notice-success-icon',
  },
  warning: {
    box: 'bg-notice-warning-bg',
    icon: 'text-notice-warning-icon',
  },
  error: { box: 'bg-notice-error-bg', icon: 'text-notice-error-icon' },
};

const ICON_PROPS = {
  'aria-hidden': true,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

// 形でも種類が分かるようにする(色だけに頼らない)
function VariantIcon({ variant }: { variant: NoticeVariant }) {
  const props = { ...ICON_PROPS, className: `size-6 shrink-0 ${VARIANT_CLASS[variant].icon}` };
  switch (variant) {
    case 'success':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10.5" />
          <path d="m8.5 12.5 2.5 2.5 4.5-5" />
        </svg>
      );
    case 'warning':
      return (
        <svg {...props}>
          <path d="M12 4 3 19.5h18L12 4Z" />
          <path d="M12 10v4.5M12 17.5v.01" />
        </svg>
      );
    case 'error':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10.5" />
          <path d="M12 7.5v5.5M12 16.5v.01" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10.5" />
          <path d="M12 11v5.5M12 7.5v.01" />
        </svg>
      );
  }
}

// 共通の案内メッセージ(09 §6 Notice)。左にアイコン、右に本文。長い文は折り返す。
// error だけ role="alert"(表示された時に読み上げる)。それ以外は静的な案内なので role を付けない
export function Notice({
  variant = 'info',
  title,
  children,
  action,
  onClose,
  className = '',
}: NoticeProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : undefined}
      className={`flex items-start gap-notice-gap rounded-notice px-notice-x py-notice-y text-sm/5 text-notice-text ${VARIANT_CLASS[variant].box} ${className}`}
    >
      <VariantIcon variant={variant} />
      <div className="min-w-0 flex-1 wrap-break-word">
        {title && <p className="font-bold">{title}</p>}
        <div className={title ? 'font-normal' : 'font-medium'}>{children}</div>
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={messages.common.close}
          className="-m-1 flex size-7 shrink-0 items-center justify-center rounded text-general-80 hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-100"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="size-4"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
