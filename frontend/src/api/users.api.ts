import api from './client';
import type { PaginatedResponse, User } from '@/types';

export const usersApi = {
  list: (page = 1, pageSize = 10) => api.get<PaginatedResponse<User>>('/users', { params: { page, pageSize } }),

  get: (id: string) => api.get<User>(`/users/${id}`),

  create: (data: any) => api.post<User>('/users', data),

  update: (id: string, data: any) => api.put<User>(`/users/${id}`, data),

  delete: (id: string) => api.delete(`/users/${id}`),
};
