import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email?: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to get user info from localStorage first
    const storedUser = localStorage.getItem('user-profile');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
      }
    }

    // If no stored user, create a default one and let user customize
    if (!storedUser) {
      // Try to get name from browser or system
      const defaultName = getDefaultUserName();
      const defaultUser: User = {
        id: '1',
        name: defaultName
      };
      setUser(defaultUser);
      localStorage.setItem('user-profile', JSON.stringify(defaultUser));
    }

    setLoading(false);
  }, []);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user-profile', JSON.stringify(user));
    }
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

/**
 * Get a reasonable default name for the user
 */
function getDefaultUserName(): string {
  // Try to get name from system/browser
  try {
    // Check if we can get username from environment (won't work in browser, but safe to try)
    if (typeof window !== 'undefined') {
      // Browser environment - use a friendly default
      const timeOfDay = new Date().getHours();
      if (timeOfDay < 12) {
        return 'Good Morning User';
      } else if (timeOfDay < 17) {
        return 'Good Afternoon User';
      } else {
        return 'Good Evening User';
      }
    }
  } catch (error) {
    // Fallback
  }

  return 'User';
}
