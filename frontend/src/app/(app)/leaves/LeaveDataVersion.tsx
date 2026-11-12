'use client';

import { createContext, useContext } from 'react';

interface LeaveDataVersionValue {
  // 休暇の申請などでデータが変わるたびに増える。各タブは値が変わったら再取得する
  version: number;
  bump: () => void;
}

export const LeaveDataVersionContext = createContext<LeaveDataVersionValue>({
  version: 0,
  bump: () => {},
});

export function useLeaveDataVersion(): LeaveDataVersionValue {
  return useContext(LeaveDataVersionContext);
}
