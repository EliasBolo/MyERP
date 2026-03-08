import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'MyERP - Σύστημα Διαχείρισης Επιχείρησης',
    template: '%s | MyERP',
  },
  description: 'Ολοκληρωμένο σύστημα ERP για διαχείριση αποθήκης, πελατών και οικονομικών',
  manifest: '/manifest.json',
  themeColor: '#0f172a',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
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
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
