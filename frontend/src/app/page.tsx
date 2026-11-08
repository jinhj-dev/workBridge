'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/client';
import { messages } from '@/messages/ja';

type HealthState = 'checking' | 'ok' | 'error';

// 開発環境の確認用ページ。画面の実装は別作業で行う。
export default function Home() {
  const [health, setHealth] = useState<HealthState>('checking');

  useEffect(() => {
    apiFetch<{ status: 'ok' }>('/health')
      .then(() => setHealth('ok'))
      .catch(() => setHealth('error'));
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-bold">{messages.app.name}</h1>
      <p>
        {messages.health.label}: {messages.health[health]}
      </p>
    </main>
  );
}
