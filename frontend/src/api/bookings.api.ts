import api from './client';
import type { Booking } from '@/types';

export const bookingsApi = {
  list: (status?: string) =>
    api.get<Booking[]>('/bookings', { params: status ? { status } : {} }),

  get: (id: string) => api.get<Booking>(`/bookings/${id}`),

  create: (data: any) => api.post<Booking>('/bookings', data),

  update: (id: string, data: any) => api.put<Booking>(`/bookings/${id}`, data),

  updateStatus: (id: string, status: string, notes?: string) =>
    api.put(`/bookings/${id}/status`, { status, notes }),

  delete: (id: string) => api.delete(`/bookings/${id}`),
};
