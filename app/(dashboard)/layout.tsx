'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SessionProvider } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [locale, setLocale] = useState('el');

  useEffect(() => {
    const cookieLocale = document.cookie
      .split(';')
      .find((c) => c.trim().startsWith('locale='))
      ?.split('=')[1];
    setLocale(cookieLocale || 'el');
  }, []);

  function handleLocaleChange(newLocale: string) {
    document.cookie = `locale=${newLocale};path=/;max-age=31536000`;
    setLocale(newLocale);
    window.location.reload();
  }

  const user = session?.user as any;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-60 lg:flex-col lg:flex-shrink-0">
        <Sidebar userRole={user?.role} businessName={user?.businessName} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72">
            <Sidebar
              onClose={() => setSidebarOpen(false)}
              userRole={user?.role}
              businessName={user?.businessName}
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          onLocaleChange={handleLocaleChange}
          currentLocale={locale}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DashboardContent>{children}</DashboardContent>
    </SessionProvider>
  );
}
