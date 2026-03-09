'use client';

import { X } from 'lucide-react';

const SUPPORT_EMAIL = 'support@devalocos.eu';

interface SupportContactModalProps {
  onClose: () => void;
  title?: string;
  message?: string;
}

export default function SupportContactModal({
  onClose,
  title = 'Request password change',
  message = 'Contact our support team to request a password change. We will assist you as soon as possible.',
}: SupportContactModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
        >
          {SUPPORT_EMAIL}
        </a>
      </div>
    </div>
  );
}
