import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import SessionProviderWrapper from '@/components/providers/SessionProviderWrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'MyERP - Devalocos',
  description: 'ERP system for inventory, clients, invoices, costs, and business management. By Devalocos.',
  openGraph: {
    title: 'MyERP - Devalocos',
    description: 'ERP system for inventory, clients, invoices, costs, and business management. By Devalocos.',
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f172a',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body>
        <SessionProviderWrapper>
          <NextIntlClientProvider messages={messages} locale={locale}>
            {children}
          </NextIntlClientProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
