import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '@/api/bookings.api';
import { useAuthStore } from '@/store/authStore';
import { canEditBooking, canApproveDocuments, canAdvanceToReservationStatuses, canAdvanceToTransportStatuses, canAdvanceToCosting, canAdvanceToDocumentsReady } from '@/utils/permissions';
import { formatDate, formatDateTime, formatCurrency } from '@/utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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

  const isStatusAllowedByRole = (status: BookingStatus) => {
    if (!user) return false;

    if (
      status === BookingStatus.RESERVATION_PENDING ||
      status === BookingStatus.RESERVATION_COMPLETED
    ) {
      return canAdvanceToReservationStatuses(user.role);
    }

    if (
      status === BookingStatus.TRANSPORT_PENDING ||
      status === BookingStatus.TRANSPORT_COMPLETED
    ) {
      return canAdvanceToTransportStatuses(user.role);
    }

    if (status === BookingStatus.COSTING_COMPLETED || status === BookingStatus.SALES_CONFIRMED) {
      return canAdvanceToCosting(user.role);
    }

    if (status === BookingStatus.DOCUMENTS_READY) {
      return canAdvanceToDocumentsReady(user.role);
    }

    return true;
  };

  // Filter statuses based on user role
  if (user) {
    nextStatuses = nextStatuses.filter((status) => isStatusAllowedByRole(status));
  }

  // Revert one stage: allow going back to the immediate previous status from audit history.
  const latestTransitionIntoCurrent = booking.statusHistory.find(
    (entry) => entry.toStatus === booking.status && Boolean(entry.fromStatus)
  );
  const previousStatus = latestTransitionIntoCurrent?.fromStatus;
  const revertStatus = previousStatus && user && isStatusAllowedByRole(previousStatus)
    ? previousStatus
    : undefined;

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
    if (newStatus === BookingStatus.RESERVATION_COMPLETED) {
      const unconfirmedHotels = (booking.hotelPlan ?? []).filter((hotel) => hotel.confirmationStatus !== 'CONFIRMED');
      if (unconfirmedHotels.length > 0) {
        setValidationError(`❌ All hotel bookings must be confirmed before marking reservation as complete. ${unconfirmedHotels.length} night(s) still pending.`);
        return false;
      }
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
    <div className="space-y-6">
      {/* Row 1: Tour Details + Client */}
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
          <CardHeader><CardTitle>Client & Passengers</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Guest Name" value={booking.client?.name} />
            <Row label="Citizenship" value={booking.client?.citizenship} />
            <Row label="Language Preference" value={booking.client?.languagePreference} />
            <Row label="Email" value={booking.client?.email} />
            <Row label="Contact" value={booking.client?.contactNumber} />
            <Divider />
            <Row label="Total Pax" value={String((booking.paxList?.length ?? 0) + (booking.client ? 1 : 0))} />
            <Row label="Adults" value={String((booking.paxList?.filter(p => p.type === 'ADULT').length ?? 0) + (booking.client ? 1 : 0))} />
            <Row label="Children" value={String(booking.paxList?.filter(p => p.type === 'CHILD').length ?? 0)} />
            <Row label="Infants" value={String(booking.paxList?.filter(p => p.type === 'INFANT').length ?? 0)} />
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Hotels + Transport */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Hotels</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {booking.hotelPlan && booking.hotelPlan.length > 0 ? (
              <>
                <Row label="Total Nights" value={String(booking.hotelPlan.length)} />
                <Row label="Confirmed" value={String(booking.hotelPlan.filter(h => h.confirmationStatus === 'CONFIRMED').length)} />
                <Row label="Pending" value={String(booking.hotelPlan.filter(h => h.confirmationStatus !== 'CONFIRMED').length)} />
                <Divider />
                {booking.hotelPlan.map((h) => (
                  <div key={h.id} className="flex justify-between">
                    <span className="text-muted-foreground">Night {h.nightNumber}</span>
                    <span className="font-medium text-right max-w-[60%] truncate">
                      {h.hotelName}
                      <span className="ml-1.5 text-xs text-muted-foreground">({h.roomCategory})</span>
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-muted-foreground">No hotel bookings yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Transport</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {booking.transportPlan ? (
              <>
                <Row label="Vehicle" value={booking.transportPlan.vehicleModel} />
                {booking.transportPlan.vehicleIdNumber && <Row label="Vehicle ID" value={booking.transportPlan.vehicleIdNumber} />}
                <Row label="Driver" value={booking.transportPlan.driverName || '—'} />
                <Row label="Driver Language" value={booking.transportPlan.driverLanguage} />
                <Divider />
                {booking.transportPlan.arrivalPickupLocation && <Row label="Arrival Pickup" value={booking.transportPlan.arrivalPickupLocation} />}
                {booking.transportPlan.departureDropLocation && <Row label="Departure Drop" value={booking.transportPlan.departureDropLocation} />}
                <Divider />
                {booking.transportPlan.babySeatRequired && <Row label="Baby Seat" value="Required" />}
                {booking.transportPlan.wheelchairRequired && <Row label="Wheelchair" value="Required" />}
                <Row label="Day Plans" value={`${booking.transportPlan.dayPlans?.length ?? 0} days`} />
              </>
            ) : (
              <p className="text-muted-foreground">No transport assigned yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Invoice + Docs/Attachments */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Invoice</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {booking.invoice ? (
              <>
                <Row label="Invoice No" value={booking.invoice.invoiceNumber} />
                <Row label="Invoice Date" value={formatDate(booking.invoice.invoiceDate)} />
                <Row label="Cost / Person" value={formatCurrency(booking.invoice.costPerPerson)} />
                <Row label="Total Amount" value={formatCurrency(booking.invoice.totalAmount)} />
                <Divider />
                <Row label="Advance Paid" value={formatCurrency(booking.invoice.advancePaid)} />
                <Row label="Balance Due" value={formatCurrency(booking.invoice.balanceAmount)} />
              </>
            ) : (
              <p className="text-muted-foreground">No invoice created yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Documents & Attachments</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Generated Documents" value={String(booking.documents?.length ?? 0)} />
            <Row label="Attachments" value={String(booking.attachments?.length ?? 0)} />
          </CardContent>
        </Card>
      </div>

      {canChangeStatus && (nextStatuses.length > 0 || Boolean(revertStatus)) && (
        <Card>
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
                  {revertStatus && (
                    <SelectItem value={revertStatus}>
                      {`Revert to ${STATUS_LABELS[revertStatus]}`}
                    </SelectItem>
                  )}
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

function Divider() {
  return <div className="border-t border-border" />;
}
