import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  title: string | null;
  role: 'super_user' | 'user';
}

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  isSuperUser: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          setSupabaseUser(session.user);
          await loadUserProfile(session.user.email!);
        } else {
          setSupabaseUser(null);
          setUser(null);
        }
      })();
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setSupabaseUser(session.user);
        await loadUserProfile(session.user.email!);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserProfile(email: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUser(data as User);
      } else {
        console.error('No user profile found for:', email);
        setUser(null);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUser(null);
    }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      setSupabaseUser(data.user);
      await loadUserProfile(email);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    setUser(null);
    setSupabaseUser(null);
  }

  const isSuperUser = user?.role === 'super_user';

  return (
    <AuthContext.Provider value={{ user, supabaseUser, loading, isSuperUser, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
