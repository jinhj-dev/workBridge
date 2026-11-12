import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { Spinner } from '@/components/Spinner';
import { messages } from '@/messages/ja';
import { LeaveManagementLayout } from './LeaveManagementLayout';

export default function LeavesLayout({ children }: { children: ReactNode }) {
  // useSearchParams を使う子画面があるため Suspense の内側に置く(cacheComponents の要件)
  return (
    <Suspense
      fallback={
        <div role="status" className="flex justify-center py-10 text-primary-100">
          <Spinner />
          <span className="sr-only">{messages.common.loading}</span>
        </div>
      }
    >
      <LeaveManagementLayout>{children}</LeaveManagementLayout>
    </Suspense>
  );
}
