import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '../lib/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

type AuthContextState = {
  user: UserProfile | null;
  session: any;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionData = supabase.auth.getSession();
    sessionData.then((result) => {
      setSession(result.data.session);
      if (result.data.session?.user) {
        const profile = {
          id: result.data.session.user.id,
          name: result.data.session.user.user_metadata?.full_name || 'Guest',
          email: result.data.session.user.email || '',
          created_at: result.data.session.user.created_at || ''
        };
        setUser(profile);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, sessionValue) => {
      setSession(sessionValue);
      if (sessionValue?.user) {
        setUser({
          id: sessionValue.user.id,
          email: sessionValue.user.email || '',
          name: sessionValue.user.user_metadata?.full_name || 'Guest',
          created_at: sessionValue.user.created_at || ''
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password }, { data: { full_name: name } });
    if (error) throw error;
    if (data.session?.user) {
      setUser({ id: data.session.user.id, email, name, created_at: data.session.user.created_at || '' });
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session?.user) {
      setUser({
        id: data.session.user.id,
        email,
        name: data.session.user.user_metadata?.full_name || 'Guest',
        created_at: data.session.user.created_at || ''
      });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
