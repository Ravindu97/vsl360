import api from './client';
import type { Inquiry, InquiryStatus, PaginatedResponse } from '@/types';

export interface InquiryListParams {
  status?: InquiryStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export type InquiryUpdatePayload = {
  status?: InquiryStatus;
  assignedUserId?: string | null;
  convertedBookingId?: string | null;
};

export const inquiriesApi = {
  list: (params: InquiryListParams = {}) =>
    api.get<PaginatedResponse<Inquiry>>('/inquiries', {
      params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')),
    }),

  get: (id: string) => api.get<Inquiry>(`/inquiries/${id}`),

  update: (id: string, data: InquiryUpdatePayload) => api.patch<Inquiry>(`/inquiries/${id}`, data),
};
