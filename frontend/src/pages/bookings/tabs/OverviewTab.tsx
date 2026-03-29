import { useState, useEffect, Fragment } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Pencil, Save, X } from 'lucide-react';
import { bookingsApi } from '@/api/bookings.api';
import { useAuthStore } from '@/store/authStore';
import { canEditBooking, canApproveDocuments, canAdvanceToReservationStatuses, canAdvanceToTransportStatuses, canAdvanceToCosting, canAdvanceToDocumentsReady } from '@/utils/permissions';
import { formatDate, formatDateTime, formatCurrency } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const PIPELINE_STEPS = [
  { label: 'Inquiry', completedWhen: [BookingStatus.INQUIRY_RECEIVED], activeWhen: [BookingStatus.INQUIRY_RECEIVED] },
  { label: 'Client', completedWhen: [BookingStatus.CLIENT_PROFILE_CREATED], activeWhen: [BookingStatus.CLIENT_PROFILE_CREATED] },
  { label: 'Pax', completedWhen: [BookingStatus.PAX_DETAILS_ADDED], activeWhen: [BookingStatus.PAX_DETAILS_ADDED] },
  { label: 'Costing', completedWhen: [BookingStatus.COSTING_COMPLETED], activeWhen: [BookingStatus.COSTING_COMPLETED] },
  { label: 'Sales', completedWhen: [BookingStatus.SALES_CONFIRMED], activeWhen: [BookingStatus.SALES_CONFIRMED] },
  { label: 'Hotels', completedWhen: [BookingStatus.RESERVATION_COMPLETED], activeWhen: [BookingStatus.RESERVATION_PENDING, BookingStatus.RESERVATION_COMPLETED] },
  { label: 'Transport', completedWhen: [BookingStatus.TRANSPORT_COMPLETED], activeWhen: [BookingStatus.TRANSPORT_PENDING, BookingStatus.TRANSPORT_COMPLETED] },
  { label: 'Docs', completedWhen: [BookingStatus.DOCUMENTS_READY], activeWhen: [BookingStatus.DOCUMENTS_READY] },
  { label: 'Approved', completedWhen: [BookingStatus.OPS_APPROVED], activeWhen: [BookingStatus.OPS_APPROVED] },
  { label: 'Done', completedWhen: [BookingStatus.COMPLETED], activeWhen: [BookingStatus.COMPLETED] },
];

export function OverviewTab({ booking }: Props) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string>('');
  const [editingTour, setEditingTour] = useState(false);
  const allowEdit = user && canEditBooking(user.role);

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
      {/* Booking Progress & Status */}
      <Card>
        <CardContent className="pt-6">
          <StatusPipeline booking={booking} />
          {canChangeStatus && (nextStatuses.length > 0 || Boolean(revertStatus)) && (
            <div className="border-t mt-5 pt-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Advance to</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Select next status" />
                    </SelectTrigger>
                    <SelectContent>
                      {nextStatuses.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                      {revertStatus && (
                        <SelectItem value={revertStatus}>
                          ↩ Revert to {STATUS_LABELS[revertStatus]}
                        </SelectItem>
                      )}
                      <SelectItem value={BookingStatus.CANCELLED}>Cancel Booking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note about this change..." />
                </div>
                <Button
                  disabled={!newStatus || statusMutation.isPending}
                  onClick={handleStatusUpdate}
                  size="sm"
                >
                  {statusMutation.isPending ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
              {validationError && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">
                  {validationError}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 1: Tour Details + Client */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TourDetailsCard booking={booking} editing={editingTour} onEdit={() => setEditingTour(true)} onClose={() => setEditingTour(false)} allowEdit={!!allowEdit} />

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
    </div>
  );
}

const tourDetailsSchema = z.object({
  tourMonth: z.string().min(1, 'Required'),
  numberOfDays: z.coerce.number().min(1),
  arrivalDate: z.string().min(1, 'Required'),
  arrivalTime: z.string().min(1, 'Required'),
  departureDate: z.string().min(1, 'Required'),
  departureTime: z.string().min(1, 'Required'),
  additionalActivities: z.string().optional(),
  specialCelebrations: z.string().optional(),
  generalNotes: z.string().optional(),
});

function TourDetailsCard({ booking, editing, onEdit, onClose, allowEdit }: { booking: Booking; editing: boolean; onEdit: () => void; onClose: () => void; allowEdit: boolean }) {
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: zodResolver(tourDetailsSchema),
    defaultValues: {
      tourMonth: booking.tourMonth,
      numberOfDays: booking.numberOfDays,
      arrivalDate: booking.arrivalDate?.slice(0, 10) ?? '',
      arrivalTime: booking.arrivalTime,
      departureDate: booking.departureDate?.slice(0, 10) ?? '',
      departureTime: booking.departureTime,
      additionalActivities: booking.additionalActivities ?? '',
      specialCelebrations: booking.specialCelebrations ?? '',
      generalNotes: booking.generalNotes ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: any) => bookingsApi.update(booking.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      onClose();
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tour Details</CardTitle>
        {allowEdit && !editing && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-2 h-3 w-3" /> Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Tour Month</Label>
                <Input placeholder="e.g. January 2026" {...form.register('tourMonth')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Number of Days</Label>
                <Input type="number" min={1} {...form.register('numberOfDays')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Arrival Date</Label>
                <Input type="date" {...form.register('arrivalDate')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Arrival Time</Label>
                <Input type="time" {...form.register('arrivalTime')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Departure Date</Label>
                <Input type="date" {...form.register('departureDate')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Departure Time</Label>
                <Input type="time" {...form.register('departureTime')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Additional Activities</Label>
              <Textarea rows={2} {...form.register('additionalActivities')} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Special Celebrations</Label>
              <Textarea rows={2} {...form.register('specialCelebrations')} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">General Notes</Label>
              <Textarea rows={2} {...form.register('generalNotes')} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={mutation.isPending}>
                <Save className="mr-2 h-3 w-3" />{mutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                <X className="mr-2 h-3 w-3" /> Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            <Row label="Tour Month" value={booking.tourMonth} />
            <Row label="Duration" value={`${booking.numberOfDays} days`} />
            <Row label="Arrival" value={`${formatDate(booking.arrivalDate)} at ${booking.arrivalTime}`} />
            <Row label="Departure" value={`${formatDate(booking.departureDate)} at ${booking.departureTime}`} />
            <Row label="Sales Owner" value={booking.salesOwner?.name} />
            <Row label="Created" value={formatDateTime(booking.createdAt)} />
            {booking.additionalActivities && <Row label="Activities" value={booking.additionalActivities} />}
            {booking.specialCelebrations && <Row label="Celebrations" value={booking.specialCelebrations} />}
            {booking.generalNotes && <Row label="Notes" value={booking.generalNotes} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusPipeline({ booking }: { booking: Booking }) {
  const reached = new Set(booking.statusHistory.map(h => h.toStatus));
  reached.add(booking.status);
  const isCancelled = booking.status === BookingStatus.CANCELLED;

  const steps = PIPELINE_STEPS.map(step => {
    const isCurrent = step.activeWhen.includes(booking.status);
    const isDone = step.completedWhen.some(s => reached.has(s));
    return {
      label: step.label,
      state: (isCurrent ? 'active' : isDone ? 'done' : 'upcoming') as 'active' | 'done' | 'upcoming',
      isDone,
    };
  });

  return (
    <div>
      {isCancelled && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 font-medium text-center">
          This booking has been cancelled
        </div>
      )}
      <div className="flex items-start overflow-x-auto pb-1">
        {steps.map((step, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <div className={cn(
                "h-0.5 flex-1 min-w-3 mt-3.5 shrink-0",
                step.state !== 'upcoming' ? 'bg-emerald-500' : 'bg-gray-200'
              )} />
            )}
            <div className="flex flex-col items-center" style={{ minWidth: '44px' }}>
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                step.state === 'done' && 'bg-emerald-500 text-white',
                step.state === 'active' && 'bg-blue-600 text-white ring-4 ring-blue-100',
                step.state === 'upcoming' && 'border-2 border-gray-300 bg-white',
              )}>
                {(step.state === 'done' || (step.state === 'active' && step.isDone)) && (
                  <Check className="w-3.5 h-3.5" />
                )}
                {step.state === 'active' && !step.isDone && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              <span className={cn(
                "text-[10px] mt-1.5 text-center whitespace-nowrap leading-tight",
                step.state === 'done' && 'text-emerald-700 font-medium',
                step.state === 'active' && 'text-blue-700 font-semibold',
                step.state === 'upcoming' && 'text-muted-foreground',
              )}>
                {step.label}
              </span>
            </div>
          </Fragment>
        ))}
      </div>
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
