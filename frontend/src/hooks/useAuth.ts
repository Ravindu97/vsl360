import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth.api';

export function useAuth() {
  const { user, isAuthenticated, setAuth, logout: clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await authApi.login(email, password);
      setAuth(data.user, data.accessToken);
      navigate('/dashboard');
    },
    [setAuth, navigate]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      navigate('/login');
    }
  }, [clearAuth, navigate]);

  return { user, isAuthenticated, login, logout };
}
