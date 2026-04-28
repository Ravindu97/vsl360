import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useBooking } from '@/hooks/useBookings';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { OverviewTab } from './tabs/OverviewTab';
import { ClientPaxTab } from './tabs/ClientPaxTab';
import { HotelsTab } from './tabs/HotelsTab';
import { TransportTab } from './tabs/TransportTab';
import { InvoiceTab } from './tabs/InvoiceTab';
import { AttachmentsTab } from './tabs/AttachmentsTab';
import { ItineraryPlanTab } from './tabs/ItineraryPlanTab';
import { DocumentsTab } from './tabs/DocumentsTab';
import { HistoryTab } from './tabs/HistoryTab';

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useBooking(id!);

  if (isLoading) return <LoadingSpinner />;

  const booking = data;
  if (!booking) return <div className="p-8 text-center text-muted-foreground">Booking not found</div>;
  const includeActivities = booking.includeActivities ?? true;
  const includeTransport = booking.includeTransport ?? true;
  const includeHotel = booking.includeHotel ?? true;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/bookings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{booking.bookingId}</h1>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {booking.client?.name} &middot; {booking.numberOfDays} days
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <div className="-mx-1 min-w-0 px-1">
          <TabsList className="flex h-auto min-h-9 w-full min-w-0 flex-nowrap justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-lg bg-muted p-1 text-muted-foreground [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsTrigger className="shrink-0" value="overview">Overview</TabsTrigger>
            <TabsTrigger className="shrink-0" value="client-pax">Client & Pax</TabsTrigger>
            {includeHotel && <TabsTrigger className="shrink-0" value="hotels">Hotels</TabsTrigger>}
            {includeTransport && <TabsTrigger className="shrink-0" value="transport">Transport</TabsTrigger>}
            <TabsTrigger className="shrink-0" value="invoice">Invoice</TabsTrigger>
            <TabsTrigger className="shrink-0" value="attachments">Attachments</TabsTrigger>
            {includeActivities && <TabsTrigger className="shrink-0" value="itinerary-plan">Itinerary Plan</TabsTrigger>}
            <TabsTrigger className="shrink-0" value="documents">Documents</TabsTrigger>
            <TabsTrigger className="shrink-0" value="history">History</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="overview"><OverviewTab booking={booking} /></TabsContent>
        <TabsContent value="client-pax"><ClientPaxTab booking={booking} /></TabsContent>
        {includeHotel && <TabsContent value="hotels"><HotelsTab booking={booking} /></TabsContent>}
        {includeTransport && <TabsContent value="transport"><TransportTab booking={booking} /></TabsContent>}
        <TabsContent value="invoice"><InvoiceTab booking={booking} /></TabsContent>
        <TabsContent value="attachments"><AttachmentsTab booking={booking} /></TabsContent>
        {includeActivities && <TabsContent value="itinerary-plan"><ItineraryPlanTab booking={booking} /></TabsContent>}
        <TabsContent value="documents"><DocumentsTab booking={booking} /></TabsContent>
        <TabsContent value="history"><HistoryTab booking={booking} /></TabsContent>
      </Tabs>
    </div>
  );
}
