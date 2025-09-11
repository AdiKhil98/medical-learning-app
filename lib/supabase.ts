import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { SecureLogger } from './security';

// Load configuration from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

SecureLogger.log('Supabase configuration loaded');

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
  throw new Error(
    'Invalid EXPO_PUBLIC_SUPABASE_URL format. Expected format: https://your-project.supabase.co'
  );
}

// Log successful configuration (without revealing secrets)
SecureLogger.log('Supabase configuration validated successfully', {
  url: supabaseUrl.replace(/([a-z0-9]+)\.supabase\.co/, '*****.supabase.co'),
  hasAnonKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey.length
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS === 'web' && {
      detectSessionInUrl: true, // Enable URL detection for email links
      persistSession: true,
      autoRefreshToken: true,
    }),
    // Email link handling configuration
    flowType: 'pkce', // Use PKCE flow for better security
  },
});

SecureLogger.log('Supabase client initialized successfully');