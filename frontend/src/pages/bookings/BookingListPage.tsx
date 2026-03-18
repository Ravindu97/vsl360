import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Trash2 } from 'lucide-react';
import { bookingsApi } from '@/api/bookings.api';
import { useAuthStore } from '@/store/authStore';
import { canCreateBooking } from '@/utils/permissions';
import { formatDate } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { BookingStatus, type Booking, type PaginatedResponse } from '@/types';
import { STATUS_LABELS } from '@/utils/constants';

const PAGE_SIZE = 10;

export function BookingListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{ data: PaginatedResponse<Booking> }>({
    queryKey: ['bookings', statusFilter === 'ALL' ? undefined : statusFilter, page, PAGE_SIZE],
    queryFn: () => bookingsApi.list(statusFilter === 'ALL' ? undefined : statusFilter, page, PAGE_SIZE),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setDeleteId(null);
    },
  });

  const bookings = data?.data.items ?? [];
  const pagination = data?.data;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {Object.values(BookingStatus).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {user && canCreateBooking(user.role) && (
            <Button onClick={() => navigate('/bookings/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          )}
        </div>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings found"
          description="Create your first booking to get started"
          action={
            user && canCreateBooking(user.role) ? (
              <Button onClick={() => navigate('/bookings/new')}>
                <Plus className="mr-2 h-4 w-4" />
                New Booking
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Tour Month</TableHead>
                <TableHead>Arrival</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sales Owner</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">{booking.bookingId}</TableCell>
                  <TableCell>{booking.client?.name ?? '—'}</TableCell>
                  <TableCell>{booking.tourMonth}</TableCell>
                  <TableCell>{formatDate(booking.arrivalDate)}</TableCell>
                  <TableCell>{booking.numberOfDays}</TableCell>
                  <TableCell>
                    <StatusBadge status={booking.status} />
                  </TableCell>
                  <TableCell>{booking.salesOwner?.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/bookings/${booking.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {user && canCreateBooking(user.role) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(booking.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
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
            itemLabel="bookings"
            onPrevious={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(pagination?.totalPages ?? current, current + 1))}
          />
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Booking"
        description="Are you sure you want to delete this booking? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
