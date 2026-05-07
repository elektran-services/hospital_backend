'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export interface HospitalInfo {
  id: string;
  name: string;
  logo?: string | null;
}

export interface BranchInfo {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  phone?: string | null;
}

export interface User {
  id: string;
  role: string;
  status?: string;
  fullName?: string;
  email?: string;
  hospitalId: string;
  branchId?: string | null;
  hospital?: HospitalInfo | null;
  branch?: BranchInfo | null;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/v1/users/me', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user ?? data);
        }
      } catch {
        console.log('Not authenticated');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      const payloadUser = data.user ?? data;
      if (!payloadUser) {
        throw new Error('Invalid login response');
      }
      setUser(payloadUser);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during login';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      setUser(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const context = React.useContext(AuthContext);
  const router = useRouter();

  React.useEffect(() => {
    if (context && !context.loading && !context.isAuthenticated) {
      router.push('/login');
    }
  }, [context, router]);

  if (!context || context.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-12 w-12 text-indigo-600" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!context.isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
