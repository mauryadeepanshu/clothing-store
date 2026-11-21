import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tokenStore.get()) { setReady(true); return; }
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => tokenStore.clear())
      .finally(() => setReady(true));
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // Any 401 on an authenticated request means the token is no longer valid.
  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('mfs:unauthorized', onUnauthorized);
    return () => window.removeEventListener('mfs:unauthorized', onUnauthorized);
  }, [logout]);

  const finish = (d) => {
    tokenStore.set(d.token);
    setUser(d.user);
    return d.user;
  };

  const value = useMemo(
    () => ({
      user,
      ready,
      isAdmin: user?.role === 'admin',
      login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password }, auth: false }).then(finish),
      adminLogin: (email, password) => api('/auth/admin/login', { method: 'POST', body: { email, password }, auth: false }).then(finish),
      register: (name, email, password) => api('/auth/register', { method: 'POST', body: { name, email, password }, auth: false }).then(finish),
      logout,
      setUser,
    }),
    [user, ready, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
