import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initSupabaseAPI, type SupabaseAPI } from '@/lib/supabase-api';
import { toast } from 'sonner';

interface ApiContextType {
  api: SupabaseAPI | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
  retryConnection: () => Promise<void>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<SupabaseAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const initialize = async () => {
    try {
      setLoading(true);
      const baseUrl = import.meta.env.DEV ? '/api' : 'http://localhost:5006';
      console.log(`🔄 Initializing Supabase API connection to ${baseUrl}...`);
      
      const apiInstance = initSupabaseAPI(baseUrl);
      setApi(apiInstance);
      
      // Check if we have a stored token
      const token = localStorage.getItem('actual-token');
      if (token) {
        try {
          const version = await apiInstance.getServerVersion();
          setIsAuthenticated(true);
          console.log('✅ Token validated, user is authenticated. Server version:', version);
        } catch (err) {
          console.warn('❌ Token validation failed, clearing stored token', err);
          localStorage.removeItem('actual-token');
          setIsAuthenticated(false);
        }
      }
      
    } catch (err) {
      console.error('💥 Failed to initialize Supabase API:', err);
      toast.error('Failed to connect to server. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const login = async (password: string) => {
    if (!api) {
      throw new Error('API not initialized');
    }

    try {
      console.log('🔐 Attempting login...');
      const result = await api.login(password);
      setIsAuthenticated(true);
      console.log('✅ Login successful');
      toast.success('🎉 Login successful!');
    } catch (error) {
      console.error('❌ Login failed:', error);
      setIsAuthenticated(false);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('actual-token');
    setIsAuthenticated(false);
    console.log('👋 User logged out');
    toast.info('Logged out');
  };

  useEffect(() => {
    initialize();
  }, []);

  return (
    <ApiContext.Provider value={{
      api,
      loading,
      isAuthenticated,
      login,
      logout,
      retryConnection: initialize,
    }}>
      {children}
    </ApiContext.Provider>
  );
}

export function useApi() {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
}
