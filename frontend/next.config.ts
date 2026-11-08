import type { NextConfig } from 'next';

// API の転送先(サーバー専用。ビルド時の値が使われる)
const backendUrl = process.env.BACKEND_URL;
if (!backendUrl) {
  throw new Error('BACKEND_URL が設定されていません。frontend/.env.local を確認してください。');
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  // ブラウザは同一オリジンの /api/v1/* を呼び、Next.js がバックエンドへ転送する
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${backendUrl}/api/v1/:path*` }];
  },
};

export default nextConfig;
