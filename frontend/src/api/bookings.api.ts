import api from './client';
import type { Booking, ItineraryPlanLeg, PaginatedResponse } from '@/types';

export type ItineraryPlanDayPayload = {
  dayNumber: number;
  dateLabel?: string;
  destinationId?: string;
  morningActivityId?: string;
  afternoonActivityId?: string;
  eveningActivityId?: string;
  notes?: string;
};

export interface BookingFilters {
  status?: string;
  search?: string;
  arrivalFrom?: string;
  arrivalTo?: string;
  salesOwnerId?: string;
}

export interface BookingPayload {
  numberOfDays?: number;
  arrivalDate?: string;
  arrivalTime?: string;
  departureDate?: string;
  departureTime?: string;
  additionalActivities?: string;
  specialCelebrations?: string;
  generalNotes?: string;
  flightNumber?: string | null;
  includeActivities?: boolean;
  includeTransport?: boolean;
  includeHotel?: boolean;
  client?: {
    name: string;
    citizenship: string;
    languagePreference: string;
    preferredCurrency: 'EUR' | 'USD' | 'INR';
    email: string;
    contactNumber: string;
    passportNumber?: string;
  };
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

  create: (data: BookingPayload) => api.post<Booking>('/bookings', data),

  update: (id: string, data: BookingPayload) => api.put<Booking>(`/bookings/${id}`, data),

  updateStatus: (id: string, status: string, notes?: string) =>
    api.put(`/bookings/${id}/status`, { status, notes }),

  getItineraryPlan: (id: string) => api.get<{ days: any[]; updatedAt?: string }>(`/bookings/${id}/itinerary-plan`),

  saveItineraryPlan: (id: string, data: { days: any[] }) =>
    api.put<{ days: any[]; updatedAt: string }>(`/bookings/${id}/itinerary-plan`, data),

  getItineraryPlanDistances: (id: string) =>
    api.get<{ legs: ItineraryPlanLeg[] }>(`/bookings/${id}/itinerary-plan/distances`),

  computeItineraryPlanDistances: (id: string, data: { days: ItineraryPlanDayPayload[] }) =>
    api.post<{ legs: ItineraryPlanLeg[] }>(`/bookings/${id}/itinerary-plan/distances`, data),

  delete: (id: string) => api.delete(`/bookings/${id}`),
};
