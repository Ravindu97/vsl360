import api from './client';
import type {
  Pax,
  Client,
  HotelBooking,
  TransportPlan,
  Invoice,
  Attachment,
  GeneratedDocument,
  TransportDayPlan,
  PaginatedResponse,
  ItineraryActivity,
  ItineraryDestination,
} from '@/types';

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
  generateItinerary: (
    bookingId: string,
    data?: {
      planDays?: Array<{
        dayNumber: number;
        dateLabel?: string;
        destinationId?: string;
        morningActivityId?: string;
        afternoonActivityId?: string;
        eveningActivityId?: string;
        notes?: string;
      }>;
    }
  ) => api.post(`/bookings/${bookingId}/documents/itinerary`, data ?? {}),
  generateTravelConfirmation: (bookingId: string) => api.post(`/bookings/${bookingId}/documents/travel-confirmation`),
  download: (bookingId: string, docId: string) =>
    api.get(`/bookings/${bookingId}/documents/${docId}/download`, { responseType: 'blob' }),
};

// Reports
export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
  bookings: (params?: any) => api.get('/reports/bookings', { params }),
};

// Itinerary library
export const itineraryApi = {
  listDestinations: (params?: { search?: string; page?: number; pageSize?: number }) =>
    api.get<PaginatedResponse<ItineraryDestination>>('/itinerary/destinations', { params }),

  geocodeDestinations: () =>
    api.post<{ updated: number; skipped: number; failed: string[] }>('/itinerary/destinations/geocode'),

  getDestinationDistance: (fromId: string, toId: string) =>
    api.get<{
      drivingMeters?: number;
      drivingDurationS?: number;
      straightMeters: number;
      source: 'osrm' | 'ors' | 'haversine';
    }>(`/itinerary/destinations/${fromId}/distance/${toId}`),
  createDestination: (data: { name: string; slug?: string; isActive?: boolean }) =>
    api.post<ItineraryDestination>('/itinerary/destinations', data),
  updateDestination: (destinationId: string, data: { name?: string; slug?: string; isActive?: boolean }) =>
    api.put<ItineraryDestination>(`/itinerary/destinations/${destinationId}`, data),
  deleteDestination: (destinationId: string) =>
    api.delete(`/itinerary/destinations/${destinationId}`),

  listActivities: (params?: { destinationId?: string; search?: string; category?: string; page?: number; pageSize?: number }) =>
    api.get<PaginatedResponse<ItineraryActivity>>('/itinerary/activities', { params }),
  createActivity: (data: {
    destinationId: string;
    title: string;
    description: string;
    category: string;
    isSeasonal?: boolean;
  }) => api.post<ItineraryActivity>('/itinerary/activities', data),
  updateActivity: (activityId: string, data: {
    destinationId?: string;
    title?: string;
    description?: string;
    category?: string;
    isSeasonal?: boolean;
  }) => api.put<ItineraryActivity>(`/itinerary/activities/${activityId}`, data),
  deleteActivity: (activityId: string) =>
    api.delete(`/itinerary/activities/${activityId}`),

  exportCatalog: () =>
    api.get<{
      exportedAt: string;
      destinationCount: number;
      activityCount: number;
      destinations: Array<{ id: string; name: string; slug: string; isActive: boolean; sortOrder: number }>;
      activities: Array<{
        id: string;
        destinationId: string;
        title: string;
        description: string;
        category: string;
        isSeasonal: boolean;
        sortOrder: number;
        sourceRow?: number | null;
      }>;
    }>('/itinerary/export'),

  importCatalog: (data: {
    replaceAll?: boolean;
    destinations: Array<{
      id: string;
      name: string;
      slug: string;
      isActive?: boolean;
      sortOrder: number;
      latitude?: number | null;
      longitude?: number | null;
    }>;
    activities: Array<{
      id: string;
      destinationId: string;
      title: string;
      description: string;
      category: string;
      isSeasonal?: boolean;
      sortOrder: number;
      sourceRow?: number | null;
    }>;
  }) => api.post('/itinerary/import', data),
};
