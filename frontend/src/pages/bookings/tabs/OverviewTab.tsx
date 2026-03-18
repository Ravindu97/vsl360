import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '@/api/bookings.api';
import { useAuthStore } from '@/store/authStore';
import { canEditBooking, canApproveDocuments } from '@/utils/permissions';
import { formatDate, formatDateTime } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { BookingStatus, type Booking } from '@/types';
import { STATUS_LABELS } from '@/utils/constants';

interface Props {
  booking: Booking;
}

const statusTransitions: Partial<Record<BookingStatus, BookingStatus[]>> = {
  [BookingStatus.INQUIRY_RECEIVED]: [BookingStatus.CLIENT_PROFILE_CREATED],
  [BookingStatus.CLIENT_PROFILE_CREATED]: [BookingStatus.PAX_DETAILS_ADDED],
  [BookingStatus.PAX_DETAILS_ADDED]: [BookingStatus.COSTING_COMPLETED],
  [BookingStatus.COSTING_COMPLETED]: [BookingStatus.SALES_CONFIRMED],
  [BookingStatus.SALES_CONFIRMED]: [BookingStatus.RESERVATION_PENDING, BookingStatus.TRANSPORT_PENDING],
  [BookingStatus.RESERVATION_PENDING]: [BookingStatus.RESERVATION_COMPLETED],
  [BookingStatus.TRANSPORT_PENDING]: [BookingStatus.TRANSPORT_COMPLETED],
  [BookingStatus.RESERVATION_COMPLETED]: [BookingStatus.TRANSPORT_PENDING],
  [BookingStatus.TRANSPORT_COMPLETED]: [BookingStatus.RESERVATION_PENDING],
  [BookingStatus.DOCUMENTS_READY]: [BookingStatus.OPS_APPROVED],
  [BookingStatus.OPS_APPROVED]: [BookingStatus.COMPLETED],
};

export function OverviewTab({ booking }: Props) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string>('');

  // Clear validation error when status changes
  useEffect(() => {
    setValidationError('');
  }, [newStatus]);

  let nextStatuses = statusTransitions[booking.status] ?? [];
  const canChangeStatus = user && (canEditBooking(user.role) || canApproveDocuments(user.role));

  // Add DOCUMENTS_READY only if both RESERVATION_COMPLETED and TRANSPORT_COMPLETED are in history
  const hasReservationCompleted = booking.statusHistory.some(
    (h) => h.toStatus === BookingStatus.RESERVATION_COMPLETED
  );
  const hasTransportCompleted = booking.statusHistory.some(
    (h) => h.toStatus === BookingStatus.TRANSPORT_COMPLETED
  );
  if (
    (booking.status === BookingStatus.RESERVATION_COMPLETED ||
      booking.status === BookingStatus.TRANSPORT_COMPLETED) &&
    hasReservationCompleted &&
    hasTransportCompleted
  ) {
    nextStatuses = [...nextStatuses, BookingStatus.DOCUMENTS_READY];
  }

  const statusMutation = useMutation({
    mutationFn: () => bookingsApi.updateStatus(booking.id, newStatus, notes || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      setNewStatus('');
      setNotes('');
      setValidationError('');
    },
  });

  // Validate before allowing status transition
  const canProceedWithStatusChange = () => {
    if (newStatus === BookingStatus.COSTING_COMPLETED && !booking.invoice) {
      setValidationError('❌ Invoice must be created before marking costing as completed. Create an invoice first.');
      return false;
    }
    if (newStatus === BookingStatus.SALES_CONFIRMED && !booking.invoice) {
      setValidationError('❌ Invoice must be created before confirming sales. Create an invoice first.');
      return false;
    }
    if (newStatus === BookingStatus.RESERVATION_COMPLETED && (!booking.hotelPlan || booking.hotelPlan.length === 0)) {
      setValidationError('❌ Hotel reservations must be completed before marking reservation as done. Add and complete hotel bookings first.');
      return false;
    }
    if (newStatus === BookingStatus.TRANSPORT_COMPLETED && !booking.transportPlan) {
      setValidationError('❌ Transport details must be added and completed before marking transport as done. Fill in transport details first.');
      return false;
    }
    return true;
  };

  const handleStatusUpdate = () => {
    if (canProceedWithStatusChange()) {
      statusMutation.mutate();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Tour Details</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Tour Month" value={booking.tourMonth} />
          <Row label="Duration" value={`${booking.numberOfDays} days`} />
          <Row label="Arrival" value={`${formatDate(booking.arrivalDate)} at ${booking.arrivalTime}`} />
          <Row label="Departure" value={`${formatDate(booking.departureDate)} at ${booking.departureTime}`} />
          <Row label="Sales Owner" value={booking.salesOwner?.name} />
          <Row label="Created" value={formatDateTime(booking.createdAt)} />
          {booking.additionalActivities && <Row label="Activities" value={booking.additionalActivities} />}
          {booking.specialCelebrations && <Row label="Celebrations" value={booking.specialCelebrations} />}
          {booking.generalNotes && <Row label="Notes" value={booking.generalNotes} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Quick Summary</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Pax Count" value={String(booking.paxList?.length ?? 0)} />
          <Row label="Hotel Nights" value={String(booking.hotelPlan?.length ?? 0)} />
          <Row label="Transport" value={booking.transportPlan ? 'Assigned' : 'Not assigned'} />
          <Row label="Invoice" value={booking.invoice ? booking.invoice.invoiceNumber : 'Not created'} />
          <Row label="Attachments" value={String(booking.attachments?.length ?? 0)} />
          <Row label="Documents" value={String(booking.documents?.length ?? 0)} />
        </CardContent>
      </Card>

      {canChangeStatus && nextStatuses.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Update Status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select next status" />
                </SelectTrigger>
                <SelectContent>
                  {nextStatuses.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                  <SelectItem value={BookingStatus.CANCELLED}>Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note about this status change..." />
            </div>
            {validationError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {validationError}
              </div>
            )}
            <Button
              disabled={!newStatus || statusMutation.isPending}
              onClick={handleStatusUpdate}
            >
              {statusMutation.isPending ? 'Updating...' : 'Update Status'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value || '—'}</span>
    </div>
  );
}
