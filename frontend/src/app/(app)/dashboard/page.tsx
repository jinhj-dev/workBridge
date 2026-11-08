import type { Metadata } from 'next';
import { messages } from '@/messages/ja';
import { DashboardView } from './DashboardView';

export const metadata: Metadata = {
  title: `${messages.dashboard.title} | ${messages.app.name}`,
};

export default function DashboardPage() {
  return <DashboardView />;
}
