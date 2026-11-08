import { messages } from '@/messages/ja';

// 読み込み中の形だけを示す灰色の帯。大きさは呼び出し側で指定する
export function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-general-40 ${className}`} />;
}

// 領域全体の読み込み表示。スクリーンリーダーには「読み込み中」と伝える
export function SkeletonLines({ count }: { count: number }) {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">{messages.common.loading}</span>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={`h-5 ${i === count - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}
