import type { InquirySlaStatus } from '@/types';
import { cn } from '@/lib/utils';

interface SlaBadgeProps {
  slaStatus: InquirySlaStatus;
  className?: string;
}

export function SlaBadge({ slaStatus, className }: SlaBadgeProps) {
  if (slaStatus === 'none') return null;

  const label = slaStatus === 'overdue' ? 'Overdue' : 'Within SLA';
  const colors =
    slaStatus === 'overdue'
      ? 'bg-red-100 text-red-800'
      : 'bg-emerald-100 text-emerald-800';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colors,
        className,
      )}
    >
      {label}
    </span>
  );
}
