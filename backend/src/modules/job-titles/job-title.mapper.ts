import { formatTokyoDateTime } from '../../common/time/tokyo-date.js';
import type { JobTitleTone } from '../../generated/prisma/client.js';

export interface JobTitleRow {
  id: string;
  name: string;
  tone: JobTitleTone;
  createdAt: Date;
  updatedAt: Date;
  userCount: number;
}

// docs/06 API-JOB-001 の JobTitle
export interface JobTitleDetail {
  id: string;
  name: string;
  tone: JobTitleTone;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export function toJobTitleDetail(row: JobTitleRow): JobTitleDetail {
  return {
    id: row.id,
    name: row.name,
    tone: row.tone,
    userCount: row.userCount,
    createdAt: formatTokyoDateTime(row.createdAt),
    updatedAt: formatTokyoDateTime(row.updatedAt),
  };
}
