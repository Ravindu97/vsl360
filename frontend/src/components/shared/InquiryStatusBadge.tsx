import { QuoteStatus } from '@/types';
import { QUOTE_STATUS_COLORS, QUOTE_STATUS_LABELS } from '@/utils/inquiryLabels';
import { cn } from '@/lib/utils';

interface InquiryStatusBadgeProps {
  status: QuoteStatus;
  className?: string;
}

export function InquiryStatusBadge({ status, className }: InquiryStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        QUOTE_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700',
        className,
      )}
    >
      {QUOTE_STATUS_LABELS[status] ?? status}
    </span>
  );
}
