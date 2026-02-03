/**
 * Referral Tracking Utility
 *
 * Reads ?ref= parameter from URL, stores in cookie + localStorage,
 * and records the click in the database.
 */
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { logger } from '@/utils/logger';

const COOKIE_NAME = 'kpmed_ref';
const STORAGE_KEY = 'kpmed_ref';
const COOKIE_DAYS = 30;

/**
 * Set a cookie (web only)
 */
function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`;
}

/**
 * Get a cookie value (web only)
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Store referral code in cookie + localStorage
 */
function storeReferralCode(code: string): void {
  setCookie(COOKIE_NAME, code, COOKIE_DAYS);
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // localStorage may not be available
  }
}

/**
 * Get stored referral code from cookie or localStorage
 */
export function getStoredReferralCode(): string | null {
  if (Platform.OS !== 'web') return null;

  // Try cookie first, then localStorage as backup
  const fromCookie = getCookie(COOKIE_NAME);
  if (fromCookie) return fromCookie;

  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Clear stored referral code (called after successful registration attribution)
 */
export function clearStoredReferralCode(): void {
  setCookie(COOKIE_NAME, '', -1); // Expire the cookie
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Check URL for ?ref= parameter, store it, and record the click.
 * Should be called once on app load.
 */
export async function handleReferralParam(): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  try {
    const url = new URL(window.location.href);
    const refCode = url.searchParams.get('ref');

    if (!refCode) return;

    logger.info('Referral code detected:', refCode);

    // Store the code
    storeReferralCode(refCode);

    // Remove ?ref= from URL without page reload (clean URL)
    url.searchParams.delete('ref');
    window.history.replaceState({}, '', url.toString());

    // Record the click in database
    const { data, error } = await supabase.rpc('record_referral_click', {
      p_affiliate_code: refCode,
      p_landing_page: window.location.pathname,
      p_user_agent: navigator.userAgent,
    });

    if (error) {
      logger.error('Failed to record referral click:', error);
    } else if (data?.success) {
      logger.info('Referral click recorded for:', refCode);
    } else {
      logger.warn('Referral click not recorded:', data?.message);
    }
  } catch (err) {
    logger.error('Error handling referral param:', err);
  }
}
