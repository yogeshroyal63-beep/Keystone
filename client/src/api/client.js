const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const readStoredToken = (key) => localStorage.getItem(key) || '';

const syncAuthFromRefresh = ({ user, accessToken, refreshToken }) => {
  if (!user || !accessToken || !refreshToken) {
    localStorage.removeItem('keystone-user');
    localStorage.removeItem('keystone-access-token');
    localStorage.removeItem('keystone-refresh-token');
    window.dispatchEvent(new CustomEvent('keystone-auth-sync', { detail: { user: null, accessToken: '', refreshToken: '' } }));
    return;
  }

  localStorage.setItem('keystone-user', JSON.stringify(user));
  localStorage.setItem('keystone-access-token', accessToken);
  localStorage.setItem('keystone-refresh-token', refreshToken);
  window.dispatchEvent(new CustomEvent('keystone-auth-sync', { detail: { user, accessToken, refreshToken } }));
};

const isAuthFailure = (message = '') => [
  'Invalid or expired token.',
  'User no longer exists.',
  'Authentication required.',
  'Session expired.',
  'Invalid refresh token.',
].includes(message);

export async function apiRequest(path, options = {}, token) {
  const requestWithToken = async (currentToken) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (currentToken) {
      headers.Authorization = `Bearer ${currentToken}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) {
      throw new Error(payload.message || 'Request failed');
    }

    return payload;
  };

  try {
    return await requestWithToken(token);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';

    if (isAuthFailure(message)) {
      const refreshToken = readStoredToken('keystone-refresh-token');
      if (!refreshToken) {
        throw error;
      }

      const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      let refreshPayload = {};
      try {
        refreshPayload = await refreshResponse.json();
      } catch {
        refreshPayload = {};
      }

      if (!refreshResponse.ok) {
        syncAuthFromRefresh({ user: null, accessToken: '', refreshToken: '' });
        throw new Error(refreshPayload.message || 'Session expired');
      }

      syncAuthFromRefresh(refreshPayload);
      return requestWithToken(refreshPayload.accessToken);
    }

    throw error;
  }
}

export { API_URL };
