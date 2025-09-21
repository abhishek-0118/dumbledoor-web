'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthContextType, authService } from '@/lib/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (newToken: string): Promise<void> => {
    try {
      const userData = await authService.login(newToken);
      setToken(newToken);
      setUser(userData);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = (): void => {
    authService.logout();
    setToken(null);
    setUser(null);
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const userData = await authService.fetchUserInfo();
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const isAuthenticated = Boolean(token && authService.isTokenValid(token));

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      
      const storedToken = authService.getToken();
      const storedUser = authService.getUser();

      if (storedToken && authService.isTokenValid(storedToken)) {
        setToken(storedToken);
        
        if (storedUser) {
          setUser(storedUser);
        } else {
          // Fetch user data if not in localStorage
          try {
            const userData = await authService.fetchUserInfo();
            if (userData) {
              setUser(userData);
            }
          } catch (error) {
            console.error('Failed to fetch user data:', error);
            authService.removeToken();
          }
        }
      } else {
        // Clean up invalid tokens
        authService.removeToken();
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated,
    isLoading,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
