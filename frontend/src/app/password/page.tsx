import type { Metadata } from 'next';
import { messages } from '@/messages/ja';
import { PasswordChangeForm } from './PasswordChangeForm';

export const metadata: Metadata = {
  title: `${messages.password.title} | ${messages.app.name}`,
};

export default function PasswordPage() {
  return <PasswordChangeForm />;
}
