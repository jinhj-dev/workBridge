'use client';

import { useMediaQuery } from '@/lib/useMediaQuery';
import { AttendanceHistoryView } from './AttendanceHistoryView';
import { AttendanceLoading } from './AttendanceLoading';
import { AttendanceSheetView } from './AttendanceSheetView';

// Tailwind の md(768px)と同じ値。これ以上は出勤簿、未満は旧来の勤怠一覧を表示する
const DESKTOP_QUERY = '(min-width: 768px)';

// SCR-003。画面幅で表示を切り替え、必ず片方だけをマウントする(不要な API 呼び出しを避ける)
export function AttendanceView() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  if (isDesktop === null) return <AttendanceLoading />;
  return isDesktop ? <AttendanceSheetView /> : <AttendanceHistoryView />;
}
