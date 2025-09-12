import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { SecureLogger } from './security';

// Load configuration from environment variables with fallback for web deployment
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 
  process.env.SUPABASE_URL ||
  (typeof window !== 'undefined' && (window as any).__ENV__?.EXPO_PUBLIC_SUPABASE_URL) ||
  'https://pavjavrijaihnwbydfrk.supabase.co'; // Temporary fallback for web deployment
  
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY ||
  (typeof window !== 'undefined' && (window as any).__ENV__?.EXPO_PUBLIC_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhdmphdnJpamFpaG53YnlkZnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDM4NjYsImV4cCI6MjA2MDcxOTg2Nn0.4VrlhzIdV6F8cypZlVuYwE61GspATdFcjh0ebViOHIs'; // Fallback

// Debug logging for browser console
console.log('🔍 SUPABASE CONFIG DEBUG:', {
  url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING',
  keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
  platform: Platform.OS,
  envVars: {
    EXPO_PUBLIC_SUPABASE_URL: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY
  }
});

SecureLogger.log('Supabase configuration loaded', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  platform: Platform.OS,
  processEnvUrl: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
  processEnvKey: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
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