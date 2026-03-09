'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Menu, Bell, Globe, ChevronDown, User, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import SupportContactModal from '@/components/auth/SupportContactModal';

interface HeaderProps {
  onMenuClick: () => void;
  onLocaleChange: (locale: string) => void;
  currentLocale: string;
}

export default function Header({ onMenuClick, onLocaleChange, currentLocale }: HeaderProps) {
  const { data: session } = useSession();
  const t = useTranslations();
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const user = session?.user as any;

  const roleLabels: Record<string, string> = {
    master_admin: 'Κεντρικός Διαχ.',
    business_admin: 'Διαχειριστής',
    user: 'Χρήστης',
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-sm px-4 sm:px-6">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Language switcher */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:block font-medium uppercase">{currentLocale}</span>
            <ChevronDown className={cn('h-3 w-3 transition-transform', langOpen && 'rotate-180')} />
          </button>
          {langOpen && (
            <div className="absolute right-0 top-full mt-1 rounded-lg border border-border bg-popover shadow-lg overflow-hidden z-50">
              <button
                onClick={() => { onLocaleChange('el'); setLangOpen(false); }}
                className={cn(
                  'flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors',
                  currentLocale === 'el' ? 'text-primary font-medium' : 'text-foreground'
                )}
              >
                <span>🇬🇷</span> Ελληνικά
              </button>
              <button
                onClick={() => { onLocaleChange('en'); setLangOpen(false); }}
                className={cn(
                  'flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors',
                  currentLocale === 'en' ? 'text-primary font-medium' : 'text-foreground'
                )}
              >
                <span>🇬🇧</span> English
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <button className="relative rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-500" />
        </button>

        {/* User profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-foreground leading-none">{user?.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {roleLabels[user?.role] || 'Χρήστης'}
              </p>
            </div>
            <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', profileOpen && 'rotate-180')} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-border bg-popover shadow-lg overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
              </div>
              <div className="py-1">
                <a
                  href="/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  onClick={() => setProfileOpen(false)}
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Προφίλ & Ρυθμίσεις
                </a>
                <button
                  type="button"
                  onClick={() => { setShowSupportModal(true); setProfileOpen(false); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  {t('auth.requestPasswordChange')}
                </button>
              </div>
            </div>
          )}

          {showSupportModal && (
            <SupportContactModal
              onClose={() => setShowSupportModal(false)}
              title={t('auth.requestPasswordChange')}
              message={t('auth.requestPasswordChangeMessage')}
            />
          )}
        </div>
      </div>
    </header>
  );
}
