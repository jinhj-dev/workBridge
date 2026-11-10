import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Spinner } from '@/components/Spinner';
import { messages } from '@/messages/ja';
import { LeavesView } from './LeavesView';

export const metadata: Metadata = {
  title: `${messages.leaves.title} | ${messages.app.name}`,
};

export default function LeavesPage() {
  // useSearchParams を使う画面は Suspense の内側に置く(cacheComponents の要件)
  return (
    <Suspense
      fallback={
        <div role="status" className="flex justify-center py-10 text-primary-100">
          <Spinner />
          <span className="sr-only">{messages.common.loading}</span>
        </div>
      }
    >
      <LeavesView />
    </Suspense>
  );
}
