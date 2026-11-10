import { Spinner } from '@/components/Spinner';
import { messages } from '@/messages/ja';

// 出勤簿の読み込み中(Suspense の fallback と画面幅の判定前で共通)
export function AttendanceLoading() {
  return (
    <div role="status" className="flex justify-center py-10 text-primary-100">
      <Spinner />
      <span className="sr-only">{messages.common.loading}</span>
    </div>
  );
}
