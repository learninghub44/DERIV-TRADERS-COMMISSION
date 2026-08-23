import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DERIV TECH - Your Deriv API Business, All in One Dashboard',
  description: 'Track markup, commissions, trading activity and earnings from your Deriv-powered applications. Independent analytics platform for Deriv API application operators.',
  keywords: ['Deriv', 'API', 'partner', 'markup', 'commission', 'analytics', 'trading'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
