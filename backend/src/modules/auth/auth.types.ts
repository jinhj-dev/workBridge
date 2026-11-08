import type { Request } from 'express';
import type { Role } from '../../generated/prisma/client.js';

// ログイン応答と /auth/me で返す、認証済みユーザーの情報
export interface AuthUser {
  id: string;
  name: string;
  empId: string;
  role: Role;
  departmentName: string | null;
  approvalRequired: boolean;
  mustChangePassword: boolean;
}

// 認証 Guard が user を載せたリクエスト
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
