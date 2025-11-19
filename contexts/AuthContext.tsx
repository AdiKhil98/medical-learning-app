import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { validatePassword, validateEmail, SecureLogger, SessionTimeoutManager, RateLimiter } from '@/lib/security';
import { AuditLogger } from '@/lib/auditLogger';

type AuthContextType = {
  session: Session | null;
  user: any | null;
  loading: boolean;
  isEmailVerified: boolean; // SECURITY: Email verification status
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
    
    // EMERGENCY FALLBACK: Force loading to false after 3 seconds no matter what
    const emergencyTimeout = setTimeout(() => {
      setLoading(false);
    }, 3000);
    
    return () => clearTimeout(emergencyTimeout);
  }, []);

  const initializeAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        SecureLogger.error('Session error:', error);
      }
      
      SecureLogger.log('Initial session loaded', { hasSession: !!session, userId: session?.user?.id });
      
      // Set the session state immediately and end loading
      setSession(session);
      setLoading(false); // Move this up to prevent infinite loading
      
      // Handle user profile loading asynchronously without blocking
      if (session?.user) {
        ensureUserProfile(session.user).catch(error => {
        });
        
        // Initialize session timeout manager asynchronously
        SessionTimeoutManager.init(
          () => SecureLogger.warn('Session timeout warning'),
          () => handleSessionTimeout()
        ).catch(error => {
        });
      } else {
        setUser(null);
      }
      
    } catch (error) {
      SecureLogger.error('Error initializing auth', error);
      setSession(null);
      setUser(null);
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

          // Force clear session and user state immediately
          setSession(null);
          setUser(null);

          // Also force a brief loading state to ensure proper navigation
          setLoading(true);
          setTimeout(() => setLoading(false), 100);
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
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('User profile fetch timeout')), 5000)
      );
      
      const fetchPromise = supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      
      const { data: existingUser, error: fetchError } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

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
      const signInStartTime = performance.now();
      SecureLogger.log('Sign in attempt initiated');
      
      // Check client-side rate limiting first
      const rateLimitStartTime = performance.now();
      const rateLimitCheck = await RateLimiter.checkAttempts(email);
      
      if (!rateLimitCheck.allowed) {
        const lockoutEndsAt = new Date(rateLimitCheck.lockoutEndsAt!);
        throw new Error(`Too many failed attempts. Account locked until ${lockoutEndsAt.toLocaleTimeString()}`);
      }
      
      // SECURITY FIX: Check server-side rate limiting
      const serverLockStartTime = performance.now();
      try {
        const { data: rateLimitResult, error: rateLimitError } = await supabase.rpc('check_login_rate_limit', {
          p_email: email,
          p_ip_address: null // IP not available in client
        });

        if (rateLimitError) {
          SecureLogger.warn('Rate limit check error:', rateLimitError);
        } else if (rateLimitResult && !rateLimitResult.allowed) {
          throw new Error(rateLimitResult.message || 'Konto temporär gesperrt. Versuchen Sie es später erneut.');
        } else if (rateLimitResult?.message) {
          // Show warning about remaining attempts
          SecureLogger.warn(rateLimitResult.message);
        }
      } catch (rpcError: any) {
        // If rate limit check fails with a lockout message, throw it
        if (rpcError.message?.includes('gesperrt') || rpcError.message?.includes('locked')) {
          throw rpcError;
        }
        // Otherwise continue with login (backwards compatibility)
        SecureLogger.log('Rate limit check RPC not available, continuing');
      }
      
      // Actual Supabase authentication
      const supabaseAuthStartTime = performance.now();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      const supabaseAuthEndTime = performance.now();
      
      if (error) {
        SecureLogger.warn('Sign in failed');
        // Record failed attempt (client-side)
        const failedAttemptStartTime = performance.now();
        await RateLimiter.recordFailedAttempt(email);

        // SECURITY FIX: Record failed attempt on server
        const serverFailedStartTime = performance.now();
        try {
          await supabase.rpc('record_login_attempt', {
            p_email: email,
            p_success: false,
            p_ip_address: null,
            p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
          });
        } catch (rpcError) {
          SecureLogger.log('Record login attempt RPC not available');
        }

        // Log failed login audit event
        const auditStartTime = performance.now();
        await AuditLogger.logAuthEvent('login_failed', undefined, { email, error: error.message });
        throw error;
      }
      
      if (data.user) {
        SecureLogger.log('Sign in successful');

        // Clear failed attempts on success (client-side)
        const clearAttemptsStartTime = performance.now();
        await RateLimiter.clearAttempts(email);

        // SECURITY FIX: Record successful login on server
        const serverClearStartTime = performance.now();
        try {
          await supabase.rpc('record_login_attempt', {
            p_email: email,
            p_success: true,
            p_ip_address: null,
            p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
          });
        } catch (rpcError) {
          SecureLogger.log('Record login attempt RPC not available');
        }

        // Update activity for session timeout
        const sessionTimeoutStartTime = performance.now();
        await SessionTimeoutManager.updateLastActivity();

        // Log successful login audit event
        const successAuditStartTime = performance.now();
        await AuditLogger.logAuthEvent('login_success', data.user.id, { email });
      }
      
      const totalSignInTime = performance.now() - signInStartTime;
      
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
      
      // Validate password strength (client-side)
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        const errorMessage = `Password requirements not met:\n${passwordValidation.errors.join('\n')}`;
        throw new Error(errorMessage);
      }

      // SECURITY FIX: Also validate password on server-side
      try {
        const { data: serverValidation, error: validationError } = await supabase.rpc('validate_password_strength', {
          p_password: password
        });

        if (validationError) {
          SecureLogger.warn('Server-side password validation error:', validationError);
        } else if (serverValidation && !serverValidation.is_valid) {
          const serverErrors = serverValidation.errors?.join('\n') || 'Password does not meet requirements';
          throw new Error(serverErrors);
        }
      } catch (rpcError: any) {
        // If server validation fails with specific errors, throw them
        if (rpcError.message && !rpcError.message.includes('RPC')) {
          throw rpcError;
        }
        // Otherwise continue (backwards compatibility)
        SecureLogger.log('Server-side password validation not available');
      }
      
      // Validate name
      if (!name || name.trim().length < 2) {
        throw new Error('Please enter a valid name (at least 2 characters)');
      }
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: { 
          data: { name: name.trim() },
          emailRedirectTo: Platform.OS === 'web' 
            ? `${window.location.origin}/auth/verify-email`
            : 'medicallearningapp://auth/verify-email'
        }
      });
      
      if (authError) {
        SecureLogger.warn('Sign up failed');
        throw authError;
      }
      
      // Check if user needs email confirmation
      if (authData.user && !authData.user.email_confirmed_at) {
        SecureLogger.log('Sign up successful - email verification required');
        // Return a special status to indicate email verification is needed
        throw new Error('VERIFICATION_REQUIRED');
      }
      
      SecureLogger.log('Sign up successful');
      return authData;
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
      
      // Clear local state immediately and force re-render
      SecureLogger.log('Clearing local session state');
      setSession(null);
      setUser(null);

      // Force a loading state briefly to ensure components re-render properly
      setLoading(true);
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
    <AuthContext.Provider value={{
      session,
      user,
      loading,
      // SECURITY FIX: Check email_confirmed_at to determine verification status
      isEmailVerified: !!session?.user?.email_confirmed_at,
      signIn,
      signUp,
      signOut
    }}>
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