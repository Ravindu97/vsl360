import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { inquiriesApi } from '@/api/inquiries.api';
import { CustomItineraryDetailSheet } from '@/pages/inquiries/CustomItineraryDetailSheet';
import { InquiryStatusBadge } from '@/components/shared/InquiryStatusBadge';
import { SlaBadge } from '@/components/shared/SlaBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QuoteStatus, type CustomItineraryInquiry, type CustomItineraryInquiryFilters, type PaginatedResponse } from '@/types';
import { formatDateTime } from '@/utils/formatters';
import { formatGuests, formatTripSummary } from '@/utils/inquiryLabels';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

export function CustomItineraryInboxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [submittedFrom, setSubmittedFrom] = useState('');
  const [submittedTo, setSubmittedTo] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get('overdue') === 'true');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('id'));

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) setSelectedId(id);
    if (searchParams.get('overdue') === 'true') setOverdueOnly(true);
  }, [searchParams]);

  const filters: CustomItineraryInquiryFilters = {
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    ...(search ? { search } : {}),
    ...(submittedFrom ? { submittedFrom } : {}),
    ...(submittedTo ? { submittedTo } : {}),
    ...(overdueOnly ? { overdueOnly: true } : {}),
  };

  const activeFilterCount = [submittedFrom, submittedTo, overdueOnly ? 'overdue' : ''].filter(Boolean).length;

  const { data, isLoading } = useQuery<{ data: PaginatedResponse<CustomItineraryInquiry> }>({
    queryKey: ['custom-itinerary-inquiries', filters, page, PAGE_SIZE],
    queryFn: () => inquiriesApi.list(filters, page, PAGE_SIZE),
  });

  const inquiries = data?.data.items ?? [];
  const pagination = data?.data;

  const openDetail = (id: string) => {
    setSelectedId(id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('id', id);
      return next;
    });
  };

  const closeDetail = (open: boolean) => {
    if (!open) {
      setSelectedId(null);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('id');
        return next;
      });
    }
  };

  const rowClassName = (inquiry: CustomItineraryInquiry) => {
    if (inquiry.slaStatus === 'overdue') return 'bg-red-50/80 hover:bg-red-50';
    if (inquiry.slaStatus === 'due') return 'bg-amber-50/60 hover:bg-amber-50';
    return undefined;
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Itinerary Inquiries</h1>
          <p className="text-sm text-muted-foreground">
            Homepage wizard submissions — contact within 12 hours
          </p>
        </div>
        <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
          <div className="relative w-full min-w-0 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9"
            />
            {searchInput && (
              <button
                type="button"
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchInput('')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {Object.values(QuoteStatus).map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="relative shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-md border bg-muted/30 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Submitted From</Label>
              <Input
                type="date"
                value={submittedFrom}
                onChange={(e) => {
                  setSubmittedFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Submitted To</Label>
              <Input
                type="date"
                value={submittedTo}
                onChange={(e) => {
                  setSubmittedTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant={overdueOnly ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => {
                  setOverdueOnly(!overdueOnly);
                  setPage(1);
                }}
              >
                {overdueOnly ? 'Showing overdue only' : 'Overdue only (>12h)'}
              </Button>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-xs"
              onClick={() => {
                setSubmittedFrom('');
                setSubmittedTo('');
                setOverdueOnly(false);
                setPage(1);
              }}
            >
              <X className="mr-1 h-3 w-3" /> Clear all filters
            </Button>
          )}
        </div>
      )}

      {inquiries.length === 0 ? (
        <EmptyState
          title="No inquiries found"
          description="Custom itinerary wizard submissions will appear here"
        />
      ) : (
        <div className="rounded-md border">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead>Trip</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries.map((inquiry) => (
                  <TableRow
                    key={inquiry.id}
                    className={cn('cursor-pointer', rowClassName(inquiry))}
                    onClick={() => openDetail(inquiry.id)}
                  >
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDateTime(inquiry.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">{inquiry.name}</TableCell>
                    <TableCell>{inquiry.email}</TableCell>
                    <TableCell>{inquiry.phone ?? '—'}</TableCell>
                    <TableCell>{formatGuests(inquiry)}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm">
                      {formatTripSummary(inquiry)}
                    </TableCell>
                    <TableCell>
                      <InquiryStatusBadge status={inquiry.status} />
                    </TableCell>
                    <TableCell>
                      <SlaBadge slaStatus={inquiry.slaStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls
            page={pagination?.page ?? 1}
            totalPages={pagination?.totalPages ?? 1}
            totalItems={pagination?.total ?? 0}
            pageSize={pagination?.pageSize ?? PAGE_SIZE}
            itemLabel="inquiries"
            onPrevious={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() =>
              setPage((current) => Math.min(pagination?.totalPages ?? current, current + 1))
            }
          />
        </div>
      )}

      <CustomItineraryDetailSheet
        inquiryId={selectedId}
        open={!!selectedId}
        onOpenChange={closeDetail}
      />
    </div>
  );
}
