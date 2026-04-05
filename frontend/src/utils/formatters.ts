import { format, parseISO } from 'date-fns';

const currencyLocaleMap: Record<string, string> = {
  EUR: 'de-DE',
  USD: 'en-US',
  INR: 'en-IN',
};

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd MMM yyyy');
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd MMM yyyy, HH:mm');
}

export function formatCurrency(amount: number | string, currency: 'EUR' | 'USD' | 'INR' = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const locale = currencyLocaleMap[currency] ?? 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(num);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
