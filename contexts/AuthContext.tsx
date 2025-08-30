import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { validatePassword, validateEmail, SecureLogger, SessionTimeoutManager, RateLimiter } from '@/lib/security';
import { AuditLogger } from '@/lib/auditLogger';

type AuthContextType = {
  session: Session | null;
  user: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        SecureLogger.error('Session error:', error);
        console.log('Session error:', error);
      }
      
      SecureLogger.log('Initial session loaded', { hasSession: !!session, userId: session?.user?.id });
      console.log('Session check result:', { hasSession: !!session, userId: session?.user?.id, error });
      
      // Try manual refresh if no session but no error
      if (!session && !error) {
        try {
          SecureLogger.log('No session found, attempting refresh...');
          console.log('No session found, attempting refresh...');
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            // Don't show error, just continue
            setSession(null);
            setUser(null);
          } else {
            if (refreshedSession) {
              setSession(refreshedSession);
              // Ensure user profile is loaded with role information
              await ensureUserProfile(refreshedSession.user);
              SecureLogger.log('Session restored from refresh');
              console.log('Session restored from refresh');
            } else {
              setSession(null);
              setUser(null);
            }
          }
        } catch (error) {
          // Don't show error, just continue with no session
          setSession(null);
          setUser(null);
        }
      } else {
        setSession(session);
        if (session?.user) {
          // Ensure user profile is loaded with role information
          await ensureUserProfile(session.user);
        } else {
          setUser(null);
        }
      }
      
      // Get the final session state (either original or refreshed)
      const finalSession = session || null;
      
      if (finalSession?.user) {
        await ensureUserProfile(finalSession.user);
        // Initialize session timeout manager
        await SessionTimeoutManager.init(
          () => SecureLogger.warn('Session timeout warning'),
          () => handleSessionTimeout()
        );
      }
      
      // Always set loading to false at the end
      setLoading(false);
      console.log('AuthContext loading set to false, final session:', { hasSession: !!finalSession });
    } catch (error) {
      SecureLogger.error('Error initializing auth', error);
      setLoading(false);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        SecureLogger.log('Auth state change', { event, hasSession: !!session });
        
        if (event === 'SIGNED_IN' && session?.user) {
          SecureLogger.log('Processing SIGNED_IN event');
          setSession(session);
          setUser(session.user);
          await ensureUserProfile(session.user);
          // Initialize session timeout on sign in
          await SessionTimeoutManager.init(
            () => SecureLogger.warn('Session timeout warning'),
            () => handleSessionTimeout()
          );
        } else if (event === 'SIGNED_OUT') {
          SecureLogger.log('Processing SIGNED_OUT event');
          // Cleanup session timeout on sign out
          SessionTimeoutManager.destroy();
          setSession(null);
          setUser(null);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          SecureLogger.log('Processing TOKEN_REFRESHED event');
          setSession(session);
          // Re-ensure user profile to maintain role information
          await ensureUserProfile(session.user);
        } else {
          SecureLogger.log('Processing other auth event or clearing session');
          setSession(session);
          if (session?.user) {
            // Re-ensure user profile to maintain role information
            await ensureUserProfile(session.user);
          } else {
            setUser(null);
          }
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
      SessionTimeoutManager.destroy();
    };
  };

  const handleSessionTimeout = async () => {
    SecureLogger.warn('Session timed out - automatic logout');
    try {
      await signOut();
    } catch (error) {
      SecureLogger.error('Error during timeout logout', error);
    }
  };

  const ensureUserProfile = async (authUser: any) => {
    try {
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        SecureLogger.error('Error checking user profile', fetchError);
        return;
      }

      if (!existingUser) {
        SecureLogger.log('Creating user profile for user');
        try {
          const { error: insertError } = await supabase
            .from('users')
            .insert([{
              id: authUser.id,
              name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
              email: authUser.email,
              role: 'user',
              push_notifications_enabled: true,
              sound_vibration_enabled: true,
            }]);

          if (insertError) {
            if (
              insertError.message.includes('push_notifications_enabled') ||
              insertError.message.includes('sound_vibration_enabled')
            ) {
              SecureLogger.log('Notification columns missing, inserting basic profile');
              const { error: basicInsertError } = await supabase
                .from('users')
                .insert([{
                  id: authUser.id,
                  name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
                  email: authUser.email,
                  role: 'user',
                }]);

              if (basicInsertError) {
                SecureLogger.error('Error inserting basic profile', basicInsertError);
              } else {
                SecureLogger.log('Basic profile created successfully');
              }
            } else {
              SecureLogger.error('Insert error', insertError);
            }
          } else {
            SecureLogger.log('Profile created with notification fields');
          }
        } catch (createError) {
          SecureLogger.error('Error creating user profile', createError);
        }
      } else {
        try {
          if (
            existingUser.push_notifications_enabled === undefined ||
            existingUser.sound_vibration_enabled === undefined
          ) {
            SecureLogger.log('Updating user with missing notification fields');
            const { error: updateError } = await supabase
              .from('users')
              .update({
                push_notifications_enabled: existingUser.push_notifications_enabled ?? true,
                sound_vibration_enabled: existingUser.sound_vibration_enabled ?? true,
              })
              .eq('id', authUser.id);

            if (updateError) {
              SecureLogger.log('Could not update notification fields', updateError);
            }
          }
        } catch (updateError) {
          SecureLogger.log('Notification update failed', updateError);
        }
      }

      // After ensuring profile exists, fetch the complete user profile and update user state
      try {
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError) {
          SecureLogger.error('Error fetching user profile after ensure', profileError);
        } else {
          // Merge auth user with profile data - profile takes precedence for role
          const completeUser = {
            ...authUser,
            ...userProfile,
            // Keep auth-specific fields from authUser
            id: authUser.id,
            email: authUser.email,
          };
          
          setUser(completeUser);
          SecureLogger.log('User profile loaded with role', { role: userProfile.role, email: authUser.email });
          console.log('Complete user profile set:', { role: userProfile.role, email: authUser.email });
        }
      } catch (profileFetchError) {
        SecureLogger.error('Error in profile fetch', profileFetchError);
      }

    } catch (error) {
      SecureLogger.error('ensureUserProfile error', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      SecureLogger.log('Sign in attempt initiated');
      
      // Check client-side rate limiting first
      const rateLimitCheck = await RateLimiter.checkAttempts(email);
      if (!rateLimitCheck.allowed) {
        const lockoutEndsAt = new Date(rateLimitCheck.lockoutEndsAt!);
        throw new Error(`Too many failed attempts. Account locked until ${lockoutEndsAt.toLocaleTimeString()}`);
      }
      
      // Check server-side account lock
      try {
        const { data: isLocked } = await supabase.rpc('check_account_lock', { email_input: email });
        if (isLocked) {
          throw new Error('Account locked. Try again in 30 minutes');
        }
      } catch (rpcError) {
        // If RPC doesn't exist, continue with login (backwards compatibility)
        SecureLogger.log('Account lock check RPC not available, continuing');
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        SecureLogger.warn('Sign in failed');
        // Record failed attempt
        await RateLimiter.recordFailedAttempt(email);
        // Also record on server if RPC exists
        try {
          await supabase.rpc('increment_failed_login', { email_input: email });
        } catch (rpcError) {
          SecureLogger.log('Failed login RPC not available');
        }
        // Log failed login audit event
        await AuditLogger.logAuthEvent('login_failed', undefined, { email, error: error.message });
        throw error;
      }
      
      if (data.user) {
        SecureLogger.log('Sign in successful');
        // Clear failed attempts on success
        await RateLimiter.clearAttempts(email);
        // Also clear on server if RPC exists
        try {
          await supabase.rpc('reset_failed_login', { user_id_input: data.user.id });
        } catch (rpcError) {
          SecureLogger.log('Reset failed login RPC not available');
        }
        // Update activity for session timeout
        await SessionTimeoutManager.updateLastActivity();
        // Log successful login audit event
        await AuditLogger.logAuthEvent('login_success', data.user.id, { email });
      }
      
    } catch (error) {
      SecureLogger.error('Sign in error', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      SecureLogger.log('Sign up attempt initiated');
      
      // Validate email format
      if (!validateEmail(email)) {
        throw new Error('Please enter a valid email address');
      }
      
      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        const errorMessage = `Password requirements not met:\n${passwordValidation.errors.join('\n')}`;
        throw new Error(errorMessage);
      }
      
      // Validate name
      if (!name || name.trim().length < 2) {
        throw new Error('Please enter a valid name (at least 2 characters)');
      }
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: { data: { name: name.trim() } }
      });
      
      if (authError) {
        SecureLogger.warn('Sign up failed');
        throw authError;
      }
      
      SecureLogger.log('Sign up successful');
    } catch (error) {
      SecureLogger.error('Sign up error', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const startTime = Date.now();
      SecureLogger.log('Starting signOut process');
      
      // Set loading to prevent immediate navigation issues
      setLoading(true);
      
      const { data: { session: beforeSession } } = await supabase.auth.getSession();
      SecureLogger.log('Session exists before signOut', { hasSession: !!beforeSession });
      
      if (!beforeSession) {
        SecureLogger.warn('No session found, but continuing with signOut process');
      }

      SecureLogger.log('Calling supabase.auth.signOut');
      const { error } = await supabase.auth.signOut();
      if (error) {
        SecureLogger.error('Supabase signOut error', error);
        setLoading(false);
        throw error;
      }

      const signOutTime = Date.now();
      SecureLogger.log('Supabase signOut successful', { duration: signOutTime - startTime });
      
      // Log logout audit event
      if (beforeSession?.user) {
        await AuditLogger.logAuthEvent('logout', beforeSession.user.id);
      }
      
      // Clean up session timeout manager
      SessionTimeoutManager.destroy();
      
      // Clear local state immediately
      SecureLogger.log('Clearing local session state');
      setSession(null);
      setUser(null);
      SecureLogger.log('Local state cleared');

      // Add a delay to ensure state updates propagate to all components
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verify session is actually cleared
      const { data: { session: afterSession } } = await supabase.auth.getSession();
      SecureLogger.log('Session verification after signOut', { hasSession: !!afterSession });
      
      if (afterSession) {
        SecureLogger.warn('Session still exists after signOut - potential issue');
        // Force clear again if needed
        setSession(null);
        setUser(null);
      } else {
        SecureLogger.log('Session successfully cleared from Supabase');
      }
      
      setLoading(false);
      
      const endTime = Date.now();
      SecureLogger.log('SignOut process completed', { totalDuration: endTime - startTime });
      
    } catch (error) {
      SecureLogger.error('Error during signOut', error);
      
      // Clear state even on error for security
      SecureLogger.log('Clearing state due to error');
      SessionTimeoutManager.destroy();
      setSession(null);
      setUser(null);
      setLoading(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
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