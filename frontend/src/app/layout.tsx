import type { Metadata } from 'next';
import { Inter, Noto_Sans_JP } from 'next/font/google';
import { ToastProvider } from '@/components/Toast';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { messages } from '@/messages/ja';
import './globals.css';

// 英数字は Inter、日本語は Noto Sans JP で表示する
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const notoSansJp = Noto_Sans_JP({
  variable: '--font-noto-sans-jp',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: messages.app.name,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJp.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
