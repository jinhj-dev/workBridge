import { formatTokyoDateTime } from '../../common/time/tokyo-date.js';
import { SYSTEM_DEPARTMENT_CODE } from './department.constants.js';

// 部署責任者(id・empId・name のみ)
export interface DepartmentManager {
  id: string;
  empId: string;
  name: string;
}

// リポジトリが返す部署と所属人数
export interface DepartmentRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  manager: DepartmentManager | null;
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
  description: string | null;
  manager: DepartmentManager | null;
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
    description: row.description,
    manager: row.manager,
    memberCount: row.memberCount,
    inactiveMemberCount: row.inactiveMemberCount,
    isSystem: row.code === SYSTEM_DEPARTMENT_CODE,
    createdAt: formatTokyoDateTime(row.createdAt),
    updatedAt: formatTokyoDateTime(row.updatedAt),
  };
}

// docs/06 API-DEPT-007 の部署要約
export interface DepartmentSummary {
  departmentCount: number;
  memberCount: number;
}

// docs/06 API-DEPT-008 の所属社員
export interface DepartmentMember {
  id: string;
  empId: string;
  name: string;
}
