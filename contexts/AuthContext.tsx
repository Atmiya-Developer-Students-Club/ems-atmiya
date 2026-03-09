"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  const refreshUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function getInitialUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (mounted) {
          setUser(user);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting initial user:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    }

    getInitialUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          if (event === 'SIGNED_OUT') {
            setUser(null);
            setLoading(false);
          } else if (event !== 'INITIAL_SESSION') {
            // For TOKEN_REFRESHED, SIGNED_IN, etc., fetch fresh user data
            // to ensure user_metadata (e.g. phone) is up-to-date
            const { data: { user: freshUser } } = await supabase.auth.getUser();
            if (mounted) {
              setUser(freshUser ?? session?.user ?? null);
              setLoading(false);
            }
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Remove supabase.auth dependency to prevent recreations

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
