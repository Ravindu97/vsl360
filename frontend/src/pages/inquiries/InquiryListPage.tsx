import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquarePlus, Search, Eye } from 'lucide-react';
import { inquiriesApi } from '@/api/inquiries.api';
import { formatDate } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { InquiryStatus, type Inquiry, type PaginatedResponse } from '@/types';
import { Badge } from '@/components/ui/badge';

const PAGE_SIZE = 10;

const STATUS_LABEL: Record<InquiryStatus, string> = {
  [InquiryStatus.NEW]: 'New',
  [InquiryStatus.IN_PROGRESS]: 'In progress',
  [InquiryStatus.CONVERTED]: 'Converted',
  [InquiryStatus.DISCARDED]: 'Discarded',
};

export function InquiryListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ['inquiries', statusFilter, search, page, PAGE_SIZE],
    queryFn: async () => {
      const { data: body } = await inquiriesApi.list({
        ...(statusFilter !== 'ALL' ? { status: statusFilter as InquiryStatus } : {}),
        ...(search ? { search } : {}),
        page,
        pageSize: PAGE_SIZE,
      });
      return body;
    },
  });

  const discardMutation = useMutation({
    mutationFn: (id: string) => inquiriesApi.update(id, { status: InquiryStatus.DISCARDED }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
    },
  });

  if (isLoading) return <LoadingSpinner />;

  const paginated = data as PaginatedResponse<Inquiry> | undefined;
  const items = paginated?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Inquiries</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          WhatsApp messages land here first. Open one to create a full booking when you are ready.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full min-w-0 sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search phone, name, message…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {Object.values(InquiryStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No inquiries yet"
          description="When Meta sends WhatsApp webhooks to this server, new rows appear here."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Received</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDate(row.receivedAt)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{row.fromPhone}</TableCell>
                  <TableCell>{row.waProfileName ?? '—'}</TableCell>
                  <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                    {row.messageBody}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{STATUS_LABEL[row.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {row.status !== InquiryStatus.CONVERTED && row.status !== InquiryStatus.DISCARDED && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => navigate(`/bookings/new?inquiryId=${row.id}`)}
                        >
                          <MessageSquarePlus className="h-3.5 w-3.5 mr-1" />
                          Create booking
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => discardMutation.mutate(row.id)}
                          disabled={discardMutation.isPending}
                        >
                          Discard
                        </Button>
                      </>
                    )}
                    {row.convertedBooking && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/bookings/${row.convertedBooking!.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Booking
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {paginated && (
            <PaginationControls
              page={paginated.page}
              totalPages={paginated.totalPages}
              totalItems={paginated.total}
              pageSize={paginated.pageSize}
              itemLabel="inquiries"
              onPrevious={() => setPage((current) => Math.max(1, current - 1))}
              onNext={() =>
                setPage((current) => Math.min(paginated.totalPages ?? current, current + 1))
              }
            />
          )}
        </>
      )}
    </div>
  );
}
