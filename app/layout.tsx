import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'DevBot Pro',
  description: 'AI Programming Chatbot with hybrid cloud/local capabilities',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="antialiased font-sans" suppressHydrationWarning>{children}</body>
    </html>
  );
}
