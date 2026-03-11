import api from './client';
import type { LoginResponse } from '@/types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),

  refresh: () => api.post<{ accessToken: string }>('/auth/refresh'),

  logout: () => api.post('/auth/logout'),

  me: () => api.get('/auth/me'),
};
