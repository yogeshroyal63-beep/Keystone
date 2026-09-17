import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client';

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem('keystone-user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const readStoredToken = (key) => localStorage.getItem(key) || '';

const clearStoredAuth = () => {
  localStorage.removeItem('keystone-user');
  localStorage.removeItem('keystone-access-token');
  localStorage.removeItem('keystone-refresh-token');
};

const emitAuthSync = (payload) => {
  window.dispatchEvent(new CustomEvent('keystone-auth-sync', { detail: payload }));
};

const normalizeEmail = (value = '') => value.trim().toLowerCase();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [accessToken, setAccessToken] = useState(() => readStoredToken('keystone-access-token'));
  const [refreshToken, setRefreshToken] = useState(() => readStoredToken('keystone-refresh-token'));

  useEffect(() => {
    const handleAuthSync = (event) => {
      const payload = event.detail;
      if (!payload) return;

      setUser(payload.user || null);
      setAccessToken(payload.accessToken || '');
      setRefreshToken(payload.refreshToken || '');

      if (payload.user) {
        localStorage.setItem('keystone-user', JSON.stringify(payload.user));
      }
      if (payload.accessToken) {
        localStorage.setItem('keystone-access-token', payload.accessToken);
      }
      if (payload.refreshToken) {
        localStorage.setItem('keystone-refresh-token', payload.refreshToken);
      }
    };

    window.addEventListener('keystone-auth-sync', handleAuthSync);
    return () => window.removeEventListener('keystone-auth-sync', handleAuthSync);
  }, []);

  const persistAuth = ({ user: nextUser, accessToken: nextAccessToken, refreshToken: nextRefreshToken }) => {
    setUser(nextUser);
    setAccessToken(nextAccessToken);
    setRefreshToken(nextRefreshToken);

    localStorage.setItem('keystone-user', JSON.stringify(nextUser));
    localStorage.setItem('keystone-access-token', nextAccessToken);
    localStorage.setItem('keystone-refresh-token', nextRefreshToken);
    emitAuthSync({ user: nextUser, accessToken: nextAccessToken, refreshToken: nextRefreshToken });
  };

  const login = async ({ email, password }) => {
    const cleanedEmail = normalizeEmail(email);
    const cleanedPassword = String(password || '').trim();

    if (!cleanedEmail || !cleanedPassword) {
      throw new Error('Email and password are required.');
    }

    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: cleanedEmail, password: cleanedPassword }),
    });

    persistAuth(data);
    return data;
  };

  const signup = async ({ name, email, password }) => {
    const cleanedName = String(name || '').trim();
    const cleanedEmail = normalizeEmail(email);
    const cleanedPassword = String(password || '').trim();

    if (!cleanedName || !cleanedEmail || !cleanedPassword) {
      throw new Error('Name, email, and password are required.');
    }

    if (cleanedPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const data = await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name: cleanedName, email: cleanedEmail, password: cleanedPassword }),
    });

    persistAuth(data);
    return data;
  };

  const logout = () => {
    setUser(null);
    setAccessToken('');
    setRefreshToken('');
    clearStoredAuth();
    emitAuthSync({ user: null, accessToken: '', refreshToken: '' });
  };

  const value = useMemo(
    () => ({ user, accessToken, refreshToken, login, signup, logout }),
    [user, accessToken, refreshToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
