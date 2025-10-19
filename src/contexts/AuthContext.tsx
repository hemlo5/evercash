import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { 
  supabase, 
  signInWithGoogle, 
  signOut as supabaseSignOut,
  getUserProfile,
  createUserProfile,
  UserProfile
} from '@/lib/supabase-client';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) return;
    
    const userProfile = await getUserProfile(user.id);
    if (userProfile) {
      setProfile(userProfile);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fallback = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 4000);

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        if (event === 'SIGNED_IN') {
          try { localStorage.setItem('actual-token', `supabase-${session.user.id}`); } catch {}
        }
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    // Initial session check, always end loading
    (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Supabase getSession error:', error);
        }
        if (!isMounted) return;
        setUser(session?.user ?? null);
        if (session?.user) {
          // On boot, if session exists and app token missing, set it so returning users skip Landing
          try {
            if (!localStorage.getItem('actual-token')) {
              localStorage.setItem('actual-token', `supabase-${session.user.id}`);
            }
          } catch {}
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.warn('Supabase getSession failed:', err);
      } finally {
        clearTimeout(fallback);
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
      clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      let userProfile = await getUserProfile(userId);
      
      // Create profile if it doesn't exist
      if (!userProfile && user) {
        userProfile = await createUserProfile({
          id: userId,
          email: user.email!,
          full_name: user.user_metadata.full_name || '',
          avatar_url: user.user_metadata.avatar_url || '',
          onboarding_completed: false,
        });
      }
      
      setProfile(userProfile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignInWithGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      try { localStorage.removeItem('actual-token'); } catch {}
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(k => { if (k.startsWith('sb-')) localStorage.removeItem(k); });
      } catch {}
      try {
        await supabase.auth.signOut({ scope: 'global' } as any);
      } catch {}
      await supabaseSignOut();
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    profile,
    loading,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
