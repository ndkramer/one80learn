import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';

interface AdminUser {
  id: string;
  email: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Admin auth state change:', event);
      
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setAdmin(null);
        setIsLoading(false);
        return;
      }
      
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        await checkAdminStatus(session.user.id, session.user.email);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAdminSession = async () => {
    try {
      setIsLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Admin session check error:', error);
        setAdmin(null);
        setIsLoading(false);
        return;
      }

      if (!session) {
        console.log('No active admin session');
        setAdmin(null);
        setIsLoading(false);
        return;
      }

      await checkAdminStatus(session.user.id, session.user.email);
    } catch (error) {
      console.error('Error checking admin session:', error);
      setAdmin(null);
      setIsLoading(false);
    }
  };

  const checkAdminStatus = async (userId: string, email?: string | null) => {
    try {
      // For simplicity, we'll consider any authenticated user as an admin
      // In a real application, you would check against a specific admin table or role
      
      if (email) {
        setAdmin({
          id: userId,
          email: email
        });
      } else {
        setAdmin(null);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if user is an admin
      await checkAdminStatus(data.user.id, data.user.email);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setAdmin(null);
    } catch (error) {
      console.error('Error during admin logout:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectTo = window.location.origin + '/admin/reset-password';
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  };

  const value = {
    admin,
    isAuthenticated: !!admin,
    isLoading,
    login,
    logout,
    resetPassword
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}