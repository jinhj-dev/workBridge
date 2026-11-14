import { Badge, type BadgeVariant } from '@/components/Badge';
import type { JobTitleTone } from '@/lib/api/types';
import { messages } from '@/messages/ja';

// 役職の色(tone)の単一定義。パレットの表示順・バッジ配色(色名は messages.jobTitles.tones)・色見本(スウォッチ)をここに集める
export const JOB_TITLE_TONES: readonly {
  tone: JobTitleTone;
  variant: BadgeVariant;
  swatchClass: string;
}[] = [
  { tone: 'VIOLET', variant: 'violet', swatchClass: 'bg-violet-100' },
  { tone: 'BLUE', variant: 'info', swatchClass: 'bg-primary-100' },
  { tone: 'GRAY', variant: 'neutral', swatchClass: 'bg-general-60' },
  { tone: 'LAVENDER', variant: 'lavender', swatchClass: 'bg-lavender-100' },
  { tone: 'GREEN', variant: 'positive', swatchClass: 'bg-success-100' },
  { tone: 'YELLOW', variant: 'yellow', swatchClass: 'bg-yellow-100' },
  { tone: 'ORANGE', variant: 'caution', swatchClass: 'bg-warning-100' },
  { tone: 'PINK', variant: 'pink', swatchClass: 'bg-pink-100' },
];

export function badgeVariantOf(tone: JobTitleTone): BadgeVariant {
  return JOB_TITLE_TONES.find((item) => item.tone === tone)?.variant ?? 'neutral';
}

// 役職バッジ(pill)。未設定は「—」
export function JobTitleBadge({
  jobTitle,
}: {
  jobTitle: { name: string; tone: JobTitleTone } | null;
}) {
  if (!jobTitle) return <>{messages.common.noValue}</>;
  return (
    <Badge variant={badgeVariantOf(jobTitle.tone)} shape="pill">
      {jobTitle.name}
    </Badge>
  );
}
