import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string, redirectTo?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateUserMetadata: (metadata: Record<string, any>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Private helper to clear client-side session state
  const _clearClientSession = () => {
    console.log('AuthContext: _clearClientSession called.');
    setUser(null);
    setIsLoading(false);
    setIsInitialized(true);
  };

  useEffect(() => {
    console.log('AuthContext: useEffect for auth state change listener triggered.');
    
    // Skip session check if we're on the set-password route
    if (window.location.pathname === '/set-password') {
      console.log('AuthContext: On /set-password route, skipping initial session check');
      setIsLoading(false);
      setIsInitialized(true);
      return;
    }
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {      
      console.log('AuthContext: Auth state change event:', event, 'Session user ID:', session?.user?.id);

      // Skip auth state processing if we're on the set-password route
      if (window.location.pathname === '/set-password') {
        console.log('AuthContext: On /set-password route, skipping auth state change processing');
        return;
      }
      
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        console.log('AuthContext: User signed out or deleted event detected.');
        _clearClientSession();
        return;
      }
      
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        try {
          console.log('AuthContext: User signed in or token refreshed. User ID:', session.user.id);
          console.log('AuthContext: User metadata:', session.user.user_metadata);
          
          // Determine if user needs to set password
          // This is true if:
          // 1. The user_metadata explicitly has needs_password_set = true, OR
          // 2. The user has just confirmed their email (email_confirmed_at exists) but hasn't set a password yet
          
          const isSuperAdmin = String(session.user.user_metadata?.is_super_admin).toLowerCase() === 'true';
          
          // Get the explicit needs_password_set flag from metadata
          const explicitNeedsPasswordSet = session.user.user_metadata?.needs_password_set === true;
          
          // Check if user has confirmed email but hasn't explicitly set needs_password_set to false
          const hasConfirmedEmail = !!session.user.email_confirmed_at;
          const hasSetPasswordFlag = session.user.user_metadata?.needs_password_set === false;
          
          // Determine final needs_password_set status
          const needsPasswordSet = explicitNeedsPasswordSet || (hasConfirmedEmail && !hasSetPasswordFlag);
          
          const emailConfirmedAt = session.user.email_confirmed_at;
          
          console.log('AuthContext: Is super admin from metadata:', isSuperAdmin);
          console.log('AuthContext: Explicit needs_password_set flag:', explicitNeedsPasswordSet);
          console.log('AuthContext: Has confirmed email:', hasConfirmedEmail);
          console.log('AuthContext: Has set password flag:', hasSetPasswordFlag);
          console.log('AuthContext: Final needs_password_set status:', needsPasswordSet);
          console.log('AuthContext: Email confirmed at:', emailConfirmedAt);
          
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            avatar: session.user.user_metadata?.avatar_url,
            is_super_admin: isSuperAdmin,
            needs_password_set: needsPasswordSet,
            email_confirmed_at: emailConfirmedAt
          });
        } catch (error) {
          console.error('AuthContext: Error updating user state during auth change:', error);
          _clearClientSession();
        } finally {
          setIsLoading(false);
          setIsInitialized(true);
          console.log('AuthContext: Auth state change processed. isLoading:', false, 'isInitialized:', true);
        }
        return;
      }
      
      // Log other events that might be relevant
      if (event === 'PASSWORD_RECOVERY') {
        console.log('AuthContext: PASSWORD_RECOVERY event received.');
        if (session?.user) {
          console.log('AuthContext: User present in PASSWORD_RECOVERY event:', session.user.id);
        } else {
          console.log('AuthContext: No user in PASSWORD_RECOVERY event.');
        }
      }
    });

    return () => {
      console.log('AuthContext: Unsubscribing from auth state changes.');
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      setIsLoading(true);
      console.log('AuthContext: checkSession called.');
      const { data: { session }, error } = await supabase.auth.getSession();      
      console.log('AuthContext: getSession result in checkSession:', { session, error });
      
      if (error) {
        console.error('AuthContext: Session check error:', error);
        _clearClientSession();
        return;
      }

      if (!session?.user) {
        console.log('AuthContext: No active session found in checkSession.');
        _clearClientSession();
        return;
      }

      // Set user from session
      console.log('AuthContext: Found existing session for user:', session.user.id);
      console.log('AuthContext: Session user metadata in checkSession:', session.user.user_metadata);
      
      // Determine if user needs to set password using the same logic as above
      const isSuperAdmin = String(session.user.user_metadata?.is_super_admin).toLowerCase() === 'true';
      
      // Get the explicit needs_password_set flag from metadata
      const explicitNeedsPasswordSet = session.user.user_metadata?.needs_password_set === true;
      
      // Check if user has confirmed email but hasn't explicitly set needs_password_set to false
      const hasConfirmedEmail = !!session.user.email_confirmed_at;
      const hasSetPasswordFlag = session.user.user_metadata?.needs_password_set === false;
      
      // Determine final needs_password_set status
      const needsPasswordSet = explicitNeedsPasswordSet || (hasConfirmedEmail && !hasSetPasswordFlag);
      
      const emailConfirmedAt = session.user.email_confirmed_at;
      
      console.log('AuthContext: Is super admin from session metadata:', isSuperAdmin);
      console.log('AuthContext: Explicit needs_password_set flag:', explicitNeedsPasswordSet);
      console.log('AuthContext: Has confirmed email:', hasConfirmedEmail);
      console.log('AuthContext: Has set password flag:', hasSetPasswordFlag);
      console.log('AuthContext: Final needs_password_set status:', needsPasswordSet);
      console.log('AuthContext: Email confirmed at from session:', emailConfirmedAt);
      
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
        avatar: session.user.user_metadata?.avatar_url,
        is_super_admin: isSuperAdmin,
        needs_password_set: needsPasswordSet,
        email_confirmed_at: emailConfirmedAt
      });
    } catch (error) {
      console.error('AuthContext: Error during initial session check:', error);
      _clearClientSession();
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
      console.log('AuthContext: checkSession finished. isLoading:', false, 'isInitialized:', true);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('AuthContext: Attempting login for email:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      console.log('AuthContext: signInWithPassword result:', { data, error });

      if (error) {
        console.error('AuthContext: Login error:', error);
        setIsLoading(false);
        return { success: false, error: error.message };
        setIsInitialized(true);
      }

      if (data?.user) {
        console.log('AuthContext: Login successful for user ID:', data.user.id);
        // User will be set by the auth state change event
        setIsLoading(false);
        return { success: true };
      }

      console.error('AuthContext: No user data returned from login.');
      setIsLoading(false);
      return { success: false, error: 'No user data returned' };
    } catch (error) {
      console.error('AuthContext: Unexpected error during login:', error);
      setIsLoading(false);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      };
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  const signup = async (email: string, password: string, name: string, redirectTo?: string) => {
    try {
      setIsLoading(true);
      console.log('AuthContext: Signing up user with email:', email);
      console.log('AuthContext: Using redirectTo URL:', redirectTo || `${window.location.origin}/set-password`);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo || `${window.location.origin}/set-password`,
          data: {
            full_name: name,
            needs_password_set: true
          }
        }
      });
      console.log('AuthContext: Signup result:', { 
        user: data?.user ? 'present' : 'missing', 
        session: data?.session ? 'present' : 'missing',
        identities: data?.user?.identities?.length,
        confirmationSent: data?.user?.confirmation_sent_at ? 'yes' : 'no',
        error: error ? error.message : 'none' 
      });

      if (error) {
        console.error('AuthContext: Signup error:', error);
        return { success: false, error: error.message };
      }

      if (data?.user) {
        console.log('AuthContext: Signup successful for user ID:', data.user.id);
        console.log('AuthContext: Email confirmation sent at:', data.user.confirmation_sent_at);
        console.log('AuthContext: User email confirmed at:', data.user.email_confirmed_at);
        console.log('AuthContext: User app metadata:', data.user.app_metadata);
        console.log('AuthContext: User identities:', data.user.identities);
        return { success: true };
      }

      console.error('AuthContext: No user data returned from signup');
      return { success: false, error: 'No user data returned' };
    } catch (error) {
      console.error('AuthContext: Unexpected error during signup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
      console.log('AuthContext: Signup process completed');
    }
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Logging out user.');
      // Call signOut directly without checking session
      await supabase.auth.signOut();
      console.log('AuthContext: supabase.auth.signOut() called.');
    } catch (error) {
      console.error('AuthContext: Unexpected error during logout:', error);
    } finally {
      // Always clear client session state
      _clearClientSession();
    }
  };

  const updatePassword = async (newPassword: string) => { 
    try {
      console.log('AuthContext: Attempting to update password.');
      // Get current session to ensure we have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('AuthContext: getSession result before updatePassword:', { session, sessionError });
      
      if (sessionError) {
        console.error('AuthContext: Error getting session before password update:', sessionError);
        return { success: false, error: sessionError.message };
      }
      
      if (!session) {
        console.log('AuthContext: No active session found for password update.');
        return { success: false, error: 'No active session' };
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      console.log('AuthContext: updateUser result:', { error });

      if (error) {
        console.error('AuthContext: Password update error:', error);
        return { success: false, error: error.message };
      }

      // Password updated successfully
      console.log('AuthContext: Password updated successfully. Logging out for clean session.');
      return { success: true };
    } catch (error) {
      console.error('AuthContext: Unexpected password update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  };

  const updateUserMetadata = async (metadata: Record<string, any>) => {
    try {
      console.log('AuthContext: Updating user metadata:', metadata);
      
      const { data, error } = await supabase.auth.updateUser({
        data: metadata
      });
      
      console.log('AuthContext: updateUser metadata result:', {
        user: data?.user ? 'present' : 'missing',
        error
      });
      
      if (error) {
        console.error('AuthContext: Error updating user metadata:', error);
        return { success: false, error: error.message };
      }
      
      // Update local user state with new metadata
      if (data?.user && user) {
        console.log('AuthContext: Updating local user state with new metadata');
        setUser({
          ...user,
          ...metadata
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('AuthContext: Unexpected error updating user metadata:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isInitialized,
    login,
    signup,
    logout,
    updatePassword,
    updateUserMetadata
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}