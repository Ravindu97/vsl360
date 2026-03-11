import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import { documentsApi } from '@/api/endpoints.api';
import { useAuthStore } from '@/store/authStore';
import { canApproveDocuments, canGenerateInvoice } from '@/utils/permissions';
import { formatDateTime } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { DocumentType, type Booking, type GeneratedDocument } from '@/types';

interface Props {
  booking: Booking;
}

const DOC_LABELS: Record<DocumentType, string> = {
  [DocumentType.INVOICE]: 'Invoice',
  [DocumentType.TRANSPORT_DETAILS]: 'Transport Details',
  [DocumentType.HOTEL_RESERVATION]: 'Hotel Reservation',
  [DocumentType.FULL_ITINERARY]: 'Full Itinerary',
};

export function DocumentsTab({ booking }: Props) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['documents', booking.id],
    queryFn: () => documentsApi.list(booking.id),
  });

  const documents: GeneratedDocument[] = data?.data ?? booking.documents ?? [];

  const generateMutation = useMutation({
    mutationFn: (type: DocumentType) => {
      switch (type) {
        case DocumentType.INVOICE: return documentsApi.generateInvoice(booking.id);
        case DocumentType.TRANSPORT_DETAILS: return documentsApi.generateTransport(booking.id);
        case DocumentType.HOTEL_RESERVATION: return documentsApi.generateReservation(booking.id);
        case DocumentType.FULL_ITINERARY: return documentsApi.generateItinerary(booking.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
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

  const canGenerate = user && (canApproveDocuments(user.role) || canGenerateInvoice(user.role));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Generated Documents ({documents.length})</CardTitle>
        </div>
        {canGenerate && (
          <div className="flex flex-wrap gap-2 pt-2">
            {Object.values(DocumentType).map((type) => (
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
        )}
      </CardContent>
    </Card>
  );
}
