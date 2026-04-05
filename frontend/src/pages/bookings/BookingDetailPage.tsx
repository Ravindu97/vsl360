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
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="client-pax">Client & Pax</TabsTrigger>
          <TabsTrigger value="hotels">Hotels</TabsTrigger>
          <TabsTrigger value="transport">Transport</TabsTrigger>
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="itinerary-plan">Itinerary Plan</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab booking={booking} /></TabsContent>
        <TabsContent value="client-pax"><ClientPaxTab booking={booking} /></TabsContent>
        <TabsContent value="hotels"><HotelsTab booking={booking} /></TabsContent>
        <TabsContent value="transport"><TransportTab booking={booking} /></TabsContent>
        <TabsContent value="invoice"><InvoiceTab booking={booking} /></TabsContent>
        <TabsContent value="attachments"><AttachmentsTab booking={booking} /></TabsContent>
        <TabsContent value="itinerary-plan"><ItineraryPlanTab booking={booking} /></TabsContent>
        <TabsContent value="documents"><DocumentsTab booking={booking} /></TabsContent>
        <TabsContent value="history"><HistoryTab booking={booking} /></TabsContent>
      </Tabs>
    </div>
  );
}
