import api from './client';
import type { Booking, PaginatedResponse } from '@/types';

export interface BookingFilters {
  status?: string;
  search?: string;
  arrivalFrom?: string;
  arrivalTo?: string;
  salesOwnerId?: string;
}

export const bookingsApi = {
  list: (filters: BookingFilters = {}, page = 1, pageSize = 10) =>
    api.get<PaginatedResponse<Booking>>('/bookings', {
      params: {
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
        page,
        pageSize,
      },
    }),

  get: (id: string) => api.get<Booking>(`/bookings/${id}`),

  create: (data: any) => api.post<Booking>('/bookings', data),

  update: (id: string, data: any) => api.put<Booking>(`/bookings/${id}`, data),

  updateStatus: (id: string, status: string, notes?: string) =>
    api.put(`/bookings/${id}/status`, { status, notes }),

  delete: (id: string) => api.delete(`/bookings/${id}`),
};
