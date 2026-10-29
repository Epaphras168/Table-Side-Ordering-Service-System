import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, setToken } from '../api/client';
import { authApi } from '../api/resources';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | signed-in | signed-out

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setStatus('signed-out');
      return;
    }
    authApi
      .me()
      .then((profile) => {
        setUser(profile);
        setStatus('signed-in');
      })
      .catch(() => {
        setToken(null);
        setStatus('signed-out');
      });
  }, []);

  const login = useCallback(async (username, password) => {
    const { token, staff } = await authApi.login(username, password);
    setToken(token);
    setUser(staff);
    setStatus('signed-in');
    return staff;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setStatus('signed-out');
  }, []);

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
