import type { Metadata } from 'next';
import { Suspense } from 'react';
import { messages } from '@/messages/ja';
import { AttendanceLoading } from './AttendanceLoading';
import { AttendanceView } from './AttendanceView';

export const metadata: Metadata = {
  title: `${messages.attendance.title} | ${messages.app.name}`,
};

export default function AttendancePage() {
  // useSearchParams を使う画面は Suspense の内側に置く(cacheComponents の要件)
  return (
    <Suspense fallback={<AttendanceLoading />}>
      <AttendanceView />
    </Suspense>
  );
}
