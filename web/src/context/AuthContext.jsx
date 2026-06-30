import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await api.get('/api/auth/me');
    if (data && data.status === 'success') {
      setUser(data.user || data.profile || data);
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password, totp) => {
    const { data } = await api.post('/api/auth/login', { email, password, totp_code: totp });
    if (data && data.status === 'success') {
      await refresh();
    }
    return data;
  }, [refresh]);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/api/auth/register', payload);
    if (data && data.status === 'success') {
      await refresh();
    }
    return data;
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout');
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
