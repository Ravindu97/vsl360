import api from './client';
import type {
  CustomItineraryInquiry,
  CustomItineraryInquiryFilters,
  InquiryStats,
  PaginatedResponse,
} from '@/types';

export const inquiriesApi = {
  list: (filters: CustomItineraryInquiryFilters = {}, page = 1, pageSize = 10) =>
    api.get<PaginatedResponse<CustomItineraryInquiry>>('/inquiries/custom-itinerary', {
      params: {
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')),
        page,
        pageSize,
      },
    }),

  get: (id: string) => api.get<CustomItineraryInquiry>(`/inquiries/custom-itinerary/${id}`),

  stats: () => api.get<InquiryStats>('/inquiries/custom-itinerary/stats'),

  update: (
    id: string,
    data: Partial<Pick<CustomItineraryInquiry, 'status' | 'adminNotes' | 'assignedTo'>>,
  ) => api.patch<CustomItineraryInquiry>(`/inquiries/custom-itinerary/${id}`, data),
};
