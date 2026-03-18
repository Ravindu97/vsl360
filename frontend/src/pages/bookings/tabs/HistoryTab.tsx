import { formatDateTime } from '@/utils/formatters';
import { STATUS_LABELS } from '@/utils/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { BookingStatus, type Booking } from '@/types';

interface Props {
  booking: Booking;
}

const STATUS_ORDER: BookingStatus[] = [
  BookingStatus.INQUIRY_RECEIVED,
  BookingStatus.CLIENT_PROFILE_CREATED,
  BookingStatus.PAX_DETAILS_ADDED,
  BookingStatus.COSTING_COMPLETED,
  BookingStatus.SALES_CONFIRMED,
  BookingStatus.RESERVATION_PENDING,
  BookingStatus.RESERVATION_COMPLETED,
  BookingStatus.TRANSPORT_PENDING,
  BookingStatus.TRANSPORT_COMPLETED,
  BookingStatus.DOCUMENTS_READY,
  BookingStatus.OPS_APPROVED,
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
];

function isRevertEntry(fromStatus?: BookingStatus, toStatus?: BookingStatus): boolean {
  if (!fromStatus || !toStatus) return false;
  const fromIndex = STATUS_ORDER.indexOf(fromStatus);
  const toIndex = STATUS_ORDER.indexOf(toStatus);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex < fromIndex;
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
                  <div
                    className={`h-3 w-3 rounded-full ${
                      isRevertEntry(entry.fromStatus as BookingStatus | undefined, entry.toStatus as BookingStatus | undefined)
                        ? 'bg-amber-500'
                        : 'bg-primary'
                    }`}
                  />
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
                    {isRevertEntry(entry.fromStatus as BookingStatus | undefined, entry.toStatus as BookingStatus | undefined) && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Reverted
                      </span>
                    )}
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
