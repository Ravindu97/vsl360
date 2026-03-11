import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  DollarSign,
  Clock,
  CheckCircle,
  Plus,
} from 'lucide-react';
import { reportsApi } from '@/api/endpoints.api';
import { useAuthStore } from '@/store/authStore';
import { canCreateBooking } from '@/utils/permissions';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { STATUS_LABELS } from '@/utils/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { DashboardData, BookingStatus } from '@/types';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<{ data: DashboardData }>({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.dashboard(),
  });

  if (isLoading) return <LoadingSpinner />;

  const dashboard = data?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name}</p>
        </div>
        {user && canCreateBooking(user.role) && (
          <Button onClick={() => navigate('/bookings/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        )}
      </div>

      {dashboard && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Bookings"
              value={dashboard.totalBookings}
              icon={BookOpen}
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(dashboard.revenue.total)}
              icon={DollarSign}
            />
            <StatCard
              title="Collected"
              value={formatCurrency(dashboard.revenue.collected)}
              icon={CheckCircle}
            />
            <StatCard
              title="Pending"
              value={formatCurrency(dashboard.revenue.pending)}
              icon={Clock}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(dashboard.statusCounts)
                    .filter(([, count]) => count > 0)
                    .map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span className="text-sm">
                          {STATUS_LABELS[status as BookingStatus] || status}
                        </span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between cursor-pointer rounded-md p-2 hover:bg-muted"
                      onClick={() => navigate(`/bookings/${booking.id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium">{booking.bookingId}</p>
                        <p className="text-xs text-muted-foreground">
                          {booking.client?.name} &middot; {formatDate(booking.arrivalDate)}
                        </p>
                      </div>
                      <StatusBadge status={booking.status as BookingStatus} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
