import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { SecureLogger } from './security';

// SECURITY FIX: Load configuration from environment variables only - no hardcoded fallbacks
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  (typeof window !== 'undefined' && (window as any).__ENV__?.EXPO_PUBLIC_SUPABASE_URL);

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  (typeof window !== 'undefined' && (window as any).__ENV__?.EXPO_PUBLIC_SUPABASE_ANON_KEY);

// SECURITY FIX: Remove debug logging that could expose configuration details

SecureLogger.log('Supabase configuration loaded', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  platform: Platform.OS,
  processEnvUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
  processEnvKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

// Validate environment variables with helpful error messages
if (!supabaseUrl) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please check your .env file and ensure EXPO_PUBLIC_SUPABASE_URL is set.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
      'Please check your .env file and ensure EXPO_PUBLIC_SUPABASE_ANON_KEY is set.'
  );
}

// Validate URL format
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  throw new Error('Invalid EXPO_PUBLIC_SUPABASE_URL format. Expected format: https://your-project.supabase.co');
}

// Log successful configuration (without revealing secrets)
SecureLogger.log('Supabase configuration validated successfully', {
  url: supabaseUrl.replace(/([a-z0-9]+)\.supabase\.co/, '*****.supabase.co'),
  hasAnonKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey.length,
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Enable session persistence on all platforms
    autoRefreshToken: true, // Auto-refresh tokens to prevent expiry issues
    detectSessionInUrl: Platform.OS === 'web', // Only detect URL session on web
    flowType: 'pkce', // Use PKCE flow for better security
  },
});

SecureLogger.log('Supabase client initialized successfully');
