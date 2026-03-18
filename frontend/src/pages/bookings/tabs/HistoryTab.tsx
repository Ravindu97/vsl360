import { formatDateTime } from '@/utils/formatters';
import { STATUS_LABELS } from '@/utils/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Booking, BookingStatus } from '@/types';

interface Props {
  booking: Booking;
}

export function HistoryTab({ booking }: Props) {
  const history = booking.statusHistory ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status History</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <EmptyState title="No history" description="Status changes will appear here" />
        ) : (
          <div className="relative space-y-0">
            {history.map((entry, i) => (
              <div key={entry.id} className="flex gap-4 pb-6">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  {i < history.length - 1 && <div className="flex-1 w-px bg-border" />}
                </div>
                <div className="flex-1 -mt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.fromStatus && (
                      <>
                        <span className="text-sm text-muted-foreground">
                          {STATUS_LABELS[entry.fromStatus as BookingStatus] || entry.fromStatus}
                        </span>
                        <span className="text-muted-foreground">→</span>
                      </>
                    )}
                    <span className="text-sm font-medium">
                      {STATUS_LABELS[entry.toStatus as BookingStatus] || entry.toStatus}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateTime(entry.createdAt)}
                    {(entry.changedByName || entry.changedBy) && ` · ${entry.changedByName || entry.changedBy}`}
                  </p>
                  {entry.notes && <p className="text-sm mt-1">{entry.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
