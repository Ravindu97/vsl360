import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  DollarSign,
  Clock,
  CheckCircle,
  Plus,
  Inbox,
  AlertTriangle,
} from 'lucide-react';
import { reportsApi } from '@/api/endpoints.api';
import { inquiriesApi } from '@/api/inquiries.api';
import { usersApi } from '@/api/users.api';
import { DashboardOnboardingChecklist } from '@/components/dashboard/DashboardOnboardingChecklist';
import { useAuthStore } from '@/store/authStore';
import { canCreateBooking } from '@/utils/permissions';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { STATUS_LABELS } from '@/utils/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CurrencyCode } from '@/types';
import type { DashboardData, BookingStatus } from '@/types';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<{ data: DashboardData }>({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.dashboard(),
  });

  const { data: inquiryStatsData } = useQuery({
    queryKey: ['inquiry-stats'],
    queryFn: () => inquiriesApi.stats(),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-count'],
    queryFn: () => usersApi.list(1, 1),
  });

  if (isLoading) return <LoadingSpinner />;

  const dashboard = data?.data;
  const inquiryStats = inquiryStatsData?.data;
  const revenueCurrency = dashboard?.revenue.currency ?? CurrencyCode.INR;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name}</p>
        </div>
        {user && canCreateBooking(user.role) && (
          <Button className="w-full shrink-0 sm:w-auto" onClick={() => navigate('/bookings/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        )}
      </div>

      {dashboard && (
        <>
          <DashboardOnboardingChecklist
            totalBookings={dashboard.totalBookings}
            inquiryTotalCount={inquiryStats?.totalCount ?? 0}
            teamCount={usersData?.data?.total ?? 1}
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Bookings"
              value={dashboard.totalBookings}
              icon={BookOpen}
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(dashboard.revenue.total, revenueCurrency)}
              icon={DollarSign}
            />
            <StatCard
              title="Collected"
              value={formatCurrency(dashboard.revenue.collected, revenueCurrency)}
              icon={CheckCircle}
            />
            <StatCard
              title="Pending"
              value={formatCurrency(dashboard.revenue.pending, revenueCurrency)}
              icon={Clock}
            />
          </div>

          {inquiryStats && (
            <div className="grid gap-4 md:grid-cols-2">
              <StatCard
                title="New Itinerary Inquiries"
                value={inquiryStats.newCount}
                icon={Inbox}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => navigate('/inquiries/custom-itinerary')}
              />
              <StatCard
                title="Overdue Inquiries (>12h)"
                value={inquiryStats.overdueCount}
                icon={AlertTriangle}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => navigate('/inquiries/custom-itinerary?overdue=true')}
              />
            </div>
          )}

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
