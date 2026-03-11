import { BookingStatus } from '@/types';
import { STATUS_LABELS, STATUS_COLORS } from '@/utils/constants';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_COLORS[status] || 'bg-gray-100 text-gray-700',
        className
      )}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
