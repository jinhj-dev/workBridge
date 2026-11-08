import type { Metadata } from 'next';
import { messages } from '@/messages/ja';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: `${messages.login.title} | ${messages.app.name}`,
};

export default function LoginPage() {
  return <LoginForm />;
}
