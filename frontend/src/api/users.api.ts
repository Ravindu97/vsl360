import api from './client';
import type { User } from '@/types';

export const usersApi = {
  list: () => api.get<User[]>('/users'),

  get: (id: string) => api.get<User>(`/users/${id}`),

  create: (data: any) => api.post<User>('/users', data),

  update: (id: string, data: any) => api.put<User>(`/users/${id}`, data),

  delete: (id: string) => api.delete(`/users/${id}`),
};
