import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, Trash2, FileIcon } from 'lucide-react';
import { attachmentsApi } from '@/api/endpoints.api';
import { formatFileSize, formatDateTime } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Booking, Attachment } from '@/types';

interface Props {
  booking: Booking;
}

export function AttachmentsTab({ booking }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ['attachments', booking.id],
    queryFn: () => attachmentsApi.list(booking.id),
  });

  const attachments: Attachment[] = data?.data ?? booking.attachments ?? [];

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return attachmentsApi.upload(booking.id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attachId: string) => attachmentsApi.delete(booking.id, attachId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', booking.id] });
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
      e.target.value = '';
    }
  };

  const handleDownload = async (attach: Attachment) => {
    const response = await attachmentsApi.download(booking.id, attach.id);
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = attach.fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Attachments ({attachments.length})</CardTitle>
        <div>
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            <Upload className="mr-2 h-3 w-3" />
            {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {attachments.length === 0 ? (
          <EmptyState title="No attachments" description="Upload files for this booking" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attachments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{a.fileName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{a.fileType}</TableCell>
                  <TableCell>{formatFileSize(a.fileSize)}</TableCell>
                  <TableCell>{formatDateTime(a.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(a)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(a.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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
