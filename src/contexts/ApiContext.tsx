import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initAPI, getAPI, ActualAPI } from '@/lib/api';
import { toast } from 'sonner';

interface ApiContextType {
  api: ActualAPI | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  login: (password: string) => Promise<void>;
  logout: () => void;
  retryConnection: () => Promise<void>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [api, setApi] = useState<ActualAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const initialize = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Initializing API connection to http://localhost:5006...');
      
      // Initialize the API client with the correct base URL
      const apiInstance = await initAPI({
        baseUrl: 'http://localhost:5006',
        token: localStorage.getItem('actual-token') || undefined
      });
      
      console.log('API instance created successfully');
      
      // Check if we have a stored token
      const token = localStorage.getItem('actual-token');
      if (token) {
        // Try to validate the existing token
        try {
          const version = await apiInstance.getServerVersion();
          setIsAuthenticated(true);
          console.log('Token validated, user is authenticated. Server version:', version);
        } catch (err) {
          // Token is invalid, clear it
          console.warn('Token validation failed, clearing stored token', err);
          localStorage.removeItem('actual-token');
          setIsAuthenticated(false);
        }
      }
      
      setApi(apiInstance);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize API');
      setError(error);
      console.error('Failed to initialize API:', err);
      
      // Show user-friendly error message
      if (err instanceof Error) {
        if (err.message.includes('Cannot connect to Actual Budget server')) {
          toast.error(err.message);
        } else if (err.message.includes('fetch')) {
          toast.error('Cannot connect to Actual Budget server. Please ensure it is running on port 5006.');
        } else if (err.message.includes('<!doctype')) {
          toast.error('Server is returning HTML instead of JSON. Please check if the Actual Budget server is properly configured.');
        } else {
          toast.error(`API Error: ${err.message}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (password: string) => {
    if (!api) {
      throw new Error('API not initialized');
    }
    
    // Client-side password validation
    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters');
      throw new Error('Invalid password format');
    }
    
    try {
      const result = await api.login(password);
      localStorage.setItem('actual-token', result.token);
      setIsAuthenticated(true);
      
      // Show secure login message
      const message = result.message || 'Successfully logged in';
      toast.success(message, {
        description: '🔐 Your data is encrypted and secure',
        duration: 5000,
      });
    } catch (err) {
      console.error('Login failed:', err);
      if (err instanceof Error && err.message.includes('401')) {
        toast.error('Invalid password');
      } else {
        toast.error('Login failed. Please try again.');
      }
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('actual-token');
    setIsAuthenticated(false);
    toast.info('Logged out');
  };

  const retryConnection = async () => {
    await initialize();
  };

  useEffect(() => {
    initialize();
  }, []);

  return (
    <ApiContext.Provider value={{ 
      api, 
      loading, 
      error, 
      isAuthenticated,
      login,
      logout,
      retryConnection
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
