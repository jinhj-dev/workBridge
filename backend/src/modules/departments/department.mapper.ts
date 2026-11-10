import { formatTokyoDateTime } from '../../common/time/tokyo-date.js';
import { SYSTEM_DEPARTMENT_CODE } from './department.constants.js';

// リポジトリが返す部署と所属人数
export interface DepartmentRow {
  id: string;
  code: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
  inactiveMemberCount: number;
}

// docs/06 API-DEPT-002 の DepartmentDetail
export interface DepartmentDetail {
  id: string;
  code: string;
  name: string;
  memberCount: number;
  inactiveMemberCount: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toDepartmentDetail(row: DepartmentRow): DepartmentDetail {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    memberCount: row.memberCount,
    inactiveMemberCount: row.inactiveMemberCount,
    isSystem: row.code === SYSTEM_DEPARTMENT_CODE,
    createdAt: formatTokyoDateTime(row.createdAt),
    updatedAt: formatTokyoDateTime(row.updatedAt),
  };
}
