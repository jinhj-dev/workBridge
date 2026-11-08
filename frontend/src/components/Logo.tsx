import { messages } from '@/messages/ja';

// workBridge のロゴ(橋のアーチを図案化したマーク + ワードマーク)
export function Logo() {
  return (
    <div className="flex items-center gap-2 text-primary-100">
      <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className="size-8">
        <path d="M3 10h26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path
          d="M6 10v4a10 10 0 0 0 20 0v-4"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M16 24v-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="text-xl font-bold tracking-tight">{messages.app.name}</span>
    </div>
  );
}
