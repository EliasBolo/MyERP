import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import { el, enUS } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency = 'EUR',
  locale = 'el-GR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string, locale = 'el'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: locale === 'el' ? el : enUS });
}

export function formatDateTime(date: Date | string, locale = 'el'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM/yyyy HH:mm', { locale: locale === 'el' ? el : enUS });
}

export function formatRelativeTime(date: Date | string, locale = 'el'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, {
    addSuffix: true,
    locale: locale === 'el' ? el : enUS,
  });
}

export function generateCode(prefix: string, num: number): string {
  return `${prefix}${String(num).padStart(5, '0')}`;
}

export function calculateVAT(amount: number, vatRate: number): number {
  return amount * (vatRate / 100);
}

export function calculateTotal(subtotal: number, vatAmount: number): number {
  return subtotal + vatAmount;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

export function getStockStatus(
  current: number,
  min: number,
  max?: number | null
): 'critical' | 'low' | 'normal' | 'high' {
  if (current <= 0) return 'critical';
  if (current <= min) return 'low';
  if (max && current >= max * 0.9) return 'high';
  return 'normal';
}

export function getInvoiceStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return 'text-green-400 bg-green-400/10';
    case 'overdue':
      return 'text-red-400 bg-red-400/10';
    case 'sent':
      return 'text-blue-400 bg-blue-400/10';
    case 'draft':
      return 'text-gray-400 bg-gray-400/10';
    case 'cancelled':
      return 'text-gray-500 bg-gray-500/10';
    default:
      return 'text-gray-400 bg-gray-400/10';
  }
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function parseCSVNumber(val: string): number {
  const cleaned = val.replace(/[^\d.,-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}
