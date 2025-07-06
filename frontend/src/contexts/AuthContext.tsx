/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the application
 * with NovaSanctum security integration.
 * 
 * Features:
 * - User authentication state
 * - Login/logout methods
 * - Token management
 * - User profile data
 * - Loading states
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { novaSanctumFrontend } from '@/services/novas Sanctum.service';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = novaSanctumFrontend.isAuthenticated();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (isAuthenticated) {
          const currentUser = novaSanctumFrontend.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [isAuthenticated]);

  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      setIsLoading(true);
      const result = await novaSanctumFrontend.authenticateUser({
        email,
        password,
        rememberMe
      });

      if (result.success && result.user) {
        setUser(result.user);
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await novaSanctumFrontend.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      if (isAuthenticated) {
        const currentUser = novaSanctumFrontend.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 