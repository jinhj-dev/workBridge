import { ErrorIcon, secondaryButtonClass } from '@/components/form';
import { messages } from '@/messages/ja';

// 03 共通規則「Error(照会失敗)」: 領域の中に失敗の文言と[再試行]を出す
export function SectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p role="alert" className="flex items-start gap-1.5 text-sm/5 text-general-100">
        <ErrorIcon />
        {messages.common.loadError}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={`${secondaryButtonClass} h-9 px-4 text-sm/5`}
      >
        {messages.common.retry}
      </button>
    </div>
  );
}
