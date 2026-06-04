import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Bro Code — Developer & Creative Technologist',
  description: 'Full-stack developer building immersive web experiences with Next.js, Three.js, Babylon.js, and creative coding.',
  openGraph: {
    title: 'Bro Code — Developer & Creative',
    description: 'Building immersive web experiences with modern web technologies.',
    url: 'https://shyboy0499.github.io',
    siteName: 'Bro Code Portfolio',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-black text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
