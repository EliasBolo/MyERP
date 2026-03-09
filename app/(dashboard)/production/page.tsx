'use client';

import { useTranslations } from 'next-intl';
import { Factory } from 'lucide-react';

export default function ProductionPage() {
  const t = useTranslations('production');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Factory className="h-7 w-7" />
          {t('title')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('comingSoon')}</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">{t('placeholder')}</p>
      </div>
    </div>
  );
}
