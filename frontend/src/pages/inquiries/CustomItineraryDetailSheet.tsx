import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { inquiriesApi } from '@/api/inquiries.api';
import { CopyableField } from '@/components/shared/CopyableField';
import { InquiryStatusBadge } from '@/components/shared/InquiryStatusBadge';
import { SlaBadge } from '@/components/shared/SlaBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { QuoteStatus } from '@/types';
import { formatDateTime } from '@/utils/formatters';
import {
  accommodationLabel,
  emailFollowUpUrl,
  formatGuests,
  formatTripSummary,
  totalGuests,
  travelStyleLabel,
  whatsappFollowUpUrl,
} from '@/utils/inquiryLabels';

interface CustomItineraryDetailSheetProps {
  inquiryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-2 rounded-md border bg-muted/20 p-3">{children}</div>
    </section>
  );
}

export function CustomItineraryDetailSheet({
  inquiryId,
  open,
  onOpenChange,
}: CustomItineraryDetailSheetProps) {
  const queryClient = useQueryClient();
  const [adminNotes, setAdminNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['custom-itinerary-inquiry', inquiryId],
    queryFn: () => inquiriesApi.get(inquiryId!),
    enabled: !!inquiryId && open,
  });

  const inquiry = data?.data;

  useEffect(() => {
    if (inquiry) {
      setAdminNotes(inquiry.adminNotes ?? '');
      setAssignedTo(inquiry.assignedTo ?? '');
    }
  }, [inquiry]);

  const updateMutation = useMutation({
    mutationFn: (payload: {
      status?: QuoteStatus;
      adminNotes?: string | null;
      assignedTo?: string | null;
    }) => inquiriesApi.update(inquiryId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-itinerary-inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['custom-itinerary-inquiry', inquiryId] });
      queryClient.invalidateQueries({ queryKey: ['inquiry-stats'] });
    },
  });

  const handleStatusUpdate = (status: QuoteStatus) => {
    updateMutation.mutate({ status });
  };

  const handleSaveNotes = () => {
    updateMutation.mutate({
      adminNotes: adminNotes.trim() || null,
      assignedTo: assignedTo.trim() || null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Custom Itinerary Inquiry</SheetTitle>
          <SheetDescription>
            Customer expects contact within 12 hours of submission.
          </SheetDescription>
        </SheetHeader>

        {isLoading || !inquiry ? (
          <div className="py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="mt-6 space-y-6 pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <InquiryStatusBadge status={inquiry.status} />
              <SlaBadge slaStatus={inquiry.slaStatus} />
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Contact within 12 hours — promise shown to customer on submission.
            </div>

            <Section title="Contact">
              <p className="text-sm font-medium">{inquiry.name}</p>
              <CopyableField label="Email" value={inquiry.email} />
              {inquiry.phone && <CopyableField label="Phone / WhatsApp" value={inquiry.phone} />}
            </Section>

            <Section title="Logistics">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Trip</p>
                  <p className="font-medium">{formatTripSummary(inquiry)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Guests</p>
                  <p className="font-medium">
                    {formatGuests(inquiry)} ({totalGuests(inquiry)} total)
                  </p>
                </div>
              </div>
            </Section>

            <Section title="Preferences">
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Travel styles</p>
                <div className="flex flex-wrap gap-1.5">
                  {inquiry.travelStyles.map((style) => (
                    <Badge key={style} variant="secondary">
                      {travelStyleLabel(style)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Accommodation</p>
                <p className="text-sm font-medium">{accommodationLabel(inquiry.accommodation)}</p>
              </div>
            </Section>

            <Section title="Notes">
              {inquiry.specialRequests ? (
                <div>
                  <p className="text-xs text-muted-foreground">Special requests</p>
                  <p className="whitespace-pre-wrap text-sm">{inquiry.specialRequests}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No special requests</p>
              )}
              <div className="space-y-1.5 pt-2">
                <Label htmlFor="admin-notes" className="text-xs">
                  Internal notes
                </Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder="Planner notes (not visible to customer)"
                />
              </div>
            </Section>

            <Section title="Meta">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
              <CopyableField label="Customer reference" value={inquiry.publicRef} />
                <div>
                  <p className="text-xs text-muted-foreground">Internal ID</p>
                  <p className="break-all font-mono text-xs text-muted-foreground">{inquiry.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p>{formatDateTime(inquiry.createdAt)}</p>
                </div>
                {inquiry.contactedAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">Contacted at</p>
                    <p>{formatDateTime(inquiry.contactedAt)}</p>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assigned-to" className="text-xs">
                  Assigned planner
                </Label>
                <Input
                  id="assigned-to"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Planner name"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveNotes}
                disabled={updateMutation.isPending}
              >
                Save notes & assignment
              </Button>
            </Section>

            {inquiry.timelineEvents && inquiry.timelineEvents.length > 0 && (
              <Section title="Timeline">
                <ol className="space-y-3">
                  {inquiry.timelineEvents.map((event) => (
                    <li key={event.id} className="flex gap-3 text-sm">
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium">{event.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(event.createdAt)}
                          <span className="ml-2 font-mono text-[10px] uppercase">{event.stage}</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Status</h3>
              <Select
                value={inquiry.status}
                onValueChange={(value) => handleStatusUpdate(value as QuoteStatus)}
                disabled={updateMutation.isPending}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(QuoteStatus).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Follow-up</h3>
              <div className="flex flex-wrap gap-2">
                {inquiry.phone && (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={whatsappFollowUpUrl(inquiry.name, inquiry.phone, inquiry.publicRef)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        WhatsApp
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${inquiry.phone}`}>
                        <Phone className="mr-2 h-4 w-4" />
                        Call
                      </a>
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" asChild>
                  <a href={emailFollowUpUrl(inquiry.name, inquiry.email)}>
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </a>
                </Button>
              </div>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
