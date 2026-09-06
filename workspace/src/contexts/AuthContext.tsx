'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { safeLocalStorage } from '@/lib/storage';

export interface UserType {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin' | 'artist';
  studyTime: number;
  profilePic?: string;
  phoneNumber?: string;
  bio?: string;
  isAdminStudent?: boolean;
  isPremium?: boolean;
  aiCredits?: number;
  // Artist marketplace fields
  rateDrawingOnly?: number;
  rateDrawingWriting?: number;
  specialties?: string[];
  isAvailable?: boolean;
  rating?: number;
  completedOrders?: number;
}

export interface AuthContextProps {
  token: string | null;
  user: UserType | null;
  setUser: React.Dispatch<React.SetStateAction<UserType | null>>;
  isAuthenticated: boolean;
  isLoading: boolean;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  isKeyModalOpen: boolean;
  setIsKeyModalOpen: (open: boolean) => void;
  login: (token: string, user: UserType) => void;
  logout: () => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  updateUserStudyTime: (seconds: number) => Promise<void>;
  updateSession: (token: string, user: UserType) => void;
  language: 'en' | 'bn';
  setLanguage: (lang: 'en' | 'bn') => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [geminiApiKey, setGeminiApiKeyState] = useState<string>('');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [language, setLanguageState] = useState<'en' | 'bn'>('en');

  // Initialize from local storage on mount (client only)
  useEffect(() => {
    let cancelled = false;
    const storedToken = safeLocalStorage.getItem('png_token');
    const storedKey = safeLocalStorage.getItem('user_gemini_key') || '';
    const storedLang = safeLocalStorage.getItem('png_lang');
    if (storedToken) setToken(storedToken);
    if (storedKey) setGeminiApiKeyState(storedKey);
    if (storedLang === 'bn' || storedLang === 'en') setLanguageState(storedLang);

    // Validate token with the server
    const initializeAuth = async () => {
      if (!storedToken) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        // Guard against unmount or rapid remount — if cancelled, don't
        // update state (prevents stale response overwriting newer one).
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (cancelled) return;
          if (data.user) {
            setUser(data.user);
          } else {
            // Token is invalid — clear it so the user sees the login page
            safeLocalStorage.removeItem('png_token');
            setToken(null);
          }
        } else if (res.status === 401 || res.status === 404) {
          // 401 = token is genuinely invalid; 404 = user no longer exists in DB.
          // Both cases: clear the token so the user sees the login page.
          safeLocalStorage.removeItem('png_token');
          setToken(null);
        } else {
          // 503 (DB down), 500 (server error), network blip — DON'T clear the
          // token. Keep the user logged in so they can retry when the DB
          // comes back. Previous code cleared the token on ANY non-200,
          // which logged everyone out during transient Neon connection drops.
          console.warn(`Auth check returned ${res.status}, keeping token`);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to authenticate session token on startup:', err);
        // Network error or DB connection dropped — DON'T clear the token.
        // Keep the user logged in so they can retry when the network/DB
        // comes back. Previous code cleared the token on every network error,
        // logging users out during transient Neon connection drops.
        // The user will see a "reconnecting" state in the UI instead.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const setGeminiApiKey = useCallback((key: string) => {
    const trimmed = key.trim();
    setGeminiApiKeyState(trimmed);
    if (trimmed) {
      safeLocalStorage.setItem('user_gemini_key', trimmed);
    } else {
      safeLocalStorage.removeItem('user_gemini_key');
    }
  }, []);

  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const activeToken = token || safeLocalStorage.getItem('png_token');
      const customGeminiKey = geminiApiKey || safeLocalStorage.getItem('user_gemini_key');
      const headers = {
        ...(options.headers || {}),
      } as Record<string, string>;

      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }
      if (customGeminiKey && customGeminiKey.trim()) {
        headers['x-gemini-api-key'] = customGeminiKey.trim();
      }

      try {
        const res = await fetch(url, { ...options, headers });
        // Auto-report 5xx responses — 4xx is the client's fault, not a bug.
        if (res.status >= 500) {
          // Import lazily to keep the bundle small
          import('@/lib/client-error-capture').then(({ reportError }) => {
            reportError({
              type: 'fetch_error',
              message: `Server returned ${res.status} ${res.statusText} for ${url}`,
              extra: { requestUrl: url.slice(0, 500), method: options.method || 'GET', status: res.status },
            });
          });
        }
        return res;
      } catch (err: any) {
        // Network-level failure (DNS, connection refused, etc.) — report it
        import('@/lib/client-error-capture').then(({ reportError }) => {
          reportError({
            type: 'fetch_error',
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack || '' : '',
            extra: { requestUrl: url.slice(0, 500), method: options.method || 'GET' },
          });
        });
        throw err;
      }
    },
    [token, geminiApiKey],
  );

  const login = useCallback((newToken: string, newUser: UserType) => {
    safeLocalStorage.setItem('png_token', newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const updateSession = useCallback((newToken: string, newUser: UserType) => {
    safeLocalStorage.setItem('png_token', newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    safeLocalStorage.removeItem('png_token');
    setToken(null);
    setUser(null);
  }, []);

  const updateUserStudyTime = useCallback(
    async (seconds: number) => {
      try {
        const res = await apiFetch('/api/auth/track-time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seconds }),
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (typeof data.studyTime === 'number') {
            // Functional updater — avoids stale `user` closure that would
            // overwrite freshly-saved profilePic / name / bio with old values.
            setUser((prev) => prev ? { ...prev, studyTime: data.studyTime } : prev);
          }
        }
      } catch (err) {
        console.error('Could not register study session details:', err);
      }
    },
    [apiFetch],
  );

  const setLanguage = useCallback((lang: 'en' | 'bn') => {
    setLanguageState(lang);
    safeLocalStorage.setItem('png_lang', lang);
  }, []);

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        setUser,
        isAuthenticated,
        isLoading,
        geminiApiKey,
        setGeminiApiKey,
        isKeyModalOpen,
        setIsKeyModalOpen,
        login,
        logout,
        apiFetch,
        updateUserStudyTime,
        updateSession,
        language,
        setLanguage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be called from within an AuthProvider root context node');
  }
  return context;
};
