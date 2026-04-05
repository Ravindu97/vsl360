import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import { documentsApi } from '@/api/endpoints.api';
import { useAuthStore } from '@/store/authStore';
import { formatDateTime } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { DocumentType, Role, type Booking, type GeneratedDocument, type PaginatedResponse } from '@/types';

const PAGE_SIZE = 5;
const ITINERARY_DRAFT_KEY_PREFIX = 'itinerary-plan-draft';

interface Props {
  booking: Booking;
}

const DOC_LABELS: Record<DocumentType, string> = {
  [DocumentType.INVOICE]: 'Invoice',
  [DocumentType.TRANSPORT_DETAILS]: 'Transport Confirmation',
  [DocumentType.HOTEL_RESERVATION]: 'Hotel Reservation',
  [DocumentType.FULL_ITINERARY]: 'Full Itinerary',
  [DocumentType.TRAVEL_CONFIRMATION]: 'Hotel Confirmation',
};

const ROLE_ALLOWED_TYPES: Record<Role, DocumentType[]> = {
  [Role.SALES]: [DocumentType.INVOICE],
  [Role.RESERVATION]: [DocumentType.TRAVEL_CONFIRMATION],
  [Role.TRANSPORT]: [DocumentType.TRAVEL_CONFIRMATION, DocumentType.TRANSPORT_DETAILS],
  [Role.OPS_MANAGER]: [
    DocumentType.INVOICE,
    DocumentType.TRAVEL_CONFIRMATION,
    DocumentType.TRANSPORT_DETAILS,
    DocumentType.FULL_ITINERARY,
  ],
};

export function DocumentsTab({ booking }: Props) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data } = useQuery<{ data: PaginatedResponse<GeneratedDocument> }>({
    queryKey: ['documents', booking.id, page, PAGE_SIZE],
    queryFn: () => documentsApi.list(booking.id, page, PAGE_SIZE),
  });

  const documents: GeneratedDocument[] = data?.data.items ?? booking.documents ?? [];
  const pagination = data?.data;

  const generateMutation = useMutation({
    mutationFn: (type: DocumentType) => {
      const draftKey = `${ITINERARY_DRAFT_KEY_PREFIX}:${booking.id}`;
      const itineraryDraft = (() => {
        try {
          const raw = window.localStorage.getItem(draftKey);
          if (!raw) return undefined;
          const parsed = JSON.parse(raw) as Array<{
            dayNumber: number;
            dateLabel?: string;
            destinationId?: string;
            morningActivityId?: string;
            afternoonActivityId?: string;
            eveningActivityId?: string;
            notes?: string;
          }>;

          if (!Array.isArray(parsed)) return undefined;
          return {
            planDays: parsed
              .filter((day) => Number.isInteger(day?.dayNumber))
              .map((day) => ({
                dayNumber: day.dayNumber,
                dateLabel: day.dateLabel,
                destinationId: day.destinationId || undefined,
                morningActivityId: day.morningActivityId || undefined,
                afternoonActivityId: day.afternoonActivityId || undefined,
                eveningActivityId: day.eveningActivityId || undefined,
                notes: day.notes || undefined,
              })),
          };
        } catch {
          return undefined;
        }
      })();

      switch (type) {
        case DocumentType.INVOICE: return documentsApi.generateInvoice(booking.id);
        case DocumentType.TRANSPORT_DETAILS: return documentsApi.generateTransport(booking.id);
        case DocumentType.HOTEL_RESERVATION: return documentsApi.generateReservation(booking.id);
        case DocumentType.FULL_ITINERARY: return documentsApi.generateItinerary(booking.id, itineraryDraft);
        case DocumentType.TRAVEL_CONFIRMATION: return documentsApi.generateTravelConfirmation(booking.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
      setPage(1);
    },
  });

  const handleDownload = async (doc: GeneratedDocument) => {
    const response = await documentsApi.download(booking.id, doc.id);
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${DOC_LABELS[doc.type] || doc.type}_v${doc.version}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const allowedTypes = user ? ROLE_ALLOWED_TYPES[user.role as Role] ?? [] : [];
  const canGenerate = allowedTypes.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Generated Documents ({documents.length})</CardTitle>
        </div>
        {canGenerate && (
          <div className="flex flex-wrap gap-2 pt-2">
            {allowedTypes.map((type) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => generateMutation.mutate(type)}
                disabled={generateMutation.isPending}
              >
                <FileText className="mr-2 h-3 w-3" />
                Generate {DOC_LABELS[type]}
              </Button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <EmptyState title="No documents" description="Generate PDF documents for this booking" />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Badge variant="outline">{DOC_LABELS[doc.type] || doc.type}</Badge>
                    </TableCell>
                    <TableCell>v{doc.version}</TableCell>
                    <TableCell>{formatDateTime(doc.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls
              page={pagination?.page ?? 1}
              totalPages={pagination?.totalPages ?? 1}
              totalItems={pagination?.total ?? 0}
              pageSize={pagination?.pageSize ?? PAGE_SIZE}
              itemLabel="documents"
              onPrevious={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() => setPage((current) => Math.min(pagination?.totalPages ?? current, current + 1))}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
