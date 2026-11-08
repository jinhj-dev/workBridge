// Playwright で使う E2E 専用アカウント。spec はこのファイルだけを参照する。
// 社員番号は backend/prisma/e2e-account-data.ts の E2E_ACCOUNTS と同じ値にすること
// (パッケージが分かれているため import では共有しない)。
export const E2E_ADMIN = {
  empId: '900001',
  password: process.env.E2E_ADMIN_PASSWORD ?? '',
};

export const E2E_INITIAL_USER = {
  empId: '900002',
  password: process.env.E2E_INITIAL_PASSWORD ?? '',
};
