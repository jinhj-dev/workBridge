import { secondaryButtonClass } from '@/components/form';
import { Notice } from '@/components/Notice';
import { messages } from '@/messages/ja';

// 03 共通規則「Error(照会失敗)」: 領域の中に失敗の文言と[再試行]を出す。見た目は共通の Notice(error)
export function SectionError({
  onRetry,
  message = messages.common.loadError,
}: {
  onRetry: () => void;
  // 省略時は共通の読み込み失敗文言
  message?: string;
}) {
  return (
    <Notice
      variant="error"
      action={
        <button
          type="button"
          onClick={onRetry}
          className={`${secondaryButtonClass} h-9 px-4 text-sm/5`}
        >
          {messages.common.retry}
        </button>
      }
    >
      {message}
    </Notice>
  );
}
