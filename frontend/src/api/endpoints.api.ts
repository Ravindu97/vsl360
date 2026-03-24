import api from './client';
import type { Pax, Client, HotelBooking, TransportPlan, Invoice, Attachment, GeneratedDocument, TransportDayPlan, PaginatedResponse } from '@/types';

// Client (Main Guest)
export const clientApi = {
  get: (bookingId: string) => api.get<Client>(`/bookings/${bookingId}/client`),
  update: (bookingId: string, data: any) => api.put<Client>(`/bookings/${bookingId}/client`, data),
};

// Pax
export const paxApi = {
  list: (bookingId: string) => api.get<Pax[]>(`/bookings/${bookingId}/pax`),
  create: (bookingId: string, data: any) => api.post<Pax>(`/bookings/${bookingId}/pax`, data),
  update: (bookingId: string, paxId: string, data: any) => api.put<Pax>(`/bookings/${bookingId}/pax/${paxId}`, data),
  delete: (bookingId: string, paxId: string) => api.delete(`/bookings/${bookingId}/pax/${paxId}`),
};

// Hotels
export const hotelsApi = {
  list: (bookingId: string) => api.get<HotelBooking[]>(`/bookings/${bookingId}/hotels`),
  create: (bookingId: string, data: any) => api.post<HotelBooking>(`/bookings/${bookingId}/hotels`, data),
  update: (bookingId: string, hotelId: string, data: any) => api.put<HotelBooking>(`/bookings/${bookingId}/hotels/${hotelId}`, data),
  confirm: (bookingId: string, hotelId: string) => api.put<HotelBooking>(`/bookings/${bookingId}/hotels/${hotelId}/confirm`),
  delete: (bookingId: string, hotelId: string) => api.delete(`/bookings/${bookingId}/hotels/${hotelId}`),
};

// Transport
export const transportApi = {
  get: (bookingId: string) => api.get<TransportPlan>(`/bookings/${bookingId}/transport`),
  create: (bookingId: string, data: any) => api.post<TransportPlan>(`/bookings/${bookingId}/transport`, data),
  update: (bookingId: string, data: any) => api.put<TransportPlan>(`/bookings/${bookingId}/transport`, data),
  createDayPlan: (bookingId: string, data: any) => api.post<TransportDayPlan>(`/bookings/${bookingId}/transport/day-plans`, data),
  updateDayPlan: (bookingId: string, dayId: string, data: any) => api.put<TransportDayPlan>(`/bookings/${bookingId}/transport/day-plans/${dayId}`, data),
  deleteDayPlan: (bookingId: string, dayId: string) => api.delete(`/bookings/${bookingId}/transport/day-plans/${dayId}`),
};

// Invoice
export const invoiceApi = {
  get: (bookingId: string) => api.get<Invoice>(`/bookings/${bookingId}/invoice`),
  create: (bookingId: string, data: any) => api.post<Invoice>(`/bookings/${bookingId}/invoice`, data),
  update: (bookingId: string, data: any) => api.put<Invoice>(`/bookings/${bookingId}/invoice`, data),
};

// Attachments
export const attachmentsApi = {
  list: (bookingId: string) => api.get<Attachment[]>(`/bookings/${bookingId}/attachments`),
  upload: (bookingId: string, formData: FormData) =>
    api.post<Attachment>(`/bookings/${bookingId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  download: (bookingId: string, attachId: string) =>
    api.get(`/bookings/${bookingId}/attachments/${attachId}/download`, { responseType: 'blob' }),
  delete: (bookingId: string, attachId: string) => api.delete(`/bookings/${bookingId}/attachments/${attachId}`),
};

// Documents
export const documentsApi = {
  list: (bookingId: string, page = 1, pageSize = 5) =>
    api.get<PaginatedResponse<GeneratedDocument>>(`/bookings/${bookingId}/documents`, { params: { page, pageSize } }),
  generateInvoice: (bookingId: string) => api.post(`/bookings/${bookingId}/documents/invoice`),
  generateTransport: (bookingId: string) => api.post(`/bookings/${bookingId}/documents/transport`),
  generateReservation: (bookingId: string) => api.post(`/bookings/${bookingId}/documents/reservation`),
  generateItinerary: (bookingId: string) => api.post(`/bookings/${bookingId}/documents/itinerary`),
  generateTravelConfirmation: (bookingId: string) => api.post(`/bookings/${bookingId}/documents/travel-confirmation`),
  download: (bookingId: string, docId: string) =>
    api.get(`/bookings/${bookingId}/documents/${docId}/download`, { responseType: 'blob' }),
};

// Reports
export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
  bookings: (params?: any) => api.get('/reports/bookings', { params }),
};
