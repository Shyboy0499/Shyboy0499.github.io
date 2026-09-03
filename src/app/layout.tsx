import type { Metadata } from 'next';
import { Inter, EB_Garamond } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const serif = EB_Garamond({ subsets: ['latin'], weight: ['400', '500'], style: ['normal', 'italic'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'Shyboy0499 — UTS · DeepSeek / LLM / ML',
  description: 'Year-2 computer science student at UTS exploring DeepSeek, LLMs and machine learning — learning by building and shipping open source.',
  openGraph: {
    title: 'Shyboy0499 — UTS · DeepSeek / LLM / ML',
    description: 'Year-2 CS @ UTS, exploring DeepSeek, LLMs & machine learning.',
    url: 'https://shyboy0499.github.io',
    siteName: 'Shyboy0499',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
