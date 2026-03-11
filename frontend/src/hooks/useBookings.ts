import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '@/api/bookings.api';

export function useBookings(status?: string) {
  return useQuery({
    queryKey: ['bookings', status],
    queryFn: () => bookingsApi.list(status).then((res) => res.data),
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.get(id).then((res) => res.data),
    enabled: !!id,
  });
}
