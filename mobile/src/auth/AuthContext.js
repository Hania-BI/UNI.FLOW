import { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiPost } from '../api/client';

const AuthContext = createContext(null);
const TOKEN_KEY = 'cc.token';
const USER_KEY = 'cc.user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedUser = await SecureStore.getItemAsync(USER_KEY);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    })();
  }, []);

  async function login(email, password) {
    console.log('[Auth] login attempt:', email);
    const data = await apiPost('/auth/login', { email, password });
    console.log('[Auth] login success, role:', data.user?.role);
    await persistSession(data);
  }

  async function register(name, email, password, role) {
    console.log('[Auth] register attempt:', email, role);
    await apiPost('/auth/register', { name, email, password, role });
    console.log('[Auth] register success');
  }

  async function logout() {
    console.log('[Auth] logout');
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setUser(null);
    setToken(null);
  }

  async function persistSession({ user, token }) {
    if (!token || !user) {
      console.error('[Auth] persistSession received incomplete data:', { token: !!token, user: !!user });
      throw new Error('Server returned an incomplete session. Please try again.');
    }
    console.log('[Auth] persisting session for user:', user.id, user.role);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    setToken(token);
    setUser(user);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
