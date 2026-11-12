import { messages } from '@/messages/ja';

const tokyoHourFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Tokyo',
  hour: 'numeric',
  hourCycle: 'h23',
});

// 東京の時刻で挨拶を決める(5〜10時 / 11〜17時 / それ以外)
export function greetingOf(now: Date): string {
  const hour = Number(tokyoHourFormatter.format(now));
  const t = messages.dashboard.greeting;
  if (hour >= 5 && hour <= 10) return t.morning;
  if (hour >= 11 && hour <= 17) return t.afternoon;
  return t.evening;
}
