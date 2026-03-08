'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Package,
  Users,
  Receipt,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Building2,
  TrendingDown,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  onClose?: () => void;
  userRole?: string;
  businessName?: string;
}

export default function Sidebar({ onClose, userRole, businessName }: SidebarProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/inventory', label: t('inventory'), icon: Package },
    { href: '/clients', label: t('clients'), icon: Users },
    { href: '/invoices', label: t('invoices'), icon: Receipt },
    { href: '/costs', label: t('costs'), icon: TrendingDown },
    { href: '/analytics', label: t('analytics'), icon: BarChart3 },
    { href: '/reports', label: t('reports'), icon: FileText },
  ];

  const adminItems =
    userRole === 'master_admin' || userRole === 'business_admin'
      ? [{ href: '/users', label: t('users'), icon: Users }]
      : [];

  return (
    <div className="flex h-full flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-foreground">MyERP</span>
            {businessName && (
              <p className="text-xs text-muted-foreground truncate max-w-[120px]">{businessName}</p>
            )}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'nav-item',
                isActive && 'active'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}

        {adminItems.length > 0 && (
          <>
            <div className="my-3 border-t border-border" />
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
              Διαχείριση
            </p>
            {adminItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn('nav-item', isActive && 'active')}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-border px-3 py-4 space-y-1">
        <Link
          href="/settings"
          onClick={onClose}
          className={cn('nav-item', pathname === '/settings' && 'active')}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          <span>{t('settings')}</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="nav-item w-full text-left text-red-400/80 hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span>Αποσύνδεση</span>
        </button>
      </div>
    </div>
  );
}
